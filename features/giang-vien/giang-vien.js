/* ========== DÙNG CHUNG CHO PHÂN HỆ GIẢNG VIÊN ==========
   Phân công giảng dạy (môn + lớp) lấy từ tài khoản giảng viên (Admin chỉnh ở trang Tài khoản);
   lịch đứng lớp lấy từ thời khóa biểu trong Excel (window.TIMETABLE). */
const TEACHER = CURRENT_USER && CURRENT_USER.role === "teacher" ? CURRENT_USER.staff : null;

const WEEK_DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
const START_YEAR = 2025; // Năm 1 = 2025_2026

// Các ca học: 4 ca ban ngày (theo Excel) + ca tối
const SLOTS = [
  { key: "Ca 1", detail: "Tiết 1-3" },
  { key: "Ca 2", detail: "Tiết 4-6" },
  { key: "Ca 3", detail: "Tiết 7-9" },
  { key: "Ca 4", detail: "Tiết 10-12" },
  { key: "Ca Tối", detail: "18:00 - 20:00", evening: true },
];

// Phòng học (DỮ LIỆU MẪU — Excel chưa có danh sách phòng)
const ROOMS = [
  { id: "A1-101", type: "Phòng lý thuyết", seats: 60 },
  { id: "A1-102", type: "Phòng lý thuyết", seats: 60 },
  { id: "A1-201", type: "Phòng lý thuyết", seats: 80 },
  { id: "A1-202", type: "Phòng lý thuyết", seats: 80 },
  { id: "A2-301", type: "Phòng máy tính", seats: 45 },
  { id: "A2-302", type: "Phòng máy tính", seats: 45 },
  { id: "A2-303", type: "Phòng máy tính", seats: 40 },
  { id: "A3-401", type: "Phòng thực hành mạng", seats: 36 },
  { id: "B1-101", type: "Hội trường", seats: 150 },
  { id: "B1-201", type: "Phòng hội thảo", seats: 30 },
];
const BOOKING_PURPOSES = ["Dạy bù", "Dạy thêm / Phụ đạo", "Ôn tập", "Kiểm tra / Thi giữa kỳ", "Seminar / Hội thảo"];

// "Ca 4 (Tiết 10-12)" -> { key: "Ca 4", detail: "Tiết 10-12" }
function parseSession(text) {
  const m = String(text).match(/^(.+?)\s*\((.+)\)\s*$/);
  return m ? { key: m[1].trim(), detail: m[2].trim() } : { key: String(text).trim(), detail: "" };
}

const schoolYearLabel = (y) => `${START_YEAR + y - 1}_${START_YEAR + y}`;

// Năm học (1..4) của một ngày; null nếu ngoài khóa học
function studyYearOfDate(date) {
  const start = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  const y = start - START_YEAR + 1;
  return y >= 1 && y <= 4 ? y : null;
}

// Thứ trong tuần theo tên dùng trong Excel ("Thứ 2" ... "Chủ Nhật")
const dayName = (date) => WEEK_DAYS[(date.getDay() + 6) % 7];

// Thứ 2 của tuần chứa ngày date
function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const subjectCredits = (name) => (window.SUBJECTS || []).find((s) => s.name === name)?.credits;

/* Các buổi đứng lớp chính thức của giảng viên (môn được phân công × lớp được phân công) */
function teacherSessions(teacher = TEACHER) {
  if (!teacher) return [];
  const subjects = new Set(teacher.subjects || []);
  const classes = new Set(teacher.classes || []);
  return (window.TIMETABLE || [])
    .filter((t) => subjects.has(t.subject) && classes.has(t.lop))
    .map((t) => ({ ...t, ...parseSession(t.session), credits: subjectCredits(t.subject) }));
}

/* Lớp học phần = (môn, lớp) duy nhất mà giảng viên dạy */
function teacherSections(teacher = TEACHER) {
  const seen = new Map();
  teacherSessions(teacher).forEach((s) => {
    const id = `${s.subject}|${s.lop}`;
    if (!seen.has(id)) seen.set(id, { id, subject: s.subject, lop: s.lop, year: s.year, sessions: [] });
    seen.get(id).sessions.push(s);
  });
  return [...seen.values()].sort((a, b) => a.year - b.year || a.subject.localeCompare(b.subject) || a.lop.localeCompare(b.lop));
}

const studentsOfClass = (lop) => getStudents().filter((s) => s.lop === lop).sort((a, b) => a.msv.localeCompare(b.msv));
const teacherClasses = (teacher = TEACHER) => [...new Set(teacher?.classes || [])].sort();

/* ---------- Đăng ký phòng ---------- */
function loadBookings() {
  const list = readJSON(STORE.bookings, []);
  return Array.isArray(list) ? list : [];
}
function saveBookings(list) {
  return writeJSON(STORE.bookings, list);
}
const activeBookings = () => loadBookings().filter((b) => b.status !== "cancelled");
