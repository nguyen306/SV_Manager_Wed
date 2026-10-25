/* ========== DÙNG CHUNG CHO MỌI TRANG ==========
   Dữ liệu sinh viên lấy từ data/students.js (sinh từ data/students.xlsx).
   Phiên đăng nhập lưu mã sinh viên trong localStorage (khóa SESSION_KEY), mọi trang
   đọc cùng khóa này nên thông tin luôn đồng bộ khi chuyển trang.

   Mỗi trang khai báo trên thẻ <body>:
     data-root="../../"  đường dẫn từ trang đó về thư mục gốc dự án ("" với index.html ở gốc)
     data-page="hoc-tap" khóa trang trong PAGES (để tô sáng menu và quay lại sau đăng nhập)
   và đặt 2 chỗ trống <aside data-layout="sidebar"> / <header data-layout="navbar">,
   app.js sẽ tự vẽ Sidebar + Navbar với đường dẫn đúng cho mọi thư mục. */
const SESSION_KEY = "currentStudentId";
// Mật khẩu chung cho mọi tài khoản (bản demo, chưa có server xác thực)
const DEMO_PASSWORD = "123";

/* ---------- Danh sách trang (một nơi duy nhất khai báo đường dẫn) ---------- */
const PAGES = {
  "trang-chu": "index.html",
  "dang-nhap": "features/dang-nhap/login.html",
  profile: "features/profile/profile.html",
  "hoc-tap": "features/hoc-tap/hoc-tap.html",
  "lich-hoc": "features/lich-hoc/lich-hoc.html",
  "ky-tuc-xa": "features/ky-tuc-xa/dormitory.html",
  "thu-vien": "features/thu-vien/library.html",
  "hoc-phi": "features/tai-chinh/hoc-phi.html",
  "thanh-toan": "features/tai-chinh/thanh-toan-online.html",
  "phan-hoi": "features/phan-hoi/phan-hoi.html",
};

// Menu bên trái (key trùng với PAGES; menu "Học phí" sáng cả khi ở trang Thanh toán online)
const MENU = [
  { key: "trang-chu", label: "Trang chủ", icon: "fa-house" },
  { key: "profile", label: "Profile", icon: "fa-user" },
  { key: "hoc-tap", label: "Học tập", icon: "fa-book-open" },
  { key: "ky-tuc-xa", label: "Ký túc xá", icon: "fa-building" },
  { key: "thu-vien", label: "Thư viện", icon: "fa-book" },
  { key: "lich-hoc", label: "Lịch học", icon: "fa-calendar-days" },
  { key: "hoc-phi", label: "Học phí", icon: "fa-wallet", also: ["thanh-toan"] },
  { key: "phan-hoi", label: "Phản hồi", icon: "fa-comments" },
];

const ROOT = document.body.dataset.root || "";
const CURRENT_PAGE = document.body.dataset.page || "";
const IS_LOGIN_PAGE = CURRENT_PAGE === "dang-nhap";

// Đường dẫn tới một trang, tính từ trang đang mở. VD: pageUrl("lich-hoc") -> "../lich-hoc/lich-hoc.html"
function pageUrl(key, suffix = "") {
  return ROOT + (PAGES[key] || PAGES["trang-chu"]) + suffix;
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* bỏ qua */ }
}

function findStudent(idOrEmail) {
  const key = String(idOrEmail || "").trim().toLowerCase();
  return (window.STUDENTS || []).find(
    (s) => s.msv === key || s.email.toLowerCase() === key
  );
}

function getCurrentStudent() {
  const msv = storageGet(SESSION_KEY);
  return msv ? findStudent(msv) || null : null;
}

// Đăng nhập bằng mã sinh viên (hoặc email) + mật khẩu; trả về sinh viên hoặc null
function authenticate(idOrEmail, password) {
  const student = findStudent(idOrEmail);
  return student && password === DEMO_PASSWORD ? student : null;
}

// Xếp loại học lực theo điểm trung bình hệ 4 (Quy chế đào tạo đại học, TT 08/2021/TT-BGDĐT)
function classify(gpa4) {
  if (gpa4 == null || Number.isNaN(gpa4)) return { label: "—", cls: "rank--none" };
  if (gpa4 >= 3.6) return { label: "Xuất sắc", cls: "rank--excellent" };
  if (gpa4 >= 3.2) return { label: "Giỏi", cls: "rank--good" };
  if (gpa4 >= 2.5) return { label: "Khá", cls: "rank--fair" };
  if (gpa4 >= 2.0) return { label: "Trung bình", cls: "rank--average" };
  if (gpa4 >= 1.0) return { label: "Yếu", cls: "rank--weak" };
  return { label: "Kém", cls: "rank--poor" };
}

// Các môn sinh viên phải học phụ đạo tối (điểm môn < 2.0), lấy từ sheet "Danh Sách SV Phụ Đạo Tối"
function getTutoring(msv) {
  return (window.TUTORING_STUDENTS || []).filter((t) => t.msv === msv);
}

function getAvatar(msv) {
  return storageGet(`avatar:${msv}`);
}

// Ảnh mặc định: chữ cái đầu của tên, vẽ bằng SVG (không cần tải ảnh ngoài)
function initialsAvatar(name) {
  const parts = name.trim().split(/\s+/);
  const initials = (parts.length > 1 ? parts[parts.length - 2][0] : "") + parts[parts.length - 1][0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="200" height="200" fill="#4f46e5"/>
    <text x="50%" y="54%" font-family="Segoe UI, Arial" font-size="80" font-weight="700"
      fill="#fff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function toTitleCase(name) {
  return name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function logout() {
  storageRemove(SESSION_KEY);
  window.location.href = pageUrl("dang-nhap");
}

/* ---------- Bảo vệ trang ----------
   Chưa đăng nhập (hoặc mã SV không còn trong dữ liệu) thì quay về trang đăng nhập,
   kèm ?next=<khóa trang> để đăng nhập xong trở lại đúng trang đang mở. */
if (!IS_LOGIN_PAGE && !getCurrentStudent()) {
  storageRemove(SESSION_KEY);
  location.replace(pageUrl("dang-nhap", `?next=${encodeURIComponent(CURRENT_PAGE + location.hash)}`));
}

/* Đăng nhập / đăng xuất / đổi tài khoản ở tab khác: tải lại để mọi trang cùng một người dùng */
window.addEventListener("storage", (e) => {
  if (e.key === SESSION_KEY && !IS_LOGIN_PAGE) location.reload();
});

/* ---------- Vẽ Sidebar + Navbar ----------
   Chạy ngay khi app.js được nạp (app.js đặt cuối <body>), trước script riêng của trang,
   nên các trang vẫn tìm thấy .user__name, .user__avatar... như trước. */
(function renderLayout() {
  const sidebar = document.querySelector('[data-layout="sidebar"]');
  if (sidebar) {
    sidebar.className = "sidebar";
    const item = (m) => {
      const active = m.key && (m.key === CURRENT_PAGE || (m.also || []).includes(CURRENT_PAGE));
      return `<a href="${m.key ? pageUrl(m.key) : "#"}" class="menu-item${active ? " active" : ""}"${active ? ' aria-current="page"' : ""}>
        <i class="fa-solid ${m.icon}"></i><span>${m.label}</span></a>`;
    };
    sidebar.innerHTML = `
      <a href="${pageUrl("trang-chu")}" class="sidebar__brand">
        <i class="fa-solid fa-graduation-cap"></i><span>StudentHub</span>
      </a>
      <nav class="sidebar__menu">${MENU.map(item).join("")}</nav>
      <div class="sidebar__footer">
        <a href="#" class="menu-item"><i class="fa-solid fa-gear"></i><span>Cài đặt</span></a>
        <a href="#" class="menu-item logout"><i class="fa-solid fa-right-from-bracket"></i><span>Đăng xuất</span></a>
      </div>`;
    sidebar.querySelector(".logout").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  const navbar = document.querySelector('[data-layout="navbar"]');
  if (navbar) {
    navbar.className = "navbar";
    navbar.innerHTML = `
      <form class="search" role="search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" placeholder="Tìm kiếm sinh viên, môn học, tài liệu..." />
      </form>
      <div class="navbar__right">
        <button class="icon-btn" aria-label="Thông báo"><i class="fa-regular fa-bell"></i><span class="badge">3</span></button>
        <button class="icon-btn" aria-label="Tin nhắn"><i class="fa-regular fa-envelope"></i></button>
        <a class="user" href="${pageUrl("profile")}" title="Thông tin cá nhân">
          <img src="" alt="Ảnh đại diện" class="user__avatar" />
          <div class="user__info"><span class="user__name"></span><span class="user__role"></span></div>
          <i class="fa-solid fa-chevron-down user__caret"></i>
        </a>
      </div>`;
    navbar.querySelector(".search").addEventListener("submit", (e) => e.preventDefault());

    const student = getCurrentStudent();
    if (student) {
      navbar.querySelector(".user__name").textContent = toTitleCase(student.hoTen);
      navbar.querySelector(".user__role").textContent = `MSSV: ${student.msv}`;
      navbar.querySelector(".user__avatar").src = getAvatar(student.msv) || initialsAvatar(student.hoTen);
    }
  }
})();
