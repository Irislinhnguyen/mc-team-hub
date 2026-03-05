# 🚀 Hướng Dẫn Setup Auto-Sync - CS Sheet

## Bước 1: Mở Google Sheet

Mở link này: https://docs.google.com/spreadsheets/d/1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM/edit

## Bước 2: Mở Apps Script Editor

1. Vào menu **Extensions** (Tiện ích mở rộng)
2. Chọn **Apps Script**
3. Sẽ mở tab mới với Apps Script editor

## Bước 3: Copy Code

1. Mở file: `google-apps-script/SEA_CS_AutoSync.gs` (đã update sẵn domain)
2. **Copy TOÀN BỘ nội dung** file này
3. **Paste** vào Apps Script editor (thay thế hết code cũ nếu có)
4. Click **💾 Save** (hoặc Ctrl+S)

## Bước 4: Cài Trigger

1. Trong Apps Script editor, click icon **⏰ Triggers** (bên trái)
2. Click nút **+ Add Trigger** (góc dưới phải)
3. Điền như sau:
   - **Choose which function to run**: `onEdit`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `From spreadsheet`
   - **Select event type**: `On edit`
4. Click **Save**
5. Nếu hỏi authorize, click **Review permissions** → chọn account → **Allow**

## Bước 5: Test

### Test 1 - Test Connection:
1. Trong Apps Script editor
2. Chọn function `testWebhookConnection` từ dropdown
3. Click **Run** (▶️)
4. Xem log → phải thấy "✅ Webhook endpoint is accessible"

### Test 2 - Test Sync:
1. Chọn function `manualSync` từ dropdown
2. Click **Run** (▶️)
3. Xem log → phải thấy "✅ Sync triggered successfully"

### Test 3 - Test Auto-Sync:
1. Quay lại Google Sheet
2. Edit 1 cell bất kỳ trong sheet **SEA_CS**
3. Đợi 30 giây
4. Quay lại Apps Script → View → **Executions**
5. Phải thấy `onEdit` và `triggerSync` đã chạy

## ✅ Xong!

Từ giờ mỗi khi edit sheet SEA_CS:
- Đợi 30 giây (debounce)
- Tự động sync về database
- Không cần làm gì thêm

## 🔧 Troubleshooting

**Không sync?**
- Check xem trigger đã cài chưa: Run function `listTriggers()`
- Check config: Run function `showConfig()`

**Lỗi 401/403?**
- Token hoặc spreadsheet ID sai
- Liên hệ dev

**Muốn sync ngay không đợi 30s?**
- Run function `manualSync()` trong Apps Script
- Hoặc gọi API: `POST https://mc-team-hub.vercel.app/api/pipelines/quarterly-sheets/0aaba63e-4635-480b-85b0-89fd63267d8a/sync`

---

**Domain**: https://mc-team-hub.vercel.app ✅
**Webhook Token**: Đã config sẵn ✅
**Sheet**: SEA_CS ✅
**Status**: Ready to use ✅
