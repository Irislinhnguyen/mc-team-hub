# GCPP BigQuery Dataset Schema Documentation

**Dataset**: `gcpp-check.geniee`
**Total Tables**: 19
**Last Updated**: 2025-11-07
**Purpose**: Google Certified Publishing Partner (GCPP) monitoring and competitive analysis

---

## Table of Contents

1. [Main Fact Tables](#main-fact-tables)
   - [master_market](#master_market)
   - [master_partner](#master_partner)
   - [master_partner_market](#master_partner_market)
2. [Analysis Tables](#analysis-tables)
   - [geniee_wallet_analysis](#geniee_wallet_analysis)
   - [shared_pub_monitoring](#shared_pub_monitoring)
   - [market_share_all_partner](#market_share_all_partner)
3. [Partner-Specific Tables](#partner-specific-tables)
4. [Derived/Supporting Tables](#derivedsupporting-tables)
5. [Common Queries](#common-queries)

---

## Main Fact Tables

### master_market

**Description**: Primary fact table containing impressions data aggregated by market
**Row Count**: 3,160,059 rows
**Update Frequency**: Daily
**Primary Use**: Main source for GCPP Check reports and analysis

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `domain_app_id` | STRING | NULLABLE | Unique identifier for domain or mobile app |
| `app_name` | STRING | NULLABLE | Human-readable name of the application |
| `filtered_impressions` | INTEGER | NULLABLE | Total number of ad impressions (filtered) |
| `filtered_unique` | INTEGER | NULLABLE | Count of unique ad impressions |
| `filtered_audio_impressions` | INTEGER | NULLABLE | Number of audio ad impressions |
| `filtered_display_impressions` | INTEGER | NULLABLE | Number of display ad impressions |
| `filtered_video_impressions` | INTEGER | NULLABLE | Number of video ad impressions |
| `publisher` | STRING | NULLABLE | Publisher name/identifier |
| `market` | STRING | NULLABLE | Market or geographic region (e.g., VN, TH, ID) |
| `date` | DATE | NULLABLE | Transaction date (YYYY-MM-DD) |
| `team` | STRING | NULLABLE | Team assignment (e.g., WEB_GV, APP_GV) |

#### Sample Query

```sql
-- Get total impressions by market for last 7 days
SELECT
  market,
  COUNT(DISTINCT domain_app_id) as unique_apps,
  SUM(filtered_impressions) as total_impressions,
  SUM(filtered_video_impressions) as video_impressions,
  SUM(filtered_display_impressions) as display_impressions
FROM `gcpp-check.geniee.master_market`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  AND team = 'WEB_GV'
GROUP BY market
ORDER BY total_impressions DESC
```

---

### master_partner

**Description**: Impressions data aggregated by partner/competitor
**Row Count**: 150,451 rows
**Update Frequency**: Daily
**Primary Use**: Competitive analysis, partner performance comparison

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `domain_app_id` | STRING | NULLABLE | Domain or App identifier |
| `app_name` | STRING | NULLABLE | Application name |
| `filtered_impressions` | INTEGER | NULLABLE | Total impressions count |
| `filtered_unique` | INTEGER | NULLABLE | Unique impressions |
| `filtered_audio_impressions` | INTEGER | NULLABLE | Audio ad impressions |
| `filtered_display_impressions` | INTEGER | NULLABLE | Display ad impressions |
| `filtered_video_impressions` | INTEGER | NULLABLE | Video ad impressions |
| `publisher` | STRING | NULLABLE | Publisher name |
| `partner` | STRING | NULLABLE | Partner/competitor name (e.g., Geniee, Anymind, Acqua) |
| `date` | DATE | NULLABLE | Transaction date |
| `team` | STRING | NULLABLE | Team assignment |

#### Sample Query

```sql
-- Compare Geniee vs competitors for a specific period
SELECT
  partner,
  SUM(filtered_impressions) as impressions,
  ROUND(SUM(filtered_impressions) * 100.0 / SUM(SUM(filtered_impressions)) OVER(), 2) as market_share_pct,
  RANK() OVER (ORDER BY SUM(filtered_impressions) DESC) as rank
FROM `gcpp-check.geniee.master_partner`
WHERE date BETWEEN '2025-10-01' AND '2025-10-31'
  AND team = 'WEB_GV'
GROUP BY partner
ORDER BY impressions DESC
```

---

### master_partner_market

**Description**: Combined partner and market dimensions for cross-analysis
**Row Count**: 150,450 rows
**Update Frequency**: Daily
**Primary Use**: Multi-dimensional analysis (partner × market)

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `domain_app_id` | STRING | NULLABLE | Domain/App identifier |
| `app_name` | STRING | NULLABLE | App name |
| `filtered_impressions` | INTEGER | NULLABLE | Impressions count |
| `filtered_unique` | INTEGER | NULLABLE | Unique impressions |
| `filtered_audio_impressions` | INTEGER | NULLABLE | Audio impressions |
| `filtered_display_impressions` | INTEGER | NULLABLE | Display impressions |
| `filtered_video_impressions` | INTEGER | NULLABLE | Video impressions |
| `publisher` | STRING | NULLABLE | Publisher |
| `partner` | STRING | NULLABLE | Partner name |
| `market` | STRING | NULLABLE | Market identifier |
| `date` | DATE | NULLABLE | Date |
| `team` | STRING | NULLABLE | Team |

#### Sample Query

```sql
-- Analyze Geniee's performance across markets
SELECT
  market,
  SUM(filtered_impressions) as impressions,
  COUNT(DISTINCT domain_app_id) as unique_apps
FROM `gcpp-check.geniee.master_partner_market`
WHERE partner = 'Geniee'
  AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY market
ORDER BY impressions DESC
```

---

## Analysis Tables

### geniee_wallet_analysis

**Description**: Geniee's share of wallet vs total market impressions
**Row Count**: 35,487 rows
**Update Frequency**: Daily
**Primary Use**: Market share tracking, wallet penetration analysis

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `date` | DATE | NULLABLE | Analysis date |
| `team` | STRING | NULLABLE | Team assignment |
| `domain_app_id` | STRING | NULLABLE | Domain/App identifier |
| `app_name` | STRING | NULLABLE | Application name |
| `geniee_impressions` | INTEGER | NULLABLE | Geniee's impression count |
| `total_impressions` | INTEGER | NULLABLE | Total market impressions (all partners) |
| `impressions_percentage` | FLOAT | NULLABLE | Geniee's market share percentage |

#### Sample Query

```sql
-- Get average wallet share by team over last 30 days
SELECT
  team,
  COUNT(DISTINCT domain_app_id) as apps_tracked,
  AVG(impressions_percentage) as avg_wallet_share,
  SUM(geniee_impressions) as total_geniee_impressions,
  SUM(total_impressions) as total_market_impressions
FROM `gcpp-check.geniee.geniee_wallet_analysis`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY team
ORDER BY avg_wallet_share DESC
```

#### Key Insights

- **High wallet share (>50%)**: Dominant position
- **Medium wallet share (20-50%)**: Competitive position
- **Low wallet share (<20%)**: Growth opportunity

---

### shared_pub_monitoring

**Description**: Head-to-head competition tracking with alerts
**Row Count**: 196 rows
**Update Frequency**: Daily
**Primary Use**: Competitive alerts, win/loss tracking

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `domain_app_id` | STRING | NULLABLE | Domain/App identifier |
| `app_name` | STRING | NULLABLE | Application name |
| `team` | STRING | NULLABLE | Team assignment |
| `competitor_partner` | STRING | NULLABLE | Competitor/partner name |
| `latest_date` | DATE | NULLABLE | Most recent date in analysis |
| `previous_date` | DATE | NULLABLE | Previous comparison date |
| `geniee_impressions_latest` | INTEGER | NULLABLE | Geniee impressions (latest period) |
| `geniee_impressions_previous` | INTEGER | NULLABLE | Geniee impressions (previous period) |
| `competitor_impressions_latest` | INTEGER | NULLABLE | Competitor impressions (latest) |
| `competitor_impressions_previous` | INTEGER | NULLABLE | Competitor impressions (previous) |
| `geniee_growth_pct` | FLOAT | NULLABLE | Geniee's growth percentage |
| `competitor_growth_pct` | FLOAT | NULLABLE | Competitor's growth percentage |
| `scenario` | STRING | NULLABLE | Analysis scenario (Winning/Losing/Critical/Stable) |
| `scenario_color` | STRING | NULLABLE | Status color indicator (green/yellow/red) |
| `action_guidance` | STRING | NULLABLE | Recommended action |

#### Sample Query

```sql
-- Get critical competitive alerts
SELECT
  domain_app_id,
  app_name,
  competitor_partner,
  geniee_growth_pct,
  competitor_growth_pct,
  (geniee_growth_pct - competitor_growth_pct) as growth_gap,
  scenario,
  action_guidance
FROM `gcpp-check.geniee.shared_pub_monitoring`
WHERE scenario IN ('Losing', 'Critical')
ORDER BY ABS(geniee_growth_pct - competitor_growth_pct) DESC
LIMIT 20
```

#### Scenario Definitions

- **Winning**: Geniee growing faster than competitor
- **Losing**: Competitor growing faster than Geniee
- **Critical**: Significant negative gap (>50%)
- **Stable**: Both partners growing at similar rates

---

### market_share_all_partner

**Description**: Time-series market share data by partner
**Row Count**: 3,158 rows
**Update Frequency**: Daily
**Primary Use**: Market share trend analysis

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `market` | STRING | NULLABLE | Market identifier |
| `date` | DATE | NULLABLE | Date |
| `formatted_date` | STRING | NULLABLE | Human-readable date format |
| `partner` | STRING | NULLABLE | Partner name |
| `team` | STRING | NULLABLE | Team |
| `partner_impressions` | INTEGER | NULLABLE | Partner's impressions |
| `total_impressions` | INTEGER | NULLABLE | Total market impressions |
| `market_share_ratio` | FLOAT | NULLABLE | Market share (0-1 decimal) |
| `market_share_percent` | FLOAT | NULLABLE | Market share (0-100 percentage) |

#### Sample Query

```sql
-- Track Geniee's market share trend over time
SELECT
  date,
  market,
  market_share_percent,
  partner_impressions,
  total_impressions
FROM `gcpp-check.geniee.market_share_all_partner`
WHERE partner = 'Geniee'
  AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
ORDER BY date ASC, market_share_percent DESC
```

---

## Partner-Specific Tables

These tables contain detailed impressions data for individual partners. All share the same schema structure.

### Available Partner Tables

| Table Name | Row Count | Description |
|-----------|-----------|-------------|
| `acqua` | 17,740 | Acqua partner performance data |
| `adopx` | 6,044 | AdOpx partner data |
| `anymind` | 64,697 | AnyMind partner data |
| `geniee` | 39,622 | Geniee's own performance |
| `netlink` | 8,417 | Netlink partner data |
| `optad360` | 13,930 | Optad360 partner data |

### Common Schema for All Partner Tables

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `domain_app_id` | STRING | NULLABLE | Domain/App ID |
| `app_name` | STRING | NULLABLE | App name |
| `filtered_impressions` | INTEGER | NULLABLE | Total impressions |
| `filtered_unique` | INTEGER | NULLABLE | Unique impressions |
| `filtered_audio_impressions` | INTEGER | NULLABLE | Audio impressions |
| `filtered_display_impressions` | INTEGER | NULLABLE | Display impressions |
| `filtered_video_impressions` | INTEGER | NULLABLE | Video impressions |
| `publisher` | STRING | NULLABLE | Publisher |
| `partner` | STRING | NULLABLE | Partner name |
| `market` | STRING | NULLABLE | Market |
| `date` | DATE | NULLABLE | Date |

#### Sample Query (Geniee-specific)

```sql
-- Analyze Geniee's top performing apps
SELECT
  app_name,
  market,
  SUM(filtered_impressions) as total_impressions,
  AVG(filtered_impressions) as avg_daily_impressions,
  COUNT(DISTINCT date) as days_active
FROM `gcpp-check.geniee.geniee`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY app_name, market
ORDER BY total_impressions DESC
LIMIT 20
```

---

## Derived/Supporting Tables

### master_partner_market_top_by_market

**Description**: Top performers by market with performance trends
**Row Count**: 122,304 rows

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `domain_app_id` | STRING | NULLABLE | Domain/App |
| `market` | STRING | NULLABLE | Market |
| `date` | DATE | NULLABLE | Date |
| `partner` | STRING | NULLABLE | Partner |
| `filtered_impressions` | INTEGER | NULLABLE | Current impressions |
| `prev_impressions` | INTEGER | NULLABLE | Previous period impressions |
| `performance` | STRING | NULLABLE | Trend indicator (up/down/stable) |
| `app_name` | STRING | NULLABLE | App name |
| `team` | STRING | NULLABLE | Team |

#### Sample Query

```sql
-- Find apps with "up" trend in specific market
SELECT
  app_name,
  partner,
  filtered_impressions,
  prev_impressions,
  ROUND((filtered_impressions - prev_impressions) * 100.0 / prev_impressions, 2) as growth_pct
FROM `gcpp-check.geniee.master_partner_market_top_by_market`
WHERE market = 'VN'
  AND performance = 'up'
  AND partner = 'Geniee'
ORDER BY growth_pct DESC
LIMIT 20
```

---

### master_top_100_by_partner_all_market

**Description**: Top 100 rankings by partner across all markets
**Row Count**: 33,837 rows

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `rank` | INTEGER | NULLABLE | Ranking position (1-100) |
| `domain_app_id` | STRING | NULLABLE | Domain/App |
| `app_name` | STRING | NULLABLE | App name |
| `filtered_impressions` | INTEGER | NULLABLE | Impressions |
| `filtered_unique` | INTEGER | NULLABLE | Unique impressions |
| `filtered_audio_impressions` | INTEGER | NULLABLE | Audio |
| `filtered_display_impressions` | INTEGER | NULLABLE | Display |
| `filtered_video_impressions` | INTEGER | NULLABLE | Video |
| `publisher` | STRING | NULLABLE | Publisher |
| `partner` | STRING | NULLABLE | Partner |
| `date` | DATE | NULLABLE | Date |
| `team` | STRING | NULLABLE | Team |

#### Sample Query

```sql
-- Get Geniee's top 10 apps for latest date
SELECT
  rank,
  app_name,
  filtered_impressions,
  date
FROM `gcpp-check.geniee.master_top_100_by_partner_all_market`
WHERE partner = 'Geniee'
  AND date = (SELECT MAX(date) FROM `gcpp-check.geniee.master_top_100_by_partner_all_market`)
  AND rank <= 10
ORDER BY rank ASC
```

---

### new_pub_by_partner

**Description**: New publisher tracking and categorization
**Row Count**: 478 rows

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `partner` | STRING | NULLABLE | Partner name |
| `domain_app_id` | STRING | NULLABLE | Domain/App |
| `app_name` | STRING | NULLABLE | App name |
| `team` | STRING | NULLABLE | Team |
| `filtered_impressions` | INTEGER | NULLABLE | Impressions |
| `pub_size_category` | STRING | NULLABLE | Size category (small/medium/large) |

#### Sample Query

```sql
-- Count new publishers by partner and size
SELECT
  partner,
  pub_size_category,
  COUNT(*) as new_pub_count,
  SUM(filtered_impressions) as total_impressions
FROM `gcpp-check.geniee.new_pub_by_partner`
GROUP BY partner, pub_size_category
ORDER BY new_pub_count DESC
```

---

### partner_market_distribution

**Description**: Partner distribution across markets
**Row Count**: 21,828 rows

#### Schema

| Column Name | Type | Mode | Description |
|------------|------|------|-------------|
| `date` | DATE | NULLABLE | Date |
| `partner` | STRING | NULLABLE | Partner |
| `market` | STRING | NULLABLE | Market |
| `team` | STRING | NULLABLE | Team |
| `market_impressions` | INTEGER | NULLABLE | Impressions in this market |
| `total_impressions` | INTEGER | NULLABLE | Total impressions across all markets |
| `percent_within_partner` | FLOAT | NULLABLE | % of partner's total volume |
| `formatted_date` | STRING | NULLABLE | Human-readable date |

#### Sample Query

```sql
-- See Geniee's market concentration
SELECT
  market,
  SUM(market_impressions) as impressions,
  AVG(percent_within_partner) as avg_pct_of_total
FROM `gcpp-check.geniee.partner_market_distribution`
WHERE partner = 'Geniee'
  AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY market
ORDER BY impressions DESC
```

---

## Common Queries

### 1. Get Latest Available Date

```sql
SELECT MAX(date) as latest_date
FROM `gcpp-check.geniee.master_market`
```

### 2. Overall Market Share Summary

```sql
WITH partner_totals AS (
  SELECT
    partner,
    SUM(filtered_impressions) as impressions
  FROM `gcpp-check.geniee.master_partner`
  WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY partner
),
total AS (
  SELECT SUM(impressions) as total_impressions
  FROM partner_totals
)
SELECT
  p.partner,
  p.impressions,
  ROUND(p.impressions * 100.0 / t.total_impressions, 2) as market_share_pct,
  RANK() OVER (ORDER BY p.impressions DESC) as rank
FROM partner_totals p
CROSS JOIN total t
ORDER BY rank ASC
```

### 3. Time Series Data for Charts

```sql
SELECT
  date,
  partner,
  SUM(filtered_impressions) as impressions,
  COUNT(DISTINCT domain_app_id) as unique_apps
FROM `gcpp-check.geniee.master_partner`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND partner IN ('Geniee', 'Anymind', 'Acqua')
GROUP BY date, partner
ORDER BY date ASC, partner
```

### 4. Top Movers (Growth Analysis)

```sql
WITH current_week AS (
  SELECT
    domain_app_id,
    app_name,
    SUM(filtered_impressions) as current_impressions
  FROM `gcpp-check.geniee.master_market`
  WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY domain_app_id, app_name
),
prev_week AS (
  SELECT
    domain_app_id,
    SUM(filtered_impressions) as prev_impressions
  FROM `gcpp-check.geniee.master_market`
  WHERE date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
    AND DATE_SUB(CURRENT_DATE(), INTERVAL 8 DAY)
  GROUP BY domain_app_id
)
SELECT
  c.app_name,
  c.current_impressions,
  p.prev_impressions,
  ROUND((c.current_impressions - p.prev_impressions) * 100.0 / p.prev_impressions, 2) as growth_pct
FROM current_week c
LEFT JOIN prev_week p ON c.domain_app_id = p.domain_app_id
WHERE p.prev_impressions > 0
ORDER BY growth_pct DESC
LIMIT 20
```

### 5. Market Concentration Analysis

```sql
SELECT
  market,
  COUNT(DISTINCT domain_app_id) as unique_apps,
  COUNT(DISTINCT publisher) as unique_publishers,
  COUNT(DISTINCT partner) as partners_present,
  SUM(filtered_impressions) as total_impressions
FROM `gcpp-check.geniee.master_partner_market`
WHERE date = (SELECT MAX(date) FROM `gcpp-check.geniee.master_partner_market`)
GROUP BY market
ORDER BY total_impressions DESC
```

### 6. Head-to-Head Comparison (Geniee vs Specific Competitor)

```sql
WITH geniee_data AS (
  SELECT
    date,
    market,
    SUM(filtered_impressions) as geniee_impressions
  FROM `gcpp-check.geniee.master_partner_market`
  WHERE partner = 'Geniee'
    AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY date, market
),
competitor_data AS (
  SELECT
    date,
    market,
    SUM(filtered_impressions) as competitor_impressions
  FROM `gcpp-check.geniee.master_partner_market`
  WHERE partner = 'Anymind'  -- Change competitor name here
    AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY date, market
)
SELECT
  g.date,
  g.market,
  g.geniee_impressions,
  c.competitor_impressions,
  ROUND(g.geniee_impressions * 100.0 / (g.geniee_impressions + c.competitor_impressions), 2) as geniee_share_pct
FROM geniee_data g
LEFT JOIN competitor_data c ON g.date = c.date AND g.market = c.market
ORDER BY g.date DESC, g.market
```

---

## Data Quality Notes

### Date Ranges
- **Latest data**: Typically T-1 (yesterday)
- **Historical data**: Goes back to early 2024
- **Data gaps**: Some dates may have missing data for certain markets

### Data Completeness
- **master_market**: Most complete (3M+ rows)
- **partner tables**: May have sparse data for smaller partners
- **shared_pub_monitoring**: Only tracks publishers with direct competition

### Performance Tips
1. **Always filter by date**: Include date ranges to speed up queries
2. **Use specific tables**: Don't join master_market with master_partner unnecessarily
3. **Aggregate first**: Use CTEs to aggregate before joining
4. **Limit results**: Use LIMIT for exploratory queries

---

## Filter Dimensions

### Recommended Filter Fields for GCPP Check Dashboard

1. **Date Range** (required)
   - Latest date auto-fill recommended
   - Non-consecutive dates common in dataset

2. **Team** (multi-select)
   - Values: WEB_GV, APP_GV, etc.
   - Source: `master_market.team`

3. **Partner** (multi-select)
   - Values: Geniee, Anymind, Acqua, AdOpx, Netlink, Optad360
   - Source: `master_partner.partner`

4. **Market** (multi-select)
   - Values: VN, TH, ID, PH, MY, SG, etc.
   - Source: `master_market.market`

5. **Publisher** (autocomplete/search)
   - Many unique values (1000+)
   - Source: `master_market.publisher`

---

## Next Steps

When building the GCPP Check dashboard, you will need:

1. **Báo cáo (Report) section**:
   - Use: `master_market`, `master_partner`, `market_share_all_partner`
   - Key metrics: Total impressions, market share, unique apps
   - Charts: Time series trends, partner comparison

2. **Deep Dive section**:
   - Use: `master_partner_market_top_by_market`, `shared_pub_monitoring`
   - Features: Period comparison, tier analysis, drill-down
   - Alerts: Competitive scenarios from `shared_pub_monitoring`

3. **Latest Date Logic**:
   - Query MAX(date) on page load
   - Pre-fill date picker with latest available date

---

**Document Version**: 1.0
**Contact**: MC Team Hub Development Team
**Last Reviewed**: 2025-11-07