# ☕ Coffee Shop Management System (POS & Kiosk)

Một hệ thống quản lý quán cà phê toàn diện (Full-stack) được tối ưu hóa để triển khai trên Cloud (Render) và vận hành mượt mà tại máy bộ bộ (Local). Hệ thống cho phép khách hàng tự đặt món tại Kiosk và giúp quản lý điều hành mọi hoạt động từ nhân sự đến thực đơn.

## 🌟 Tính năng nổi bật

### 1. Đối với Khách hàng (Kiosk Mode)
* **Giao diện Kiosk:** Thân thiện, ấm cúng, tối ưu cho màn hình cảm ứng tại quán.
* **Duyệt Thực đơn:** Phân loại thông minh theo danh mục (Cà phê, Trà, Bánh...).
* **Đặt món tự động:** Đơn hàng được gửi trực tiếp đến hệ thống quản lý của nhân viên.

### 2. Đối với Nhân viên & POS
* **Quản lý Đơn hàng:** Tạo đơn tại quầy, theo dõi trạng thái (Đang chờ, Đang làm, Đã xong).
* **Responsive:** Thao tác mượt mà trên máy tính bảng, điện thoại và PC.

### 3. Đối với Quản lý (Admin Dashboard)
* **Thống kê:** Theo dõi doanh thu và hiệu suất bán hàng.
* **Quản lý Thực đơn & Nhân sự:** Thêm/sửa/xóa món, cấp quyền tài khoản (Manager/Staff).
* **Bảo mật:** Xác thực hệ thống bằng JWT (JSON Web Token).

## 🛠 Công nghệ sử dụng

* **Frontend:** React.js, React Router, Lucide Icons.
* **Backend:** Python Flask, Flask-SQLAlchemy, Flask-JWT-Extended.
* **Database:** PostgreSQL (Production trên Render) & SQLite (Local Development).
* **Deployment:** Đã cấu hình sẵn cho Render (thông qua `Procfile`).

## 📂 Cấu trúc dự án chuẩn hóa

```text
coffeeAppBuild/
├── backend/                # Server-side (Flask)
│   ├── app.py              # API Logic & Database Models
│   ├── requirements.txt    # Danh sách thư viện Python
│   └── Procfile            # Cấu hình triển khai Render
├── frontend/               # Client-side (React)
│   ├── src/                # Components & CSS (Login, Dashboard, Kiosk...)
│   ├── public/             # Tệp tĩnh & Index HTML
│   └── package.json        # Scripts & Dependencies
├── .gitignore              # Cấu hình chặn file rác cho cả dự án
├── setup_and_run.bat       # Script khởi chạy nhanh 1-click trên Windows
└── README.md               # Tài liệu hướng dẫn dự án