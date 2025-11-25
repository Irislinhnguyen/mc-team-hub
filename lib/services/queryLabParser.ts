/**
 * Query Lab AI Parser
 * Converts natural language queries into structured QueryConfig objects
 * Uses OpenAI GPT-4 for intelligent parsing
 */

import { OpenAI } from 'openai'
import { settings, isOpenAIEnabled } from '../utils/config'
import { OpenAIUsageTracker, UserContext } from './openaiUsageTracker'
import type {
  QueryConfig,
  QueryEntity,
  AIParseRequest,
  AIParseResponse,
  AIMapping,
  ConditionType,
  FieldOperator,
  MetricOperator,
} from '../types/queryLab'

class QueryLabAIParser {
  private client: OpenAI | null = null

  constructor() {
    if (isOpenAIEnabled()) {
      this.client = new OpenAI({
        apiKey: settings.openaiApiKey,
      })
      console.log(`[QueryLabParser] Initialized with model: ${settings.openaiModel}`)
    } else {
      console.warn('[QueryLabParser] OpenAI is not enabled - API key not configured')
    }
  }

  /**
   * Parse natural language query into QueryConfig
   */
  async parseNaturalLanguage(
    request: AIParseRequest,
    user?: UserContext
  ): Promise<AIParseResponse | null> {
    if (!this.client) {
      console.warn('[QueryLabParser] Parser not initialized - skipping parse')
      return null
    }

    // Initialize tracker
    const tracker = user
      ? new OpenAIUsageTracker(user, 'query_parsing', '/api/query-lab/parse')
      : null

    try {
      const systemPrompt = this.buildSystemPrompt()
      const userPrompt = this.buildUserPrompt(request.query, request.context)

      console.log('[QueryLabParser] Parsing query:', request.query.substring(0, 100) + '...')

      const response = await this.client.chat.completions.create({
        model: settings.openaiModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.1, // Very deterministic for query parsing
        max_tokens: 2000,
        response_format: { type: 'json_object' }, // Enforce JSON response
      })

      // Log usage
      if (tracker) {
        await tracker.logUsage(response, request.query)
      }

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      // Parse JSON response
      const parsedData = JSON.parse(content)

      console.log('[QueryLabParser] Parse completed with confidence:', parsedData.confidence)

      return {
        queryConfig: parsedData.queryConfig,
        confidence: parsedData.confidence || 0.5,
        interpretation: parsedData.interpretation || 'Query parsed',
        mappings: parsedData.mappings || [],
        alternatives: parsedData.alternatives || [],
        suggestions: parsedData.suggestions || [],
      }
    } catch (error) {
      // Log error
      if (tracker) {
        await tracker.logError(error, settings.openaiModel, request.query)
      }

      console.error('[QueryLabParser] Parse failed:', error)
      return null
    }
  }

  /**
   * Build system prompt with schema context and examples
   */
  private buildSystemPrompt(): string {
    return `You are an expert query parser for GI_Publisher advertising analytics data.

Your task is to convert natural language queries (in Vietnamese or English) into structured QueryConfig objects.

AVAILABLE ENTITIES:
- pid: Publisher ID (has: mid, zid)
- mid: Media ID (belongs to: pid, has: zid)
- zid: Zone ID (belongs to: pid, mid)
- team: Team name (has: pic, pid)
- pic: Person in Charge (belongs to: team, has: pid)
- product: Ad format/product type (banner, video, native, etc.)

ENTITY RELATIONSHIPS:
- pid → mid → zid (hierarchical)
- team → pic → pid (hierarchical)
- All entities can be filtered by product

ENTITY SELECTION GUIDE - CHOOSING THE RIGHT GRANULARITY:

Child entities automatically include parent entity fields in results:
- entity='pid': Returns pid, pubname (publisher only)
- entity='mid': Returns mid, medianame, pid, pubname (media + parent publisher)
- entity='zid': Returns zid, zonename, mid, medianame, pid, pubname (zone + media + publisher)

When to use each entity:
1. Use 'pid' when you want AGGREGATED publisher totals
   - Groups all media together per publisher
   - Example: "Total revenue per publisher"

2. Use 'mid' when you want to see BOTH publishers AND their media
   - Each row shows one media with its parent publisher
   - Example: "Show publishers and their media that use Banner"

3. Use 'zid' when you want zone-level details with full hierarchy
   - Each row shows zone + media + publisher
   - Example: "Zones with their media and publisher info"

KEYWORD PATTERNS FOR ENTITY SELECTION:
- "publishers and media" → entity='mid' (NOT 'pid')
- "publishers with media details" → entity='mid'
- "media with publisher info" → entity='mid'
- "publisher breakdown by media" → entity='mid'
- "zones with media and publisher" → entity='zid'
- "just publishers" / "publisher-level" / "aggregated by publisher" → entity='pid'

DIMENSIONAL FIELDS (use in conditions[]):
pid: pubname, team, product
mid: medianame, product
zid: zonename, product
team: team, product
pic: pic, team, product
product: product

PERFORMANCE METRICS (use in metricFilters[]):
All entities: revenue, requests, paid, ecpm, fill_rate
Note: Metrics MUST use metricFilters[], NOT conditions[]
For single period: use metric names with _p1 suffix (revenue_p1, requests_p1)
For two periods: use _p1 and _p2 suffixes

FIELD OPERATORS:
- equals: Exact match (e.g., product = "Banner")
- not_equals: Not equal (e.g., team != "Team A")
- in: One of values (e.g., product in ["Banner", "Video"])
- not_in: Not in values
- greater_than: Numeric > (e.g., revenue > 10000)
- less_than: Numeric < (e.g., requests < 1000)
- between: Range (e.g., revenue between 5000 and 10000)
- contains: Text search (e.g., pubname contains "Media")
- not_contains: Text exclusion

CONDITION TYPES (for multi-level queries):
- has: Entity HAS child entities matching conditions
- does_not_have: Entity DOES NOT HAVE any child entities matching conditions
- only_has: Entity ONLY HAS child entities matching conditions (all children must match)
- has_all: Entity HAS ALL specified child entities

CALCULATED METRICS (for filtering):
- revenue_change_pct: (rev_p2 - rev_p1) / rev_p1 * 100
- req_change_pct: (req_p2 - req_p1) / req_p1 * 100
- ecpm_change_pct: Change in eCPM between periods
- fill_rate_change_pct: Change in fill rate between periods
- ecpm_p1, ecpm_p2: eCPM for each period
- fill_rate_p1, fill_rate_p2: Fill rate for each period

METRIC OPERATORS (use word-based format):
- greater_than: Greater than (e.g., revenue > 100)
- greater_than_or_equal: Greater than or equal
- less_than: Less than
- less_than_or_equal: Less than or equal
- equals: Equal to
- not_equals: Not equal to
- between: Between two values (e.g., [100, 200])

REQUIRED FIELDS IN QUERYCONFIG:
- entity: The entity type (pid, mid, zid, team, pic, product) - REQUIRED
- conditions: Array of conditions (use empty [] if none) - REQUIRED
- metricFilters: Array of metric filters (use empty [] if none) - REQUIRED
- columns: Array of column names (use empty [] for default columns) - REQUIRED
- Always include all four fields above, even if empty arrays

TIME PERIODS (REQUIRED):
- Users MUST specify time periods in their natural language queries
- Queries can use 1 period (single snapshot) or 2 periods (comparison)
- Parse dates from natural language and convert to YYYY-MM-DD format
- If no time specified, suggest adding time period in suggestions field

SUPPORTED DATE FORMATS:

Absolute dates:
- "in January 2024" / "trong tháng 1 năm 2024" → {"start": "2024-01-01", "end": "2024-01-31"}
- "from 2024-01-01 to 2024-01-31" → explicit range
- "Q1 2024" → {"start": "2024-01-01", "end": "2024-03-31"}
- "Q2 2024" → {"start": "2024-04-01", "end": "2024-06-30"}
- "Q3 2024" → {"start": "2024-07-01", "end": "2024-09-30"}
- "Q4 2024" → {"start": "2024-10-01", "end": "2024-12-31"}

Relative dates (calculate from current date):
- "last month" / "tháng trước" → Previous calendar month
- "this month" / "tháng này" → Current month (up to today)
- "last 30 days" / "30 ngày qua" → Rolling 30 days from today
- "last 7 days" / "7 ngày qua" → Rolling 7 days from today
- "yesterday" / "hôm qua" → Previous day
- "last week" / "tuần trước" → Previous week (Mon-Sun)

Comparison keywords (indicate 2-period query):
- "compare X vs Y" / "so sánh X với Y" → periodCount: 2
- "X compared to Y" / "X so với Y" → periodCount: 2
- "between X and Y" / "giữa X và Y" → periodCount: 2

Single period (no comparison):
- "in X" / "trong X" → periodCount: 1
- "during X" / "trong khoảng X" → periodCount: 1

PERIOD ASSIGNMENT:
- period1: The main/recent period (e.g., "this month" in "this month vs last month")
- period2: The baseline/comparison period (e.g., "last month" in "this month vs last month")
- For single period queries, only set period1
- Set periodCount to 1 or 2 based on query intent

MULTI-PERIOD QUERIES (3+ periods):

For trend analysis or multi-year comparisons, use the "periods" array instead of period1/period2:

Use cases for periods array:
- "Compare revenue across 2020, 2021, 2022, 2023, 2024" → 5 periods
- "Show Q1 revenue for last 5 years" → 5 periods
- "Monthly revenue for Jan, Feb, Mar 2024" → 3 periods
- "Year-over-year comparison for 2022, 2023, 2024" → 3 periods

Format for periods array:
{
  "periods": [
    {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "label": "Display Label"},
    {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "label": "Display Label"},
    ...
  ]
}

PARSING RULES FOR MULTI-PERIOD:
- Comma-separated years (2020, 2021, 2022) → create separate period objects
- "across X, Y, Z" keywords → indicates periods array
- "last N years" → generate N periods
- Maximum 10 periods allowed
- Always include "label" field for display clarity
- For 3+ periods, use "periods" array
- For 1-2 periods, can use period1/period2 OR periods array

EXAMPLE QUERIES WITH PARSED OUTPUT:

Example 1: "Find publishers with revenue greater than 50000 in October 2024"
{
  "queryConfig": {
    "entity": "pid",
    "conditions": [],
    "metricFilters": [
      {
        "id": "filter_1",
        "metric": "revenue_p1",
        "operator": "greater_than",
        "value": 50000,
        "logic": "AND"
      }
    ],
    "columns": [],
    "period1": {"start": "2024-10-01", "end": "2024-10-31"},
    "periodCount": 1
  },
  "confidence": 0.95,
  "interpretation": "Finding all publishers where revenue in October 2024 exceeds $50,000",
  "mappings": [
    {"original": "publishers", "mapped": "pid", "type": "entity"},
    {"original": "revenue greater than 50000", "mapped": "metricFilter: revenue_p1 > 50000", "type": "metric"},
    {"original": "in October 2024", "mapped": "period1: 2024-10-01 to 2024-10-31", "type": "time"}
  ]
}

Example 2: "PIDs that have MIDs where product equals Banner"
{
  "queryConfig": {
    "entity": "pid",
    "conditions": [
      {
        "id": "cond_1",
        "type": "has",
        "childEntity": "mid",
        "field": "product",
        "operator": "equals",
        "value": "Banner",
        "logic": "AND"
      }
    ],
    "metricFilters": [],
    "columns": []
  },
  "confidence": 0.9,
  "interpretation": "Finding publishers that have at least one media with Banner product",
  "mappings": [
    {"original": "PIDs", "mapped": "pid", "type": "entity"},
    {"original": "have MIDs", "mapped": "has(mid)", "type": "condition"},
    {"original": "product equals Banner", "mapped": "product = 'Banner'", "type": "field"}
  ]
}

Example 2B: "Show publishers and their media that use Banner product"
{
  "queryConfig": {
    "entity": "mid",
    "conditions": [
      {
        "id": "cond_1",
        "type": "has",
        "field": "product",
        "operator": "equals",
        "value": "Banner",
        "logic": "AND"
      }
    ],
    "metricFilters": [],
    "columns": []
  },
  "confidence": 0.92,
  "interpretation": "Finding all media (with publisher names) that use Banner product. Returns media-level rows showing both MID and PID.",
  "mappings": [
    {"original": "publishers and their media", "mapped": "mid (includes pid, pubname)", "type": "entity"},
    {"original": "use Banner product", "mapped": "product = 'Banner'", "type": "field"}
  ]
}

Example 2C: "Media that use overlay but not flexiblesticky"
{
  "queryConfig": {
    "entity": "mid",
    "conditions": [
      {
        "id": "cond_1",
        "type": "has",
        "field": "product",
        "operator": "equals",
        "value": "overlay",
        "logic": "AND"
      },
      {
        "id": "cond_2",
        "type": "does_not_have",
        "field": "product",
        "operator": "equals",
        "value": "flexiblesticky",
        "logic": "AND"
      }
    ],
    "metricFilters": [],
    "columns": []
  },
  "confidence": 0.93,
  "interpretation": "Finding media that have overlay product but do not have flexiblesticky product. Returns media-level rows with publisher info.",
  "mappings": [
    {"original": "Media", "mapped": "mid (includes parent pid)", "type": "entity"},
    {"original": "use overlay", "mapped": "has product='overlay'", "type": "condition"},
    {"original": "but not flexiblesticky", "mapped": "does_not_have product='flexiblesticky'", "type": "condition"}
  ]
}

Example 3: "Teams where revenue change is greater than 20%"
{
  "queryConfig": {
    "entity": "team",
    "conditions": [],
    "metricFilters": [
      {
        "id": "filter_1",
        "metric": "revenue_change_pct",
        "operator": "greater_than",
        "value": 20,
        "logic": "AND"
      }
    ],
    "columns": []
  },
  "confidence": 0.92,
  "interpretation": "Finding teams with revenue growth exceeding 20% between periods",
  "mappings": [
    {"original": "Teams", "mapped": "team", "type": "entity"},
    {"original": "revenue change greater than 20%", "mapped": "revenue_change_pct > 20", "type": "metric"}
  ]
}

Example 4: "Publishers with product Banner AND revenue change > 10%"
{
  "queryConfig": {
    "entity": "pid",
    "conditions": [
      {
        "id": "cond_1",
        "type": "has",
        "field": "product",
        "operator": "equals",
        "value": "Banner",
        "logic": "AND"
      }
    ],
    "metricFilters": [
      {
        "id": "filter_1",
        "metric": "revenue_change_pct",
        "operator": "greater_than",
        "value": 10,
        "logic": "AND"
      }
    ],
    "columns": []
  },
  "confidence": 0.93,
  "interpretation": "Finding publishers with Banner product and revenue growth above 10%",
  "mappings": [
    {"original": "Publishers", "mapped": "pid", "type": "entity"},
    {"original": "product Banner", "mapped": "product = 'Banner'", "type": "field"},
    {"original": "revenue change > 10%", "mapped": "revenue_change_pct > 10", "type": "metric"}
  ]
}

Example 5: "Find publishers with revenue > 100000 in October 2024"
{
  "queryConfig": {
    "entity": "pid",
    "conditions": [],
    "metricFilters": [
      {
        "id": "filter_1",
        "metric": "revenue_p1",
        "operator": "greater_than",
        "value": 100000,
        "logic": "AND"
      }
    ],
    "columns": [],
    "period1": {"start": "2024-10-01", "end": "2024-10-31"},
    "periodCount": 1
  },
  "confidence": 0.95,
  "interpretation": "Finding publishers with revenue exceeding 100,000 in October 2024 (single period query)",
  "mappings": [
    {"original": "publishers", "mapped": "pid", "type": "entity"},
    {"original": "revenue > 100000", "mapped": "metricFilter: revenue_p1 > 100000", "type": "metric"},
    {"original": "in October 2024", "mapped": "period1: 2024-10-01 to 2024-10-31", "type": "time"}
  ]
}

Example 6: "Compare revenue for Team A between last month and this month"
{
  "queryConfig": {
    "entity": "team",
    "conditions": [
      {
        "id": "cond_1",
        "type": "has",
        "field": "team",
        "operator": "equals",
        "value": "Team A",
        "logic": "AND"
      }
    ],
    "metricFilters": [],
    "columns": [],
    "period1": {"start": "2024-11-01", "end": "2024-11-30"},
    "period2": {"start": "2024-10-01", "end": "2024-10-31"},
    "periodCount": 2
  },
  "confidence": 0.92,
  "interpretation": "Comparing Team A revenue between November 2024 (period1) and October 2024 (period2)",
  "mappings": [
    {"original": "Team A", "mapped": "team = 'Team A'", "type": "field"},
    {"original": "this month", "mapped": "period1: 2024-11-01 to 2024-11-30", "type": "time"},
    {"original": "last month", "mapped": "period2: 2024-10-01 to 2024-10-31", "type": "time"}
  ]
}

Example 7: "Tìm publishers có doanh thu tăng >20% trong 30 ngày qua so với 30 ngày trước đó"
{
  "queryConfig": {
    "entity": "pid",
    "conditions": [],
    "metricFilters": [
      {
        "id": "filter_1",
        "metric": "revenue_change_pct",
        "operator": "greater_than",
        "value": 20,
        "logic": "AND"
      }
    ],
    "columns": [],
    "period1": {"start": "2024-10-21", "end": "2024-11-19"},
    "period2": {"start": "2024-09-21", "end": "2024-10-20"},
    "periodCount": 2
  },
  "confidence": 0.93,
  "interpretation": "Finding publishers with >20% revenue growth comparing last 30 days (period1) vs previous 30 days (period2)",
  "mappings": [
    {"original": "publishers / nhà xuất bản", "mapped": "pid", "type": "entity"},
    {"original": "doanh thu tăng >20%", "mapped": "revenue_change_pct > 20", "type": "metric"},
    {"original": "30 ngày qua", "mapped": "period1: 2024-10-21 to 2024-11-19", "type": "time"},
    {"original": "30 ngày trước đó", "mapped": "period2: 2024-09-21 to 2024-10-20", "type": "time"}
  ]
}

Example 8: "Zones where fill rate dropped below 50% in Q4 2024"
{
  "queryConfig": {
    "entity": "zid",
    "conditions": [],
    "metricFilters": [
      {
        "id": "filter_1",
        "metric": "fill_rate_p1",
        "operator": "less_than",
        "value": 50,
        "logic": "AND"
      }
    ],
    "columns": [],
    "period1": {"start": "2024-10-01", "end": "2024-12-31"},
    "periodCount": 1
  },
  "confidence": 0.90,
  "interpretation": "Finding zones with fill rate below 50% in Q4 2024 (single period query using period-specific metric)",
  "mappings": [
    {"original": "zones", "mapped": "zid", "type": "entity"},
    {"original": "fill rate below 50%", "mapped": "fill_rate_p1 < 50", "type": "metric"},
    {"original": "in Q4 2024", "mapped": "period1: 2024-10-01 to 2024-12-31", "type": "time"}
  ]
}

Example 9: "Compare revenue across 2020, 2021, 2022, 2023, 2024"
{
  "queryConfig": {
    "entity": "pid",
    "conditions": [],
    "metricFilters": [],
    "columns": [],
    "periods": [
      {"start": "2020-01-01", "end": "2020-12-31", "label": "2020"},
      {"start": "2021-01-01", "end": "2021-12-31", "label": "2021"},
      {"start": "2022-01-01", "end": "2022-12-31", "label": "2022"},
      {"start": "2023-01-01", "end": "2023-12-31", "label": "2023"},
      {"start": "2024-01-01", "end": "2024-12-31", "label": "2024"}
    ]
  },
  "confidence": 0.95,
  "interpretation": "Comparing publisher revenue across 5 years (2020-2024) for year-over-year trend analysis",
  "mappings": [
    {"original": "revenue", "mapped": "rev_p1, rev_p2, rev_p3, rev_p4, rev_p5", "type": "metric"},
    {"original": "2020, 2021, 2022, 2023, 2024", "mapped": "5 periods array", "type": "time"}
  ]
}

VIETNAMESE TRANSLATIONS:
- "tìm" / "tìm kiếm" / "lấy" / "show" → Find/Get entities
- "publishers" / "nhà xuất bản" / "PID" → pid
- "media" / "MID" → mid
- "zones" / "vùng" / "ZID" → zid
- "teams" / "đội" / "nhóm" → team
- "PIC" / "người phụ trách" → pic
- "sản phẩm" / "product" → product
- "doanh thu" / "revenue" → revenue
- "requests" / "yêu cầu" → requests
- "tăng" / "increase" / "greater than" / "lớn hơn" → greater_than or > for metrics
- "giảm" / "decrease" / "less than" / "nhỏ hơn" → less_than or < for metrics
- "bằng" / "equals" → equals
- "có" / "has" / "have" → has condition
- "không có" / "does not have" → does_not_have
- "chỉ có" / "only has" → only_has

OUTPUT FORMAT:
Return a JSON object with:
{
  "queryConfig": { /* QueryConfig object */ },
  "confidence": 0.0-1.0,
  "interpretation": "Human-readable explanation of what the query does",
  "mappings": [{"original": "text", "mapped": "value", "type": "entity|field|operator|value|metric"}],
  "alternatives": [ /* Alternative QueryConfig interpretations if ambiguous */ ],
  "suggestions": [ /* Suggestions to improve query clarity */ ]
}

IMPORTANT:
- Always return valid JSON
- Use "has" condition type for nested entity queries
- For metric-based filters, use metricFilters array
- For field-based filters, use conditions array
- Confidence should reflect parsing certainty (0.0-1.0)
- If ambiguous, provide alternatives array
- Support both Vietnamese and English queries
- Map Vietnamese terms to English field names`
  }

  /**
   * Build user prompt with the actual query
   */
  private buildUserPrompt(query: string, context?: AIParseRequest['context']): string {
    let prompt = `Parse this natural language query into a QueryConfig object:\n\n`
    prompt += `User Query: "${query}"\n\n`

    if (context) {
      prompt += `Available Context:\n`
      if (context.availableEntities) {
        prompt += `- Entities: ${context.availableEntities.join(', ')}\n`
      }
      if (context.availableFields) {
        prompt += `- Fields: ${context.availableFields.join(', ')}\n`
      }
      if (context.availableMetrics) {
        prompt += `- Metrics: ${context.availableMetrics.join(', ')}\n`
      }
      prompt += `\n`
    }

    prompt += `Return the parsed QueryConfig with confidence score, interpretation, and mappings.`

    return prompt
  }

  /**
   * Validate parsed QueryConfig structure
   */
  validateQueryConfig(config: QueryConfig): boolean {
    if (!config.entity) return false

    // Validate entity type
    const validEntities: QueryEntity[] = ['pid', 'mid', 'zid', 'team', 'pic', 'product']
    if (!validEntities.includes(config.entity)) return false

    // Provide default for missing columns field
    if (!config.columns) {
      config.columns = []
    }

    // Validate conditions if present
    if (config.conditions) {
      for (const condition of config.conditions) {
        if (!condition.type) return false

        const validConditionTypes: ConditionType[] = ['has', 'does_not_have', 'only_has', 'has_all']
        if (!validConditionTypes.includes(condition.type)) return false

        if (condition.field && condition.operator) {
          const validOperators: FieldOperator[] = [
            'equals', 'not_equals', 'in', 'not_in',
            'greater_than', 'less_than', 'between',
            'contains', 'not_contains'
          ]
          if (!validOperators.includes(condition.operator)) return false
        }
      }
    }

    // Validate metric filters if present
    if (config.metricFilters) {
      for (const filter of config.metricFilters) {
        if (!filter.metric || !filter.operator || filter.value === undefined) return false

        const validMetricOps: MetricOperator[] = [
          'greater_than',
          'greater_than_or_equal',
          'less_than',
          'less_than_or_equal',
          'equals',
          'not_equals',
          'between'
        ]
        if (!validMetricOps.includes(filter.operator)) return false
      }
    }

    // Validate time periods if present
    if (config.periodCount) {
      if (config.periodCount === 2 && !config.period2) {
        console.warn('[QueryLabParser] periodCount is 2 but period2 is missing')
        return false
      }
    }

    // Validate date format if periods specified
    if (config.period1 && !this.isValidDateRange(config.period1)) {
      console.warn('[QueryLabParser] Invalid period1 date format')
      return false
    }
    if (config.period2 && !this.isValidDateRange(config.period2)) {
      console.warn('[QueryLabParser] Invalid period2 date format')
      return false
    }

    return true
  }

  /**
   * Validate date range format (YYYY-MM-DD)
   */
  private isValidDateRange(range: any): boolean {
    if (!range || !range.start || !range.end) return false

    // Basic YYYY-MM-DD format check
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(range.start) || !dateRegex.test(range.end)) return false

    // Validate that start <= end
    const startDate = new Date(range.start)
    const endDate = new Date(range.end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false
    if (startDate > endDate) return false

    return true
  }
}

// Singleton instance
let parserInstance: QueryLabAIParser | null = null

export function getQueryLabParser(): QueryLabAIParser {
  if (!parserInstance) {
    parserInstance = new QueryLabAIParser()
  }
  return parserInstance
}

export default QueryLabAIParser
