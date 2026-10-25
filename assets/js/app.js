/* ========== DÙNG CHUNG CHO MỌI TRANG ==========
   Dữ liệu sinh viên lấy từ data/students.js (sinh từ data/students.xlsx), cộng với các thay đổi
   do Admin thực hiện (thêm / sửa / xóa / khóa tài khoản) lưu trong localStorage (ACCOUNTS_KEY).
   Phiên đăng nhập lưu tên đăng nhập (mã SV, hoặc tài khoản giảng viên / admin) trong SESSION_KEY;
   mọi trang đọc cùng khóa này nên thông tin luôn đồng bộ khi chuyển trang.

   Mỗi trang khai báo trên thẻ <body>:
     data-root="../../"  đường dẫn từ trang đó về thư mục gốc dự án ("" với index.html ở gốc)
     data-page="hoc-tap" khóa trang trong PAGES (để tô sáng menu, phân quyền và quay lại sau đăng nhập)
   và đặt 2 chỗ trống <aside data-layout="sidebar"> / <header data-layout="navbar">,
   app.js sẽ tự vẽ Sidebar + Navbar theo vai trò của người đang đăng nhập. */
const SESSION_KEY = "currentStudentId";
const ACCOUNTS_KEY = "accounts:store";
// Mật khẩu mặc định của sinh viên (bản demo, chưa có server xác thực); Admin có thể đặt lại từng SV
const DEMO_PASSWORD = "123";

/* ---------- Vai trò ---------- */
const ROLES = {
  // Mọi vai trò đều về Trang chủ (index.html); trang chủ hiển thị theo vai trò của tài khoản
  student: { label: "Sinh viên", home: "trang-chu", color: "#4f46e5" },
  teacher: { label: "Giảng viên", home: "trang-chu", color: "#0e7490" },
  admin: { label: "Quản trị viên", home: "trang-chu", color: "#b91c1c" },
};

/* ---------- Danh sách trang: đường dẫn + vai trò được phép mở ---------- */
const PAGES = {
  "trang-chu": { path: "index.html", roles: ["student", "teacher", "admin"], label: "Trang chủ" },
  "dang-nhap": { path: "features/dang-nhap/login.html", roles: [], label: "Đăng nhập" },
  profile: { path: "features/profile/profile.html", roles: ["student"], label: "Profile" },
  "hoc-tap": { path: "features/hoc-tap/hoc-tap.html", roles: ["student"], label: "Học tập" },
  "lich-hoc": { path: "features/lich-hoc/lich-hoc.html", roles: ["student"], label: "Lịch học" },
  "ky-tuc-xa": { path: "features/ky-tuc-xa/dormitory.html", roles: ["student"], label: "Ký túc xá" },
  "thu-vien": { path: "features/thu-vien/library.html", roles: ["student"], label: "Thư viện" },
  "hoc-phi": { path: "features/tai-chinh/hoc-phi.html", roles: ["student"], label: "Học phí" },
  "thanh-toan": { path: "features/tai-chinh/thanh-toan-online.html", roles: ["student"], label: "Thanh toán online" },
  "phan-hoi": { path: "features/phan-hoi/phan-hoi.html", roles: ["student"], label: "Phản hồi" },
  // Giảng viên
  "gv-lich-day": { path: "features/giang-vien/lich-day.html", roles: ["teacher"], label: "Lịch dạy" },
  "gv-dang-ky-phong": { path: "features/giang-vien/dang-ky-phong.html", roles: ["teacher"], label: "Đăng ký phòng & ca dạy" },
  "gv-ren-luyen": { path: "features/giang-vien/ren-luyen.html", roles: ["teacher"], label: "Điểm rèn luyện" },
  "gv-lop-hoc-phan": { path: "features/giang-vien/lop-hoc-phan.html", roles: ["teacher"], label: "Lớp học phần" },
  "gv-hoc-vu": { path: "features/giang-vien/hoc-vu.html", roles: ["teacher"], label: "Học vụ" },
  // Quản trị viên
  "qt-dashboard": { path: "features/quan-tri/dashboard.html", roles: ["admin"], label: "Dashboard" },
  "qt-tai-khoan": { path: "features/quan-tri/tai-khoan.html", roles: ["admin"], label: "Tài khoản & phân quyền" },
  "qt-phan-hoi": { path: "features/quan-tri/phan-hoi.html", roles: ["admin"], label: "Quản trị phản hồi" },
  "qt-tai-chinh": { path: "features/quan-tri/tai-chinh.html", roles: ["admin"], label: "Quản lý tài chính" },
  "qt-thu-vien": { path: "features/quan-tri/thu-vien.html", roles: ["admin"], label: "Duyệt mượn sách" },
};

// Menu bên trái theo vai trò (key trùng PAGES; "also": các trang con cũng tô sáng mục này)
const MENUS = {
  student: [
    { key: "trang-chu", label: "Trang chủ", icon: "fa-house" },
    { key: "profile", label: "Profile", icon: "fa-user" },
    { key: "hoc-tap", label: "Học tập", icon: "fa-book-open" },
    { key: "ky-tuc-xa", label: "Ký túc xá", icon: "fa-building" },
    { key: "thu-vien", label: "Thư viện", icon: "fa-book" },
    { key: "lich-hoc", label: "Lịch học", icon: "fa-calendar-days" },
    { key: "hoc-phi", label: "Học phí", icon: "fa-wallet", also: ["thanh-toan"] },
    { key: "phan-hoi", label: "Phản hồi", icon: "fa-comments" },
  ],
  teacher: [
    { key: "trang-chu", label: "Trang chủ", icon: "fa-house" },
    { key: "gv-lich-day", label: "Lịch dạy", icon: "fa-calendar-week" },
    { key: "gv-dang-ky-phong", label: "Đăng ký phòng", icon: "fa-door-open" },
    { key: "gv-lop-hoc-phan", label: "Lớp học phần", icon: "fa-chalkboard-user" },
    { key: "gv-ren-luyen", label: "Điểm rèn luyện", icon: "fa-star-half-stroke" },
    { key: "gv-hoc-vu", label: "Học vụ", icon: "fa-comments" },
  ],
  admin: [
    { key: "trang-chu", label: "Trang chủ", icon: "fa-house" },
    { key: "qt-dashboard", label: "Dashboard", icon: "fa-chart-pie" },
    { key: "qt-tai-khoan", label: "Tài khoản", icon: "fa-users-gear" },
    { key: "qt-phan-hoi", label: "Phản hồi", icon: "fa-inbox" },
    { key: "qt-tai-chinh", label: "Tài chính", icon: "fa-sack-dollar" },
    { key: "qt-thu-vien", label: "Thư viện", icon: "fa-book" },
  ],
};

const ROOT = document.body.dataset.root || "";
const CURRENT_PAGE = document.body.dataset.page || "";
const IS_LOGIN_PAGE = CURRENT_PAGE === "dang-nhap";

// Đường dẫn tới một trang, tính từ trang đang mở. VD: pageUrl("lich-hoc") -> "../lich-hoc/lich-hoc.html"
function pageUrl(key, suffix = "") {
  return ROOT + (PAGES[key] || PAGES["trang-chu"]).path + suffix;
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
function readJSON(key, fallback) {
  try {
    const v = JSON.parse(storageGet(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  return storageSet(key, JSON.stringify(value));
}

/* ---------- Thông báo (chuông trên Navbar) ----------
   Lưu chung trong localStorage (NOTIFY_KEY) nên tài khoản khác trên cùng trình duyệt nhận được ngay.
   { id, to: "admin" | "teacher" | <mã SV>, title, message, icon, type: "info"|"success"|"error",
     link: { page, hash }, at, read, shown }  — shown: đã bật popup lần đầu hay chưa */
const NOTIFY_KEY = "notifications:items";
const NOTIFY_MAX = 200;

function loadNotifications() {
  const list = readJSON(NOTIFY_KEY, []);
  return Array.isArray(list) ? list : [];
}
function pushNotification(n) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(), read: false, shown: false, icon: "fa-bell", type: "info", ...n,
  };
  return writeJSON(NOTIFY_KEY, [item, ...loadNotifications()].slice(0, NOTIFY_MAX)) ? item : null;
}
// Người nhận của tài khoản đang đăng nhập: SV nhận theo mã SV, cán bộ nhận theo vai trò
const notifyTarget = (user) => (user.role === "student" ? user.id : user.role);
function updateNotifications(user, change) {
  const target = notifyTarget(user);
  const list = loadNotifications();
  list.forEach((n) => { if (n.to === target) change(n); });
  writeJSON(NOTIFY_KEY, list);
}

/* ---------- Kho tài khoản ----------
   students.added   : SV do Admin thêm (không có trong Excel)
   students.edited  : { msv: {hoTen, lop, email, sdt} } sửa đè lên dữ liệu Excel
   students.deleted : [msv] SV đã xóa
   students.locked  : [msv] SV bị khóa đăng nhập
   students.passwords: { msv: "mật khẩu mới" } (mặc định DEMO_PASSWORD)
   staff            : tài khoản giảng viên / admin                                       */
const DEFAULT_STAFF = [
  {
    username: "giangvien", password: "1234", role: "teacher", name: "Giảng viên Khoa CNTT", active: true,
    // Phân công giảng dạy mẫu: các môn này ở cả 4 lớp, lịch lấy từ thời khóa biểu trong Excel
    subjects: ["Lập trình hướng đối tượng", "Cấu trúc dữ liệu và giải thuật", "Lập trình Web"],
    classes: ["Công nghệ thông tin 1 K66", "Công nghệ thông tin 2 K66", "Công nghệ thông tin 3 K66", "Khoa học máy tính K66"],
  },
  { username: "admin", password: "admin", role: "admin", name: "Quản trị hệ thống", active: true, subjects: [], classes: [] },
];

function loadAccounts() {
  const store = readJSON(ACCOUNTS_KEY, null) || {};
  const st = store.students || {};
  return {
    students: {
      added: st.added || [],
      edited: st.edited || {},
      deleted: st.deleted || [],
      locked: st.locked || [],
      passwords: st.passwords || {},
    },
    staff: Array.isArray(store.staff) ? store.staff : DEFAULT_STAFF.map((x) => ({ ...x })),
  };
}

let studentsCache = null;
function saveAccounts(store) {
  studentsCache = null;
  return writeJSON(ACCOUNTS_KEY, store);
}

const majorOf = (lop) => String(lop || "").replace(/\s*\d*\s*K\d+$/, "").trim();

// Danh sách sinh viên hiện hành = Excel - đã xóa + sửa đổi + SV thêm mới
function getStudents() {
  if (studentsCache) return studentsCache;
  const { students: st } = loadAccounts();
  const deleted = new Set(st.deleted);
  const base = (window.STUDENTS || [])
    .filter((s) => !deleted.has(s.msv))
    .map((s) => {
      const e = st.edited[s.msv];
      return e ? { ...s, ...e, nganh: majorOf(e.lop || s.lop) } : s;
    });
  const added = st.added
    .filter((s) => !deleted.has(s.msv))
    .map((s) => ({ ngaySinh: null, diem: {}, gpa: null, ...s, nganh: majorOf(s.lop), addedByAdmin: true }));
  studentsCache = [...base, ...added];
  return studentsCache;
}

function findStudent(idOrEmail) {
  const key = String(idOrEmail || "").trim().toLowerCase();
  return getStudents().find((s) => s.msv === key || String(s.email || "").toLowerCase() === key);
}

function findStaff(username) {
  const key = String(username || "").trim().toLowerCase();
  return loadAccounts().staff.find((s) => s.username.toLowerCase() === key);
}

function isStudentLocked(msv) {
  return loadAccounts().students.locked.includes(msv);
}

/* Đăng nhập: trả về { ok, user } hoặc { ok:false, reason: "not-found" | "locked" | "wrong-password" } */
function authenticate(id, password) {
  const staff = findStaff(id);
  if (staff) {
    if (!staff.active) return { ok: false, reason: "locked" };
    return password === staff.password
      ? { ok: true, user: { id: staff.username, role: staff.role } }
      : { ok: false, reason: "wrong-password" };
  }
  const student = findStudent(id);
  if (!student) return { ok: false, reason: "not-found" };
  if (isStudentLocked(student.msv)) return { ok: false, reason: "locked" };
  const pass = loadAccounts().students.passwords[student.msv] || DEMO_PASSWORD;
  return password === pass
    ? { ok: true, user: { id: student.msv, role: "student" } }
    : { ok: false, reason: "wrong-password" };
}

// Người đang đăng nhập: { id, role, name, student? , staff? } hoặc null
function getCurrentUser() {
  const id = storageGet(SESSION_KEY);
  if (!id) return null;
  const staff = findStaff(id);
  if (staff) return staff.active ? { id: staff.username, role: staff.role, name: staff.name, staff } : null;
  const student = findStudent(id);
  if (!student || isStudentLocked(student.msv)) return null;
  return { id: student.msv, role: "student", name: toTitleCase(student.hoTen), student };
}

function getCurrentStudent() {
  const user = getCurrentUser();
  return user && user.role === "student" ? user.student : null;
}

// Trang chủ của vai trò (index.html, nội dung hiển thị theo vai trò)
function homeUrl(role) {
  return pageUrl((ROLES[role] || ROLES.student).home);
}

// Năm học hiện tại của khóa K66 (năm học bắt đầu tháng 9; Năm 1 = 2025_2026), giới hạn 1..4
function currentStudyYear(date = new Date()) {
  const start = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return Math.min(4, Math.max(1, start - 2025 + 1));
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

// Xếp loại điểm rèn luyện (thang 100, TT 16/2015/TT-BGDĐT)
function classifyConduct(score) {
  if (score == null || score === "" || Number.isNaN(Number(score))) return { label: "Chưa chấm", cls: "cd--none" };
  const s = Number(score);
  if (s >= 90) return { label: "Xuất sắc", cls: "cd--excellent" };
  if (s >= 80) return { label: "Tốt", cls: "cd--good" };
  if (s >= 65) return { label: "Khá", cls: "cd--fair" };
  if (s >= 50) return { label: "Trung bình", cls: "cd--average" };
  if (s >= 35) return { label: "Yếu", cls: "cd--weak" };
  return { label: "Kém", cls: "cd--poor" };
}

// Các môn sinh viên phải học phụ đạo tối (điểm môn < 2.0), lấy từ sheet "Danh Sách SV Phụ Đạo Tối"
function getTutoring(msv) {
  return (window.TUTORING_STUDENTS || []).filter((t) => t.msv === msv);
}

function getAvatar(msv) {
  return storageGet(`avatar:${msv}`);
}

// Ảnh mặc định: chữ cái đầu của tên, vẽ bằng SVG (không cần tải ảnh ngoài)
function initialsAvatar(name, color = "#4f46e5") {
  const parts = String(name || "?").trim().split(/\s+/);
  const initials = ((parts.length > 1 ? parts[parts.length - 2][0] : "") + parts[parts.length - 1][0]).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="200" height="200" fill="${color}"/>
    <text x="50%" y="54%" font-family="Segoe UI, Arial" font-size="80" font-weight="700"
      fill="#fff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function toTitleCase(name) {
  return String(name || "").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function logout() {
  storageRemove(SESSION_KEY);
  window.location.href = pageUrl("dang-nhap");
}

/* ---------- Bảo vệ trang ----------
   - Chưa đăng nhập (hoặc tài khoản đã bị xóa / khóa): về trang đăng nhập kèm ?next=<khóa trang>.
   - Đăng nhập nhưng vai trò không được mở trang này: về trang chủ của vai trò đó. */
const CURRENT_USER = IS_LOGIN_PAGE ? null : getCurrentUser();
if (!IS_LOGIN_PAGE) {
  const page = PAGES[CURRENT_PAGE];
  if (!CURRENT_USER) {
    storageRemove(SESSION_KEY);
    location.replace(pageUrl("dang-nhap", `?next=${encodeURIComponent(CURRENT_PAGE + location.hash)}`));
  } else if (page && !page.roles.includes(CURRENT_USER.role)) {
    location.replace(homeUrl(CURRENT_USER.role));
  }
}

/* Đăng nhập / đăng xuất / đổi tài khoản ở tab khác: tải lại để mọi trang cùng một người dùng */
window.addEventListener("storage", (e) => {
  if (e.key === SESSION_KEY && !IS_LOGIN_PAGE) location.reload();
  if (e.key === ACCOUNTS_KEY) studentsCache = null;
  if (e.key === NOTIFY_KEY) renderNotifications();
});

/* ---------- Chuông thông báo + popup ---------- */
const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} giờ trước`;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function openNotification(n) {
  updateNotifications(CURRENT_USER, (x) => { if (x.id === n.id) x.read = true; });
  if (!n.link) return renderNotifications();
  const url = pageUrl(n.link.page, n.link.hash ? `#${n.link.hash}` : "");
  if (n.link.page === CURRENT_PAGE) {
    location.hash = n.link.hash || "";
    renderNotifications();
    window.dispatchEvent(new CustomEvent("notification:open", { detail: n }));
  } else {
    location.href = url;
  }
}

// Popup góc màn hình cho thông báo mới (mỗi thông báo bật một lần)
function popNotification(n) {
  let stack = document.getElementById("notifyStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "notifyStack";
    stack.className = "notify-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `notify-pop notify-pop--${n.type}`;
  el.setAttribute("role", "status");
  el.innerHTML = `
    <span class="notify-pop__icon"><i class="fa-solid ${escapeHtml(n.icon)}"></i></span>
    <button type="button" class="notify-pop__body">
      <b>${escapeHtml(n.title)}</b><span>${escapeHtml(n.message)}</span>
    </button>
    <button type="button" class="notify-pop__close" aria-label="Đóng thông báo"><i class="fa-solid fa-xmark"></i></button>`;
  const close = () => {
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), 250);
  };
  el.querySelector(".notify-pop__close").addEventListener("click", close);
  el.querySelector(".notify-pop__body").addEventListener("click", () => { close(); openNotification(n); });
  stack.appendChild(el);
  setTimeout(close, 8000);
}

function renderNotifications() {
  const user = CURRENT_USER;
  const bell = document.getElementById("notifyBell");
  if (!user || !bell) return;
  const target = notifyTarget(user);
  const mine = loadNotifications().filter((n) => n.to === target);
  const unread = mine.filter((n) => !n.read).length;

  const badge = bell.querySelector(".badge");
  badge.hidden = !unread;
  badge.textContent = unread > 99 ? "99+" : unread;
  bell.setAttribute("aria-label", unread ? `Thông báo (${unread} chưa đọc)` : "Thông báo");

  document.getElementById("notifyList").innerHTML = mine.length
    ? mine
        .slice(0, 30)
        .map(
          (n) => `<li><button type="button" class="notify-item${n.read ? "" : " is-unread"}" data-notify="${escapeHtml(n.id)}">
              <span class="notify-item__icon notify-item__icon--${escapeHtml(n.type)}"><i class="fa-solid ${escapeHtml(n.icon)}"></i></span>
              <span class="notify-item__text"><b>${escapeHtml(n.title)}</b><span>${escapeHtml(n.message)}</span>
                <small>${timeAgo(n.at)}</small></span>
            </button></li>`
        )
        .join("")
    : `<li class="notify-empty"><i class="fa-regular fa-bell-slash"></i> Chưa có thông báo nào.</li>`;
  document.getElementById("notifyReadAll").disabled = !unread;

  const fresh = mine.filter((n) => !n.shown);
  if (fresh.length) {
    updateNotifications(user, (n) => { n.shown = true; });
    fresh.slice(0, 3).reverse().forEach(popNotification);
  }
}

/* ---------- Vẽ Sidebar + Navbar ----------
   Chạy ngay khi app.js được nạp (app.js đặt cuối <body>), trước script riêng của trang,
   nên các trang vẫn tìm thấy .user__name, .user__avatar... như trước. */
(function renderLayout() {
  const user = CURRENT_USER;
  const role = user ? user.role : "student";

  const sidebar = document.querySelector('[data-layout="sidebar"]');
  if (sidebar) {
    sidebar.className = `sidebar sidebar--${role}`;
    const item = (m) => {
      const active = m.key === CURRENT_PAGE || (m.also || []).includes(CURRENT_PAGE);
      return `<a href="${pageUrl(m.key)}" class="menu-item${active ? " active" : ""}"${active ? ' aria-current="page"' : ""}>
        <i class="fa-solid ${m.icon}"></i><span>${m.label}</span></a>`;
    };
    sidebar.innerHTML = `
      <a href="${homeUrl(role)}" class="sidebar__brand">
        <i class="fa-solid fa-graduation-cap"></i><span>StudentHub</span>
      </a>
      ${role !== "student" ? `<div class="sidebar__role"><i class="fa-solid fa-shield-halved"></i><span>${ROLES[role].label}</span></div>` : ""}
      <nav class="sidebar__menu">${MENUS[role].map(item).join("")}</nav>
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
        <div class="notify">
          <button type="button" class="icon-btn" id="notifyBell" aria-label="Thông báo" aria-haspopup="true" aria-expanded="false" aria-controls="notifyPanel">
            <i class="fa-regular fa-bell"></i><span class="badge" hidden>0</span></button>
          <div class="notify-panel" id="notifyPanel" hidden>
            <div class="notify-panel__head">
              <b>Thông báo</b>
              <button type="button" class="notify-panel__all" id="notifyReadAll">Đánh dấu đã đọc</button>
            </div>
            <ul class="notify-list" id="notifyList"></ul>
          </div>
        </div>
        <button class="icon-btn" aria-label="Tin nhắn"><i class="fa-regular fa-envelope"></i></button>
        <a class="user" href="${role === "student" ? pageUrl("profile") : homeUrl(role)}" title="${role === "student" ? "Thông tin cá nhân" : ROLES[role].label}">
          <img src="" alt="Ảnh đại diện" class="user__avatar" />
          <div class="user__info"><span class="user__name"></span><span class="user__role"></span></div>
          <i class="fa-solid fa-chevron-down user__caret"></i>
        </a>
        <button type="button" class="icon-btn navbar__logout" aria-label="Đăng xuất" title="Đăng xuất">
          <i class="fa-solid fa-right-from-bracket"></i></button>
      </div>`;
    navbar.querySelector(".search").addEventListener("submit", (e) => e.preventDefault());
    // Mobile: chân Sidebar (có nút Đăng xuất) bị ẩn nên đặt nút đăng xuất trên Navbar
    navbar.querySelector(".navbar__logout").addEventListener("click", () => {
      if (confirm("Bạn có chắc muốn đăng xuất?")) logout();
    });

    if (user) {
      navbar.querySelector(".user__name").textContent = user.name;
      navbar.querySelector(".user__role").textContent =
        role === "student" ? `MSSV: ${user.id}` : `${ROLES[role].label} · ${user.id}`;
      navbar.querySelector(".user__avatar").src =
        (role === "student" && getAvatar(user.id)) || initialsAvatar(user.name, ROLES[role].color);

      const bell = navbar.querySelector("#notifyBell");
      const panel = navbar.querySelector("#notifyPanel");
      const toggle = (open) => {
        panel.hidden = !open;
        bell.setAttribute("aria-expanded", open);
      };
      bell.addEventListener("click", () => toggle(panel.hidden));
      document.addEventListener("click", (e) => { if (!e.target.closest(".notify")) toggle(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { toggle(false); bell.focus(); } });
      navbar.querySelector("#notifyReadAll").addEventListener("click", () => {
        updateNotifications(user, (n) => { n.read = true; });
        renderNotifications();
      });
      navbar.querySelector("#notifyList").addEventListener("click", (e) => {
        const item = e.target.closest("[data-notify]");
        const n = item && loadNotifications().find((x) => x.id === item.dataset.notify);
        if (!n) return;
        toggle(false);
        openNotification(n);
      });
      renderNotifications();
    }
  }
})();
