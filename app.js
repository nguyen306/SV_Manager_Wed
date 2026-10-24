/* ========== DÙNG CHUNG CHO MỌI TRANG ==========
   Dữ liệu sinh viên lấy từ data/students.js (sinh từ data/students.xlsx).
   Phiên đăng nhập lưu mã sinh viên trong localStorage (khóa SESSION_KEY), mọi trang
   đọc cùng khóa này nên thông tin luôn đồng bộ khi chuyển trang. */
const SESSION_KEY = "currentStudentId";
// Mật khẩu chung cho mọi tài khoản (bản demo, chưa có server xác thực)
const DEMO_PASSWORD = "123";
const IS_LOGIN_PAGE = Boolean(document.getElementById("loginForm"));

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

/* Chưa đăng nhập (hoặc mã SV không còn trong dữ liệu) thì quay về trang đăng nhập,
   kèm ?next= để đăng nhập xong trở lại đúng trang đang mở. */
if (!IS_LOGIN_PAGE && !getCurrentStudent()) {
  storageRemove(SESSION_KEY);
  const page = location.pathname.split("/").pop() || "index.html";
  location.replace(`login.html?next=${encodeURIComponent(page + location.hash)}`);
}

/* Đăng nhập / đăng xuất / đổi tài khoản ở tab khác: tải lại để mọi trang cùng một người dùng */
window.addEventListener("storage", (e) => {
  if (e.key === SESSION_KEY && !IS_LOGIN_PAGE) location.reload();
});

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

/* Điền thông tin tài khoản lên Navbar + xử lý Đăng xuất */
document.addEventListener("DOMContentLoaded", () => {
  if (IS_LOGIN_PAGE) return;
  const student = getCurrentStudent();
  if (student) {
    const name = document.querySelector(".user__name");
    const role = document.querySelector(".user__role");
    const avatar = document.querySelector(".user__avatar");
    if (name) name.textContent = toTitleCase(student.hoTen);
    if (role) role.textContent = `MSSV: ${student.msv}`;
    if (avatar) avatar.src = getAvatar(student.msv) || initialsAvatar(student.hoTen);
  }

  const logout = document.querySelector(".menu-item.logout");
  if (logout) {
    logout.addEventListener("click", (e) => {
      e.preventDefault();
      storageRemove(SESSION_KEY);
      window.location.href = "login.html";
    });
  }
});
