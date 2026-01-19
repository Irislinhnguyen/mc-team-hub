/**
 * AI SQL Generator
 *
 * Generates BigQuery SQL from natural language questions using OpenAI GPT-4
 * Enhanced with Supabase-based learning from past queries
 */

import OpenAI from 'openai'
import { feedbackLearningService } from './feedbackLearningService'
import { OpenAIUsageTracker, UserContext } from './openaiUsageTracker'
import { knowledgeGraph, type AIContext } from './knowledgeGraphSupabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface SqlGenerationResult {
  understanding: {
    summary: string
    entities: string[]
    filters: string[]
    timeRange: string
    confidence: number
  }
  sql: string
  warnings: string[]
}

/**
 * Valid column names for schema validation
 */
const VALID_COLUMNS = {
  pub_data: [
    'date', 'pic', 'pid', 'pubname', 'mid', 'medianame',
    'zid', 'zonename', 'rev', 'profit', 'paid', 'req',
    'request_CPM', 'month', 'year'
  ],
  updated_product_name: [
    'pid', 'pubname', 'mid', 'medianame', 'zid', 'zonename',
    'H5', 'product'
  ]
}

/**
 * Extract column references from SQL query
 * Looks for patterns like: p.column_name, u.column_name, or standalone column_name
 */
function extractColumnsFromSql(sql: string): string[] {
  const columns = new Set<string>()

  // Match patterns like p.column_name or u.column_name
  const aliasedColumns = sql.match(/[p|u]\.\w+/g) || []
  aliasedColumns.forEach(match => {
    const column = match.split('.')[1]
    if (column && !['*'].includes(column)) {
      columns.add(column)
    }
  })

  // Also check for common SQL keywords to avoid false positives
  const sqlKeywords = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'BY', 'AS', 'ON',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'AND', 'OR', 'IN',
    'HAVING', 'LIMIT', 'OFFSET', 'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'SUM', 'COUNT', 'AVG', 'MAX', 'MIN', 'ROUND', 'CAST', 'DISTINCT'
  ])

  // Filter out SQL keywords
  return Array.from(columns).filter(col => !sqlKeywords.has(col.toUpperCase()))
}

/**
 * Validate that generated SQL only uses valid column names
 */
function validateColumnNames(sql: string): { isValid: boolean; invalidColumns: string[] } {
  const allValidColumns = [
    ...VALID_COLUMNS.pub_data,
    ...VALID_COLUMNS.updated_product_name
  ]

  const usedColumns = extractColumnsFromSql(sql)
  const invalidColumns = usedColumns.filter(col => !allValidColumns.includes(col))

  return {
    isValid: invalidColumns.length === 0,
    invalidColumns
  }
}

export const SYSTEM_PROMPT = `You are a BigQuery SQL expert for the GCPP-Check analytics platform.

**CRITICAL: LANGUAGE DETECTION**
Detect the language of the user's question and ALWAYS respond in the SAME language:
- Vietnamese question (tiếng Việt) → Vietnamese response
- English question → English response
- Japanese question (日本語) → Japanese response
- Indonesian question (Bahasa) → Indonesian response
- Any other language → Same language response

**AVAILABLE COLUMNS (IMPORTANT - zonename EXISTS in pub_data!):**

pub_data table (gcpp-check.GI_publisher.pub_data):
- date, pic, pid, pubname, mid, medianame
- zid, zonename  ← zonename IS available directly, NO extra table needed!
- rev (revenue), profit, paid (impressions), req (requests)
- request_CPM, month, year

updated_product_name table (gcpp-check.GI_publisher.updated_product_name):
- JOIN on zid when user asks about "product"
- Columns: pid, pubname, mid, medianame, zid, zonename, H5, product

**CRITICAL REMINDERS:**
- "zone name" / "zonename" → use zonename column (EXISTS in pub_data!)
- "product" → JOIN with updated_product_name table
- "team" → use pic IN (...) filter (NO team column exists!)

**IMPORTANT: 3-STEP THINKING PROCESS FOR GENERATING SQL**

You MUST follow this 3-step process for every question:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: ENTITY IDENTIFICATION (What entities?)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIRST: Identify what ENTITY the user wants:

| Entity | Description | Columns to SELECT |
|--------|-------------|-------------------|
| pid | Publisher | pid, pubname |
| mid | Media | mid, medianame, pid, pubname |
| zid | Zone | zid, zonename, mid, medianame, pid, pubname |
| team | Team (via PIC) | pic, COUNT(DISTINCT pid) |
| pic | Person in Charge | pic, team, pubname |

ENTITY HIERARCHY (child includes parent):
- zid → includes mid, pid info
- mid → includes pid info
- pid → publisher only

KEYWORD PATTERNS:
- "zones", "zone IDs", "zid", "these zones" → entity = zid
- "publishers", "PIDs", "pubname" → entity = pid
- "media", "MIDs", "medianame" → entity = mid
- "teams", "team names" → entity = team (use pic filter)

SPECIFIC ID FILTERS:
- "these zones: 1597085, 1563812, ..." → WHERE zid IN (1597085, 1563812, ...)
- "for PIDs: 123, 456" → WHERE pid IN (123, 456)
- Parse comma-separated, tab-separated, or space-separated numbers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: METRIC DETERMINATION (What metrics?)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECOND: Identify what METRICS to calculate:

| User Request | SQL Formula | Notes |
|--------------|-------------|-------|
| "revenue" | SUM(rev) | Direct sum |
| "ad requests" / "requests" | SUM(req) | Direct sum |
| "impressions" / "paid" | SUM(paid) | Direct sum |
| "profit" | SUM(profit) | Direct sum |
| "eCPM" | SAFE_DIVIDE(SUM(rev), SUM(paid)) * 1000 | Calculated! |
| "fill rate" | SAFE_DIVIDE(SUM(paid), SUM(req)) * 100 | Calculated! |
| "profit rate" | SAFE_DIVIDE(SUM(profit), SUM(rev)) * 100 | Calculated! |
| "revenue to publisher" | SUM(paid) | Same as impressions |

IMPORTANT: When user asks for "eCPM", "fill rate", or "profit rate",
you MUST calculate them using SAFE_DIVIDE, NOT select a pre-existing column!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: HOW TO GET METRICS (SQL Structure)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIRD: Build the SQL query:

1. SELECT entity columns + calculated metrics
2. FROM \`gcpp-check.GI_publisher.pub_data\`
3. WHERE conditions:
   - Date range (parse from question)
   - Entity ID filter (IN clause for specific IDs)
   - Product filter (only if mentioned - requires JOIN)
4. GROUP BY entity columns
5. ORDER BY (usually revenue descending)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE: Complex Zone Query with Multiple Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question: "Give me the information for these zones: 1597085, 1563812, 1595787.
Include zonename. Calculate total ad requests, revenue, eCPM, profit."

**Step 1: Entity**
- Keywords: "zones", "zone IDs" → entity = zid
- Specific IDs: 1597085, 1563812, 1595787

**Step 2: Metrics**
- "ad requests" → SUM(req)
- "revenue" → SUM(rev)
- "eCPM" → SAFE_DIVIDE(SUM(rev), SUM(paid)) * 1000
- "profit" → SUM(profit)

**Step 3: SQL**
SELECT
  zid,
  zonename,
  mid,
  medianame,
  pid,
  pubname,
  SUM(req) as total_requests,
  SUM(rev) as total_revenue,
  SUM(profit) as total_profit,
  SUM(paid) as total_impressions,
  SAFE_DIVIDE(SUM(rev), SUM(paid)) * 1000 as ecpm
FROM \`gcpp-check.GI_publisher.pub_data\`
WHERE zid IN (1597085, 1563812, 1595787)
GROUP BY zid, zonename, mid, medianame, pid, pubname
ORDER BY total_revenue DESC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE: Multiple Metrics for Publishers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question: "Show publishers with revenue, eCPM, and fill rate in October 2024"

**Step 1: Entity**
- Keywords: "publishers" → entity = pid

**Step 2: Metrics**
- "revenue" → SUM(rev)
- "eCPM" → SAFE_DIVIDE(SUM(rev), SUM(paid)) * 1000
- "fill rate" → SAFE_DIVIDE(SUM(paid), SUM(req)) * 100

**Step 3: SQL**
SELECT
  pid,
  pubname,
  SUM(rev) as total_revenue,
  SUM(req) as total_requests,
  SUM(paid) as total_impressions,
  SAFE_DIVIDE(SUM(rev), SUM(paid)) * 1000 as ecpm,
  SAFE_DIVIDE(SUM(paid), SUM(req)) * 100 as fill_rate
FROM \`gcpp-check.GI_publisher.pub_data\`
WHERE date BETWEEN '2024-10-01' AND '2024-10-31'
GROUP BY pid, pubname
ORDER BY total_revenue DESC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**pub_data table columns:**
date, pic, pid, pubname, mid, medianame, zid, zonename, rev, profit, paid, req, request_CPM, month, year

**updated_product_name table columns:**
pid, pubname, mid, medianame, zid, zonename, H5, product

**IMPORTANT:**
- "zone name" / "zonename" → use zonename column (EXISTS in pub_data!)
- "product" → JOIN with updated_product_name table
- "team" → use pic IN (...) filter (NO team column exists!)

**EXAMPLE REASONING (Churned Publishers):**

Question: "Find publishers with no revenue in November 2025 but had revenue in March-October 2025"

{
  "step1_understanding": {
    "question_type": "churned_entities",
    "entities": ["publishers (pid, pubname)"],
    "time_periods": ["March-October 2025 (had revenue)", "November 2025 (no revenue)"],
    "key_insight": "Churn means entity EXISTS in period1 (Mar-Oct) with revenue > 0, but DOES NOT EXIST or has revenue = 0 in period2 (Nov)"
  },
  "step2_breakdown": {
    "logic_steps": [
      "1. Find all PIDs with SUM(revenue) > 0 during March-October 2025",
      "2. Calculate total revenue and months with revenue for Mar-Oct period",
      "3. Find PIDs with SUM(revenue) = 0 OR NULL during November 2025",
      "4. Use LEFT JOIN or NOT IN to find publishers in step1 but not in step2",
      "5. Calculate average monthly revenue = total_revenue / count(months with revenue)"
    ],
    "calculations": [
      "avg_monthly_revenue = SUM(rev WHERE rev > 0) / COUNT(DISTINCT month WHERE rev > 0)"
    ]
  },
  "step3_constraints": {
    "no_product_filter": true,
    "no_join_needed": true,
    "date_ranges": [
      "'2025-03-01' to '2025-10-31' (period with revenue)",
      "'2025-11-01' to '2025-11-30' (period without revenue)"
    ]
  },
  "step4_sql_plan": {
    "cte1": "publishers_with_revenue_before: Get PIDs with SUM(rev) > 0 in Mar-Oct, calculate total revenue and month count",
    "cte2": "revenue_in_november: Get PIDs with SUM(rev) per publisher in November",
    "main_query": "LEFT JOIN cte1 with cte2, filter WHERE nov_revenue IS NULL OR nov_revenue = 0",
    "order_by": "avg_monthly_revenue DESC"
  }
}

**STAGE 2: SQL GENERATION**

Based on your reasoning above, generate the SQL.

For the "churned publishers" example above, the SQL would be:

WITH publishers_with_revenue_before AS (
  SELECT
    pid,
    pubname,
    SUM(rev) as total_revenue_mar_oct,
    SUM(profit) as total_profit_mar_oct,
    COUNT(DISTINCT CASE WHEN rev > 0 THEN month END) as months_with_revenue
  FROM \`gcpp-check.GI_publisher.pub_data\`
  WHERE date BETWEEN '2025-03-01' AND '2025-10-31'
  GROUP BY pid, pubname
  HAVING SUM(rev) > 0
),
revenue_in_november AS (
  SELECT
    pid,
    SUM(rev) as nov_revenue
  FROM \`gcpp-check.GI_publisher.pub_data\`
  WHERE date BETWEEN '2025-11-01' AND '2025-11-30'
  GROUP BY pid
)
SELECT
  p.pid,
  p.pubname,
  p.total_revenue_mar_oct,
  p.total_profit_mar_oct,
  p.total_revenue_mar_oct / p.months_with_revenue as avg_monthly_revenue,
  p.total_profit_mar_oct / p.months_with_revenue as avg_monthly_profit,
  COALESCE(n.nov_revenue, 0) as nov_revenue
FROM publishers_with_revenue_before p
LEFT JOIN revenue_in_november n ON p.pid = n.pid
WHERE COALESCE(n.nov_revenue, 0) = 0
ORDER BY avg_monthly_revenue DESC

**EXAMPLE REASONING 2 (Top N with Breakdown):**

Question: "Find top 5 products by revenue in 2025 and breakdown revenue by month"

{
  "step1_understanding": {
    "question_type": "top_n_with_breakdown",
    "entities": ["products (from updated_product_name)"],
    "time_periods": ["All of 2025 (Jan-Dec)"],
    "key_insight": "Two-step logic: (1) Find top 5 products by TOTAL revenue in 2025, (2) Show monthly breakdown for those 5 products only"
  },
  "step2_breakdown": {
    "logic_steps": [
      "1. Calculate monthly revenue for each product across all of 2025",
      "2. Calculate total revenue per product (sum of all months)",
      "3. Rank products by total revenue and select top 5",
      "4. For those top 5, show month-by-month breakdown"
    ],
    "calculations": [
      "monthly_revenue = SUM(rev) per product per month",
      "total_revenue = SUM(monthly_revenue) per product"
    ]
  },
  "step3_constraints": {
    "no_product_filter": false,
    "join_required": true,
    "date_ranges": [
      "'2025-01-01' to '2025-12-31' (full year 2025)"
    ],
    "team_filter_needed": false
  },
  "step4_sql_plan": {
    "cte1": "product_revenue_2025: Calculate SUM(rev) per product per month for 2025, JOIN pub_data with updated_product_name on zid",
    "cte2": "top_5_products: Aggregate monthly revenue to get total per product, ORDER BY total DESC LIMIT 5",
    "main_query": "SELECT monthly breakdown from cte1 WHERE product IN (top 5 from cte2), JOIN to filter",
    "order_by": "product, year, month"
  }
}

**SQL for example 2:**

WITH product_revenue_2025 AS (
  SELECT
    u.product,
    EXTRACT(YEAR FROM p.date) as year,
    EXTRACT(MONTH FROM p.date) as month,
    SUM(p.rev) as monthly_revenue
  FROM \`gcpp-check.GI_publisher.pub_data\` p
  LEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u ON p.zid = u.zid
  WHERE p.date BETWEEN '2025-01-01' AND '2025-12-31'
  GROUP BY u.product, year, month
),
top_5_products AS (
  SELECT
    product,
    SUM(monthly_revenue) as total_revenue
  FROM product_revenue_2025
  GROUP BY product
  ORDER BY total_revenue DESC
  LIMIT 5
)
SELECT
  pr.product,
  pr.year,
  pr.month,
  pr.monthly_revenue
FROM product_revenue_2025 pr
JOIN top_5_products tp ON pr.product = tp.product
ORDER BY tp.total_revenue DESC, pr.product, pr.year, pr.month

---

TABLE SCHEMA:

**PRIMARY TABLES (Always use these two tables with JOIN):**

Table 1: \`gcpp-check.GI_publisher.pub_data\` (Fact table - daily metrics)
Columns:
- date (DATE) - Date of the data
- pic (STRING) - Person in Charge (e.g., "VN_minhlh", "ID_Devi") - CAN BE NULL
- pid (INT64) - Publisher ID
- pubname (STRING) - Publisher name
- mid (INT64) - Media Property ID
- medianame (STRING) - Media property name
- zid (INT64) - Zone ID
- zonename (STRING) - Zone name
- rev (FLOAT64) - Revenue in USD
- profit (FLOAT64) - Profit in USD
- paid (INT64) - Paid impressions
- req (INT64) - Ad requests
- request_CPM (FLOAT64) - eCPM value
- month (INT64) - Month number (1-12)
- year (INT64) - Year number (e.g., 2025)

Table 2: \`gcpp-check.GI_publisher.updated_product_name\` (Dimension - product mapping)
Columns:
- pid (INT64) - Publisher ID
- pubname (STRING) - Publisher name
- mid (INT64) - Media Property ID
- medianame (STRING) - Media property name
- zid (INT64) - Zone ID
- zonename (STRING) - Zone name
- H5 (BOOL) - Is H5 product type
- product (STRING) - Product name (overlay, flexiblesticky, banner, native, interstitial, etc.)

**CRITICAL: pub_data does NOT have 'product' field!**
To filter or group by product, you MUST JOIN with updated_product_name:

\`\`\`sql
FROM \`gcpp-check.GI_publisher.pub_data\` p
LEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u
  ON p.zid = u.zid
WHERE u.product = 'overlay'  -- Now you can filter by product
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CRITICAL: VALID COLUMN NAMES - STRICT ENFORCEMENT REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU MUST USE **ONLY** THESE EXACT COLUMN NAMES. DO NOT:
❌ Abbreviate column names (e.g., mname, pname, zname, mtype)
❌ Invent new column names based on logic
❌ Assume columns exist without checking this list

**pub_data table - VALID COLUMNS:**
date, pic, pid, pubname, mid, medianame, zid, zonename, rev, profit, paid, req, request_CPM, month, year

**updated_product_name table - VALID COLUMNS:**
pid, pubname, mid, medianame, zid, zonename, H5, product

**COMMON MISTAKES TO AVOID:**

❌ WRONG: SELECT p.mname              → Column 'mname' does NOT exist
✅ RIGHT: SELECT p.medianame          → Use full name 'medianame'

❌ WRONG: SELECT p.pname              → Column 'pname' does NOT exist
✅ RIGHT: SELECT p.pubname            → Use full name 'pubname'

❌ WRONG: SELECT p.zname              → Column 'zname' does NOT exist
✅ RIGHT: SELECT p.zonename           → Use full name 'zonename'

❌ WRONG: SELECT p.quarter            → Column 'quarter' does NOT exist
✅ RIGHT: SELECT CEIL(p.month / 3) AS quarter  → Calculate quarter from month column

❌ WRONG: SELECT p.mtype              → Column 'mtype' does NOT exist
✅ RIGHT: SELECT u.product            → Product info is in updated_product_name table

❌ WRONG: WHERE p.product = 'overlay' → pub_data has NO 'product' column!
✅ RIGHT: JOIN updated_product_name u ON p.zid = u.zid WHERE u.product = 'overlay'

If user mentions "media", "publisher", or "zone" names → use medianame, pubname, zonename (NOT abbreviations!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENTITY HIERARCHY:
- Publisher (pid) → Media (mid) → Zone (zid)
- Each publisher has multiple media properties
- Each media has multiple zones
- Each zone has ONE product (from updated_product_name)

YOUR TASK:
1. Parse the user's natural language question (Vietnamese or English)
2. Generate optimized BigQuery SQL
3. Explain your understanding in a structured format

IMPORTANT RULES:
- Always include a WHERE clause with date range filter
- Use CTEs (WITH clauses) for complex queries to improve readability
- Calculate metrics correctly:
  * eCPM = (revenue / paid_impressions) * 1000
  * Fill Rate = (paid_impressions / requests) * 100
- Use SAFE_DIVIDE for division to handle zero denominators
- Optimize queries: Put WHERE before GROUP BY, use DISTINCT carefully
- **CRITICAL: BigQuery does NOT support tuple IN syntax**
  * WRONG: (mid, zid) IN (SELECT mid, zid FROM ...)
  * RIGHT: mid IN (SELECT mid FROM ...)
  * IN/NOT IN subqueries MUST return exactly ONE column
- **Subquery must return scalar or single column, not STRUCT:**
  * WRONG: WHERE pid IN (SELECT max_pid FROM cte) -- returns STRUCT
  * RIGHT: WHERE pid = (SELECT MAX(pid) FROM cte) -- returns scalar
  * RIGHT: WHERE pid IN (SELECT pid FROM cte) -- returns column
- **For "last N days/months" or "recent" queries:**
  * DO NOT use CURRENT_DATE() - it may be ahead of available data
  * Use subquery to get actual latest date: (SELECT MAX(date) FROM \`gcpp-check.GI_publisher.pub_data\`)
  * Example: "last 6 months" → WHERE date BETWEEN DATE_SUB((SELECT MAX(date) FROM \`gcpp-check.GI_publisher.pub_data\`), INTERVAL 6 MONTH) AND (SELECT MAX(date) FROM \`gcpp-check.GI_publisher.pub_data\`)
  * Example: "last 30 days" → WHERE date BETWEEN DATE_SUB((SELECT MAX(date) FROM \`gcpp-check.GI_publisher.pub_data\`), INTERVAL 30 DAY) AND (SELECT MAX(date) FROM \`gcpp-check.GI_publisher.pub_data\`)
- For multi-level queries (e.g., "media with product X"):
  * Understand the entity level: "media" = mid level, "zone" = zid level
  * Query about "media" with product filter → filter by mid only
  * Query about "zone" with product filter → filter by zid only
  * Use CTEs to filter, then aggregate back to the correct entity level
- **For "top N largest" or "pid lớn nhất" queries:**
  * "Largest" typically means highest revenue/profit (business context), NOT highest ID number
  * "Top 5 pid lớn nhất" → ORDER BY revenue DESC LIMIT 5
  * If user explicitly wants highest PID numbers, they will say "PID có số lớn nhất"
- Always ORDER BY the most relevant metric DESC
- Add LIMIT 10000 if not specified

COMMON QUERY PATTERNS:

1. SIMPLE AGGREGATION (no product filter):
"Top publishers by revenue in October 2024"
→ SELECT
     p.pid,
     p.pubname,
     SUM(p.rev) as revenue
   FROM \`gcpp-check.GI_publisher.pub_data\` p
   WHERE p.date BETWEEN '2024-10-01' AND '2024-10-31'
   GROUP BY p.pid, p.pubname
   ORDER BY revenue DESC
   LIMIT 10

2. QUERY WITH PRODUCT FILTER (requires JOIN):
"Media using overlay in October 2024"
→ SELECT
     p.mid,
     p.medianame,
     p.pid,
     p.pubname,
     SUM(p.rev) as revenue
   FROM \`gcpp-check.GI_publisher.pub_data\` p
   LEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u
     ON p.zid = u.zid
   WHERE p.date BETWEEN '2024-10-01' AND '2024-10-31'
     AND u.product = 'overlay'
   GROUP BY p.mid, p.medianame, p.pid, p.pubname
   ORDER BY revenue DESC

3. MULTI-LEVEL FILTERING WITH PRODUCT:
"Media that use overlay but not flexiblesticky"
→ WITH media_with_overlay AS (
     SELECT DISTINCT p.mid
     FROM \`gcpp-check.GI_publisher.pub_data\` p
     LEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u ON p.zid = u.zid
     WHERE u.product = 'overlay'
   ),
   media_with_flex AS (
     SELECT DISTINCT p.mid
     FROM \`gcpp-check.GI_publisher.pub_data\` p
     LEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u ON p.zid = u.zid
     WHERE u.product = 'flexiblesticky'
   )
   SELECT
     p.mid,
     p.medianame,
     p.pid,
     p.pubname,
     SUM(p.rev) as revenue
   FROM \`gcpp-check.GI_publisher.pub_data\` p
   WHERE p.mid IN (SELECT mid FROM media_with_overlay)
     AND p.mid NOT IN (SELECT mid FROM media_with_flex)
   GROUP BY p.mid, p.medianame, p.pid, p.pubname
   ORDER BY revenue DESC

4. COMPARISON QUERIES (no product - no JOIN needed):
"Compare revenue between October and November 2024"
→ SELECT
     pid,
     pubname,
     SUM(CASE WHEN date BETWEEN '2024-10-01' AND '2024-10-31' THEN rev ELSE 0 END) as oct_revenue,
     SUM(CASE WHEN date BETWEEN '2024-11-01' AND '2024-11-30' THEN rev ELSE 0 END) as nov_revenue,
     SAFE_DIVIDE(
       SUM(CASE WHEN date BETWEEN '2024-11-01' AND '2024-11-30' THEN rev ELSE 0 END) -
       SUM(CASE WHEN date BETWEEN '2024-10-01' AND '2024-10-31' THEN rev ELSE 0 END),
       SUM(CASE WHEN date BETWEEN '2024-10-01' AND '2024-10-31' THEN rev ELSE 0 END)
     ) * 100 as revenue_change_pct
   FROM \`gcpp-check.GI_publisher.pub_data\`
   WHERE date BETWEEN '2024-10-01' AND '2024-11-30'
   GROUP BY pid, pubname
   ORDER BY oct_revenue DESC

4. TEAM-LEVEL QUERIES:
IMPORTANT: Team field does NOT exist as a column in BigQuery table.
However, you CAN query team data by filtering on PIC field.

Team to PIC mapping is fetched DYNAMICALLY from Supabase and will be provided in the prompt when user mentions a team.

If team mappings are provided above (in "CURRENT TEAM MAPPINGS FROM SUPABASE" section), use those exact PIC lists.

Example:
- If you see: "Team WEB_GV → WHERE pic IN ('VN_minhlh', 'VN_xxx')"
- Then use: WHERE pic IN ('VN_minhlh', 'VN_xxx')

DO NOT use hardcoded PIC lists or guess team members!

When user asks about a specific team, filter by the PIC values provided from Supabase, and GROUP BY can include pic or aggregate across all PICs in that team.

RESPONSE FORMAT:
Return a JSON object with:
{
  "understanding": {
    "summary": "One-sentence explanation of what the query does",
    "entities": ["List of entities involved"],
    "filters": ["List of filter conditions"],
    "timeRange": "Date range being queried",
    "confidence": 0.95  // Your confidence level (0-1)
  },
  "sql": "The complete BigQuery SQL query",
  "warnings": ["Any warnings or limitations"]
}

EXAMPLES:

Example 1 (No product filter - no JOIN needed):
Question: "Tìm top 10 publishers có doanh thu cao nhất trong tháng 10 năm 2024"
Response:
{
  "understanding": {
    "summary": "Find top 10 publishers by revenue in October 2024",
    "entities": ["publisher (pid, pubname)"],
    "filters": ["date in October 2024"],
    "timeRange": "2024-10-01 to 2024-10-31",
    "confidence": 0.98
  },
  "sql": "SELECT\\n  pid,\\n  pubname,\\n  SUM(rev) as total_revenue\\nFROM \`gcpp-check.GI_publisher.pub_data\`\\nWHERE date BETWEEN '2024-10-01' AND '2024-10-31'\\nGROUP BY pid, pubname\\nORDER BY total_revenue DESC\\nLIMIT 10",
  "warnings": []
}

Example 2 (MEDIA-level query WITH product filter - requires JOIN):
Question: "Media có product overlay nhưng không có flexiblesticky trong tháng 10/2024"
Response:
{
  "understanding": {
    "summary": "Find media properties that use overlay product but not flexiblesticky product in October 2024",
    "entities": ["media (mid, medianame)"],
    "filters": ["product='overlay'", "does not have product='flexiblesticky'", "date in October 2024"],
    "timeRange": "2024-10-01 to 2024-10-31",
    "confidence": 0.95
  },
  "sql": "WITH media_with_overlay AS (\\n  SELECT DISTINCT p.mid\\n  FROM \`gcpp-check.GI_publisher.pub_data\` p\\n  LEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u ON p.zid = u.zid\\n  WHERE p.date BETWEEN '2024-10-01' AND '2024-10-31'\\n    AND u.product = 'overlay'\\n),\\nmedia_with_flexiblesticky AS (\\n  SELECT DISTINCT p.mid\\n  FROM \`gcpp-check.GI_publisher.pub_data\` p\\n  LEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u ON p.zid = u.zid\\n  WHERE p.date BETWEEN '2024-10-01' AND '2024-10-31'\\n    AND u.product = 'flexiblesticky'\\n)\\nSELECT\\n  p.mid,\\n  p.medianame,\\n  p.pid,\\n  p.pubname,\\n  SUM(p.rev) as total_revenue,\\n  SUM(p.req) as total_requests,\\n  SUM(p.paid) as total_impressions,\\n  SAFE_DIVIDE(SUM(p.rev), SUM(p.paid)) * 1000 as avg_ecpm,\\n  SAFE_DIVIDE(SUM(p.paid), SUM(p.req)) * 100 as avg_fill_rate\\nFROM \`gcpp-check.GI_publisher.pub_data\` p\\nWHERE p.date BETWEEN '2024-10-01' AND '2024-10-31'\\n  AND p.mid IN (SELECT mid FROM media_with_overlay)\\n  AND p.mid NOT IN (SELECT mid FROM media_with_flexiblesticky)\\nGROUP BY p.mid, p.medianame, p.pid, p.pubname\\nORDER BY total_revenue DESC\\nLIMIT 10000",
  "warnings": []
}

Example 3 (ZONE-level WITH product - requires JOIN):
Question: "Tìm các zone có product overlay, hiển thị cả mid và zone name trong tháng 10/2024"
Response:
{
  "understanding": {
    "summary": "Find zones using overlay product, showing both media and zone details in October 2024",
    "entities": ["zones (zid, zonename)", "media (mid, medianame)"],
    "filters": ["product='overlay'", "date in October 2024"],
    "timeRange": "2024-10-01 to 2024-10-31",
    "confidence": 0.95
  },
  "sql": "SELECT\\n  p.zid,\\n  p.zonename,\\n  p.mid,\\n  p.medianame,\\n  p.pid,\\n  p.pubname,\\n  SUM(p.rev) as total_revenue,\\n  SUM(p.req) as total_requests,\\n  SUM(p.paid) as total_impressions\\nFROM \`gcpp-check.GI_publisher.pub_data\` p\\nLEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u ON p.zid = u.zid\\nWHERE p.date BETWEEN '2024-10-01' AND '2024-10-31'\\n  AND u.product = 'overlay'\\nGROUP BY p.zid, p.zonename, p.mid, p.medianame, p.pid, p.pubname\\nORDER BY total_revenue DESC\\nLIMIT 10000",
  "warnings": []
}

Example 4 (TEAM-level, no product - no JOIN needed):
Question: "Hiển thị doanh thu Q1 trong 3 năm gần nhất của team WEB_GV"
Context: Team WEB_GV → WHERE pic IN ('VN_minhlh')
Response:
{
  "understanding": {
    "summary": "Show Q1 revenue for team WEB_GV across the last 3 years (2022, 2023, 2024)",
    "entities": ["team WEB_GV (filtered by PIC from Supabase)"],
    "filters": ["team=WEB_GV via PIC filter", "Q1 (Jan-Mar)", "years: 2022, 2023, 2024"],
    "timeRange": "Q1 2022, Q1 2023, Q1 2024",
    "confidence": 0.90
  },
  "sql": "SELECT\\n  EXTRACT(YEAR FROM date) as year,\\n  SUM(rev) as q1_revenue,\\n  SUM(profit) as q1_profit\\nFROM \`gcpp-check.GI_publisher.pub_data\`\\nWHERE date BETWEEN '2022-01-01' AND '2024-03-31'\\n  AND EXTRACT(MONTH FROM date) IN (1, 2, 3)\\n  AND pic IN ('VN_minhlh')\\nGROUP BY year\\nORDER BY year",
  "warnings": []
}

Example 5 (RECENT data WITH product - requires JOIN):
Question: "Hiển thị kết quả doanh thu của sản phẩm flexiblesticky cho team WEB_GV trong từng tháng của 6 tháng trở lại đây"
Context: Team WEB_GV → WHERE pic IN ('VN_minhlh')
Response:
{
  "understanding": {
    "summary": "Show monthly revenue for flexiblesticky product for team WEB_GV over the last 6 months",
    "entities": ["team WEB_GV (filtered by PIC from Supabase)", "product flexiblesticky"],
    "filters": ["product='flexiblesticky'", "team=WEB_GV via PIC filter", "last 6 months from latest date"],
    "timeRange": "Last 6 months from latest available date",
    "confidence": 0.95
  },
  "sql": "SELECT\\n  EXTRACT(YEAR FROM p.date) as year,\\n  EXTRACT(MONTH FROM p.date) as month,\\n  SUM(p.rev) as monthly_revenue,\\n  SUM(p.profit) as monthly_profit\\nFROM \`gcpp-check.GI_publisher.pub_data\` p\\nLEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u ON p.zid = u.zid\\nWHERE p.date BETWEEN DATE_SUB((SELECT MAX(date) FROM \`gcpp-check.GI_publisher.pub_data\`), INTERVAL 6 MONTH) AND (SELECT MAX(date) FROM \`gcpp-check.GI_publisher.pub_data\`)\\n  AND u.product = 'flexiblesticky'\\n  AND p.pic IN ('VN_minhlh')\\nGROUP BY year, month\\nORDER BY year DESC, month DESC\\nLIMIT 10000",
  "warnings": []
}

**OUTPUT FORMAT WITH 3-STEP REASONING:**

You MUST return JSON with this structure:

{
  "reasoning": {
    "step1_entity": {
      "detected_entity": "zid",
      "keywords_found": ["zones", "zone IDs"],
      "id_filters": [1597085, 1563812],
      "reason": "User asked for zone information with specific IDs"
    },
    "step2_metrics": {
      "metrics_requested": ["ad requests", "revenue", "eCPM", "profit"],
      "sql_formulas": {
        "ad_requests": "SUM(req)",
        "revenue": "SUM(rev)",
        "ecpm": "SAFE_DIVIDE(SUM(rev), SUM(paid)) * 1000",
        "profit": "SUM(profit)"
      }
    },
    "step3_sql_structure": {
      "entity_columns": ["zid", "zonename", "mid", "medianame", "pid", "pubname"],
      "where_clause": "zid IN (...)",
      "group_by": ["zid", "zonename", "mid", "medianame", "pid", "pubname"],
      "order_by": "total_revenue DESC"
    }
  },
  "understanding": {
    "summary": "Show metrics for specific zones",
    "entities": ["zones (zid, zonename)"],
    "filters": ["zid IN (...)"],
    "metrics": ["requests", "revenue", "eCPM", "profit"],
    "timeRange": "...",
    "confidence": 0.95
  },
  "sql": "SELECT ...",
  "warnings": []
}

Now process the user's question with 3-STEP REASONING FIRST, then SQL.`

export async function generateSqlFromQuestion(
  question: string,
  teamContext?: string,
  user?: UserContext
): Promise<SqlGenerationResult> {
  // Initialize tracker if user context is provided
  const tracker = user
    ? new OpenAIUsageTracker(user, 'sql_generation', '/api/query-lab/gen-sql')
    : null

  try {
    // Build system prompt with optional team context from Supabase
    let systemPrompt = SYSTEM_PROMPT
    if (teamContext) {
      systemPrompt += teamContext
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.1, // Low temperature for more deterministic outputs
      response_format: { type: 'json_object' }
    })

    // Log usage
    if (tracker) {
      await tracker.logUsage(response, question)
    }

    const result = JSON.parse(response.choices[0].message.content || '{}')

    // Validate the result
    if (!result.sql || !result.understanding) {
      throw new Error('Invalid response from AI: missing required fields')
    }

    const generatedResult = {
      reasoning: result.reasoning, // Include CoT reasoning in response
      understanding: {
        summary: result.understanding.summary || '',
        entities: result.understanding.entities || [],
        filters: result.understanding.filters || [],
        timeRange: result.understanding.timeRange || '',
        confidence: result.understanding.confidence || 0.5
      },
      sql: result.sql,
      warnings: result.warnings || []
    }

    // Fire-and-forget: Store successful query in Supabase (non-blocking)
    feedbackLearningService.storeSuccessfulQuery(question, generatedResult.sql)
      .catch(err => console.warn('[AI SQL Generator] Feedback store failed (non-blocking):', err?.message?.substring(0, 50)))

    return generatedResult
  } catch (error) {
    // Log error to usage tracker
    if (tracker) {
      await tracker.logError(error, 'gpt-4o', question)
    }

    console.error('[AI SQL Generator] Error:', error)

    // Fire-and-forget: Store error in Supabase (non-blocking)
    feedbackLearningService.storeErrorCase(
      question,
      '',
      error instanceof Error ? error.message : String(error)
    ).catch(err => console.warn('[AI SQL Generator] Feedback error store failed (non-blocking):', err?.message?.substring(0, 50)))

    throw new Error(`Failed to generate SQL: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * SIMPLE PLAN GENERATION (Claude Code style)
 * Returns a simple markdown plan instead of complex reasoning structure
 */
export async function generateSimplePlan(
  question: string,
  teamContext?: string,
  conversationHistory?: string,
  user?: UserContext
): Promise<{
  plan: string
  confidence: number
}> {
  // Initialize tracker
  const tracker = user
    ? new OpenAIUsageTracker(user, 'simple_plan', '/api/query-lab/simple-plan')
    : null

  try {
    const simplePlanPrompt = `You are a BigQuery SQL expert helping users query their data.

**CRITICAL: LANGUAGE DETECTION**
Detect the language of the user's question and RESPOND IN THE SAME LANGUAGE:
- Vietnamese question → Vietnamese response
- English question → English response
- Japanese/Indonesian/other → Same language response

User's question: "${question}"

Your task: Explain your approach in a simple, numbered plan (3-7 steps). Be concise and clear. Use the SAME language as the user's question.

Example format (English):
"I understand you want to find top 5 products by revenue in 2025 with monthly breakdown. Here's my plan:

1. Calculate monthly revenue for each product in 2025 (SUM revenue per product per month)
2. Calculate total revenue per product (sum across all months)
3. Rank products by total revenue
4. Select top 5 products
5. Show monthly breakdown for those 5 products only

Does this approach look correct?"

Example format (Vietnamese):
"Tôi hiểu bạn muốn tìm 5 sản phẩm có doanh thu cao nhất năm 2025. Đây là kế hoạch của tôi:

1. Tính doanh thu theo tháng cho mỗi sản phẩm năm 2025
2. Tính tổng doanh thu cho từng sản phẩm
3. Xếp hạng sản phẩm theo doanh thu
4. Chọn top 5 sản phẩm
5. Hiển thị chi tiết theo tháng cho 5 sản phẩm đó

Cách tiếp cận này có đúng không?"

${teamContext ? `\n\nTeam Context:\n${teamContext}` : ''}
${conversationHistory ? `\n\nPrevious conversation:\n${conversationHistory}` : ''}

Important:
- Keep it simple and conversational
- Use numbered list format
- Ask user for confirmation at the end
- Return as JSON: { "plan": "your markdown plan here", "confidence": 0.0-1.0 }
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful BigQuery SQL expert. Respond in JSON format with a simple plan.'
        },
        {
          role: 'user',
          content: simplePlanPrompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    // Log usage
    if (tracker) {
      await tracker.logUsage(response, question)
    }

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (!result.plan) {
      throw new Error('No plan generated')
    }

    return {
      plan: result.plan,
      confidence: result.confidence || 0.8
    }
  } catch (error) {
    // Log error
    if (tracker) {
      await tracker.logError(error, 'gpt-4o', question)
    }

    console.error('[Simple Plan Generator] Error:', error)
    throw new Error(`Failed to generate plan: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * UPDATE PLAN BASED ON USER FEEDBACK (Claude Code style)
 */
export async function updatePlanWithFeedback(
  question: string,
  currentPlan: string,
  userFeedback: string,
  conversationHistory: string,
  user?: UserContext
): Promise<{
  plan: string
  confidence: number
}> {
  const tracker = user
    ? new OpenAIUsageTracker(user, 'plan_update', '/api/query-lab/update-plan')
    : null

  try {
    const updatePrompt = `You are refining a BigQuery SQL plan based on user feedback.

**CRITICAL: LANGUAGE DETECTION**
Detect the language of the user's original question and feedback, then RESPOND IN THE SAME LANGUAGE:
- Vietnamese → Vietnamese response
- English → English response
- Other languages → Same language response

Original question: "${question}"

Current plan:
${currentPlan}

User feedback: "${userFeedback}"

${conversationHistory ? `Previous conversation:\n${conversationHistory}` : ''}

Your task: Update the plan based on user's feedback. Keep the same numbered format. Use the SAME LANGUAGE as the user.

Return as JSON: { "plan": "updated markdown plan in user's language", "confidence": 0.0-1.0 }
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful BigQuery SQL expert. Respond in JSON format with an updated plan.'
        },
        {
          role: 'user',
          content: updatePrompt
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    // Log usage
    if (tracker) {
      await tracker.logUsage(response, userFeedback)
    }

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (!result.plan) {
      throw new Error('No updated plan generated')
    }

    return {
      plan: result.plan,
      confidence: result.confidence || 0.8
    }
  } catch (error) {
    // Log error
    if (tracker) {
      await tracker.logError(error, 'gpt-4o', userFeedback)
    }

    console.error('[Plan Update] Error:', error)
    throw new Error(`Failed to update plan: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * GENERATE SQL FROM SIMPLE PLAN (Claude Code style)
 */
export async function generateSqlFromSimplePlan(
  question: string,
  plan: string,
  teamContext?: string,
  user?: UserContext
): Promise<{
  sql: string
  warnings: string[]
}> {
  const tracker = user
    ? new OpenAIUsageTracker(user, 'sql_generation', '/api/query-lab/gen-sql-from-plan')
    : null

  try {
    // Get schema context
    let schemaContext = SYSTEM_PROMPT.split('STAGE 1: REASONING PROCESS')[0]
    if (teamContext) {
      schemaContext += teamContext
    }

    const sqlPrompt = `Generate BigQuery SQL based on this plan:

Question: "${question}"

Plan:
${plan}

**CRITICAL INSTRUCTIONS:**
- Use ONLY these tables: \`gcpp-check.GI_publisher.pub_data\` and \`gcpp-check.GI_publisher.updated_product_name\`
- The table pub_data contains revenue data (rev column)
- To get product information, JOIN with updated_product_name table ON zid
- pub_data has these revenue-related columns: rev (revenue), paid (impressions), profit
- Always use fully qualified table names (project.dataset.table)
- For "products" the user means the 'product' column from updated_product_name table
- For "monthly" the user wants GROUP BY month
- For "revenue" use the 'rev' column

**EXAMPLE for "top N products by revenue with monthly breakdown":**
\`\`\`sql
WITH monthly_data AS (
  SELECT
    u.product,
    p.month,
    ROUND(SUM(p.rev)) AS monthly_rev
  FROM \`gcpp-check.GI_publisher.pub_data\` p
  LEFT JOIN \`gcpp-check.GI_publisher.updated_product_name\` u ON p.zid = u.zid
  WHERE p.year = 2025
  GROUP BY u.product, p.month
),
total_per_product AS (
  SELECT
    product,
    ROUND(SUM(monthly_rev)) AS total_rev
  FROM monthly_data
  GROUP BY product
),
top_products AS (
  SELECT product
  FROM total_per_product
  ORDER BY total_rev DESC
  LIMIT 5
)
SELECT
  md.product,
  md.month,
  md.monthly_rev
FROM monthly_data md
INNER JOIN top_products tp ON md.product = tp.product
ORDER BY md.product, md.month
\`\`\`

**EXAMPLE for "team-based queries":**
⚠️ CRITICAL: There is NO 'team' column in pub_data!
Team mappings come from Supabase and are provided in the context above.

WRONG approach:
\`\`\`sql
-- ❌ This will FAIL - 'team' column doesn't exist!
SELECT * FROM \`gcpp-check.GI_publisher.pub_data\`
WHERE team = 'WEB_GV'
\`\`\`

RIGHT approach - use PIC filter from team mappings:
\`\`\`sql
-- ✅ Correct - filter by PICs that belong to the team
SELECT
  p.pubname,
  SUM(p.rev) AS total_revenue
FROM \`gcpp-check.GI_publisher.pub_data\` p
WHERE p.pic IN ('VN_ngocth', 'VN_ngantt')  -- Team WEB_GV PICs
  AND p.year = 2025
GROUP BY p.pubname
\`\`\`

Always check the "TEAM DATA MAPPING" section above for current PIC assignments!

**EXAMPLE for "column name abbreviations" (COMMON ERROR):**
⚠️ CRITICAL: DO NOT abbreviate column names!

WRONG approach - using abbreviated column names:
\`\`\`sql
-- ❌ This will FAIL - 'mname' column doesn't exist!
SELECT
  p.mid,
  p.mname,  -- ❌ WRONG! No such column
  SUM(p.rev) AS revenue
FROM \`gcpp-check.GI_publisher.pub_data\` p
WHERE p.year = 2025
GROUP BY p.mid, p.mname
\`\`\`

RIGHT approach - using full column names:
\`\`\`sql
-- ✅ Correct - use full column name 'medianame'
SELECT
  p.mid,
  p.medianame,  -- ✅ RIGHT! Full column name
  SUM(p.rev) AS revenue
FROM \`gcpp-check.GI_publisher.pub_data\` p
WHERE p.year = 2025
GROUP BY p.mid, p.medianame
\`\`\`

Remember:
- Use 'medianame' NOT 'mname'
- Use 'pubname' NOT 'pname'
- Use 'zonename' NOT 'zname'
- Check the VALID COLUMN NAMES section above!

Follow the plan exactly and use the example structures above as reference. Return JSON: { "sql": "SELECT ...", "warnings": [] }
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: schemaContext + '\n\nYou are generating BigQuery SQL. Always use fully qualified table names. Return JSON format with "sql" and "warnings" fields.'
        },
        {
          role: 'user',
          content: sqlPrompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    // Log usage
    if (tracker) {
      await tracker.logUsage(response, plan)
    }

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (!result.sql) {
      throw new Error('No SQL generated')
    }

    // PRE-FIX: Fix common AI mistakes BEFORE validation
    let sql = result.sql

    // Fix p.total_xxx patterns that AI commonly generates
    const preFixes: [RegExp, string][] = [
      [/\bp\.total_revenue\b/gi, 'SUM(p.rev) as total_revenue'],
      [/\bp\.total_profit\b/gi, 'SUM(p.profit) as total_profit'],
      [/\bp\.total_impressions\b/gi, 'SUM(p.req) as total_impressions'],
      [/\bp\.total_requests\b/gi, 'SUM(p.req) as total_requests'],
      [/\bp\.total_paid\b/gi, 'SUM(p.paid) as total_paid'],
      [/\bp\.revenue\b/gi, 'p.rev'],
      [/\bp\.impressions\b/gi, 'p.req'],
      [/\bp\.requests\b/gi, 'p.req'],
    ]

    for (const [pattern, replacement] of preFixes) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0
      if (pattern.test(sql)) {
        console.log(`[SQL from Plan] Pre-fix: ${pattern.source} → ${replacement}`)
        pattern.lastIndex = 0 // Reset again before replace
        sql = sql.replace(pattern, replacement)
      }
    }

    // Update result.sql with pre-fixed version
    result.sql = sql

    // Validate and AUTO-FIX column names BEFORE executing
    const validation = validateColumnNames(sql)
    if (!validation.isValid) {
      console.log('[SQL from Plan] Auto-fixing invalid columns:', validation.invalidColumns.join(', '))

      // Auto-fix common column mistakes
      const columnFixes: Record<string, string> = {
        // Direct column mistakes
        'revenue': 'rev',
        'impressions': 'req',
        'requests': 'req',
        'mname': 'medianame',
        'pname': 'pubname',
        'zname': 'zonename',
        'mtype': 'product',
        'media_name': 'medianame',
        'pub_name': 'pubname',
        'zone_name': 'zonename'
      }

      // Try to fix each invalid column
      let fixedCount = 0
      for (const col of validation.invalidColumns) {
        const lowerCol = col.toLowerCase()

        // Check if it's an alias in SELECT (e.g., "SUM(rev) as total_revenue" - this is OK)
        const aliasPattern = new RegExp(`as\\s+${col}\\b`, 'gi')
        if (aliasPattern.test(sql)) {
          // This is just an alias, not an actual column reference - skip
          fixedCount++
          continue
        }

        // Check if we have a fix for this column
        if (columnFixes[lowerCol]) {
          const fix = columnFixes[lowerCol]
          // Replace the column name (careful with word boundaries)
          const regex = new RegExp(`\\b${col}\\b`, 'g')
          sql = sql.replace(regex, fix)
          fixedCount++
          console.log(`[SQL from Plan] Fixed: ${col} → ${fix}`)
        }
      }

      // Re-validate after fixes
      const revalidation = validateColumnNames(sql)
      if (!revalidation.isValid) {
        // Still invalid - throw error with helpful message
        const invalidCols = revalidation.invalidColumns.join(', ')
        const suggestions = revalidation.invalidColumns.map(col => {
          if (col === 'mname') return 'Did you mean "medianame"?'
          if (col === 'pname') return 'Did you mean "pubname"?'
          if (col === 'zname') return 'Did you mean "zonename"?'
          if (col === 'mtype') return 'Did you mean "product" from updated_product_name table?'
          if (col === 'quarter') return 'Column "quarter" does not exist. Calculate it: CEIL(month / 3)'
          return 'Check the VALID COLUMN NAMES section in the schema'
        }).join(' ')

        throw new Error(
          `Invalid column names detected: ${invalidCols}. ${suggestions}\n` +
          `Valid columns are: ${VALID_COLUMNS.pub_data.join(', ')} (pub_data) and ` +
          `${VALID_COLUMNS.updated_product_name.join(', ')} (updated_product_name)`
        )
      }

      // Update result.sql with fixed version
      result.sql = sql
      console.log('[SQL from Plan] Auto-fix successful!')
    }

    // Fire-and-forget: Store successful query in Supabase (non-blocking)
    feedbackLearningService.storeSuccessfulQuery(question, result.sql)
      .catch(err => console.warn('[SQL from Plan] Feedback store failed (non-blocking):', err?.message?.substring(0, 50)))

    return {
      sql: result.sql,
      warnings: result.warnings || []
    }
  } catch (error) {
    // Log error
    if (tracker) {
      await tracker.logError(error, 'gpt-4o', plan)
    }

    console.error('[SQL from Simple Plan] Error:', error)

    // Fire-and-forget: Store error in Supabase (non-blocking)
    feedbackLearningService.storeErrorCase(
      question,
      '',
      error instanceof Error ? error.message : String(error)
    ).catch(err => console.warn('[SQL from Plan] Feedback error store failed (non-blocking):', err?.message?.substring(0, 50)))

    throw new Error(`Failed to generate SQL: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * STEP 1: Generate reasoning breakdown only (no SQL yet)
 * This is the first step in the 2-step workflow
 * NOTE: This is the old complex version - use generateSimplePlan() for simpler UX
 */
export async function generateReasoningFromQuestion(
  question: string,
  teamContext?: string,
  conversationHistory?: string,
  user?: UserContext
): Promise<{
  reasoning: any
  understanding: {
    summary: string
    entities: string[]
    filters: string[]
    timeRange: string
    confidence: number
  }
}> {
  const tracker = user
    ? new OpenAIUsageTracker(user, 'reasoning', '/api/query-lab/reasoning')
    : null

  try {
    // Build system prompt for reasoning-only generation
    let systemPrompt = SYSTEM_PROMPT

    // Add instruction to return ONLY reasoning (no SQL)
    systemPrompt += `\n\n**IMPORTANT: For this request, return ONLY the reasoning and understanding objects. DO NOT generate SQL yet. The user will confirm the reasoning first, then request SQL generation in a separate step.**`

    if (teamContext) {
      systemPrompt += teamContext
    }
    if (conversationHistory) {
      systemPrompt += `\n\nCONVERSATION HISTORY (User feedback from previous iterations):\n${conversationHistory}`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    // Log usage
    if (tracker) {
      await tracker.logUsage(response, question)
    }

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (!result.reasoning || !result.understanding) {
      throw new Error('Invalid response from AI: missing reasoning or understanding')
    }

    return {
      reasoning: result.reasoning,
      understanding: {
        summary: result.understanding.summary || '',
        entities: result.understanding.entities || [],
        filters: result.understanding.filters || [],
        timeRange: result.understanding.timeRange || '',
        confidence: result.understanding.confidence || 0.5
      }
    }
  } catch (error) {
    // Log error
    if (tracker) {
      await tracker.logError(error, 'gpt-4o', question)
    }

    console.error('[AI Reasoning Generator] Error:', error)
    throw new Error(`Failed to generate reasoning: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Refine reasoning based on user feedback
 * This is used in the conversational feedback loop
 */
export async function refineReasoningWithFeedback(
  question: string,
  currentReasoning: any,
  stepNumber: 1 | 2 | 3 | 4,
  userFeedback: string,
  conversationHistory: string,
  user?: UserContext
): Promise<{
  reasoning: any
  aiResponse: string
  confidence: number
}> {
  const tracker = user
    ? new OpenAIUsageTracker(user, 'reasoning_refinement', '/api/query-lab/refine-reasoning')
    : null

  try {
    const stepNames = {
      1: 'Step 1: Understanding the Question',
      2: 'Step 2: Breaking Down the Logic',
      3: 'Step 3: Identifying Constraints',
      4: 'Step 4: Planning SQL Structure'
    }

    const refinementPrompt = `
You are refining the reasoning for a BigQuery SQL generation task.

**Original Question:** ${question}

**Current Reasoning (all 4 steps):**
${JSON.stringify(currentReasoning, null, 2)}

**User Feedback on ${stepNames[stepNumber]}:**
"${userFeedback}"

**Conversation History:**
${conversationHistory}

**Your Task:**
1. Acknowledge the user's feedback
2. Explain what you will change in ${stepNames[stepNumber]}
3. Return the COMPLETE refined reasoning (all 4 steps, with changes applied to step ${stepNumber})

**IMPORTANT: Return your response as a JSON object with the following structure:**

**Output JSON Format:**
{
  "aiResponse": "I understand your feedback. I will adjust step ${stepNumber} by...",
  "reasoning": {
    "step1_understanding": { ... },
    "step2_breakdown": { ... },
    "step3_constraints": { ... },
    "step4_sql_plan": { ... }
  },
  "confidence": 0.0-1.0
}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that refines SQL reasoning based on user feedback.'
        },
        {
          role: 'user',
          content: refinementPrompt
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    // Log usage
    if (tracker) {
      await tracker.logUsage(response, userFeedback)
    }

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (!result.reasoning || !result.aiResponse) {
      throw new Error('Invalid refinement response from AI')
    }

    return {
      reasoning: result.reasoning,
      aiResponse: result.aiResponse,
      confidence: result.confidence || 0.7
    }
  } catch (error) {
    // Log error
    if (tracker) {
      await tracker.logError(error, 'gpt-4o', userFeedback)
    }

    console.error('[AI Reasoning Refiner] Error:', error)
    throw new Error(`Failed to refine reasoning: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * STEP 2: Generate SQL from confirmed reasoning
 * This is the second step in the 2-step workflow
 */
export async function generateSqlFromReasoning(
  question: string,
  confirmedReasoning: any,
  teamContext?: string,
  user?: UserContext
): Promise<{
  sql: string
  warnings: string[]
}> {
  const tracker = user
    ? new OpenAIUsageTracker(user, 'sql_generation', '/api/query-lab/gen-sql-from-reasoning')
    : null

  try {
    const sqlGenerationPrompt = `
You are a BigQuery SQL expert. The user has confirmed the following reasoning breakdown for their question. Now generate the SQL based on this confirmed reasoning.

**Question:** ${question}

**Confirmed Reasoning:**
${JSON.stringify(confirmedReasoning, null, 2)}

**Your Task:**
Generate ONLY the SQL query based on the confirmed reasoning above. Follow the SQL plan exactly as specified in step 4.

**IMPORTANT: Return your response as a JSON object with the following structure:**

**Output JSON Format:**
{
  "sql": "WITH ... SELECT ...",
  "warnings": []
}
`

    // Get schema context (don't need full reasoning prompt anymore)
    let schemaContext = SYSTEM_PROMPT.split('STAGE 1: REASONING PROCESS')[0] // Get only schema part
    if (teamContext) {
      schemaContext += teamContext
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: schemaContext
        },
        {
          role: 'user',
          content: sqlGenerationPrompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    // Log usage
    if (tracker) {
      await tracker.logUsage(response, question)
    }

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (!result.sql) {
      throw new Error('Invalid response from AI: missing SQL')
    }

    // Fire-and-forget: Store in Supabase (non-blocking)
    feedbackLearningService.storeSuccessfulQuery(question, result.sql)
      .catch(err => console.warn('[AI SQL Generator] Feedback store failed (non-blocking):', err?.message?.substring(0, 50)))

    return {
      sql: result.sql,
      warnings: result.warnings || []
    }
  } catch (error) {
    // Log error
    if (tracker) {
      await tracker.logError(error, 'gpt-4o', question)
    }

    console.error('[AI SQL Generator from Reasoning] Error:', error)

    // Fire-and-forget: Store error in Supabase (non-blocking)
    feedbackLearningService.storeErrorCase(
      question,
      '',
      error instanceof Error ? error.message : String(error)
    ).catch(err => console.warn('[AI SQL Generator] Feedback error store failed (non-blocking):', err?.message?.substring(0, 50)))

    throw new Error(`Failed to generate SQL from reasoning: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ============================================================================
// KNOWLEDGE GRAPH ENHANCED SQL GENERATION
// ============================================================================

/**
 * Build a dynamic prompt using Knowledge Graph context
 * This replaces the 630-line hardcoded SYSTEM_PROMPT with relevant context only
 */
function buildKGEnhancedPrompt(kgContext: AIContext, question: string): string {
  const parts: string[] = []

  parts.push(`You are a BigQuery SQL expert for the GCPP-Check analytics platform.

**CRITICAL: LANGUAGE DETECTION**
Detect the language of the user's question and ALWAYS respond in the SAME language.

**USER QUESTION:** "${question}"

**KNOWLEDGE GRAPH CONTEXT:**
${kgContext.prompt_context}

**YOUR TASK:**
1. Use the detected concepts and schema above to generate SQL
2. Follow the suggested patterns if applicable
3. Apply business rules where relevant
4. Learn from similar examples

**OUTPUT FORMAT:**
Return a JSON object with:
{
  "reasoning": {
    "step1_understanding": { "question_type": "...", "entities": [...], "time_periods": [...], "key_insight": "..." },
    "step2_breakdown": { "logic_steps": [...], "set_operations": "..." },
    "step3_constraints": { "needs_join": true/false, "date_range": "...", "null_handling": "..." },
    "step4_sql_plan": { "structure": "...", "ctes": [...], "main_select": "...", "order_by": "..." }
  },
  "understanding": { "summary": "...", "entities": [...], "filters": [...], "timeRange": "...", "confidence": 0.0-1.0 },
  "sql": "SELECT ...",
  "warnings": []
}`)

  // Add BigQuery-specific constraints
  parts.push(`

**BIGQUERY CONSTRAINTS:**
- Use backticks for table names: \`gcpp-check.GI_publisher.pub_data\`
- Use SAFE_DIVIDE for division: SAFE_DIVIDE(a, b)
- Date functions: DATE_TRUNC(date, WEEK/MONTH), DATE_SUB(date, INTERVAL n DAY)
- NULL handling: COALESCE(), NULLIF()
- No tuple IN subqueries: (col1, col2) IN (...) is NOT supported
`)

  return parts.join('\n')
}

/**
 * Generate SQL using Knowledge Graph enhanced context
 * This is the new preferred method that uses dynamic context instead of hardcoded prompts
 */
export async function generateSqlWithKnowledgeGraph(
  question: string,
  options: {
    teamContext?: string
    conversationHistory?: string
    user?: UserContext
    useKG?: boolean
  } = {}
): Promise<{
  reasoning: any
  understanding: any
  sql: string
  warnings: string[]
  kgContext?: AIContext
}> {
  const { teamContext, conversationHistory, user, useKG = true } = options

  // Initialize tracker
  const tracker = user
    ? new OpenAIUsageTracker(user, 'kg_sql_generation', '/api/query-lab/generate-sql')
    : null

  try {
    let systemPrompt: string
    let kgContext: AIContext | undefined

    if (useKG) {
      // Build Knowledge Graph context
      console.log('[KG SQL Generator] Building KG context for question:', question.substring(0, 50))
      kgContext = await knowledgeGraph.buildAIContext(question)

      // Build dynamic prompt
      systemPrompt = buildKGEnhancedPrompt(kgContext, question)
      console.log('[KG SQL Generator] KG context built:', {
        concepts: kgContext.concepts.length,
        tables: kgContext.schema.tables.length,
        patterns: kgContext.patterns.length,
        examples: kgContext.examples.length
      })
    } else {
      // Fallback to original prompt
      systemPrompt = SYSTEM_PROMPT
    }

    // Add team context if provided
    if (teamContext) {
      systemPrompt += `\n\n**TEAM CONTEXT:**\n${teamContext}`
    }

    // Add conversation history if provided
    if (conversationHistory) {
      systemPrompt += `\n\n**PREVIOUS CONVERSATION:**\n${conversationHistory}`
    }

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate SQL for: "${question}"` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    // Log usage
    if (tracker) {
      await tracker.logUsage(response, question)
    }

    const result = JSON.parse(response.choices[0].message.content || '{}')

    if (!result.sql) {
      throw new Error('Invalid response from AI: missing SQL')
    }

    // Validate column names
    const validation = validateColumnNames(result.sql)
    if (!validation.isValid) {
      console.warn('[KG SQL Generator] Invalid columns detected:', validation.invalidColumns)
      result.warnings = result.warnings || []
      result.warnings.push(`Warning: Potentially invalid columns: ${validation.invalidColumns.join(', ')}`)
    }

    // Apply learned rules from feedbackLearningService
    const { sql: fixedSql, appliedRules } = await feedbackLearningService.applyLearnedRules(result.sql)
    if (appliedRules.length > 0) {
      console.log('[KG SQL Generator] Applied learned rules:', appliedRules)
      result.sql = fixedSql
    }

    // Store successful query in Knowledge Graph (non-blocking)
    if (useKG && kgContext) {
      knowledgeGraph.storeExample(question, result.sql, {
        language: detectLanguage(question),
        tables_used: kgContext.schema.tables.map(t => t.name),
        concepts_used: kgContext.concepts.map(c => c.concept.id),
        patterns_used: kgContext.patterns.map(p => p.id),
        feedback_type: 'auto_success',
        user_id: user?.userId
      }).catch(err => console.warn('[KG] Store example failed (non-blocking):', err?.message?.substring(0, 50)))

      // Update pattern metrics
      for (const pattern of kgContext.patterns) {
        knowledgeGraph.updatePatternMetrics(pattern.id, true).catch(() => {})
      }
    }

    // Also store in feedbackLearningService (non-blocking)
    feedbackLearningService.storeSuccessfulQuery(question, result.sql)
      .catch(err => console.warn('[KG SQL Generator] Feedback store failed (non-blocking):', err?.message?.substring(0, 50)))

    return {
      reasoning: result.reasoning || {},
      understanding: result.understanding || {},
      sql: result.sql,
      warnings: result.warnings || [],
      kgContext
    }

  } catch (error) {
    // Log error
    if (tracker) {
      await tracker.logError(error, 'gpt-4o', question)
    }

    console.error('[KG SQL Generator] Error:', error)

    // Store error case (non-blocking)
    feedbackLearningService.storeErrorCase(
      question,
      '',
      error instanceof Error ? error.message : String(error)
    ).catch(err => console.warn('[KG SQL Generator] Error store failed (non-blocking):', err?.message?.substring(0, 50)))

    throw new Error(`Failed to generate SQL with KG: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Simple language detection based on characters
 */
function detectLanguage(text: string): string {
  // Vietnamese characters
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text)) {
    return 'vi'
  }
  // Japanese characters
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    return 'jp'
  }
  // Indonesian common words
  if (/\b(dan|yang|untuk|dengan|ini|itu|dari|pada|adalah|ke|di)\b/i.test(text)) {
    return 'id'
  }
  // Default to English
  return 'en'
}

/**
 * Get Knowledge Graph context for a question (for debugging/analysis)
 */
export async function getKGContextForQuestion(question: string): Promise<AIContext> {
  return knowledgeGraph.buildAIContext(question)
}

// ============================================================================
// TIERED SQL GENERATION (Cost Optimized)
// ============================================================================

import { conversationMemory, type ConversationContext } from './conversationMemoryService'

export interface TieredGenerationResult {
  sql: string
  warnings: string[]
  source: 'refined' | 'generated'
  model: string
  questionType: 'follow_up' | 'new_topic'
  confidence?: number
  changes?: string[]
  reasoning?: any
  understanding?: any
  kgContext?: AIContext
}

/**
 * Generate SQL with tiered strategy based on conversation context
 *
 * TIER 1 (Follow-up): Use gpt-4o-mini to refine previous SQL (~$0.0001/call)
 * TIER 2 (New topic): Use gpt-4o with minimal context (~$0.0075/call)
 *
 * This can reduce costs by 60-80% depending on follow-up ratio
 */
export async function generateSqlWithTieredStrategy(
  question: string,
  options: {
    sessionId?: string
    teamContext?: string
    conversationHistory?: string
    user?: UserContext
    useKG?: boolean
  } = {}
): Promise<TieredGenerationResult> {
  const { sessionId, teamContext, conversationHistory, user, useKG = true } = options

  // Get conversation context if sessionId provided
  let context: ConversationContext | null = null
  if (sessionId) {
    context = await conversationMemory.getConversationContext(sessionId, 5)
  }

  // Detect question type
  let questionType: 'follow_up' | 'new_topic' = 'new_topic'
  let detectionConfidence = 1.0  // Default for no context case

  if (context && context.hasContext && context.lastSqlMessage) {
    const detection = await conversationMemory.detectQuestionType(question, context, user)
    questionType = detection.type
    detectionConfidence = detection.confidence

    console.log(`[Tiered SQL] Question type: ${questionType} (confidence: ${detection.confidence}, reason: ${detection.reason})`)

    // TIER 1: Follow-up refinement using gpt-4o-mini
    if (questionType === 'follow_up') {
      try {
        // Find the previous user question
        const previousUserMessages = context.messages.filter(m => m.role === 'user')
        const previousQuestion = previousUserMessages[previousUserMessages.length - 1]?.content || ''

        const refinementResult = await conversationMemory.refineSqlFromContext(
          question,
          previousQuestion,
          context.lastSqlMessage.sql!,
          user
        )

        console.log(`[Tiered SQL] Used refinement mode - ${refinementResult.changes.length} changes`)

        return {
          sql: refinementResult.sql,
          warnings: [],
          source: 'refined',
          model: refinementResult.model,
          questionType: 'follow_up',
          confidence: detectionConfidence,
          changes: refinementResult.changes
        }
      } catch (error) {
        console.warn('[Tiered SQL] Refinement failed, falling back to full generation:', error)
        // Fall through to full generation
        questionType = 'new_topic'
      }
    }
  }

  // TIER 2: Full generation with optimized context
  console.log(`[Tiered SQL] Using full generation mode`)

  const result = await generateSqlWithKnowledgeGraph(question, {
    teamContext,
    conversationHistory: context ? conversationMemory.buildConversationSummary(context) : conversationHistory,
    user,
    useKG
  })

  return {
    sql: result.sql,
    warnings: result.warnings,
    source: 'generated',
    model: 'gpt-4o',
    questionType: questionType,
    confidence: detectionConfidence,
    reasoning: result.reasoning,
    understanding: result.understanding,
    kgContext: result.kgContext
  }
}

/**
 * Simplified wrapper that auto-detects session from conversation history
 * For backward compatibility with existing code
 */
export async function generateSqlSmart(
  question: string,
  sessionId?: string,
  teamContext?: string,
  user?: UserContext
): Promise<{
  sql: string
  warnings: string[]
  source: string
  model: string
}> {
  const result = await generateSqlWithTieredStrategy(question, {
    sessionId,
    teamContext,
    user,
    useKG: true
  })

  return {
    sql: result.sql,
    warnings: result.warnings,
    source: result.source,
    model: result.model
  }
}
