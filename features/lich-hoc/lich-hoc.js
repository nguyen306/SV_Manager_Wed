// Thời khóa biểu cá nhân, toàn bộ lấy từ data/students.js (sinh từ file Excel):
//   TIMETABLE          — sheet "TKB Chính Thức (Ban Ngày)": lớp, năm, môn, thứ, ca
//   TUTORING_SCHEDULE  — sheet "Lịch Phụ Đạo Tối": môn, thứ, ca tối
//   TUTORING_STUDENTS  — sheet "Danh Sách SV Phụ Đạo Tối": SV có điểm môn < 2.0
document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  if (!student) return; // app.js đã chuyển về trang đăng nhập

  const START_YEAR = 2025; // Năm 1 = 2025_2026
  const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
  const todayName = DAYS[(new Date().getDay() + 6) % 7]; // getDay(): 0 = Chủ Nhật

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const schoolYear = (y) => `${START_YEAR + y - 1}_${START_YEAR + y}`;

  const subjects = new Map((window.SUBJECTS || []).map((s) => [s.name, s]));

  // "Ca 4 (Tiết 10-12)" -> { key: "Ca 4", detail: "Tiết 10-12" }; "Ca Tối (18:00 - 20:00)" -> { key: "Ca Tối", ... }
  function parseSession(text) {
    const m = String(text).match(/^(.+?)\s*\((.+)\)\s*$/);
    return m ? { key: m[1].trim(), detail: m[2].trim() } : { key: String(text).trim(), detail: "" };
  }

  /* ---------- Lịch của sinh viên ---------- */
  const classes = (window.TIMETABLE || [])
    .filter((t) => t.lop === student.lop)
    .map((t) => ({ ...t, ...parseSession(t.session), type: "day" }));

  const tutorSchedule = new Map((window.TUTORING_SCHEDULE || []).map((t) => [t.subject, t]));
  const tutoring = getTutoring(student.msv).map((t) => {
    const sched = tutorSchedule.get(t.subject);
    // Ưu tiên lịch theo môn; nếu thiếu thì đọc từ cột "Lịch học phụ đạo tối" của sinh viên
    const day = sched ? sched.day : t.schedule.split(" (")[0];
    const session = sched ? sched.session : t.schedule.replace(/^.*?\((.*)\)$/, "$1");
    return { year: t.year, subject: t.subject, score: t.score, day, session, ...parseSession(session), type: "tutor" };
  });

  // Các ca dùng cho hàng của lưới: lấy từ toàn bộ dữ liệu để lưới các năm giống nhau
  const slotMap = new Map();
  [...(window.TIMETABLE || []), ...(window.TUTORING_SCHEDULE || [])].forEach((t) => {
    const s = parseSession(t.session);
    if (!slotMap.has(s.key)) slotMap.set(s.key, { ...s, evening: /tối/i.test(s.key) });
  });
  const slotOrder = (s) => (s.evening ? 99 : parseInt(s.key.replace(/\D/g, ""), 10) || 50);
  const slots = [...slotMap.values()].sort((a, b) => slotOrder(a) - slotOrder(b));

  const years = [...new Set([...classes, ...tutoring].map((x) => x.year))].sort((a, b) => a - b);

  // Năm học hiện tại theo ngày hệ thống (năm học bắt đầu từ tháng 9)
  const now = new Date();
  const currentYear = Math.min(
    Math.max((now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1) - START_YEAR + 1, years[0] || 1),
    years[years.length - 1] || 1
  );

  /* ---------- Thông tin đầu trang ---------- */
  document.getElementById("tkbSub").textContent =
    `${toTitleCase(student.hoTen)} · MSV ${student.msv} · Lớp ${student.lop}`;

  const alert = document.getElementById("tutorAlert");
  if (tutoring.length) {
    alert.hidden = false;
    alert.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div>
        Bạn có <b>${tutoring.length} môn điểm dưới 2.0</b> và phải học phụ đạo buổi tối.
        Lịch đã được bổ sung tự động vào thời khóa biểu:
        <ul>${tutoring
          .map(
            (t) => `<li><b>${esc(t.subject)}</b> (Năm ${t.year}, điểm ${esc(t.score)}) —
              ${esc(t.day)}, ${esc(t.key)} ${esc(t.detail)}</li>`
          )
          .join("")}</ul>
      </div>`;
  }

  /* ---------- Chọn năm ---------- */
  const yearTabs = document.getElementById("yearTabs");
  yearTabs.innerHTML = years
    .map(
      (y) => `<button type="button" role="tab" data-year="${y}" aria-selected="false">
        <span>Năm ${y}${y === currentYear ? '<i class="now" title="Năm học hiện tại"></i>' : ""}</span>
        <small>${schoolYear(y)}</small></button>`
    )
    .join("");

  function selectYear(y) {
    if (!years.includes(y)) y = currentYear;
    yearTabs.querySelectorAll("[data-year]").forEach((b) => b.setAttribute("aria-selected", Number(b.dataset.year) === y));
    history.replaceState(null, "", `#nam-${y}`);
    render(y);
  }
  yearTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-year]");
    if (btn) selectYear(Number(btn.dataset.year));
  });

  /* ---------- Hiển thị ---------- */
  function card(item) {
    const credits = subjects.get(item.subject)?.credits;
    return item.type === "tutor"
      ? `<div class="class-card class-card--tutor">
           <b>${esc(item.subject)}</b>
           <span>${esc(item.detail)}</span>
           <span class="tag">Phụ đạo · điểm ${esc(item.score)}</span>
         </div>`
      : `<div class="class-card">
           <b>${esc(item.subject)}</b>
           <span>${esc(item.detail)}${credits ? ` · ${credits} TC` : ""}</span>
         </div>`;
  }

  function render(year) {
    const items = [...classes, ...tutoring].filter((x) => x.year === year);
    const at = (day, slotKey) => items.filter((x) => x.day === day && x.key === slotKey);
    const dayClasses = items.filter((x) => x.type === "day");
    const tutorItems = items.filter((x) => x.type === "tutor");
    const totalCredits = dayClasses.reduce((s, x) => s + (subjects.get(x.subject)?.credits || 0), 0);

    document.getElementById("gridTitle").textContent =
      `Lịch học trong tuần · Năm ${year} (${schoolYear(year)})`;

    document.getElementById("tkbStats").innerHTML = `
      <div class="tkb-stat"><i class="fa-solid fa-book" style="background:#dbeafe;color:#1d4ed8"></i>
        <div><b>${dayClasses.length}</b><span>Môn học chính thức</span></div></div>
      <div class="tkb-stat"><i class="fa-solid fa-layer-group" style="background:#e0e7ff;color:var(--navy)"></i>
        <div><b>${totalCredits}</b><span>Tổng tín chỉ</span></div></div>
      <div class="tkb-stat"><i class="fa-solid fa-calendar-day" style="background:#dcfce7;color:#16a34a"></i>
        <div><b>${new Set(items.map((x) => x.day)).size}</b><span>Số ngày có lịch / tuần</span></div></div>
      <div class="tkb-stat"><i class="fa-solid fa-moon" style="background:#ffedd5;color:var(--tutor)"></i>
        <div><b>${tutorItems.length}</b><span>Buổi phụ đạo tối</span></div></div>`;

    // Lưới tuần
    document.getElementById("weekTable").innerHTML = `
      <thead><tr>
        <th class="slot">Ca học</th>
        ${DAYS.map((d) => `<th class="${d === todayName ? "is-today" : ""}">${d}${d === todayName ? "<small>Hôm nay</small>" : ""}</th>`).join("")}
      </tr></thead>
      <tbody>${slots
        .map(
          (s) => `<tr class="${s.evening ? "row--evening" : ""}">
            <th class="slot">${esc(s.key)}<small>${esc(s.detail)}</small></th>
            ${DAYS.map((d) => `<td class="${d === todayName ? "is-today" : ""}">${at(d, s.key).map(card).join("")}</td>`).join("")}
          </tr>`
        )
        .join("")}</tbody>`;

    // Danh sách theo ngày (điện thoại)
    document.getElementById("dayList").innerHTML = DAYS.map((d) => {
      const list = items
        .filter((x) => x.day === d)
        .sort((a, b) => slotOrder(slotMap.get(a.key)) - slotOrder(slotMap.get(b.key)));
      return `<div class="day ${d === todayName ? "is-today" : ""}">
        <div class="day__head"><span>${d}</span><span>${d === todayName ? "Hôm nay" : `${list.length} buổi`}</span></div>
        ${list.length
          ? `<div class="day__items">${list
              .map((x) => `<div class="day__item"><div class="day__slot">${esc(x.key)}<small>${esc(x.detail)}</small></div>${card(x)}</div>`)
              .join("")}</div>`
          : `<div class="day__empty">Không có lịch học</div>`}
      </div>`;
    }).join("");

    // Bảng danh sách
    const sorted = [...items].sort(
      (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || slotOrder(slotMap.get(a.key)) - slotOrder(slotMap.get(b.key))
    );
    document.getElementById("listBody").innerHTML = sorted.length
      ? sorted
          .map((x, i) => {
            const score = student.diem[x.subject];
            return `<tr class="${x.type === "tutor" ? "is-tutor" : ""}">
              <td>${i + 1}</td>
              <td><b>${esc(x.subject)}</b></td>
              <td>${subjects.get(x.subject)?.credits ?? "—"}</td>
              <td>${esc(x.day)}</td>
              <td>${esc(x.key)} <small style="color:var(--muted)">(${esc(x.detail)})</small></td>
              <td>${x.type === "tutor" ? '<span class="pill pill--tutor">Phụ đạo tối</span>' : '<span class="pill pill--day">Chính thức</span>'}</td>
              <td class="score ${score < 2 ? "low" : ""}">${score ?? "—"}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="7" class="empty-row">Năm học này chưa có lịch.</td></tr>`;
  }

  selectYear(Number((location.hash.match(/^#nam-(\d)$/) || [])[1]) || currentYear);
});
