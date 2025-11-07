# 🧪 Backend Testing Guide - Sales Scenarios

## Quick Start

```bash
# 1. Start the development server
npm run dev

# 2. In another terminal, run the test suite
chmod +x test-scenarios.sh
./test-scenarios.sh
```

---

## 5 Real Sales Questions We're Testing

### Scenario 1️⃣: "Hôm qua performance gimana?"

**The Story:**
- Sales manager checks dashboard every morning
- Wants to know: Is today good? Better than normal?
- Action: If down > 20%, alert the team. If up > 15%, celebrate! 🎉

**Technical Flow:**
```
API Request
  ↓
BigQuery Query: yesterday vs 30-day average
  ↓
Returns: { yesterday_revenue: X, avg_30d_revenue: Y, variance_pct: Z }
  ↓
Display: "🟢 Today is +13.64% above average" or "🔴 Today is -8.23% below average"
```

**Expected Result:**
```bash
$ curl -X POST http://localhost:3000/api/bigquery/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT ... FROM agg_monthly_with_pic_table WHERE DATE = DATE_SUB(...)"}'

Response:
{
  "status": "ok",
  "rows": [
    {
      "yesterday_revenue": 1250000.50,
      "avg_30d_revenue": 1100000.25,
      "variance_pct": 13.64
    }
  ],
  "count": 1
}
```

✅ **Success:** Returns 1 row with variance_pct calculated

---

### Scenario 2️⃣: "Top publishers month ini siapa aja?"

**The Story:**
- Sales manager wants to see top performers for this month
- Wants to recognize them, give bonus, invite to kickoff meeting
- Also wants to identify which team (APP, WEB) is dominating

**Technical Flow:**
```
API Request
  ↓
BigQuery Query: GROUP BY pid, pubname, team
  ↓
Aggregate: SUM(revenue), COUNT(active_days), ROUND(daily_avg)
  ↓
Returns: Top 20 publishers with metrics
  ↓
Display: Top performers leaderboard
```

**Expected Result:**
```bash
Response:
{
  "status": "ok",
  "rows": [
    {
      "pid": "PID-00123",
      "pubname": "Tech Blog Indonesia",
      "team": "WEB_GV",
      "total_revenue": 5250000,
      "active_days": 28,
      "daily_avg_revenue": 187500
    },
    {
      "pid": "PID-00456",
      "pubname": "Gaming Portal",
      "team": "APP_GV",
      "total_revenue": 4780000,
      "active_days": 30,
      "daily_avg_revenue": 159333
    },
    ...
  ],
  "count": 20
}
```

✅ **Success:** Returns 20 rows, team field has APP_GV/WEB_GV/WEB_GTI values

---

### Scenario 3️⃣: "Ada publisher churn risk?"

**The Story:**
- Sales manager worried about top publishers leaving
- Wants to identify red flags early
- Example: Publisher used to make $10k/month, now only $2k/month = HIGH RISK
- Action: Personal call from account manager = save the account

**Technical Flow:**
```
API Request
  ↓
BigQuery Query:
  - Find publishers with historical revenue > $5000
  - Check recent 30-day activity
  - Calculate decline percentage
  ↓
Classify:
  - 🔴 Inactive: no recent activity
  - 🟠 High Risk: revenue dropped > 50%
  - 🟡 Monitor: revenue stable or growing
  ↓
Returns: Sorted by most at-risk first
```

**Expected Result:**
```bash
Response:
{
  "status": "ok",
  "rows": [
    {
      "pid": "PID-99999",
      "pubname": "Declining Publisher",
      "team": "WEB_GTI",
      "total_historical_revenue": 50000,
      "recent_30d_revenue": 0,
      "risk_level": "🔴 Inactive"
    },
    {
      "pid": "PID-88888",
      "pubname": "At Risk Publisher",
      "team": "APP_GV",
      "total_historical_revenue": 100000,
      "recent_30d_revenue": 40000,
      "risk_level": "🟠 High Risk"
    },
    ...
  ],
  "count": 15
}
```

✅ **Success:** Returns high-risk publishers with risk_level emoji classification

---

### Scenario 4️⃣: "Format apa yang trending?"

**The Story:**
- Product manager wants to know: which ad formats should we push?
- Sales team wants to know: what to recommend to publishers?
- Data: WipeAd +25% vs Sticky -15% = WipeAd is hot! 🔥

**Technical Flow:**
```
API Request
  ↓
BigQuery Query:
  - Current month revenue by product
  - Previous month revenue by product
  ↓
Calculate: Growth % for each format
  ↓
Classify:
  - 📈 Strong Growth: > 20%
  - 📊 Growing: 0-20%
  - ➡️ Stable: -10% to 0%
  - 📉 Declining: < -10%
```

**Expected Result:**
```bash
Response:
{
  "status": "ok",
  "rows": [
    {
      "product": "WipeAd",
      "current_revenue": 850000,
      "previous_revenue": 700000,
      "growth_pct": 21.43
    },
    {
      "product": "Sticky",
      "current_revenue": 620000,
      "previous_revenue": 680000,
      "growth_pct": -8.82
    },
    ...
  ],
  "count": 8
}
```

✅ **Success:** Returns all formats with growth_pct (positive/negative values)

---

### Scenario 5️⃣: "Team performance compare"

**The Story:**
- C-level check: which team is winning? APP_GV, WEB_GV, or WEB_GTI?
- Healthy competition between teams
- Data used for: KPI tracking, bonus calculation, resource allocation

**Technical Flow:**
```
API Request
  ↓
BigQuery Query:
  - GROUP BY team (derived from pic field)
  - SUM(revenue), SUM(profit)
  - COUNT(distinct publishers), COUNT(distinct days)
  ↓
Calculate: Profit margin % = profit/revenue*100
  ↓
Returns: 3 rows (one per team) with metrics
```

**Expected Result:**
```bash
Response:
{
  "status": "ok",
  "rows": [
    {
      "team": "APP_GV",
      "total_revenue": 8500000,
      "total_profit": 2550000,
      "num_publishers": 245,
      "active_days": 29
    },
    {
      "team": "WEB_GV",
      "total_revenue": 7200000,
      "total_profit": 2160000,
      "num_publishers": 312,
      "active_days": 30
    },
    {
      "team": "WEB_GTI",
      "total_revenue": 5800000,
      "total_profit": 1740000,
      "num_publishers": 198,
      "active_days": 28
    }
  ],
  "count": 3
}
```

✅ **Success:** Returns 3 rows (APP_GV, WEB_GV, WEB_GTI) with correct metrics

---

## Running Tests

### Option A: Automated (Recommended)

```bash
# Make script executable
chmod +x test-scenarios.sh

# Run all tests
./test-scenarios.sh

# Output:
# [Scenario 1] Daily vs 30-Day Average Performance
# ✅ SUCCESS
# Returned 1 rows
#
# [Scenario 2] Top 20 Publishers by Revenue (This Month)
# ✅ SUCCESS
# Returned 20 rows
#
# ... etc
```

### Option B: Manual Testing

**Scenario 1:**
```bash
curl -X POST http://localhost:3000/api/bigquery/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "WITH yesterday_data AS (SELECT 1 as grp, SUM(CAST(rev AS FLOAT64)) as yesterday_revenue FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\` WHERE DATE = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) GROUP BY 1), avg_30d AS (SELECT 1 as grp, AVG(CAST(rev AS FLOAT64)) as avg_30d_revenue FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\` WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND DATE < CURRENT_DATE() GROUP BY 1) SELECT y.yesterday_revenue, a.avg_30d_revenue, ROUND((y.yesterday_revenue - a.avg_30d_revenue) / a.avg_30d_revenue * 100, 2) as variance_pct FROM yesterday_data y LEFT JOIN avg_30d a ON y.grp = a.grp"
  }' | jq .
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Make sure dev server is running: `npm run dev` |
| BigQuery errors | Check service-account.json exists and credentials are valid |
| Timeout errors | Query might be complex, wait for it to complete |
| No data returned | Data might not exist for the selected time period |
| 500 error | Check server logs for detailed error message |

---

## Expected Success Rates

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Daily vs 30d Avg | ✅ Ready | Simple aggregation, should be fastest |
| 2. Top 20 Publishers | ✅ Ready | Standard GROUP BY, 2-3 sec |
| 3. Churn Risk Detection | ✅ Ready | More complex, 3-5 sec |
| 4. Format Trending | ✅ Ready | Month comparison, 2-4 sec |
| 5. Team Performance | ✅ Ready | Simple aggregation, 2-3 sec |

**All scenarios should complete within 5 seconds under normal conditions.**

---

## ✅ Definition of Success

For each scenario, we verify:

- ✅ No errors in response
- ✅ Returns correct number of rows
- ✅ All expected fields present
- ✅ Data types are correct (numbers, strings, etc)
- ✅ Business logic correct (e.g., team classification, risk level)
- ✅ Sorting correct (e.g., by revenue DESC)
- ✅ Response time < 5 seconds

---

## Next Actions

1. **Review the 5 scenarios above** ← You are here
2. **Start dev server:** `npm run dev` (in terminal 1)
3. **Run tests:** `./test-scenarios.sh` (in terminal 2)
4. **Monitor results:** All should show ✅ SUCCESS
5. **If any fail:** Check logs and debug
6. **Share results:** Send screenshot of successful test runs to stakeholders

---

## Files Created

- 📄 `TEST_SCENARIOS.md` - Detailed query breakdowns
- 📄 `SALES_TEST_SUMMARY.md` - Business context for each scenario
- 🔧 `test-scenarios.sh` - Automated test runner
- 📄 `TESTING_GUIDE.md` - This file
