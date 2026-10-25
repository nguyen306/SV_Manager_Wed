// Trang chủ (file tổng): cùng một trang, nội dung hiển thị theo vai trò của tài khoản đang đăng nhập.
//   Sinh viên   -> tóm tắt học tập, lịch hôm nay, KTX, thư viện, học phí, phản hồi
//   Giảng viên  -> lịch dạy hôm nay, lớp học phần, chấm điểm, câu hỏi học vụ chờ trả lời
//   Quản trị    -> số liệu toàn trường, phản hồi cần xử lý, tài chính, tài khoản
document.addEventListener("DOMContentLoaded", () => {
  const user = CURRENT_USER;
  if (!user) return; // app.js đã chuyển về trang đăng nhập

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const readList = (key) => {
    try {
      const list = JSON.parse(storageGet(key));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  };
  const readMap = (key) => {
    try {
      return JSON.parse(storageGet(key)) || {};
    } catch {
      return {};
    }
  };

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const DAYS = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const todayName = DAYS[now.getDay()];
  const currentYear = currentStudyYear(now);
  const fmtTime = (iso) => {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  };
  const sessionKey = (s) => String(s).split(" (")[0]; // "Ca 4 (Tiết 10-12)" -> "Ca 4"
  const sessionDetail = (s) => (String(s).match(/\((.+)\)/) || [, ""])[1];

  /* ---------- Phần chung: lời chào, thẻ phân hệ, khung "Hôm nay / Cần xử lý" ---------- */
  function hero(name, sub, chips) {
    $("hero").classList.add(`hero--${user.role}`);
    $("heroRole").textContent = ROLES[user.role].label;
    $("today").textContent = `${todayName}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    $("heroName").textContent = name;
    $("heroSub").textContent = sub;
    $("heroChips").innerHTML = chips.filter(Boolean).join("");
  }

  function cards(list) {
    $("featureGrid").innerHTML = list
      .map(
        (c) => `
        <a class="feature" href="${pageUrl(c.key)}" style="--accent:${c.color}">
          <span class="feature__icon"><i class="fa-solid ${c.icon}"></i></span>
          <span class="feature__title">${c.title}</span>
          <span class="feature__stat">${c.stat}</span>
          <span class="feature__note">${c.note}</span>
          ${c.alert ? `<span class="feature__alert"><i class="fa-solid fa-triangle-exclamation"></i> ${c.alert}</span>` : ""}
          <span class="feature__go">Mở <i class="fa-solid fa-arrow-right"></i></span>
        </a>`
      )
      .join("");
  }

  function panel(title, icon, link, items, emptyText) {
    $("homePanel").hidden = false;
    $("panelTitle").innerHTML = `<i class="fa-solid ${icon}"></i> ${title}`;
    $("panelLink").href = pageUrl(link.key);
    $("panelLink").textContent = link.label;
    $("panelList").innerHTML = items.length
      ? items
          .map(
            (it) => `<li><div class="agenda__item">
                <span class="agenda__time">${it.time}<small>${it.timeSub || ""}</small></span>
                <span class="agenda__main"><b>${it.title}</b><span>${it.sub}</span></span>
                ${it.tag ? `<span class="agenda__tag ${it.tagCls || ""}">${it.tag}</span>` : ""}
              </div></li>`
          )
          .join("")
      : `<li class="agenda__empty">${emptyText}</li>`;
  }

  function $(id) {
    return document.getElementById(id);
  }

  /* ================== SINH VIÊN ================== */
  function renderStudent() {
    const student = user.student;
    const gpa = student.gpa;
    const rank = classify(gpa);
    const tutoring = getTutoring(student.msv);

    const tutorDays = new Map((window.TUTORING_SCHEDULE || []).map((t) => [t.subject, t]));
    const todayClasses = [
      ...(window.TIMETABLE || []).filter((t) => t.lop === student.lop && t.year === currentYear && t.day === todayName),
      ...tutoring
        .map((t) => ({ ...t, ...tutorDays.get(t.subject) }))
        .filter((t) => t.year === currentYear && t.day === todayName),
    ];

    const dorm = readList("dorm:registrations").find((r) => r.msv === student.msv && r.status === "active");
    const loans = readList("library:loans").filter((l) => l.msv === student.msv && l.status === "borrowing");
    const overdue = loans.filter((l) => todayKey > l.dueDate).length;
    const fin = getFinance(student);
    const feedback = readList("feedback:items").filter((f) => f.msv === student.msv);
    const feedbackOpen = feedback.filter((f) => f.status !== "da-giai-quyet").length;

    hero(toTitleCase(student.hoTen), `MSV ${student.msv} · ${student.lop} · Năm ${currentYear}`, [
      `<span class="chip"><i class="fa-solid fa-chart-line"></i> GPA ${gpa != null ? gpa.toFixed(2) : "—"} · ${rank.label}</span>`,
      `<span class="chip ${fin.done ? "chip--ok" : "chip--bad"}"><i class="fa-solid fa-wallet"></i> ${fin.done ? "Học phí đã hoàn thành" : `Còn nợ ${formatMoney(fin.totals.debt)}`}</span>`,
      tutoring.length ? `<span class="chip chip--warn"><i class="fa-solid fa-moon"></i> ${tutoring.length} môn phụ đạo tối</span>` : "",
    ]);

    cards([
      { key: "profile", icon: "fa-user", color: "#4f46e5", title: "Thông tin cá nhân", stat: esc(student.lop), note: `SĐT ${esc(student.sdt || "—")}` },
      { key: "hoc-tap", icon: "fa-book-open", color: "#0b3d91", title: "Học tập", stat: `GPA ${gpa != null ? gpa.toFixed(2) : "—"}`, note: `Xếp loại ${rank.label}` },
      {
        key: "lich-hoc", icon: "fa-calendar-days", color: "#0e7490", title: "Lịch học",
        stat: todayClasses.length ? `${todayClasses.length} buổi hôm nay` : "Hôm nay không có lịch",
        note: todayClasses.length
          ? todayClasses.map((c) => `${esc(c.subject)} (${esc(sessionKey(c.session))})`).join(", ")
          : `${todayName} · Năm ${currentYear}`,
        alert: tutoring.length ? `${tutoring.length} môn phụ đạo tối` : "",
      },
      {
        key: "ky-tuc-xa", icon: "fa-building", color: "#7c3aed", title: "Ký túc xá",
        stat: dorm ? esc(dorm.roomName) : "Chưa đăng ký",
        note: dorm ? `Phòng ${dorm.capacity} người · ${formatMoney(dorm.price)}/tháng` : "Xem phòng còn trống và đăng ký",
      },
      {
        key: "thu-vien", icon: "fa-book", color: "#15803d", title: "Thư viện",
        stat: `${loans.length} sách đang mượn`,
        note: loans.length ? loans.map((l) => esc(l.title)).join(", ") : "Tra cứu & mượn sách",
        alert: overdue ? `${overdue} quyển quá hạn` : "",
      },
      {
        key: "hoc-phi", icon: "fa-file-invoice-dollar", color: fin.done ? "#16a34a" : "#dc2626", title: "Học phí",
        stat: fin.done ? "Đã hoàn thành" : formatMoney(fin.totals.debt),
        note: fin.done ? `Đã nộp ${formatMoney(fin.totals.paid)}` : `Còn nợ · ${fin.debtRows.length} khoản`,
      },
      {
        key: "thanh-toan", icon: "fa-qrcode", color: "#ea580c", title: "Thanh toán online",
        stat: fin.done ? "Không có khoản cần nộp" : "Thanh toán ngay", note: "SHB QR · VNPay · MoMo · Vietcombank",
      },
      {
        key: "phan-hoi", icon: "fa-comments", color: "#0891b2", title: "Phản hồi",
        stat: feedback.length ? `${feedback.length} ý kiến đã gửi` : "Gửi góp ý",
        note: feedback.length ? `${feedbackOpen} đang chờ giải quyết` : "Cơ sở vật chất, đào tạo, học phí, hệ thống...",
      },
    ]);
  }

  /* ================== GIẢNG VIÊN ================== */
  function renderTeacher() {
    const t = user.staff;
    const subjects = new Set(t.subjects || []);
    const classes = new Set(t.classes || []);
    const sessions = (window.TIMETABLE || []).filter((x) => subjects.has(x.subject) && classes.has(x.lop));
    const sections = new Map(sessions.map((x) => [`${x.subject}|${x.lop}`, x]));
    const studentsByClass = {};
    getStudents().forEach((s) => {
      if (classes.has(s.lop)) (studentsByClass[s.lop] = studentsByClass[s.lop] || []).push(s);
    });
    const myStudents = Object.values(studentsByClass).flat();

    // Hôm nay: buổi dạy chính thức (năm học hiện tại) + phòng đã đăng ký đúng ngày
    const order = (k) => (/tối/i.test(k) ? 9 : parseInt(k.replace(/\D/g, ""), 10) || 5);
    const today = [
      ...sessions
        .filter((x) => x.year === currentYear && x.day === todayName)
        .map((x) => ({ slot: sessionKey(x.session), detail: sessionDetail(x.session), title: x.subject, sub: x.lop, tag: "Lịch chính thức" })),
      ...readList("room:bookings")
        .filter((b) => b.teacher === t.username && b.status !== "cancelled" && b.date === todayKey)
        .map((b) => ({ slot: b.slot, detail: `Phòng ${b.room}`, title: b.subject || b.purpose, sub: `${b.purpose}${b.lop ? ` · ${b.lop}` : ""}`, tag: "Đăng ký phòng", booking: true })),
    ].sort((a, b) => order(a.slot) - order(b.slot));

    const weekCount = sessions.filter((x) => x.year === currentYear).length;
    const upcomingBookings = readList("room:bookings").filter((b) => b.teacher === t.username && b.status !== "cancelled" && b.date >= todayKey);

    // Câu hỏi học vụ chờ trả lời (cùng phạm vi với trang Học vụ)
    const questions = readList("feedback:items").filter(
      (x) => x.category === "dao-tao" && classes.has(x.lop) && (!x.subject || subjects.has(x.subject))
    );
    const waiting = questions.filter((x) => x.status !== "da-giai-quyet");

    // Tiến độ chấm điểm
    const conduct = readMap("conduct:scores");
    const conductDone = myStudents.filter((s) => conduct[`${currentYear}|${s.msv}`]).length;
    const grades = readMap("course:grades");
    const currentSections = [...sections.values()].filter((x) => x.year === currentYear);
    const gradeSlots = currentSections.reduce((n, x) => n + (studentsByClass[x.lop] || []).length, 0);
    const gradeDone = currentSections.reduce(
      (n, x) => n + (studentsByClass[x.lop] || []).filter((s) => {
        const g = grades[`${x.subject}|${s.msv}`];
        return g && g.mid != null && g.final != null;
      }).length,
      0
    );

    hero(t.name, `Tài khoản ${t.username} · ${subjects.size} môn · ${classes.size} lớp phụ trách · Năm học ${2024 + currentYear}_${2025 + currentYear}`, [
      `<span class="chip"><i class="fa-solid fa-chalkboard"></i> ${today.length} buổi dạy hôm nay</span>`,
      `<span class="chip"><i class="fa-solid fa-chalkboard-user"></i> ${sections.size} lớp học phần</span>`,
      waiting.length ? `<span class="chip chip--warn"><i class="fa-solid fa-comments"></i> ${waiting.length} câu hỏi chờ trả lời</span>` : "",
    ]);

    panel(
      `Lịch dạy hôm nay · ${todayName}`, "fa-calendar-day", { key: "gv-lich-day", label: "Xem cả tuần →" },
      today.map((x) => ({
        time: esc(x.slot), timeSub: esc(x.detail), title: esc(x.title), sub: esc(x.sub),
        tag: x.tag, tagCls: x.booking ? "agenda__tag--booking" : "",
      })),
      "Hôm nay bạn không có buổi dạy nào."
    );

    $("featureLabel").textContent = "Công việc giảng dạy";
    cards([
      {
        key: "gv-lich-day", icon: "fa-calendar-week", color: "#0e7490", title: "Lịch dạy",
        stat: `${weekCount} buổi / tuần`, note: `${weekCount * 3} tiết mỗi tuần · Năm ${currentYear}`,
      },
      {
        key: "gv-dang-ky-phong", icon: "fa-door-open", color: "#ea580c", title: "Đăng ký phòng",
        stat: upcomingBookings.length ? `${upcomingBookings.length} buổi sắp tới` : "Chưa có đăng ký",
        note: upcomingBookings.length ? upcomingBookings.slice(0, 2).map((b) => `${esc(b.room)} · ${esc(b.slot)}`).join(", ") : "Đăng ký phòng dạy bù, ôn tập, kiểm tra",
      },
      {
        key: "gv-lop-hoc-phan", icon: "fa-chalkboard-user", color: "#0b3d91", title: "Lớp học phần",
        stat: `${sections.size} lớp học phần`,
        note: gradeSlots ? `Năm nay đã nhập điểm ${gradeDone}/${gradeSlots} lượt SV` : "Không có lớp trong năm học này",
        alert: gradeSlots && gradeDone < gradeSlots ? `${gradeSlots - gradeDone} lượt chưa đủ điểm` : "",
      },
      {
        key: "gv-ren-luyen", icon: "fa-star-half-stroke", color: "#7c3aed", title: "Điểm rèn luyện",
        stat: `${conductDone}/${myStudents.length} đã chấm`, note: `Năm học hiện tại · ${classes.size} lớp phụ trách`,
      },
      {
        key: "gv-hoc-vu", icon: "fa-comments", color: "#0891b2", title: "Học vụ",
        stat: waiting.length ? `${waiting.length} câu hỏi chờ` : "Không có câu hỏi chờ",
        note: `${questions.length} câu hỏi từ sinh viên các lớp phụ trách`,
        alert: waiting.some((x) => x.priority === "khan-cap") ? "Có câu hỏi khẩn cấp" : "",
      },
    ]);
  }

  /* ================== QUẢN TRỊ VIÊN ================== */
  function renderAdmin() {
    const students = getStudents();
    const store = loadAccounts();
    const teachers = store.staff.filter((s) => s.role === "teacher");
    const lockedCount = store.students.locked.length + store.staff.filter((s) => !s.active).length;
    const finance = students.map((s) => getFinance(s)).filter((f) => f.rows.length);
    const sum = (k) => finance.reduce((n, f) => n + f.totals[k], 0);
    const due = sum("payable") - sum("exempt");
    const collected = sum("paid") - sum("withdrawn");
    const debtors = finance.filter((f) => !f.done).length;
    const feedback = readList("feedback:items");
    const open = feedback.filter((x) => x.status !== "da-giai-quyet");
    const urgent = open.filter((x) => x.priority === "khan-cap");

    hero(user.name, `Tài khoản ${user.id} · ${students.length} sinh viên · ${teachers.length} giảng viên`, [
      `<span class="chip"><i class="fa-solid fa-user-graduate"></i> ${students.length} sinh viên</span>`,
      `<span class="chip ${debtors ? "chip--bad" : "chip--ok"}"><i class="fa-solid fa-wallet"></i> ${debtors} SV còn nợ học phí</span>`,
      open.length ? `<span class="chip chip--warn"><i class="fa-solid fa-inbox"></i> ${open.length} phản hồi cần xử lý</span>` : "",
    ]);

    // Phản hồi cần xử lý: khẩn cấp trước, rồi mới nhất
    const rankP = { "khan-cap": 0, "quan-trong": 1, thuong: 2 };
    const statusTag = { "tiep-nhan": ["Đang tiếp nhận", "agenda__tag--new"], "dang-xu-ly": ["Đang xử lý", "agenda__tag--doing"] };
    panel(
      "Phản hồi cần xử lý", "fa-inbox", { key: "qt-phan-hoi", label: "Xem tất cả →" },
      [...open]
        .sort((a, b) => rankP[a.priority] - rankP[b.priority] || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map((x) => ({
          time: fmtTime(x.createdAt).split(" ")[1], timeSub: fmtTime(x.createdAt).split(" ")[0],
          title: esc(x.title), sub: `${esc(toTitleCase(x.hoTen))} · ${esc(x.lop || "")}`,
          tag: x.priority === "khan-cap" ? "Khẩn cấp" : statusTag[x.status][0],
          tagCls: x.priority === "khan-cap" ? "agenda__tag--urgent" : statusTag[x.status][1],
        })),
      "Không có phản hồi nào cần xử lý."
    );

    $("featureLabel").textContent = "Quản trị hệ thống";
    const mil = (v) => `${(v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
    cards([
      {
        key: "qt-dashboard", icon: "fa-chart-pie", color: "#0b3d91", title: "Dashboard",
        stat: `${new Set(students.map((s) => s.lop)).size} lớp · ${students.length} SV`, note: "Thống kê & biểu đồ toàn trường",
      },
      {
        key: "qt-tai-khoan", icon: "fa-users-gear", color: "#7c3aed", title: "Tài khoản",
        stat: `${students.length + store.staff.length} tài khoản`,
        note: `${teachers.length} giảng viên · ${store.staff.length - teachers.length} quản trị viên`,
        alert: lockedCount ? `${lockedCount} tài khoản đang bị khóa` : "",
      },
      {
        key: "qt-phan-hoi", icon: "fa-inbox", color: "#0891b2", title: "Phản hồi",
        stat: `${open.length} cần xử lý`, note: `${feedback.length} phản hồi toàn trường`,
        alert: urgent.length ? `${urgent.length} phản hồi khẩn cấp` : "",
      },
      {
        key: "qt-tai-chinh", icon: "fa-sack-dollar", color: debtors ? "#dc2626" : "#16a34a", title: "Tài chính",
        stat: `Đã thu ${due ? ((collected / due) * 100).toFixed(1) : 0}%`,
        note: `${mil(collected)} / ${mil(due)} · còn nợ ${mil(sum("debt"))}`,
        alert: debtors ? `${debtors} sinh viên chưa nộp đủ` : "",
      },
    ]);
  }

  if (user.role === "teacher") renderTeacher();
  else if (user.role === "admin") renderAdmin();
  else renderStudent();
});
