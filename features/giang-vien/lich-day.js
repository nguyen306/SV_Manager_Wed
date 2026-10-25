// Lịch giảng dạy theo tuần: lịch chính thức (TKB trong Excel) + các buổi đăng ký phòng / dạy bù.
document.addEventListener("DOMContentLoaded", () => {
  if (!TEACHER) return; // app.js đã chuyển hướng

  const sessions = teacherSessions();
  const sections = teacherSections();
  let monday = mondayOf(new Date());

  $id("teacherSub").textContent =
    `${TEACHER.name} · ${(TEACHER.subjects || []).length} môn · ${(TEACHER.classes || []).length} lớp phụ trách`;
  $id("bookLink").href = pageUrl("gv-dang-ky-phong");

  function render() {
    const days = WEEK_DAYS.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const todayKey = dayKey(new Date());
    const myBookings = activeBookings().filter((b) => b.teacher === TEACHER.username);

    // Mỗi ngày: buổi chính thức theo năm học của ngày đó + buổi đăng ký phòng đúng ngày
    const itemsOn = (date, slotKey) => {
      const year = studyYearOfDate(date);
      const official = year
        ? sessions.filter((s) => s.year === year && s.day === dayName(date) && s.key === slotKey).map((s) => ({ ...s, kind: "class" }))
        : [];
      const booked = myBookings
        .filter((b) => b.date === dayKey(date) && b.slot === slotKey)
        .map((b) => ({ ...b, kind: "booking" }));
      return [...official, ...booked];
    };

    const year = studyYearOfDate(days[0]) || studyYearOfDate(days[6]);
    $id("weekTitle").textContent =
      `Tuần ${fmtDate(days[0])} – ${fmtDate(days[6])}${year ? ` · Năm học ${schoolYearLabel(year)}` : " · Ngoài khóa học"}`;
    $id("weekPicker").value = dayKey(monday);

    const all = days.flatMap((d) => SLOTS.flatMap((s) => itemsOn(d, s.key)));
    const classCount = all.filter((x) => x.kind === "class").length;
    const bookingCount = all.filter((x) => x.kind === "booking").length;
    const students = new Set(sections.flatMap((s) => studentsOfClass(s.lop).map((x) => x.msv)));
    $id("stats").innerHTML = `
      <div class="stat stat--info"><span class="stat__icon"><i class="fa-solid fa-chalkboard"></i></span>
        <div><b>${classCount}</b><span>Buổi dạy chính thức trong tuần</span></div></div>
      <div class="stat"><span class="stat__icon"><i class="fa-regular fa-clock"></i></span>
        <div><b>${classCount * 3}</b><span>Số tiết trong tuần (3 tiết/ca)</span></div></div>
      <div class="stat stat--warn"><span class="stat__icon"><i class="fa-solid fa-door-open"></i></span>
        <div><b>${bookingCount}</b><span>Buổi đăng ký phòng / dạy bù</span></div></div>
      <div class="stat stat--ok"><span class="stat__icon"><i class="fa-solid fa-users"></i></span>
        <div><b>${students.size}</b><span>Sinh viên phụ trách</span></div></div>`;

    const card = (x) =>
      x.kind === "class"
        ? `<div class="slot-card"><b>${esc(x.subject)}</b><span>${esc(x.lop)}</span><span>${esc(x.detail)}${x.credits ? ` · ${x.credits} TC` : ""}</span></div>`
        : `<div class="slot-card slot-card--booking"><b>${esc(x.subject || x.purpose)}</b>
             <span><i class="fa-solid fa-door-open"></i> ${esc(x.room)} · ${esc(x.purpose)}</span>${x.lop ? `<span>${esc(x.lop)}</span>` : ""}</div>`;

    $id("weekTable").innerHTML = `
      <thead><tr><th class="slot">Ca</th>${days
        .map((d, i) => `<th class="${dayKey(d) === todayKey ? "is-today" : ""}">${WEEK_DAYS[i]}<small>${fmtDate(d).slice(0, 5)}</small></th>`)
        .join("")}</tr></thead>
      <tbody>${SLOTS.map(
        (s) => `<tr class="${s.evening ? "row--evening" : ""}"><th class="slot">${s.key}<small>${s.detail}</small></th>${days
          .map((d) => `<td class="${dayKey(d) === todayKey ? "is-today" : ""}">${itemsOn(d, s.key).map(card).join("")}</td>`)
          .join("")}</tr>`
      ).join("")}</tbody>`;
  }

  // Danh sách lớp học phần (không đổi theo tuần)
  $id("sectionBody").innerHTML = sections.length
    ? sections
        .map(
          (s) => `<tr>
            <td class="nowrap">Năm ${s.year}<small>${schoolYearLabel(s.year)}</small></td>
            <td><b>${esc(s.subject)}</b></td>
            <td>${esc(s.lop)}</td>
            <td class="center">${subjectCredits(s.subject) ?? "—"}</td>
            <td>${s.sessions.map((x) => `${esc(x.day)}, ${esc(x.key)}`).join("<br />")}</td>
            <td class="num">${studentsOfClass(s.lop).length}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="6" class="empty-row">Bạn chưa được phân công lớp học phần nào. Liên hệ quản trị viên.</td></tr>`;

  const shift = (days) => {
    monday = new Date(monday);
    monday.setDate(monday.getDate() + days);
    render();
  };
  $id("prevWeek").addEventListener("click", () => shift(-7));
  $id("nextWeek").addEventListener("click", () => shift(7));
  $id("thisWeek").addEventListener("click", () => {
    monday = mondayOf(new Date());
    render();
  });
  $id("weekPicker").addEventListener("change", (e) => {
    if (!e.target.value) return;
    monday = mondayOf(parseDayKey(e.target.value));
    render();
  });
  window.addEventListener("storage", (e) => { if (e.key === STORE.bookings) render(); });

  render();
});
