# StudentHub — Cổng thông tin quản lý sinh viên

Website quản lý sinh viên viết bằng HTML5, CSS3 (Flexbox/Grid) và JavaScript thuần, không cần build.
Dữ liệu lấy từ file Excel `data/students.xlsx`.

## Chạy thử

Mở `login.html` bằng trình duyệt (bấm đúp là được), hoặc chạy qua web server:

```bash
python -m http.server 8000
# rồi mở http://localhost:8000/login.html
```

**Đăng nhập:** mã sinh viên (VD `251210934`) hoặc email sinh viên, mật khẩu `123`
(mật khẩu demo dùng chung, chỉ kiểm tra trên trình duyệt).

## Các trang

| Trang | File | Nội dung |
|---|---|---|
| Đăng nhập | `login.html` | Đăng nhập bằng mã SV / email, chuyển về trang đang mở |
| Tin tức | `index.html` | Khung giao diện chung (Sidebar + Navbar) |
| Profile | `profile.html` | Thông tin cá nhân, đổi ảnh đại diện, cập nhật SĐT & tài khoản ngân hàng |
| Học tập | `hoc-tap.html` | Bảng điểm theo năm, điểm hệ 10/hệ 4, xếp loại học lực, học phần nợ, chương trình học |
| Lịch học | `lich-hoc.html` | Thời khóa biểu theo tuần, tự thêm lịch phụ đạo tối cho môn điểm < 2.0 |
| Ký túc xá | `dormitory.html` | Đăng ký phòng (10/8/5 người, khu Nam/Nữ), lịch sử đăng ký |
| Thư viện | `library.html` | Giờ mở cửa, chỗ ngồi phòng đọc, tra cứu & mượn / gia hạn / trả sách |
| Học phí | `hoc-phi.html` | Tổng hợp nợ/thừa, khoản phải nộp/đã nộp, hóa đơn theo năm học |
| Thanh toán online | `thanh-toan-online.html` | Chọn khoản cần nộp, cổng QR (minh họa), xác nhận thanh toán |

## Dữ liệu

`data/students.xlsx` là nguồn dữ liệu duy nhất, gồm các sheet:

- Danh sách sinh viên + điểm hệ 4 từng môn (Năm 1–4) + GPA
- Thời khóa biểu chính thức, lịch phụ đạo tối, danh sách SV phải phụ đạo
- Cấu hình học phí, chi tiết học phí theo năm, tổng hợp học phí

Trình duyệt không đọc trực tiếp được `.xlsx` khi mở bằng `file://`, nên dữ liệu được chuyển sang
`data/students.js`. **Sau khi sửa Excel, chạy lại:**

```bash
pip install openpyxl
python tools/xlsx_to_js.py        # cập nhật data/students.js
python tools/build_tuition.py     # (tùy chọn) tạo lại 3 sheet học phí, rồi chạy lại lệnh trên
```

`data/books.js` là danh mục sách mẫu cho trang Thư viện.

Đăng ký ký túc xá, mượn sách, thanh toán online và thông tin cập nhật ở Profile được lưu trong
`localStorage` của trình duyệt (chưa có server).

## Cấu trúc

```
├── index.html, style.css, app.js     # khung chung, phiên đăng nhập, tiện ích dùng chung
├── login.*  profile.*  hoc-tap.*  lich-hoc.*  dormitory.*  library.*
├── hoc-phi.*  thanh-toan-online.*  finance.js  tai-chinh.css
├── data/   students.xlsx, students.js (tự sinh), books.js
└── tools/  xlsx_to_js.py, build_tuition.py
```
