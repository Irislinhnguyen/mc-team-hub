# BigQuery Test Queries - Quick Reference

## How to Use

1. **Open BigQuery Console:** Go to https://console.cloud.google.com/bigquery
2. **Select Project:** gcpp-check
3. **Open Query Editor:** Click "Compose new query"
4. **Copy-Paste:** Copy each scenario SQL from `BIGQUERY_TEST_QUERIES.sql`
5. **Run:** Click "Run" button
6. **Compare:** Check results match expected output below

---

## Scenario 1: Daily vs 30-Day Average

**What it does:** Compares yesterday's total revenue to the 30-day rolling average

**Expected Output:** 1 row with:
- `yesterday_revenue`: ~$18,959.88
- `avg_30d_revenue`: ~$18.12
- `variance_pct`: ~+104,544%

**Performance:** ~980ms | 1 row

```sql
-- Copy from BIGQUERY_TEST_QUERIES.sql - SCENARIO 1
```

---

## Scenario 2: Top 20 Publishers by Revenue

**What it does:** Ranks top-performing publishers this month with engagement metrics

**Expected Output:** 20 rows showing:
- Publisher name and ID
- Team assignment (APP_GV, WEB_GV, WEB_GTI)
- Total revenue and daily average
- Number of active days, formats, zones

**Top Publisher Example:**
- Name: "Tran Xuan Tien"
- Revenue: $194,084.58
- Team: WEB_GV
- Active Days: 30
- Formats Used: 3

**Performance:** ~660ms | 20 rows

```sql
-- Copy from BIGQUERY_TEST_QUERIES.sql - SCENARIO 2
```

---

## Scenario 3: Churn Risk Detection

**What it does:** Identifies publishers showing declining revenue week-over-week

**Expected Output:** ~100 rows with:
- Publisher ID and name
- Current week vs previous week revenue
- Change percentage
- Risk status: 🟢 New, 📈 Growing, ➡️ Stable, 🔴 At Risk

**Performance:** ~681ms | 100 rows

```sql
-- Copy from BIGQUERY_TEST_QUERIES.sql - SCENARIO 3
```

---

## Scenario 4: Ad Format Trending

**What it does:** Shows which ad formats (products) are gaining or losing traction this month

**Expected Output:** ~28 rows showing:
- Ad format (product) name
- Current month revenue vs previous month
- Growth percentage
- Trend indicator: 🆕 New, 📈 Strong Growth, 📊 Growing, ➡️ Stable, 📉 Declining

**Performance:** ~663ms | 28+ rows

```sql
-- Copy from BIGQUERY_TEST_QUERIES.sql - SCENARIO 4
```

---

## Scenario 5: Team Performance by Week

**What it does:** Compares performance across teams (APP_GV, WEB_GV, WEB_GTI) week by week

**Expected Output:** ~12 rows (3 teams × 4 weeks) with:
- Team name
- Week starting date
- Weekly revenue
- Number of publishers active
- Days active in that week
- Average revenue per publisher

**Performance:** ~661ms | 12 rows

```sql
-- Copy from BIGQUERY_TEST_QUERIES.sql - SCENARIO 5
```

---

## Bonus: Data Validation Query

**What it does:** Verifies table structure and data freshness

**Expected Output:** Shows:
- Total record count
- Latest data date
- Number of unique publishers
- Number of unique ad formats
- Teams present in data

```sql
-- Copy from BIGQUERY_TEST_QUERIES.sql - BONUS
```

---

## Column Mappings (Schema)

The main table uses these column names:

| Column Name | Business Meaning | Data Type |
|------------|-----------------|-----------|
| `pid` | Publisher ID | Integer |
| `pubname` | Publisher Name | String |
| `rev` | Revenue | Float/Numeric |
| `profit` | Net Profit | Float/Numeric |
| `req` | Impressions | Integer |
| `paid` | Paid Impressions | Integer |
| `product` | Ad Format (e.g., "Sticky", "Expandable") | String |
| `zonename` | Zone/Site Name | String |
| `zid` | Zone ID | Integer |
| `pic` | Team Identifier Prefix | String |
| `DATE` | Date of Record | Date |

**Team Classification:**
- `APP%` → APP_GV
- `VN%` → WEB_GV
- `ID%` → WEB_GTI

---

## Troubleshooting

### Query Returns 0 Rows
- Check if data exists for today/yesterday
- Verify DATE column has recent data
- Run the Bonus validation query first

### Different Numbers Than Expected
- This is normal - data updates daily
- Focus on comparing trends, not absolute numbers
- Check Date ranges in WHERE clauses

### Performance Issue (Slow Query)
- Run during off-peak hours
- The queries should complete in < 2 seconds
- Check BigQuery slots availability

---

## Files in This Project

- **BIGQUERY_TEST_QUERIES.sql** - All 5 scenarios ready to copy-paste
- **TEST_RESULTS.md** - Last test run results
- **TEST_SCENARIOS.md** - Detailed SQL explanations
- **TESTING_GUIDE.md** - Complete testing instructions
- **RUN_TESTS.sh** - Automated test runner (bash script)

---

## Next Steps

After testing in BigQuery:

1. ✅ Verify results match test expectations
2. 📊 Check data freshness and quality
3. 🚀 Deploy backend to production
4. 🎨 Integrate with frontend UI
5. 👥 Train sales team on use cases
