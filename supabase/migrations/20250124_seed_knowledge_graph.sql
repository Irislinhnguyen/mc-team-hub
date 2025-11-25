-- Knowledge Graph Seed Data
-- Initial data for AI "brain" based on GI Publisher business context

-- ============================================================================
-- SEED: kg_tables - BigQuery table metadata
-- ============================================================================

INSERT INTO kg_tables (name, full_path, description, table_type, columns_json, join_hints) VALUES

-- Main fact table
('pub_data', 'gcpp-check.GI_publisher.pub_data',
 'Main fact table containing daily publisher performance data. Primary source for revenue, profit, ad requests, and impressions.',
 'fact',
 '[
   {"name": "date", "type": "DATE", "description": "Date of the record", "is_key": true},
   {"name": "pic", "type": "STRING", "description": "Person In Charge - account manager ID", "is_key": false},
   {"name": "pid", "type": "INT64", "description": "Publisher ID - unique identifier for publisher", "is_key": true},
   {"name": "pubname", "type": "STRING", "description": "Publisher name", "is_key": false},
   {"name": "mid", "type": "INT64", "description": "Media ID - website/app identifier", "is_key": true},
   {"name": "medianame", "type": "STRING", "description": "Media/website name", "is_key": false},
   {"name": "zid", "type": "INT64", "description": "Zone ID - ad placement identifier", "is_key": true},
   {"name": "zonename", "type": "STRING", "description": "Zone/placement name", "is_key": false},
   {"name": "rev", "type": "FLOAT64", "description": "Total revenue in USD", "is_key": false},
   {"name": "profit", "type": "FLOAT64", "description": "Company profit in USD", "is_key": false},
   {"name": "paid", "type": "INT64", "description": "Served impressions count", "is_key": false},
   {"name": "req", "type": "INT64", "description": "Ad request count", "is_key": false},
   {"name": "request_CPM", "type": "FLOAT64", "description": "Request CPM value", "is_key": false},
   {"name": "month", "type": "INT64", "description": "Month number (1-12)", "is_key": false},
   {"name": "year", "type": "INT64", "description": "Year (e.g., 2024)", "is_key": false}
 ]'::jsonb,
 '[
   {"to_table": "updated_product_name", "join_type": "LEFT JOIN", "on_condition": "p.pid = u.pid AND p.mid = u.mid AND p.zid = u.zid"}
 ]'::jsonb),

-- Product dimension table
('updated_product_name', 'gcpp-check.GI_publisher.updated_product_name',
 'Dimension table mapping zones to products/ad formats. JOIN with pub_data to get product information.',
 'dimension',
 '[
   {"name": "pid", "type": "INT64", "description": "Publisher ID", "is_key": true},
   {"name": "pubname", "type": "STRING", "description": "Publisher name", "is_key": false},
   {"name": "mid", "type": "INT64", "description": "Media ID", "is_key": true},
   {"name": "medianame", "type": "STRING", "description": "Media name", "is_key": false},
   {"name": "zid", "type": "INT64", "description": "Zone ID", "is_key": true},
   {"name": "zonename", "type": "STRING", "description": "Zone name", "is_key": false},
   {"name": "H5", "type": "STRING", "description": "H5 flag", "is_key": false},
   {"name": "product", "type": "STRING", "description": "Ad format/product name (e.g., FlexibleSticky, WipeAd, Overlay)", "is_key": false}
 ]'::jsonb,
 NULL),

-- Weekly prediction snapshot
('weekly_prediction_table', 'gcpp-check.GI_publisher.weekly_prediction_table',
 'Snapshot table with weekly predictions. No DATE column - represents current prediction state.',
 'snapshot',
 '[
   {"name": "pic", "type": "STRING", "description": "Person In Charge"},
   {"name": "pid", "type": "INT64", "description": "Publisher ID"},
   {"name": "pubname", "type": "STRING", "description": "Publisher name"},
   {"name": "mid", "type": "INT64", "description": "Media ID"},
   {"name": "medianame", "type": "STRING", "description": "Media name"},
   {"name": "zid", "type": "INT64", "description": "Zone ID"},
   {"name": "zonename", "type": "STRING", "description": "Zone name"},
   {"name": "last_month_profit", "type": "FLOAT64", "description": "Last month total profit"},
   {"name": "w1_profit", "type": "FLOAT64", "description": "Week 1 predicted profit"},
   {"name": "w2_profit", "type": "FLOAT64", "description": "Week 2 predicted profit"},
   {"name": "w3_profit", "type": "FLOAT64", "description": "Week 3 predicted profit"},
   {"name": "w4_profit", "type": "FLOAT64", "description": "Week 4 predicted profit"},
   {"name": "w5_profit", "type": "FLOAT64", "description": "Week 5 predicted profit"},
   {"name": "mom_profit", "type": "FLOAT64", "description": "Month-over-month profit change"},
   {"name": "wow_profit", "type": "FLOAT64", "description": "Week-over-week profit change"},
   {"name": "last_month_rev", "type": "FLOAT64", "description": "Last month total revenue"},
   {"name": "w1_rev", "type": "FLOAT64", "description": "Week 1 predicted revenue"},
   {"name": "w2_rev", "type": "FLOAT64", "description": "Week 2 predicted revenue"},
   {"name": "w3_rev", "type": "FLOAT64", "description": "Week 3 predicted revenue"},
   {"name": "w4_rev", "type": "FLOAT64", "description": "Week 4 predicted revenue"},
   {"name": "w5_rev", "type": "FLOAT64", "description": "Week 5 predicted revenue"},
   {"name": "mom_rev", "type": "FLOAT64", "description": "Month-over-month revenue change"},
   {"name": "wow_rev", "type": "FLOAT64", "description": "Week-over-week revenue change"}
 ]'::jsonb,
 NULL),

-- New sales master
('new_sales_master', 'gcpp-check.GI_publisher.new_sales_master',
 'New sales tracking table with contract periods.',
 'fact',
 '[
   {"name": "pic", "type": "STRING", "description": "Person In Charge"},
   {"name": "pid", "type": "INT64", "description": "Publisher ID"},
   {"name": "pubname", "type": "STRING", "description": "Publisher name"},
   {"name": "start_date", "type": "DATE", "description": "Contract start date"},
   {"name": "end_date", "type": "DATE", "description": "Contract end date"},
   {"name": "rev_this_month", "type": "FLOAT64", "description": "Revenue this month"},
   {"name": "profit_this_month", "type": "FLOAT64", "description": "Profit this month"},
   {"name": "rev_last_month", "type": "FLOAT64", "description": "Revenue last month"},
   {"name": "profit_last_month", "type": "FLOAT64", "description": "Profit last month"}
 ]'::jsonb,
 NULL),

-- Aggregated monthly data
('agg_monthly_with_pic_table_6_month', 'gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month',
 'Aggregated monthly data with PIC information. Last 6 months of data.',
 'aggregate',
 '[
   {"name": "date", "type": "DATE", "description": "Date"},
   {"name": "pic", "type": "STRING", "description": "Person In Charge"},
   {"name": "pid", "type": "INT64", "description": "Publisher ID"},
   {"name": "pubname", "type": "STRING", "description": "Publisher name"},
   {"name": "mid", "type": "INT64", "description": "Media ID"},
   {"name": "medianame", "type": "STRING", "description": "Media name"},
   {"name": "zid", "type": "INT64", "description": "Zone ID"},
   {"name": "zonename", "type": "STRING", "description": "Zone name"},
   {"name": "product", "type": "STRING", "description": "Product/ad format"},
   {"name": "rev", "type": "FLOAT64", "description": "Revenue"},
   {"name": "profit", "type": "FLOAT64", "description": "Profit"},
   {"name": "paid", "type": "INT64", "description": "Impressions"},
   {"name": "req", "type": "INT64", "description": "Ad requests"},
   {"name": "request_CPM", "type": "FLOAT64", "description": "Request CPM"}
 ]'::jsonb,
 NULL)

ON CONFLICT (name) DO UPDATE SET
  full_path = EXCLUDED.full_path,
  description = EXCLUDED.description,
  table_type = EXCLUDED.table_type,
  columns_json = EXCLUDED.columns_json,
  join_hints = EXCLUDED.join_hints,
  updated_at = NOW();

-- ============================================================================
-- SEED: kg_concepts - Semantic term mapping
-- ============================================================================

INSERT INTO kg_concepts (term_vi, term_en, maps_to_type, maps_to_value, maps_to_table, context, priority) VALUES

-- METRICS
('doanh thu', 'revenue', 'column', 'rev', 'pub_data', 'Tổng doanh thu từ quảng cáo', 10),
('lợi nhuận', 'profit', 'column', 'profit', 'pub_data', 'Lợi nhuận công ty giữ lại', 10),
('tiền trả publisher', 'payout', 'expression', 'rev - profit', 'pub_data', 'Tiền trả cho publisher = rev - profit', 10),
('impressions', 'impressions', 'column', 'paid', 'pub_data', 'Số lượt hiển thị quảng cáo', 10),
('lượt hiển thị', 'served impressions', 'column', 'paid', 'pub_data', 'Số lượt hiển thị quảng cáo đã phục vụ', 10),
('ad request', 'ad request', 'column', 'req', 'pub_data', 'Số lượt yêu cầu quảng cáo', 10),
('yêu cầu quảng cáo', 'ad requests', 'column', 'req', 'pub_data', 'Số lượt yêu cầu quảng cáo', 10),
('fill rate', 'fill rate', 'expression', 'ROUND(paid / NULLIF(req, 0) * 100, 2)', 'pub_data', 'Tỷ lệ lấp đầy = paid/req * 100', 10),
('tỷ lệ lấp đầy', 'fill rate', 'expression', 'ROUND(paid / NULLIF(req, 0) * 100, 2)', 'pub_data', 'Tỷ lệ lấp đầy quảng cáo', 10),
('ecpm', 'eCPM', 'expression', 'ROUND(rev / NULLIF(paid, 0) * 1000, 2)', 'pub_data', 'Effective CPM = rev/paid * 1000', 10),
('request cpm', 'request CPM', 'column', 'request_CPM', 'pub_data', 'CPM theo request', 10),

-- ENTITIES
('publisher', 'publisher', 'entity', 'pid', 'pub_data', 'Đối tác publisher', 10),
('nhà xuất bản', 'publisher', 'entity', 'pid', 'pub_data', 'Đối tác nhà xuất bản', 10),
('khách hàng', 'customer', 'entity', 'pid', 'pub_data', 'Khách hàng/publisher', 10),
('media', 'media', 'entity', 'mid', 'pub_data', 'Website hoặc app', 10),
('website', 'website', 'entity', 'mid', 'pub_data', 'Website của publisher', 10),
('zone', 'zone', 'entity', 'zid', 'pub_data', 'Vị trí đặt quảng cáo', 10),
('vị trí', 'placement', 'entity', 'zid', 'pub_data', 'Vị trí quảng cáo', 10),
('sản phẩm', 'product', 'column', 'product', 'updated_product_name', 'Ad format/sản phẩm quảng cáo', 10),
('định dạng', 'format', 'column', 'product', 'updated_product_name', 'Định dạng quảng cáo', 10),
('ad format', 'ad format', 'column', 'product', 'updated_product_name', 'Định dạng quảng cáo', 10),
('pic', 'PIC', 'column', 'pic', 'pub_data', 'Người phụ trách (Person In Charge)', 10),
('người phụ trách', 'person in charge', 'column', 'pic', 'pub_data', 'Account manager phụ trách', 10),

-- TEAMS
('team app', 'APP team', 'expression', 'pic LIKE ''APP%''', NULL, 'Team APP (mobile apps)', 9),
('team web gv', 'WEB_GV team', 'expression', 'pic LIKE ''VN%''', NULL, 'Team WEB_GV', 9),
('team web gti', 'WEB_GTI team', 'expression', 'pic NOT LIKE ''APP%'' AND pic NOT LIKE ''VN%''', NULL, 'Team WEB_GTI (other web)', 9),

-- TIME EXPRESSIONS
('hôm qua', 'yesterday', 'time_expression', 'DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)', NULL, 'Ngày hôm qua', 10),
('tuần này', 'this week', 'time_expression', 'DATE_TRUNC(CURRENT_DATE(), WEEK)', NULL, 'Tuần hiện tại', 10),
('tuần trước', 'last week', 'time_expression', 'DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK), INTERVAL 1 WEEK)', NULL, 'Tuần trước', 10),
('tháng này', 'this month', 'time_expression', 'DATE_TRUNC(CURRENT_DATE(), MONTH)', NULL, 'Tháng hiện tại', 10),
('tháng trước', 'last month', 'time_expression', 'DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 MONTH)', NULL, 'Tháng trước', 10),
('7 ngày qua', 'last 7 days', 'time_expression', 'DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)', NULL, '7 ngày gần nhất', 10),
('30 ngày qua', 'last 30 days', 'time_expression', 'DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)', NULL, '30 ngày gần nhất', 10),
('năm nay', 'this year', 'time_expression', 'EXTRACT(YEAR FROM CURRENT_DATE())', NULL, 'Năm hiện tại', 10),
('năm ngoái', 'last year', 'time_expression', 'EXTRACT(YEAR FROM CURRENT_DATE()) - 1', NULL, 'Năm trước', 10),

-- AGGREGATE FUNCTIONS
('tổng', 'total', 'aggregate_function', 'SUM', NULL, 'Tổng cộng', 10),
('trung bình', 'average', 'aggregate_function', 'AVG', NULL, 'Trung bình', 10),
('số lượng', 'count', 'aggregate_function', 'COUNT', NULL, 'Đếm số lượng', 10),
('cao nhất', 'maximum', 'aggregate_function', 'MAX', NULL, 'Giá trị lớn nhất', 10),
('thấp nhất', 'minimum', 'aggregate_function', 'MIN', NULL, 'Giá trị nhỏ nhất', 10),

-- PREDICTION RELATED
('prediction', 'prediction', 'table', 'weekly_prediction_table', NULL, 'Dữ liệu dự đoán', 10),
('dự đoán', 'forecast', 'table', 'weekly_prediction_table', NULL, 'Dữ liệu dự đoán', 10),
('dự báo', 'projection', 'table', 'weekly_prediction_table', NULL, 'Dữ liệu dự báo', 10),
('wow', 'week over week', 'column', 'wow_profit', 'weekly_prediction_table', 'So sánh tuần này vs tuần trước', 9),
('mom', 'month over month', 'column', 'mom_profit', 'weekly_prediction_table', 'So sánh tháng này vs tháng trước', 9),

-- COMPARISON TERMS
('so với', 'compared to', 'operator', 'comparison', NULL, 'So sánh giữa hai giá trị', 8),
('tăng', 'increase', 'operator', 'positive_change', NULL, 'Tăng trưởng dương', 8),
('giảm', 'decrease', 'operator', 'negative_change', NULL, 'Giảm/sụt giảm', 8),
('top', 'top', 'operator', 'ranking_desc', NULL, 'Xếp hạng cao nhất', 8),
('bottom', 'bottom', 'operator', 'ranking_asc', NULL, 'Xếp hạng thấp nhất', 8),

-- BUSINESS TERMS
('churn', 'churn', 'business_rule', 'churn_detection', NULL, 'Publisher ngừng hoạt động', 10),
('inactive', 'inactive', 'business_rule', 'inactive_detection', NULL, 'Publisher không hoạt động', 10),
('active', 'active', 'business_rule', 'active_detection', NULL, 'Publisher đang hoạt động', 10),
('new sales', 'new sales', 'table', 'new_sales_master', NULL, 'Publisher mới onboard', 10),
('upsell', 'upsell', 'business_rule', 'upsell_opportunity', NULL, 'Cơ hội upsell format mới', 10),
('drop', 'drop', 'business_rule', 'performance_drop', NULL, 'Sụt giảm hiệu suất', 10),
('risk', 'risk', 'business_rule', 'risk_detection', NULL, 'Rủi ro/cảnh báo', 10)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: kg_query_patterns - Reusable SQL templates
-- ============================================================================

INSERT INTO kg_query_patterns (pattern_name, pattern_category, intent_keywords, intent_description, sql_template, required_params, example_questions) VALUES

-- RANKING PATTERNS
('ranking_top_n', 'ranking',
 '["top", "cao nhất", "nhiều nhất", "lớn nhất", "best", "highest"]'::jsonb,
 'Tìm top N entities theo metric',
 'SELECT {{group_by_column}}, {{name_column}}, {{aggregate_func}}({{metric_column}}) as {{metric_alias}}
FROM {{table}}
{{join_clause}}
{{where_clause}}
GROUP BY {{group_by_column}}, {{name_column}}
ORDER BY {{metric_alias}} DESC
LIMIT {{limit}}',
 '[{"name": "group_by_column", "type": "string", "description": "Column to group by (pid, mid, zid)"},
   {"name": "metric_column", "type": "string", "description": "Metric column (rev, profit, req)"},
   {"name": "limit", "type": "number", "description": "Number of results", "default": 10}]'::jsonb,
 '["Top 10 publisher có doanh thu cao nhất", "Top 5 zone có profit nhiều nhất", "Khách hàng nào có revenue cao nhất tháng này"]'::jsonb),

('ranking_bottom_n', 'ranking',
 '["bottom", "thấp nhất", "ít nhất", "nhỏ nhất", "worst", "lowest"]'::jsonb,
 'Tìm bottom N entities theo metric',
 'SELECT {{group_by_column}}, {{name_column}}, {{aggregate_func}}({{metric_column}}) as {{metric_alias}}
FROM {{table}}
{{join_clause}}
{{where_clause}}
GROUP BY {{group_by_column}}, {{name_column}}
ORDER BY {{metric_alias}} ASC
LIMIT {{limit}}',
 '[{"name": "group_by_column", "type": "string"}, {"name": "metric_column", "type": "string"}, {"name": "limit", "type": "number", "default": 10}]'::jsonb,
 '["Zone nào có fill rate thấp nhất", "Publisher nào có doanh thu ít nhất"]'::jsonb),

-- COMPARISON PATTERNS
('comparison_period', 'comparison',
 '["so với", "compared to", "vs", "versus", "so sánh"]'::jsonb,
 'So sánh metric giữa 2 periods',
 'WITH current_period AS (
  SELECT {{group_by_column}}, SUM({{metric_column}}) as current_value
  FROM {{table}}
  WHERE date >= {{current_start}} AND date <= {{current_end}}
  GROUP BY {{group_by_column}}
),
previous_period AS (
  SELECT {{group_by_column}}, SUM({{metric_column}}) as previous_value
  FROM {{table}}
  WHERE date >= {{previous_start}} AND date <= {{previous_end}}
  GROUP BY {{group_by_column}}
)
SELECT
  c.{{group_by_column}},
  c.current_value,
  p.previous_value,
  ROUND((c.current_value - p.previous_value) / NULLIF(p.previous_value, 0) * 100, 2) as change_pct
FROM current_period c
LEFT JOIN previous_period p ON c.{{group_by_column}} = p.{{group_by_column}}
ORDER BY change_pct DESC',
 '[{"name": "group_by_column", "type": "string"}, {"name": "metric_column", "type": "string"}, {"name": "current_start", "type": "date"}, {"name": "current_end", "type": "date"}, {"name": "previous_start", "type": "date"}, {"name": "previous_end", "type": "date"}]'::jsonb,
 '["So sánh doanh thu tuần này vs tuần trước", "Revenue tháng 10 so với tháng 9"]'::jsonb),

('comparison_avg_n_days', 'comparison',
 '["trung bình", "average", "TB", "so với TB"]'::jsonb,
 'So sánh với trung bình N ngày trước',
 'WITH daily_data AS (
  SELECT date, {{group_by_column}}, SUM({{metric_column}}) as daily_value
  FROM {{table}}
  WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL {{days_back}} DAY)
  GROUP BY date, {{group_by_column}}
),
avg_data AS (
  SELECT {{group_by_column}}, AVG(daily_value) as avg_value
  FROM daily_data
  WHERE date < DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  GROUP BY {{group_by_column}}
),
yesterday_data AS (
  SELECT {{group_by_column}}, daily_value as yesterday_value
  FROM daily_data
  WHERE date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
)
SELECT
  y.{{group_by_column}},
  y.yesterday_value,
  a.avg_value,
  ROUND((y.yesterday_value - a.avg_value) / NULLIF(a.avg_value, 0) * 100, 2) as diff_pct
FROM yesterday_data y
LEFT JOIN avg_data a ON y.{{group_by_column}} = a.{{group_by_column}}
ORDER BY diff_pct',
 '[{"name": "group_by_column", "type": "string"}, {"name": "metric_column", "type": "string"}, {"name": "days_back", "type": "number", "default": 30}]'::jsonb,
 '["Phân tích số hôm qua so với TB 30 ngày", "Zone nào giảm so với trung bình"]'::jsonb),

-- BREAKDOWN PATTERNS
('breakdown_by_factor', 'breakdown',
 '["breakdown", "phân tích", "chi tiết", "lý do", "nguyên nhân", "do"]'::jsonb,
 'Breakdown thay đổi theo các factors',
 'WITH current_data AS (
  SELECT
    {{breakdown_column}},
    SUM({{metric_column}}) as current_value,
    SUM(req) as current_req,
    SUM(paid) as current_paid,
    ROUND(SUM(rev) / NULLIF(SUM(paid), 0) * 1000, 2) as current_ecpm,
    ROUND(SUM(paid) / NULLIF(SUM(req), 0) * 100, 2) as current_fill_rate
  FROM {{table}}
  WHERE date >= {{current_start}} AND date <= {{current_end}}
  {{entity_filter}}
  GROUP BY {{breakdown_column}}
),
previous_data AS (
  SELECT
    {{breakdown_column}},
    SUM({{metric_column}}) as previous_value,
    SUM(req) as previous_req,
    SUM(paid) as previous_paid,
    ROUND(SUM(rev) / NULLIF(SUM(paid), 0) * 1000, 2) as previous_ecpm,
    ROUND(SUM(paid) / NULLIF(SUM(req), 0) * 100, 2) as previous_fill_rate
  FROM {{table}}
  WHERE date >= {{previous_start}} AND date <= {{previous_end}}
  {{entity_filter}}
  GROUP BY {{breakdown_column}}
)
SELECT
  c.{{breakdown_column}},
  c.current_value,
  p.previous_value,
  c.current_value - COALESCE(p.previous_value, 0) as value_change,
  ROUND((c.current_value - COALESCE(p.previous_value, 0)) / NULLIF(p.previous_value, 0) * 100, 2) as change_pct,
  c.current_ecpm - COALESCE(p.previous_ecpm, 0) as ecpm_change,
  c.current_fill_rate - COALESCE(p.previous_fill_rate, 0) as fill_rate_change,
  c.current_req - COALESCE(p.previous_req, 0) as req_change
FROM current_data c
LEFT JOIN previous_data p ON c.{{breakdown_column}} = p.{{breakdown_column}}
ORDER BY value_change',
 '[{"name": "breakdown_column", "type": "string", "description": "Column to breakdown by (zid, mid, product)"}, {"name": "metric_column", "type": "string"}, {"name": "entity_filter", "type": "string", "description": "Optional entity filter"}]'::jsonb,
 '["PID này giảm do gì", "Phân tích lý do revenue giảm", "Breakdown theo zone"]'::jsonb),

-- GROWTH ANALYSIS
('growth_trend', 'aggregation',
 '["tăng trưởng", "growth", "trend", "xu hướng"]'::jsonb,
 'Phân tích xu hướng tăng trưởng',
 'SELECT
  DATE_TRUNC(date, {{period}}) as period,
  {{group_by_column}},
  SUM({{metric_column}}) as total_value,
  LAG(SUM({{metric_column}})) OVER (PARTITION BY {{group_by_column}} ORDER BY DATE_TRUNC(date, {{period}})) as previous_value,
  ROUND((SUM({{metric_column}}) - LAG(SUM({{metric_column}})) OVER (PARTITION BY {{group_by_column}} ORDER BY DATE_TRUNC(date, {{period}}))) /
    NULLIF(LAG(SUM({{metric_column}})) OVER (PARTITION BY {{group_by_column}} ORDER BY DATE_TRUNC(date, {{period}})), 0) * 100, 2) as growth_pct
FROM {{table}}
{{where_clause}}
GROUP BY period, {{group_by_column}}
ORDER BY period DESC, growth_pct DESC',
 '[{"name": "period", "type": "string", "description": "WEEK, MONTH, QUARTER"}, {"name": "group_by_column", "type": "string"}, {"name": "metric_column", "type": "string"}]'::jsonb,
 '["Phân tích tăng trưởng theo tháng", "Xu hướng revenue theo tuần", "Growth rate của từng product"]'::jsonb),

-- CHURN DETECTION
('churn_detection', 'filter',
 '["churn", "inactive", "ngừng hoạt động", "không có số"]'::jsonb,
 'Phát hiện churn publishers',
 'WITH last_month_active AS (
  SELECT DISTINCT {{entity_column}}
  FROM {{table}}
  WHERE date >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)
    AND date < DATE_TRUNC(CURRENT_DATE(), MONTH)
    AND {{metric_column}} > 0
),
this_month_active AS (
  SELECT DISTINCT {{entity_column}}
  FROM {{table}}
  WHERE date >= DATE_TRUNC(CURRENT_DATE(), MONTH)
    AND {{metric_column}} > 0
)
SELECT
  l.{{entity_column}},
  ''churn'' as status
FROM last_month_active l
LEFT JOIN this_month_active t ON l.{{entity_column}} = t.{{entity_column}}
WHERE t.{{entity_column}} IS NULL
ORDER BY l.{{entity_column}}',
 '[{"name": "entity_column", "type": "string", "description": "Entity to check (pid, mid, zid)"}, {"name": "metric_column", "type": "string", "default": "rev"}]'::jsonb,
 '["Publisher nào bị churn", "Zone nào không còn hoạt động", "Khách hàng nào ngừng"]'::jsonb),

-- PREDICTION ANALYSIS
('prediction_wow', 'comparison',
 '["prediction", "dự đoán", "forecast", "wow"]'::jsonb,
 'So sánh prediction tuần này vs tuần trước',
 'SELECT
  {{group_by_column}},
  {{name_column}},
  SUM(w1_{{metric}}) as this_week_prediction,
  SUM(w2_{{metric}}) as last_week_prediction,
  SUM(wow_{{metric}}) as wow_change,
  ROUND(SUM(wow_{{metric}}) / NULLIF(SUM(w2_{{metric}}), 0) * 100, 2) as wow_change_pct
FROM `gcpp-check.GI_publisher.weekly_prediction_table`
{{where_clause}}
GROUP BY {{group_by_column}}, {{name_column}}
ORDER BY wow_change_pct DESC',
 '[{"name": "group_by_column", "type": "string"}, {"name": "name_column", "type": "string"}, {"name": "metric", "type": "string", "default": "profit"}]'::jsonb,
 '["Prediction tuần này so với tuần trước", "So sánh dự đoán wow"]'::jsonb),

-- PRODUCT ANALYSIS
('product_usage', 'aggregation',
 '["format", "product", "ad format", "định dạng"]'::jsonb,
 'Phân tích sử dụng sản phẩm/format',
 'SELECT
  u.product,
  COUNT(DISTINCT p.pid) as publisher_count,
  COUNT(DISTINCT p.mid) as media_count,
  COUNT(DISTINCT p.zid) as zone_count,
  SUM(p.{{metric_column}}) as total_value
FROM `gcpp-check.GI_publisher.pub_data` p
LEFT JOIN `gcpp-check.GI_publisher.updated_product_name` u
  ON p.pid = u.pid AND p.mid = u.mid AND p.zid = u.zid
{{where_clause}}
GROUP BY u.product
ORDER BY total_value DESC',
 '[{"name": "metric_column", "type": "string", "default": "rev"}]'::jsonb,
 '["Product nào có revenue cao nhất", "So sánh các ad format", "Format nào có nhiều zone nhất"]'::jsonb),

-- UPSELL OPPORTUNITY
('upsell_opportunity', 'filter',
 '["upsell", "chưa sử dụng", "gợi ý", "recommend"]'::jsonb,
 'Tìm cơ hội upsell format mới',
 'WITH current_products AS (
  SELECT DISTINCT pid, product
  FROM `gcpp-check.GI_publisher.updated_product_name`
  WHERE product IS NOT NULL
),
all_products AS (
  SELECT DISTINCT product
  FROM `gcpp-check.GI_publisher.updated_product_name`
  WHERE product IS NOT NULL
)
SELECT
  p.pid,
  pub.pubname,
  ap.product as suggested_format,
  ''Not currently using this format'' as reason
FROM (SELECT DISTINCT pid FROM current_products WHERE pid = {{target_pid}}) p
CROSS JOIN all_products ap
LEFT JOIN current_products cp ON p.pid = cp.pid AND ap.product = cp.product
LEFT JOIN (SELECT DISTINCT pid, pubname FROM `gcpp-check.GI_publisher.pub_data`) pub ON p.pid = pub.pid
WHERE cp.pid IS NULL',
 '[{"name": "target_pid", "type": "number", "description": "Publisher ID to analyze"}]'::jsonb,
 '["Gợi ý format cho PID này", "Format nào PID chưa dùng", "Upsell opportunity"]'::jsonb)

ON CONFLICT (pattern_name) DO UPDATE SET
  intent_keywords = EXCLUDED.intent_keywords,
  sql_template = EXCLUDED.sql_template,
  required_params = EXCLUDED.required_params,
  example_questions = EXCLUDED.example_questions,
  updated_at = NOW();

-- ============================================================================
-- SEED: kg_business_rules - Domain-specific logic
-- ============================================================================

INSERT INTO kg_business_rules (rule_name, rule_type, description, condition_sql, applies_to_entities) VALUES

('churn_definition', 'definition',
 'Churn là publisher có số tháng trước nhưng không có số tháng này',
 'EXISTS (SELECT 1 FROM pub_data WHERE date >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH) AND date < DATE_TRUNC(CURRENT_DATE(), MONTH) AND rev > 0 AND pid = target_pid) AND NOT EXISTS (SELECT 1 FROM pub_data WHERE date >= DATE_TRUNC(CURRENT_DATE(), MONTH) AND rev > 0 AND pid = target_pid)',
 '["pid", "mid", "zid"]'::jsonb),

('active_zone_definition', 'definition',
 'Active zone là zone có impression > 0 trong khoảng thời gian xét',
 'paid > 0',
 '["zid"]'::jsonb),

('revenue_to_publisher', 'formula',
 'Tiền trả cho publisher = Revenue - Profit',
 'rev - profit',
 '["pid", "mid", "zid"]'::jsonb),

('fill_rate_formula', 'formula',
 'Fill rate = Impressions / Ad Requests * 100',
 'ROUND(paid / NULLIF(req, 0) * 100, 2)',
 '["zid", "mid", "pid"]'::jsonb),

('ecpm_formula', 'formula',
 'eCPM = Revenue / Impressions * 1000',
 'ROUND(rev / NULLIF(paid, 0) * 1000, 2)',
 '["zid", "mid", "pid"]'::jsonb),

('team_app_filter', 'definition',
 'Team APP là các PIC có prefix APP',
 'pic LIKE ''APP%''',
 '["pic"]'::jsonb),

('team_web_gv_filter', 'definition',
 'Team WEB_GV là các PIC có prefix VN',
 'pic LIKE ''VN%''',
 '["pic"]'::jsonb),

('team_web_gti_filter', 'definition',
 'Team WEB_GTI là các PIC không thuộc APP và WEB_GV',
 'pic NOT LIKE ''APP%'' AND pic NOT LIKE ''VN%''',
 '["pic"]'::jsonb),

('performance_drop_threshold', 'threshold',
 'Performance drop được xác định khi giảm > 20% so với trung bình',
 'change_pct < -20',
 '["pid", "mid", "zid"]'::jsonb),

('high_value_publisher', 'threshold',
 'High value publisher có revenue > $10,000/tháng',
 'monthly_rev > 10000',
 '["pid"]'::jsonb),

('product_compatibility_sticky', 'compatibility',
 'Flexible Sticky phù hợp với publisher đang dùng Overlay hoặc Sticky',
 'EXISTS (SELECT 1 FROM updated_product_name WHERE pid = target_pid AND product IN (''Overlay'', ''Sticky''))',
 '["pid"]'::jsonb)

ON CONFLICT (rule_name) DO UPDATE SET
  description = EXCLUDED.description,
  condition_sql = EXCLUDED.condition_sql,
  applies_to_entities = EXCLUDED.applies_to_entities,
  updated_at = NOW();

-- ============================================================================
-- SEED: kg_synonyms - Common synonyms
-- ============================================================================

INSERT INTO kg_synonyms (canonical_term, synonym, language, relationship) VALUES
-- Vietnamese synonyms
('rev', 'doanh thu', 'vi', 'equivalent'),
('rev', 'revenue', 'vi', 'equivalent'),
('rev', 'doanh số', 'vi', 'equivalent'),
('profit', 'lợi nhuận', 'vi', 'equivalent'),
('profit', 'lãi', 'vi', 'equivalent'),
('req', 'ad request', 'vi', 'equivalent'),
('req', 'yêu cầu', 'vi', 'equivalent'),
('paid', 'impression', 'vi', 'equivalent'),
('paid', 'lượt hiển thị', 'vi', 'equivalent'),
('pid', 'publisher', 'vi', 'equivalent'),
('pid', 'khách hàng', 'vi', 'equivalent'),
('mid', 'media', 'vi', 'equivalent'),
('mid', 'website', 'vi', 'equivalent'),
('zid', 'zone', 'vi', 'equivalent'),
('zid', 'vị trí', 'vi', 'equivalent'),
('product', 'sản phẩm', 'vi', 'equivalent'),
('product', 'format', 'vi', 'equivalent'),
('product', 'định dạng', 'vi', 'equivalent'),

-- English synonyms
('rev', 'revenue', 'en', 'equivalent'),
('rev', 'earnings', 'en', 'equivalent'),
('profit', 'profit', 'en', 'equivalent'),
('profit', 'margin', 'en', 'related'),
('req', 'requests', 'en', 'equivalent'),
('req', 'ad requests', 'en', 'equivalent'),
('paid', 'impressions', 'en', 'equivalent'),
('paid', 'served', 'en', 'equivalent'),
('pid', 'publisher', 'en', 'equivalent'),
('pid', 'client', 'en', 'equivalent'),
('mid', 'media', 'en', 'equivalent'),
('mid', 'site', 'en', 'equivalent'),
('zid', 'zone', 'en', 'equivalent'),
('zid', 'placement', 'en', 'equivalent'),
('product', 'format', 'en', 'equivalent'),
('product', 'ad format', 'en', 'equivalent')

ON CONFLICT (canonical_term, synonym, language) DO NOTHING;
