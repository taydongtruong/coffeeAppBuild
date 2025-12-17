# ☕ Coffee Shop Management System (POS & Kiosk)

Một hệ thống quản lý quán cà phê toàn diện (Full-stack) cho phép khách hàng tự đặt món tại Kiosk và giúp quản lý điều hành mọi hoạt động từ nhân sự đến thực đơn.



## 🌟 Tính năng nổi bật

### 1. Đối với Khách hàng (Kiosk Mode)
* Giao diện thân thiện, ấm cúng, tối ưu cho màn hình cảm ứng.
* Dễ dàng duyệt thực đơn theo danh mục (Cà phê, Trà, Bánh...).
* Đặt món nhanh chóng và gửi đơn hàng trực tiếp xuống quầy.

### 2. Đối với Nhân viên (Staff Order)
* Tạo đơn hàng tại bàn cho khách.
* Theo dõi trạng thái đơn hàng (Đang chờ, Đang làm, Đã xong).
* Giao diện responsive, dễ dàng thao tác trên máy tính bảng hoặc điện thoại.

### 3. Đối với Quản lý (Admin Dashboard)
* **Quản lý Thực đơn:** Thêm/sửa/xóa món ăn và các danh mục linh hoạt.
* **Quản lý Nhân sự:** Cấp tài khoản, phân quyền (Manager/Staff) và giám sát nhân viên.
* **Bảo mật:** Hệ thống đăng nhập xác thực bằng JWT (JSON Web Token).

## 🛠 Công nghệ sử dụng

* **Frontend:** React.js, React Router, CSS3 (Flexbox & Grid Layout).
* **Backend:** Python Flask, Flask-JWT-Extended, Flask-CORS.
* **Database:** SQLite (Dễ dàng cài đặt và di chuyển).
* **Thiết kế:** Responsive Design (Tương thích đa thiết bị).



## 📂 Cấu trúc dự án

```text
coffeeApp/
├── backend/            # Mã nguồn Python Flask
│   ├── app.py          # File chạy chính & API
│   ├── database.db     # Cơ sở dữ liệu SQLite
│   └── requirements.txt # Danh sách thư viện cần cài đặt
├── frontend/           # Mã nguồn React.js
│   ├── src/            # Components và logic xử lý
│   ├── public/         # Tệp tĩnh và index.html
│   └── package.json    # Quản lý thư viện Node.js
└── README.md
