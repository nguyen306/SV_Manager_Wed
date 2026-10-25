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

**Tài khoản đăng nhập** (bản demo, chỉ kiểm tra trên trình duyệt):

| Vai trò | Tài khoản | Mật khẩu | Trang chủ (`index.html`) hiển thị |
|---|---|---|---|
| Sinh viên | mã SV (VD `251210934`) hoặc email SV | `123` | GPA, lịch học hôm nay, KTX, thư viện, học phí, phản hồi |
| Giảng viên | `giangvien` | `1234` | Lịch dạy hôm nay, lớp học phần, tiến độ chấm điểm, câu hỏi học vụ chờ |
| Quản trị viên | `admin` | `admin` | Phản hồi cần xử lý, tài khoản, tài chính toàn trường |

Mọi tài khoản đều vào cùng `index.html`; hệ thống nhận diện vai trò và hiển thị Trang chủ + Sidebar
tương ứng. Mở trang không thuộc vai trò sẽ tự quay về Trang chủ. Admin có thể thêm / sửa / khóa / xóa tài khoản.

## Các trang

| Phân hệ | Thư mục / file | Nội dung |
|---|---|---|
| Trang chủ | `index.html` | **File tổng**, hiển thị theo vai trò: tóm tắt và lối vào từng phân hệ của Sinh viên / Giảng viên / Quản trị viên |
| Đăng nhập | `features/dang-nhap/` | Đăng nhập bằng mã SV / email, quay lại đúng trang đang mở |
| Profile | `features/profile/` | Thông tin cá nhân, đổi ảnh đại diện, cập nhật SĐT & tài khoản ngân hàng |
| Học tập | `features/hoc-tap/` | Bảng điểm theo năm, điểm hệ 10/hệ 4, xếp loại học lực, học phần nợ, chương trình học |
| Lịch học | `features/lich-hoc/` | Thời khóa biểu theo tuần, tự thêm lịch phụ đạo tối cho môn điểm < 2.0 |
| Ký túc xá | `features/ky-tuc-xa/` | Đăng ký phòng (10/8/5 người, khu Nam/Nữ), lịch sử đăng ký |
| Thư viện | `features/thu-vien/` | Giờ mở cửa, chỗ ngồi phòng đọc, tra cứu & gửi yêu cầu mượn (chờ Admin duyệt) / gia hạn / trả sách |
| Tài chính | `features/tai-chinh/` | `hoc-phi.html` (nợ/thừa, phải nộp/đã nộp, hóa đơn) và `thanh-toan-online.html` (cổng QR minh họa) |
| Phản hồi | `features/phan-hoi/` | Gửi góp ý (loại, môn học, tiêu đề, nội dung, mức độ), xem trạng thái và trả lời của GV / Admin |
| **Giảng viên** | `features/giang-vien/` | `lich-day` (lịch tuần), `dang-ky-phong` (phòng & ca dạy), `lop-hoc-phan` (nhập điểm GK/CK), `ren-luyen` (chấm điểm rèn luyện), `hoc-vu` (trả lời câu hỏi học vụ) |
| **Quản trị** | `features/quan-tri/` | `dashboard` (thống kê, biểu đồ), `tai-khoan` (tài khoản & phân quyền), `phan-hoi` (xử lý góp ý toàn trường), `tai-chinh` (đã/chưa nộp đủ, ghi nhận nộp bổ sung), `thu-vien` (duyệt / từ chối yêu cầu mượn sách) |

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

Dữ liệu phát sinh khi sử dụng được lưu trong `localStorage` của trình duyệt (chưa có server) và dùng chung
giữa các vai trò:

| Khóa | Nội dung | Ghi bởi → Đọc bởi |
|---|---|---|
| `accounts:store` | SV thêm/sửa/xóa/khóa, tài khoản cán bộ, phân công giảng dạy | Admin → mọi trang |
| `feedback:items` | Phản hồi + trao đổi (trả lời, ghi chú nội bộ, đổi trạng thái) | SV ↔ Giảng viên ↔ Admin |
| `conduct:scores` | Điểm rèn luyện theo năm | Giảng viên → SV (Học tập) |
| `course:grades` | Điểm giữa kỳ / cuối kỳ | Giảng viên → SV (Chi tiết học phần) |
| `room:bookings` | Đăng ký phòng & ca dạy | Giảng viên |
| `tuition:payments` | Thanh toán online + nộp bổ sung tại phòng Tài chính | SV / Admin → Học phí |
| `library:loans` | Mượn sách: SV gửi yêu cầu (`pending`) → Admin duyệt (`borrowing`) hoặc từ chối (`rejected`) | SV ↔ Admin |
| `notifications:items` | Thông báo trên chuông Navbar + popup (gửi theo mã SV hoặc vai trò) | SV ↔ Admin |

Ngoài ra: đăng ký KTX, cập nhật Profile. Phân công mẫu của `giangvien`: 3 môn (Lập trình hướng
đối tượng, Cấu trúc dữ liệu và giải thuật, Lập trình Web) × 4 lớp, lịch lấy từ thời khóa biểu trong Excel.
Danh sách phòng học và tỉ trọng điểm (30% giữa kỳ + 70% cuối kỳ) là dữ liệu mẫu.

## Cấu trúc

```
index.html                 # FILE TỔNG - Trang chủ theo vai trò, chạy toàn bộ hệ thống
assets/
  css/style.css            # giao diện chung (Sidebar, Navbar, layout, responsive)
  css/components.css       # thành phần dùng chung: bảng, nút, form, popup, hộp thư phản hồi
  css/home.css, js/home.js # Trang chủ
  js/app.js                # đăng nhập & vai trò, kho tài khoản, PAGES (đường dẫn + quyền), Sidebar + Navbar
  js/ui.js                 # tiện ích: toast, popup, phân trang, khóa localStorage dùng chung
  js/feedback-thread.js    # hộp thư phản hồi dùng chung cho Giảng viên và Admin
features/                  # mỗi phân hệ một thư mục: <tên>.html + .css + .js
  dang-nhap/  profile/  hoc-tap/  lich-hoc/  ky-tuc-xa/  thu-vien/  tai-chinh/  phan-hoi/   (sinh viên)
  giang-vien/  (giảng viên)      quan-tri/  (quản trị viên)
data/                      # students.xlsx (nguồn), students.js (tự sinh), books.js
tools/                     # xlsx_to_js.py, build_tuition.py
```

### Thêm một phân hệ mới

1. Tạo thư mục `features/<ten>/` với `<ten>.html`, `.css`, `.js`.
2. Trong file HTML: `<body data-root="../../" data-page="<khoa>">`, đặt
   `<aside data-layout="sidebar"></aside>` và `<header data-layout="navbar"></header>`,
   nạp `../../assets/css/style.css`, `../../data/students.js`, `../../assets/js/app.js`.
3. Khai báo trong `PAGES` ở `assets/js/app.js`: `{ path, roles: ["student" | "teacher" | "admin"], label }`,
   và thêm vào `MENUS[<vai trò>]` nếu muốn hiện trên Sidebar.
   Liên kết giữa các trang dùng `pageUrl("<khoa>")` để luôn đúng dù trang nằm ở thư mục nào.
