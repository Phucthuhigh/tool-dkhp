# Xếp Thời Khóa Biểu UIT

Công cụ xếp thời khóa biểu cho sinh viên UIT. Chạy hoàn toàn phía trình duyệt (không gửi dữ liệu đi đâu), tất cả lưu ở `localStorage`.

## Tính năng

- **Tải file Excel TKB** (`.xlsx` xuất từ trang đăng ký) — kéo thả hoặc chọn file. Đọc cả 2 sheet (`TKB LT` và `TKB TH,ĐA,KLTN,TTTN`), tự dò dòng tiêu đề.
- **Danh sách lớp có checkbox** — bảng cuộn ngang được, lọc theo **từng cột** (Môn học, Mã lớp, Giảng viên, Thứ, Tiết, Phòng, TC) + nút chuyển nhanh **Tất cả / LT / TH**.
- **Chặn trùng lịch hoàn toàn** — lớp nào trùng thứ + tiết với lớp đã chọn sẽ bị khóa checkbox (tô đỏ), không cho chọn.
- **Ràng buộc Lý thuyết ↔ Thực hành** — khi đã chọn lớp LT (vd `IT007.R19`), các lớp TH tương ứng (`IT007.R19.1`, `IT007.R19.2`) được tô xanh gợi ý; các lớp TH của nhóm khác (`IT007.R20.1`) bị khóa. Có cảnh báo khi chọn LT mà chưa chọn TH (và ngược lại).
- **Nhiều phương án xếp TKB có đặt tên** — tạo / nhân bản / đổi tên / xóa từng phương án. Chuyển tab để so sánh. Tự lưu vào `localStorage`, F5 không mất. Dùng để dự phòng khi lớp ưu tiên tranh không được thì qua phương án 2, 3…
- **Lưới thời khóa biểu** — Thứ 2→7 × Tiết 1→10 (kèm khung giờ UIT). Lớp không có giờ cố định (ĐA/KLTN/TTTN) hiển thị riêng ở dưới.
- **Xuất ảnh PNG** cho thời khóa biểu của phương án đang xem.
- Hiển thị **tổng số tín chỉ** của phương án.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở http://localhost:5173

Build production:

```bash
npm run build
npm run preview
```

## Cấu trúc mã

- `src/lib/parseExcel.js` — đọc workbook, dò header, chuẩn hóa cột thành danh sách lớp.
- `src/lib/tiet.js` — bảng giờ UIT, parse chuỗi tiết (`"678910"` → `[6,7,8,9,10]`), parse thứ, kiểm tra trùng lịch.
- `src/lib/storage.js` — đọc/ghi `localStorage` (dữ liệu lớp + các phương án).
- `src/components/FileUpload.jsx` — vùng tải file.
- `src/components/ClassTable.jsx` — bảng lớp + bộ lọc + checkbox.
- `src/components/Timetable.jsx` — lưới thời khóa biểu (dùng cho cả hiển thị và xuất ảnh).
- `src/App.jsx` — trạng thái, logic chọn lớp / chặn trùng / quản lý phương án / xuất ảnh.

## Ghi chú về định dạng Excel

- Dòng tiêu đề nằm ở **dòng 8**, dữ liệu từ dòng 9 (tool tự dò nên vẫn chạy nếu lệch).
- Cột `THỨ` là số `2`–`7`, `*` nghĩa là không có giờ cố định.
- Cột `TIẾT` là các số tiết nối liền (`123`, `678910`); chỉ `10` là số 2 chữ số.
- Mỗi mã lớp là một dòng (một lớp học một buổi/tuần).
