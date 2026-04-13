# 📁 Hướng dẫn Quản lý Assets (Ảnh, Icons, Files)

## 📂 Cấu trúc Thư mục

```
FE/
├── public/              # Static assets (không cần import)
│   ├── images/         # Ảnh static (logo, favicon, etc.)
│   ├── icons/          # Icons static
│   └── fonts/          # Fonts (nếu có)
│
└── src/
    └── assets/         # Assets cần import (được optimize bởi Vite)
        ├── images/      # Ảnh components
        ├── icons/       # Icons components
        └── illustrations/ # Illustrations
```

---

## 🎯 Khi nào dùng thư mục nào?

### 1. **`public/images/`** - Static Assets

**Dùng cho:**
- ✅ Logo chính của app
- ✅ Favicon
- ✅ Ảnh background lớn
- ✅ Ảnh không thay đổi
- ✅ Ảnh được reference bằng URL trực tiếp

**Cách dùng:**
```tsx
// Trong component
<img src="/images/logo.png" alt="Logo" />

// Hoặc trong CSS
background-image: url('/images/background.jpg');
```

**Ưu điểm:**
- Không cần import
- Có thể reference bằng đường dẫn tuyệt đối
- Phù hợp cho ảnh lớn, ít thay đổi

**Nhược điểm:**
- Không được optimize bởi Vite
- Không có hash trong filename (cache issues)

---
