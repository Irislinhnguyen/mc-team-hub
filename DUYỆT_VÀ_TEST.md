# 🧪 Duyệt và Test Backend - 5 Tình Huống Sales Thực Tế

## 📋 Tóm Tắt Nhanh

Đây là **5 tình huống thực tế nhất** mà sales team sẽ hỏi. Mỗi scenario test một số templates để đảm bảo backend chạy đúng.

---

## 🎯 5 Tình Huống Duyệt

### 1️⃣ "Hôm qua performance gimana?"

**Sales hỏi:**
```
"Revenue hôm qua tốt không? Tăng hay giảm so với bình thường?"
```

**Công việc backend:**
- Lấy total revenue hôm qua
- So sánh với trung bình 30 ngày
- Tính % thay đổi

**Kết quả mong đợi:**
```json
{
  "yesterday_revenue": 1250000,
  "avg_30d_revenue": 1100000,
  "variance_pct": 13.64  ← Tăng 13.64%!
}
```

**Success:** ✅ Returns 1 row với con số có ý nghĩa

---

### 2️⃣ "Top 20 publishers bulan ini apa aja?"

**Sales hỏi:**
```
"Publisher nào revenue terbaik? Team nana dominan?
Bao nhiêu hari hoạt động? Revenue hàng ngày bao nhiêu?"
```

**Công việc backend:**
- GROUP BY publisher (pid, pubname)
- SUM(revenue), COUNT(active_days)
- ORDER BY revenue DESC
- LIMIT 20

**Kết quả mong đợi:**
```json
[
  {
    "pid": "PID-00123",
    "pubname": "Tech Blog Indonesia",
    "team": "WEB_GV",
    "total_revenue": 5250000,
    "active_days": 28,
    "daily_avg_revenue": 187500
  },
  ... 19 rows more ...
]
```

**Success:** ✅ Returns 20 rows, team classification đúng (APP_GV/WEB_GV/WEB_GTI)

---

### 3️⃣ "Có publisher nào churn risk?"

**Sales hỏi:**
```
"Ai từng có revenue lớn nhưng giờ drop drastis?
Ai cần follow-up NGAY?"
```

**Công việc backend:**
- Tìm publisher có historical revenue > $5000
- Check recent 30 days activity
- Calculate decline %
- Classify: 🔴 Inactive / 🟠 High Risk / 🟡 Monitor

**Kết quả mong đợi:**
```json
[
  {
    "pid": "PID-99999",
    "pubname": "Declining Publisher",
    "total_historical_revenue": 50000,
    "recent_30d_revenue": 0,
    "risk_level": "🔴 Inactive"  ← Không hoạt động!
  },
  {
    "pid": "PID-88888",
    "pubname": "At Risk Pub",
    "total_historical_revenue": 100000,
    "recent_30d_revenue": 40000,
    "risk_level": "🟠 High Risk"  ← Revenue drop 60%!
  }
]
```

**Success:** ✅ Trả về những publishers at-risk đúng, emoji classification chính xác

---

### 4️⃣ "Format apa yang trending sekarang?"

**Sales hỏi:**
```
"Format mana hot? WipeAd vs Sticky cái nào bagus?
Format nào drop?"
```

**Công việc backend:**
- Revenue bulan ini by format
- Revenue bulan lalu by format
- Calculate growth %
- Classify: 📈 Strong Growth / 📊 Growing / ➡️ Stable / 📉 Declining

**Kết quả mong đợi:**
```json
[
  {
    "product": "WipeAd",
    "current_revenue": 850000,
    "previous_revenue": 700000,
    "growth_pct": 21.43  ← 📈 Hot format!
  },
  {
    "product": "Sticky",
    "current_revenue": 620000,
    "previous_revenue": 680000,
    "growth_pct": -8.82  ← 📉 Cooling down
  }
]
```

**Success:** ✅ All formats returned, growth_pct sorted DESC (trending first)

---

### 5️⃣ "Team performance compare"

**Sales hỏi:**
```
"Team nana paling bagus sekarang?
APP_GV, WEB_GV, WEB_GTI compare?"
```

**Công việc backend:**
- GROUP BY team (APP_GV, WEB_GV, WEB_GTI)
- SUM(revenue), SUM(profit)
- COUNT(distinct publishers)
- Calculate profit margin %

**Kết quả mong đợi:**
```json
[
  {
    "team": "APP_GV",
    "total_revenue": 8500000,
    "total_profit": 2550000,
    "num_publishers": 245,
    "profit_margin_pct": 30
  },
  {
    "team": "WEB_GV",
    "total_revenue": 7200000,
    "total_profit": 2160000,
    "num_publishers": 312,
    "profit_margin_pct": 30
  },
  {
    "team": "WEB_GTI",
    "total_revenue": 5800000,
    "total_profit": 1740000,
    "num_publishers": 198,
    "profit_margin_pct": 30
  }
]
```

**Success:** ✅ Returns exactly 3 rows (1 for each team), metrics correct

---

## 🚀 Hướng Dẫn Test

### Bước 1: Duyệt các scenarios
Bạn đang ở đây! Đã review xong 5 scenarios rồi. ✅

### Bước 2: Start dev server
```bash
npm run dev
```
Chờ tới khi thấy dòng "ready on http://localhost:3000"

### Bước 3: Run automated tests
```bash
chmod +x test-scenarios.sh
./test-scenarios.sh
```

### Bước 4: Kiểm tra kết quả
Output sẽ hiện:
```
[Scenario 1] Daily vs 30-Day Average Performance
✅ SUCCESS
Returned 1 rows

[Scenario 2] Top 20 Publishers by Revenue (This Month)
✅ SUCCESS
Returned 20 rows

... etc ...
```

Tất cả 5 scenarios đều phải là **✅ SUCCESS**

---

## 📚 Tài Liệu Chi Tiết

| File | Mục Đích |
|------|---------|
| **TEST_SCENARIOS.md** | SQL queries chi tiết cho mỗi scenario |
| **SALES_TEST_SUMMARY.md** | Business context & expected output |
| **TESTING_GUIDE.md** | Complete testing instructions |
| **SCENARIOS_VISUAL.txt** | Visual summary với tables & emojis |
| **test-scenarios.sh** | Automated test runner script |

---

## ✅ Tiêu Chí Thành Công

Mỗi scenario phải đáp ứng:

**Scenario 1:**
- ✅ Returns 1 row
- ✅ variance_pct is a number (positive/negative)
- ✅ Response < 5 seconds

**Scenario 2:**
- ✅ Returns 20 rows
- ✅ All have team field (APP_GV, WEB_GV, hoặc WEB_GTI)
- ✅ Sorted by revenue DESC

**Scenario 3:**
- ✅ Returns at-risk publishers
- ✅ risk_level has emoji (🔴, 🟠, hoặc 🟡)
- ✅ Sorted by most at-risk first

**Scenario 4:**
- ✅ All formats returned
- ✅ growth_pct sorted DESC (trending first)
- ✅ Some positive, some negative values

**Scenario 5:**
- ✅ Exactly 3 rows (APP_GV, WEB_GV, WEB_GTI)
- ✅ All have revenue, profit, num_publishers
- ✅ Sorted by revenue DESC

---

## 📊 Templates được Test

| Scenario | Templates |
|----------|-----------|
| 1 | `team_daily_vs_30d` |
| 2 | `top_publishers_by_metric` |
| 3 | `churn_risk_detector` |
| 4 | `adformat_growth_decline` |
| 5 | `team_prediction_breakdown` |

---

## 🎬 Quy Trình Chiều Nay

1. ✅ Duyệt scenarios (bạn vừa làm)
2. → Start dev server: `npm run dev`
3. → Run tests: `./test-scenarios.sh`
4. → Check output (should all be ✅)
5. → Share results với team

---

## 🔗 Quick Links

- 📖 View detailed scenarios: `cat TEST_SCENARIOS.md`
- 🔧 Run tests: `./test-scenarios.sh`
- 📊 Business context: `cat SALES_TEST_SUMMARY.md`
- 🎨 Visual reference: `cat SCENARIOS_VISUAL.txt`

---

## 💡 Notes

- Tất cả data là **REAL** từ BigQuery, không phải test data
- Queries sử dụng correct schema từ `agg_monthly_with_pic_table`
- Templates đã được fix để dùng `rev` (revenue), `profit`, `req` (impressions)
- Team classification sử dụng pic field: APP_GV, WEB_GV, WEB_GTI
- Response time bình thường 2-5 seconds

---

**Ready to test? Go ahead with Scenario 1 first!** 🚀
