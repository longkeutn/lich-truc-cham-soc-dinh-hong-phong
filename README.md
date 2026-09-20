# 🏥 Lịch Trực Chăm Sóc - Đinh Hồng Phong

Hệ thống web app điều phối ca trực chăm sóc bệnh nhân dành cho gia đình, tích hợp đồng bộ dữ liệu hai chiều (CRUD) theo thời gian thực với Google Sheets qua Google Apps Script Web App.

---

## ✨ Tính Năng Nổi Bật

- 📅 **Lịch trực linh hoạt theo 2 giai đoạn:**
  - **Giai đoạn 1 (ICU - Nằm viện):** 3 ca 8 tiếng (Sáng, Chiều, Đêm), 1 người trực/ca.
  - **Giai đoạn 2 (Phục hồi / Tại nhà):** 2 ca 12 tiếng (Ngày, Đêm), 2 người trực/ca.
- 👥 **Quản lý 7 thành viên gia đình:** Tự động gán mã màu, avatar và thống kê số giờ trực của từng người.
- ✅ **Checklist chăm sóc y tế:** Bơm súp qua sonde, uống thuốc, thay bỉm vệ sinh, lật trở chống loét 2h/lần.
- 📋 **Bàn giao ca & Ghi nhận sinh hiệu:** Cập nhật Huyết áp, SpO2, Mạch, Nhiệt độ và lời dặn ca trước.
- 🚨 **Danh bạ SOS khẩn cấp:** Tổng đài 115, Bác sĩ điều trị ICU, Điều dưỡng ngoài giờ, người thân giữ quỹ thuốc. Hỗ trợ bấm gọi và đọc số bằng giọng nói tiếng Việt.
- 📢 **Nhắc nhở y tế quan trọng trong ngày:** Ghi chú thuốc huyết áp, chế độ ăn súp ấm.
- 📸 **Xuất lịch trực chia sẻ Zalo:** Xuất lịch tuần dưới dạng ảnh PNG chất lượng cao hoặc file PDF để gửi vào nhóm Zalo gia đình chỉ với 1 click.
- 📊 **Thống kê công sức:** Biểu đồ công bằng số ca ngày/đêm và tổng số giờ trực của mỗi thành viên.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend / Storage:** Google Sheets API qua Google Apps Script Web App (`doGet` / `doPost`), Server Actions Next.js.
- **Dự phòng (Fallback):** In-Memory Store tự động khi mạng yếu hoặc timeout.

---

## 🚀 Cài Đặt & Chạy Cục Bộ (Local Development)

### 1. Cài đặt thư viện:
```bash
npm install
```

### 2. Cấu hình biến môi trường:
Tạo file `.env.local` từ mẫu [`.env.example`](.env.example):
```env
GOOGLE_SHEETS_WEBAPP_URL="https://script.google.com/macros/s/AKfycb.../exec"
```

### 3. Chạy ứng dụng:
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

---

## ☁️ Triển Khai Lên Vercel

1. Đẩy mã nguồn lên kho lưu trữ Git (GitHub / GitLab).
2. Kết nối repo với dự án mới trên [Vercel](https://vercel.com).
3. Thêm 1 biến môi trường tại **Settings** &rarr; **Environment Variables**:
   - `GOOGLE_SHEETS_WEBAPP_URL`: URL Web App sinh ra từ Google Apps Script của bạn.
4. Nhấn **Deploy**.

