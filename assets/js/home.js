// Trang chủ (file tổng): tóm tắt nhanh từng phân hệ cho sinh viên đang đăng nhập và dẫn tới trang chi tiết.
document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  if (!student) return; // app.js đã chuyển về trang đăng nhập

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

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const DAYS = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const todayName = DAYS[now.getDay()];
  // Năm học hiện tại (bắt đầu tháng 9; Năm 1 = 2025_2026), giới hạn 1..4
  const currentYear = Math.min(4, Math.max(1, (now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1) - 2025 + 1));

  /* ---------- Số liệu từng phân hệ ---------- */
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

  /* ---------- Lời chào ---------- */
  document.getElementById("today").textContent =
    `${todayName}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  document.getElementById("heroName").textContent = toTitleCase(student.hoTen);
  document.getElementById("heroSub").textContent = `MSV ${student.msv} · ${student.lop} · Năm ${currentYear}`;
  document.getElementById("heroChips").innerHTML = [
    `<span class="chip"><i class="fa-solid fa-chart-line"></i> GPA ${gpa != null ? gpa.toFixed(2) : "—"} · ${rank.label}</span>`,
    `<span class="chip ${fin.done ? "chip--ok" : "chip--bad"}"><i class="fa-solid fa-wallet"></i> ${fin.done ? "Học phí đã hoàn thành" : `Còn nợ ${formatMoney(fin.totals.debt)}`}</span>`,
    tutoring.length ? `<span class="chip chip--warn"><i class="fa-solid fa-moon"></i> ${tutoring.length} môn phụ đạo tối</span>` : "",
  ].join("");

  /* ---------- Thẻ phân hệ ---------- */
  const cards = [
    {
      key: "profile", icon: "fa-user", color: "#4f46e5", title: "Thông tin cá nhân",
      stat: esc(student.lop), note: `SĐT ${esc(student.sdt || "—")}`,
    },
    {
      key: "hoc-tap", icon: "fa-book-open", color: "#0b3d91", title: "Học tập",
      stat: `GPA ${gpa != null ? gpa.toFixed(2) : "—"}`, note: `Xếp loại ${rank.label}`, badge: rank.label,
    },
    {
      key: "lich-hoc", icon: "fa-calendar-days", color: "#0e7490", title: "Lịch học",
      stat: todayClasses.length ? `${todayClasses.length} buổi hôm nay` : "Hôm nay không có lịch",
      note: todayClasses.length
        ? todayClasses.map((c) => `${esc(c.subject)} (${esc(String(c.session).split(" (")[0])})`).join(", ")
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
      stat: fin.done ? "Không có khoản cần nộp" : "Thanh toán ngay",
      note: "SHB QR · VNPay · MoMo · Vietcombank",
    },
    {
      key: "phan-hoi", icon: "fa-comments", color: "#0891b2", title: "Phản hồi",
      stat: feedback.length ? `${feedback.length} ý kiến đã gửi` : "Gửi góp ý",
      note: feedback.length ? `${feedbackOpen} đang chờ giải quyết` : "Cơ sở vật chất, đào tạo, học phí, hệ thống...",
    },
  ];

  document.getElementById("featureGrid").innerHTML = cards
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
});
