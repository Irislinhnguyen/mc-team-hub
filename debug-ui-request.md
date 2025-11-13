# Debug UI Request

Để tìm ra tại sao UI hiển thị data sai, hãy làm theo các bước:

## Bước 1: Mở Browser DevTools

1. Mở Deep Dive page
2. Nhấn F12 để mở DevTools
3. Chọn tab "Network"
4. Filter by "Fetch/XHR"

## Bước 2: Trigger Request

1. Set filters:
   - Team: App
   - Custom dates: Sep 1-15 vs Sep 16-30
2. Click "Analyze" button
3. Trong Network tab, tìm request đến `/api/performance-tracker/deep-dive`

## Bước 3: Inspect Request

Click vào request đó và xem:

### Request Payload:
```json
{
  "perspective": "pid",
  "period1": { "start": "...", "end": "..." },
  "period2": { "start": "...", "end": "..." },
  "filters": { "team": "..." },
  ...
}
```

### Response:
```json
{
  "status": "ok",
  "data": [...],
  "summary": {
    "total_items": ???,
    "total_revenue_p2": ???,
    ...
  }
}
```

## Bước 4: Check Console Logs

Trong tab "Console", tìm các log messages:

- `[pid Perspective] Team filter detected: ...`
- `[pid Perspective] Converted team filter to X PICs: ...`
- `[pid Perspective] Filters before buildWhereClause: ...`
- `[pid Perspective] Results count: ...`

## Bước 5: Copy và gửi cho tôi:

1. Request payload (JSON)
2. Response body (JSON) - ít nhất là summary section
3. Console logs liên quan đến deep-dive API call

---

## Các vấn đề có thể:

### 1. Client-side filtering
UI có thể đang apply thêm filter sau khi nhận data từ API.

Check file: `UnifiedDeepDiveView.tsx` - có thể có logic filter data trước khi display.

### 2. Simplified filter đang active
Có thể có "Advanced Filters" đang được apply mà không thấy trong UI.

### 3. Cross-filter context
Context `CrossFilterContext` có thể đang filter data.

### 4. Cache stale
React Query cache có thể đang show old data.

Try: Hard refresh (Ctrl+Shift+R) hoặc clear site data.

### 5. Multiple API calls
UI có thể đang gọi API nhiều lần với params khác nhau.

Check Network tab để xem có bao nhiêu requests đến `/api/performance-tracker/deep-dive`.
