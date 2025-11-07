# BigQuery AVG() Error - Fixed ✅

## Lỗi gốc
```
[BigQuery] Query execution failed: [Error: No matching signature for aggregate function AVG
  Argument types: STRUCT<pid INT64, year INT64, month INT64, ...>
  Signature: AVG(INT64)
    Argument 1: Unable to coerce type STRUCT<pid INT64, year INT64, month INT64, ...> to expected type INT64
```

Lỗi xảy ra ở line 109 trong query (tương ứng với line 201 trong file `deepDiveQueryBuilder.ts`)

## Nguyên nhân

Trong file `lib/services/deepDiveQueryBuilder.ts`, hàm `buildMonthlyAverageCTE()` có xung đột tên:

```sql
-- CTE tên là "monthly_revenue"
monthly_revenue AS (
  SELECT
    ${groupBy},
    year,
    month,
    SUM(rev) as monthly_revenue  -- ❌ Column cũng tên là "monthly_revenue"
  FROM ${config.tableName}
  ...
  GROUP BY ${groupBy}, year, month
),

-- CTE tiếp theo cố gắng dùng AVG()
monthly_avg AS (
  SELECT
    ${groupBy},
    AVG(monthly_revenue) as avg_monthly_revenue,  -- ❌ BigQuery nhầm lẫn: lấy STRUCT hay column?
    COUNT(*) as months_with_data
  FROM monthly_revenue
  GROUP BY ${groupBy}
)
```

BigQuery không biết `monthly_revenue` ám chỉ column hay CTE, nên cố gắng tính AVG trên toàn bộ STRUCT (bao gồm cả pid, year, month, monthly_revenue) → lỗi type mismatch.

## Giải pháp

Đổi tên column `monthly_revenue` thành `monthly_rev` để tránh xung đột:

```sql
monthly_revenue AS (
  SELECT
    ${groupBy},
    year,
    month,
    SUM(rev) as monthly_rev  -- ✅ Đổi tên thành "monthly_rev"
  FROM ${config.tableName}
  ...
  GROUP BY ${groupBy}, year, month
),

monthly_avg AS (
  SELECT
    ${groupBy},
    AVG(monthly_rev) as avg_monthly_revenue,  -- ✅ Rõ ràng reference đến column
    COUNT(*) as months_with_data
  FROM monthly_revenue
  GROUP BY ${groupBy}
)
```

## File đã sửa

- **File**: `lib/services/deepDiveQueryBuilder.ts`
- **Lines**: 189, 201
- **Function**: `buildMonthlyAverageCTE()`

## Test Results ✅

Đã test đầy đủ **6 perspectives**:

| Perspective | Status | Items | Note |
|------------|--------|-------|------|
| Team | ✅ Pass | 3 | Aggregates PICs into teams |
| PIC | ✅ Pass | 27 | Person in Charge analysis |
| PID | ✅ Pass | 268 | Publisher performance |
| MID | ✅ Pass | 710 | Media property analysis |
| Product | ✅ Pass | 32 | Product performance |
| Zone | ✅ Pass | 2811 | Zone-level analysis |

**Kết quả**: 6/6 perspectives hoạt động bình thường, không còn lỗi BigQuery.

## Tác động

- ✅ Fix lỗi AVG() trong query 6-month monthly average cho lost items
- ✅ Tất cả 6 perspectives đều hoạt động ổn định
- ✅ Không ảnh hưởng đến logic khác
- ✅ Query execution thành công với status 200

## Test Scripts

- `test-deep-dive-fix.mjs` - Test đầy đủ 6 perspectives
- `test-avg-monthly-fix.mjs` - Test chi tiết avg_monthly_revenue cho lost items
