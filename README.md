# StudentHub — Cổng thông tin quản lý sinh viên

Website quản lý sinh viên viết bằng HTML5, CSS3 (Flexbox/Grid) và JavaScript thuần, không cần build.
Dữ liệu lấy từ file Excel `data/students.xlsx`.

## Chạy thử

**File tổng: `index.html`** ở thư mục gốc — mở file này (bấm đúp là được) để chạy toàn bộ hệ thống.
Chưa đăng nhập sẽ tự chuyển sang trang đăng nhập, đăng nhập xong quay về Trang chủ với thẻ tóm tắt
và liên kết tới mọi phân hệ. Hoặc chạy qua web server:

```bash
python -m http.server 8000
# rồi mở http://localhost:8000/
```

**Đăng nhập:** mã sinh viên (VD `251210934`) hoặc email sinh viên, mật khẩu `123`
(mật khẩu demo dùng chung, chỉ kiểm tra trên trình duyệt).

## Các trang

| Phân hệ | Thư mục / file | Nội dung |
|---|---|---|
| Trang chủ | `index.html` | **File tổng**: tóm tắt từng phân hệ (GPA, lịch hôm nay, phòng KTX, sách đang mượn, học phí) |
| Đăng nhập | `features/dang-nhap/` | Đăng nhập bằng mã SV / email, quay lại đúng trang đang mở |
| Profile | `features/profile/` | Thông tin cá nhân, đổi ảnh đại diện, cập nhật SĐT & tài khoản ngân hàng |
| Học tập | `features/hoc-tap/` | Bảng điểm theo năm, điểm hệ 10/hệ 4, xếp loại học lực, học phần nợ, chương trình học |
| Lịch học | `features/lich-hoc/` | Thời khóa biểu theo tuần, tự thêm lịch phụ đạo tối cho môn điểm < 2.0 |
| Ký túc xá | `features/ky-tuc-xa/` | Đăng ký phòng (10/8/5 người, khu Nam/Nữ), lịch sử đăng ký |
| Thư viện | `features/thu-vien/` | Giờ mở cửa, chỗ ngồi phòng đọc, tra cứu & mượn / gia hạn / trả sách |
| Tài chính | `features/tai-chinh/` | `hoc-phi.html` (nợ/thừa, phải nộp/đã nộp, hóa đơn) và `thanh-toan-online.html` (cổng QR minh họa) |

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
index.html                 # FILE TỔNG - Trang chủ, chạy toàn bộ hệ thống
assets/
  css/style.css            # giao diện chung (Sidebar, Navbar, layout, responsive)
  css/home.css, js/home.js # Trang chủ
  js/app.js                # phiên đăng nhập, danh sách trang (PAGES), tự vẽ Sidebar + Navbar
features/                  # mỗi phân hệ một thư mục: <tên>.html + .css + .js
  dang-nhap/  profile/  hoc-tap/  lich-hoc/  ky-tuc-xa/  thu-vien/  tai-chinh/
data/                      # students.xlsx (nguồn), students.js (tự sinh), books.js
tools/                     # xlsx_to_js.py, build_tuition.py
```

### Thêm một phân hệ mới

1. Tạo thư mục `features/<ten>/` với `<ten>.html`, `.css`, `.js`.
2. Trong file HTML: `<body data-root="../../" data-page="<khoa>">`, đặt
   `<aside data-layout="sidebar"></aside>` và `<header data-layout="navbar"></header>`,
   nạp `../../assets/css/style.css`, `../../data/students.js`, `../../assets/js/app.js`.
3. Khai báo đường dẫn trong `PAGES` (và `MENU` nếu muốn hiện trên Sidebar) ở `assets/js/app.js`.
   Liên kết giữa các trang dùng `pageUrl("<khoa>")` để luôn đúng dù trang nằm ở thư mục nào.
