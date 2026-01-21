# BigQuery Tables Structure for Analytics Dashboard

## Table 1: agg_monthly_with_pic_table_6_month (184,673 rows)

**Type:** Regular row-based table (NOT a pivot table)

**Columns:**
1. date (DATE)
2. year (INTEGER)
3. month (INTEGER)
4. pid (INTEGER)
5. pubname (STRING)
6. mid (INTEGER)
7. medianame (STRING)
8. zid (INTEGER)
9. zonename (STRING)
10. rev (FLOAT) - Revenue
11. profit (FLOAT)
12. paid (INTEGER) - Impressions served
13. req (INTEGER) - Ad requests
14. request_CPM (FLOAT)
15. pic (STRING) - Team/Manager ID
16. product (STRING) - Ad format (standardbanner, flexiblesticky, video, etc.)
17. H5 (BOOLEAN)

**Use For:**
- Page 1: Business Health (metrics, time series, rankings)
- Aggregate by date, pubname, medianame, zonename for charts
- Filter by: date range, product, pic, pid, pubname

**Note:** This is the base data table - all aggregations will be done in SQL queries

---

## Table 2: weekly_prediction_table (2,490 rows)

**Type:** Regular row-based table with prediction columns (NOT a pivot table)

**Columns:**
- team (STRING)
- pic (STRING)
- pid (STRING)
- pubname (STRING)
- product (STRING)
- mid (STRING)
- medianame (STRING)
- zid (STRING)
- zonename (STRING)
- **last_month_rev** (FLOAT)
- **last_month_profit** (FLOAT)
- **w1_rev, w1_profit** - Week 1 prediction
- **w2_rev, w2_profit** - Week 2 prediction
- **w3_rev, w3_profit** - Week 3 prediction
- **w4_rev, w4_profit** - Week 4 prediction
- **w5_rev, w5_profit** - Week 5 prediction
- **mom_profit** (FLOAT) - Month-over-month change
- **mom_rev** (FLOAT)
- **wow_profit** (FLOAT) - Week-over-week change
- **wow_rev** (FLOAT)

**Use For:**
- Page 2: Profit Projections (3 tables: PID, MID, ZID)
- Display as 3 separate tables filtered by prediction level
- Each shows: last_month_profit, w1_profit...w5_profit, wow_profit columns
- Filter by: date, team, pic, product

**Structure for Display:**
```
PID Prediction Table:
├─ Columns: pic, pid, pubname, last_month_profit, w1_profit, w2_profit, w3_profit, w4_profit, w5_profit, wow_profit
└─ Rows: One per pid

MID Prediction Table:
├─ Columns: pid, mid, medianame, last_month_profit, w1_profit, w2_profit, w3_profit, w4_profit, w5_profit, wow_profit
└─ Rows: One per mid

ZID Prediction Table:
├─ Columns: mid, zid, zonename, last_month_profit, w1_profit, w2_profit, w3_profit, w4_profit, w5_profit, wow_profit
└─ Rows: One per zid
```

---

## Table 3: top_movers_daily (284 rows)

**Type:** Regular row-based table (NOT a pivot table)

**Columns:**
1. pid (INTEGER)
2. pubname (STRING)
3. medianame (STRING)
4. zid (INTEGER)
5. zonename (STRING)
6. pic (STRING)
7. req_yesterday (INTEGER)
8. req_7d_avg (FLOAT)
9. paid_yesterday (INTEGER)
10. paid_7d_avg (FLOAT)
11. cpm_yesterday (FLOAT)
12. cpm_7d_avg (FLOAT)
13. rev_yesterday (FLOAT)
14. rev_7d_avg (FLOAT)
15. req_change_pct (FLOAT) - % change
16. paid_change_pct (FLOAT)
17. cpm_change_pct (FLOAT)
18. rev_change_pct (FLOAT)
19. **req_flag** (STRING) - Values: "✅ Stable", "🟢 Spike", "🟠 Moderate Drop"
20. **paid_flag** (STRING)
21. **cpm_flag** (STRING)
22. **rev_flag** (STRING)

**Use For:**
- Page 3: Daily Ops Report
- Display: Top movers table with flags
- Anomaly indicators are ALREADY IN BigQuery (req_flag, paid_flag, cpm_flag, rev_flag)
- Filter by: team (pic), rev_flag

**Note:** Flags are already calculated in BigQuery - just display them!

---

## Summary for Building Pages

| Page | Table | Type | Filter | Display |
|------|-------|------|--------|---------|
| 1 | agg_monthly_with_pic_table_6_month | Row-based | date, product, pic | Metrics + charts + table |
| 2 | weekly_prediction_table | Row-based | date, team, pic, product | 3 pivot-style tables |
| 3 | top_movers_daily | Row-based | team, pic, rev_flag | Table + flags |
| 4 | [churn queries] | Row-based | team, pic | Tables |
| 5 | [sales queries] | Row-based | date, team, pic | Tables |

---

## Key Implementation Notes

1. **NO PIVOT TABLES** - All tables are regular row-based
2. **NO CALCULATIONS NEEDED** - All flags, predictions, and metrics already in BigQuery
3. **SIMPLE DISPLAY JOB** - Just fetch and show the data
4. **FLAGS ALREADY THERE** - req_flag, paid_flag, cpm_flag, rev_flag are in BigQuery (top_movers_daily)
5. **PREDICTION WEEKS ALREADY CALCULATED** - w1_profit, w2_profit, etc. are in BigQuery

---

## Ready to Build!

All table structures are clear. Ready to build Looker Studio-style pages that just display this data.
