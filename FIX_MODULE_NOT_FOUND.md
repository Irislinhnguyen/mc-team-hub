# Fix: Module Not Found Error

## Lỗi: Can't resolve '@/lib/hooks/useFilterPresets'

### Giải pháp:

#### Cách 1: Restart Dev Server (Nhanh nhất)

```bash
# Stop server (Ctrl+C)
# Rồi chạy lại
npm run dev
```

#### Cách 2: Clear Next.js Cache

```bash
# Stop server trước
rm -rf .next
npm run dev
```

#### Cách 3: Clean Install

```bash
# Stop server
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

#### Cách 4: Kiểm tra file có tồn tại không

```bash
# Chạy lệnh này
ls -la lib/hooks/useFilterPresets.ts
```

Nếu file KHÔNG tồn tại, copy từ backup hoặc tạo lại.

---

## ✅ Sau khi Fix:

Chạy lại:
```bash
npm run dev
```

Lỗi sẽ biến mất!
