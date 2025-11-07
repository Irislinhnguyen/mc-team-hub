# Hướng Dẫn Sử Dụng Filter Presets

## ✅ Đã Hoàn Thành

1. ✅ Chạy SQL migration (bạn đã làm xong)
2. ✅ Cài đặt tất cả dependencies
3. ✅ Tạo tất cả UI components cần thiết
4. ✅ Tạo API endpoints
5. ✅ Tạo React hooks và components

## 🚀 Bây Giờ Làm Gì?

### Bước 1: Test Thử Trên Một Trang

Mình đã tạo sẵn code mẫu trong file: **`EXAMPLE_DAILY_OPS_WITH_PRESETS.tsx`**

**Cách áp dụng:**

1. Mở file: `app/(protected)/performance-tracker/daily-ops/page.tsx`

2. Copy toàn bộ code từ `EXAMPLE_DAILY_OPS_WITH_PRESETS.tsx` và thay thế vào

3. Những thay đổi chính:
   - Thêm import `FilterPresetManager`
   - Thêm import type `AnalyticsPage`
   - Cập nhật `useCrossFilter()` để có `exportCrossFilters` và `importCrossFilters`
   - Thêm `pageId: AnalyticsPage = 'daily-ops'`
   - Thêm hàm `handleLoadPreset`
   - Thêm component `<FilterPresetManager>` vào JSX (trước `<MetadataFilterPanel>`)

### Bước 2: Chạy Dev Server

```bash
npm run dev
```

### Bước 3: Test Tính Năng

1. Mở trình duyệt và vào trang Daily Ops

2. Bạn sẽ thấy một thanh mới phía trên filter panel:
   ```
   ┌────────────────────────────────────────────────┐
   │  🔖 Select a filter preset...  ▼   📁 Save As  │
   └────────────────────────────────────────────────┘
   ```

3. **Test Save (Lưu filter):**
   - Chọn một số filters (team, pic, v.v.)
   - Click "Save As"
   - Nhập tên: "Test Filter"
   - Click "Save Preset"
   - ✅ Xong! Filter đã được lưu

4. **Test Load (Load filter):**
   - Clear tất cả filters
   - Click dropdown "Select a filter preset..."
   - Chọn "Test Filter"
   - ✅ Tất cả filters được apply lại!

5. **Test Update (Cập nhật filter):**
   - Load một preset
   - Thay đổi một số filters
   - Thấy cảnh báo "Unsaved changes"
   - Click "Update"
   - ✅ Preset được cập nhật!

6. **Test Set Default:**
   - Click icon ⋮ bên cạnh một preset
   - Chọn "Set as default"
   - Icon ⭐ xuất hiện
   - Refresh trang
   - ✅ Filter tự động load!

7. **Test Share:**
   - Click icon ⋮ bên cạnh một preset
   - Chọn "Share"
   - Nhập email đồng đội
   - Chọn permission (View Only / Can Edit)
   - Click "Share Preset"
   - ✅ Đồng đội có thể thấy preset trong "Shared with me"!

## 📋 Tích Hợp Vào Các Trang Khác

Sau khi test OK trên Daily Ops, bạn có thể tích hợp vào các trang khác:

### Template Nhanh:

```tsx
// 1. Thêm imports
import { FilterPresetManager } from '../../../components/performance-tracker/FilterPresetManager'
import type { AnalyticsPage } from '../../../../lib/types/filterPreset'

// 2. Update useCrossFilter
const { crossFilters, exportCrossFilters, importCrossFilters } = useCrossFilter()

// 3. Thêm page ID
const pageId: AnalyticsPage = 'deep-dive' // hoặc 'publisher-summary', etc.

// 4. Thêm handler
const handleLoadPreset = useCallback(
  (filters: Record<string, any>, crossFilters: any[]) => {
    setCurrentFilters(filters)
    importCrossFilters(crossFilters)
  },
  [importCrossFilters]
)

// 5. Thêm vào JSX (TRƯỚC MetadataFilterPanel)
<FilterPresetManager
  page={pageId}
  currentFilters={currentFilters}
  currentCrossFilters={exportCrossFilters()}
  onLoadPreset={handleLoadPreset}
/>
```

### Danh Sách Page IDs Hợp Lệ:

- `'daily-ops'` ✅
- `'deep-dive'`
- `'publisher-summary'`
- `'business-health'`
- `'profit-projections'`
- `'sales-tracking'`
- `'publisher-health'`
- `'team-setup'`

## 🎯 Tính Năng Cho Users

### 💾 Save Filters
- User chọn filters → Click "Save As" → Đặt tên → Save
- Có thể set làm default (tự động load)
- Có thể thêm description

### 📂 Load Filters
- Click dropdown
- Chọn preset từ:
  - **My Presets**: Của mình
  - **Shared with me**: Người khác share

### ✏️ Update Filters
- Load preset → Thay đổi → Click "Update"
- Chỉ owner hoặc người có quyền edit mới update được

### 🔗 Share Filters
- Click ⋮ → "Share"
- Nhập email đồng đội
- Chọn permission:
  - **View Only**: Chỉ xem và dùng
  - **Can Edit**: Có thể chỉnh sửa

### ⭐ Set Default
- Click ⋮ → "Set as default"
- Preset tự động load khi mở trang

### ⚠️ Unsaved Changes
- Khi thay đổi filters sau khi load preset
- Hiện cảnh báo màu cam
- Nhắc user save lại

## 🔧 Troubleshooting

### Lỗi: "Cannot find module"
- Restart dev server:
  ```bash
  # Ctrl+C để stop
  npm run dev
  ```

### Lỗi: API 401 Unauthorized
- Đảm bảo đã login
- Check Supabase auth

### Preset không hiện
- Check browser console có lỗi không
- Kiểm tra SQL migration đã chạy:
  ```bash
  supabase db push
  ```

### Toast không hiện
- Check `app/layout.tsx` có `<Toaster />` chưa
- Đã có sẵn rồi, không cần làm gì

## 📚 Files Quan Trọng

### Backend:
- `supabase/migrations/20250104_create_filter_presets.sql` - Database schema
- `app/api/filter-presets/route.ts` - API endpoints
- `app/api/filter-presets/[id]/route.ts` - Update/Delete
- `app/api/filter-presets/[id]/share/route.ts` - Sharing

### Frontend:
- `lib/hooks/useFilterPresets.ts` - React hook chính
- `app/components/performance-tracker/FilterPresetManager.tsx` - UI chính
- `app/components/performance-tracker/SavePresetModal.tsx` - Modal save
- `app/components/performance-tracker/SharePresetModal.tsx` - Modal share

### Types:
- `lib/types/filterPreset.ts` - TypeScript types

## 🎉 Tóm Tắt

1. ✅ **SQL migration** - Done
2. ✅ **Dependencies** - Đã cài
3. ✅ **Components** - Đã tạo
4. 🔄 **Integration** - Copy code từ `EXAMPLE_DAILY_OPS_WITH_PRESETS.tsx` vào Daily Ops
5. 🧪 **Test** - Chạy `npm run dev` và test các tính năng
6. 🚀 **Roll out** - Áp dụng cho các trang khác

## ❓ Cần Giúp?

Xem các file documentation:
- `FILTER_PRESETS_QUICKSTART.md` - Hướng dẫn nhanh (English)
- `FILTER_PRESETS_INTEGRATION_GUIDE.md` - Chi tiết tích hợp
- `FILTER_PRESETS_IMPLEMENTATION_SUMMARY.md` - Technical details

---

**Chúc bạn thành công! 🎊**
