// Đăng ký phòng học trống theo ngày + ca. Một phòng / một ca chỉ một giảng viên;
// không cho trùng với lịch dạy chính thức hoặc buổi đã đăng ký khác của chính giảng viên.
document.addEventListener("DOMContentLoaded", () => {
  if (!TEACHER) return;

  const sessions = teacherSessions();
  const sections = teacherSections();
  const today = dayKey(new Date());

  const dateEl = $id("date");
  const slotEl = $id("slot");
  const typeEl = $id("type");
  const onlyFreeEl = $id("onlyFree");

  dateEl.min = today;
  dateEl.value = today;
  slotEl.innerHTML = SLOTS.map((s) => `<option value="${s.key}">${s.key} (${s.detail})</option>`).join("");
  [...new Set(ROOMS.map((r) => r.type))].forEach((t) => typeEl.insertAdjacentHTML("beforeend", `<option>${esc(t)}</option>`));

  // Buổi dạy chính thức của GV trùng ngày + ca đang chọn (nếu có)
  function officialClash(date, slot) {
    const d = parseDayKey(date);
    const year = studyYearOfDate(d);
    return year ? sessions.find((s) => s.year === year && s.day === dayName(d) && s.key === slot) : null;
  }

  function render() {
    const date = dateEl.value;
    const slot = slotEl.value;
    const bookings = activeBookings();
    const at = bookings.filter((b) => b.date === date && b.slot === slot);
    const clash = date ? officialClash(date, slot) : null;
    const mine = at.find((b) => b.teacher === TEACHER.username);
    const past = !date || date < today;

    const note = $id("slotNote");
    note.hidden = !(clash || mine || past);
    note.className = "note note--warn";
    note.innerHTML = past
      ? '<i class="fa-solid fa-triangle-exclamation"></i> Vui lòng chọn ngày từ hôm nay trở đi.'
      : clash
        ? `<i class="fa-solid fa-triangle-exclamation"></i> Ca này bạn có lịch dạy chính thức: <b>${esc(clash.subject)}</b> – ${esc(clash.lop)}. Không thể đăng ký thêm.`
        : mine
          ? `<i class="fa-solid fa-circle-info"></i> Bạn đã đăng ký phòng <b>${esc(mine.room)}</b> cho ca này.`
          : "";
    const blocked = past || Boolean(clash) || Boolean(mine);

    const rooms = ROOMS.filter((r) => !typeEl.value || r.type === typeEl.value).filter(
      (r) => !onlyFreeEl.checked || !at.some((b) => b.room === r.id)
    );
    $id("roomGrid").innerHTML = rooms.length
      ? rooms
          .map((r) => {
            const b = at.find((x) => x.room === r.id);
            const isMine = b && b.teacher === TEACHER.username;
            const state = b ? (isMine ? "mine" : "busy") : "free";
            return `<button type="button" class="room room--${state}" data-room="${r.id}" ${b || blocked ? "disabled" : ""}>
                <span class="room__id">${r.id}</span>
                <span class="room__type">${esc(r.type)} · ${r.seats} chỗ</span>
                <span class="room__state">${
                  b ? (isMine ? '<i class="fa-solid fa-user-check"></i> Bạn đã đặt' : `<i class="fa-solid fa-lock"></i> ${esc(b.teacherName)}`)
                    : '<i class="fa-solid fa-circle-check"></i> Còn trống'
                }</span>
              </button>`;
          })
          .join("")
      : `<p class="empty"><i class="fa-regular fa-face-meh"></i>Không có phòng phù hợp.</p>`;

    // Danh sách đăng ký của tôi
    const list = loadBookings()
      .filter((b) => b.teacher === TEACHER.username)
      .sort((a, b) => b.date.localeCompare(a.date) || a.slot.localeCompare(b.slot));
    $id("myCount").textContent = `${list.filter((b) => b.status !== "cancelled").length} đang hiệu lực`;
    $id("myBody").innerHTML = list.length
      ? list
          .map((b) => {
            const cancelled = b.status === "cancelled";
            const done = !cancelled && b.date < today;
            return `<tr class="${cancelled ? "is-muted" : ""}">
              <td class="nowrap">${fmtDate(parseDayKey(b.date))}<small>${dayName(parseDayKey(b.date))}</small></td>
              <td class="nowrap">${esc(b.slot)}</td>
              <td><b>${esc(b.room)}</b></td>
              <td>${esc(b.purpose)}</td>
              <td>${b.subject ? `${esc(b.subject)}<small>${esc(b.lop)}</small>` : "—"}</td>
              <td>${esc(b.note) || "—"}</td>
              <td>${cancelled ? '<span class="pill pill--muted">Đã hủy</span>' : done ? '<span class="pill pill--info">Đã diễn ra</span>' : '<span class="pill pill--ok">Đã đăng ký</span>'}</td>
              <td class="actions">${!cancelled && !done ? `<button type="button" class="icon-action icon-action--bad" data-cancel="${esc(b.id)}" title="Hủy đăng ký"><i class="fa-solid fa-xmark"></i></button>` : ""}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="8" class="empty-row">Chưa có đăng ký nào.</td></tr>`;
  }

  // Bấm phòng trống -> popup đăng ký
  $id("roomGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-room]");
    if (!btn || btn.disabled) return;
    const room = ROOMS.find((r) => r.id === btn.dataset.room);
    const date = dateEl.value;
    const slot = SLOTS.find((s) => s.key === slotEl.value);
    openModal({
      title: `Đăng ký phòng ${room.id}`,
      sub: `${dayName(parseDayKey(date))}, ${fmtDate(parseDayKey(date))} · ${slot.key} (${slot.detail})`,
      icon: "fa-door-open",
      body: `
        <div class="ui-form">
          <label class="ui-field"><span>Mục đích *</span>
            <select class="ui-select" id="bkPurpose">${BOOKING_PURPOSES.map((p) => `<option>${esc(p)}</option>`).join("")}</select></label>
          <label class="ui-field"><span>Lớp học phần</span>
            <select class="ui-select" id="bkSection"><option value="">— Không gắn lớp —</option>${sections
              .map((s) => `<option value="${esc(s.id)}">${esc(s.subject)} – ${esc(s.lop)}</option>`)
              .join("")}</select></label>
          <label class="ui-field full"><span>Ghi chú</span>
            <input class="ui-input" id="bkNote" maxlength="120" placeholder="VD: Dạy bù buổi nghỉ ngày 20/11" /></label>
        </div>
        <p class="note" style="margin-top:12px"><i class="fa-solid fa-circle-info"></i> ${esc(room.type)} · ${room.seats} chỗ ngồi</p>`,
      actions: [
        { value: "cancel", label: "Hủy" },
        { value: "ok", label: "Xác nhận đăng ký", kind: "primary", icon: "fa-check" },
      ],
      onAction: (value, dlg) => {
        if (value !== "ok") return;
        // Kiểm tra lại ngay trước khi ghi (tránh 2 người cùng đặt)
        const list = loadBookings();
        const taken = list.some((b) => b.status !== "cancelled" && b.date === date && b.slot === slot.key && (b.room === room.id || b.teacher === TEACHER.username));
        if (taken) {
          showToast("Phòng hoặc ca này vừa được đăng ký. Vui lòng chọn lại.", "error");
          render();
          return;
        }
        const section = sections.find((s) => s.id === dlg.querySelector("#bkSection").value);
        list.push({
          id: newId(),
          teacher: TEACHER.username,
          teacherName: TEACHER.name,
          room: room.id,
          date,
          slot: slot.key,
          purpose: dlg.querySelector("#bkPurpose").value,
          subject: section ? section.subject : "",
          lop: section ? section.lop : "",
          note: dlg.querySelector("#bkNote").value.trim(),
          status: "active",
          createdAt: new Date().toISOString(),
        });
        if (!saveBookings(list)) return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error"), false;
        showToast(`Đã đăng ký phòng ${room.id} – ${slot.key}, ${fmtDate(parseDayKey(date))}. Buổi này đã có trong Lịch dạy.`, "success");
        render();
      },
    });
  });

  $id("myBody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    const b = loadBookings().find((x) => x.id === btn.dataset.cancel);
    openModal({
      title: "Hủy đăng ký phòng?",
      sub: `${b.room} · ${b.slot} · ${fmtDate(parseDayKey(b.date))}`,
      icon: "fa-triangle-exclamation",
      warn: true,
      body: "<p>Phòng sẽ được trả lại cho giảng viên khác đăng ký.</p>",
      actions: [
        { value: "cancel", label: "Không" },
        { value: "ok", label: "Hủy đăng ký", kind: "danger", icon: "fa-xmark" },
      ],
      onAction: (value) => {
        if (value !== "ok") return;
        const list = loadBookings();
        const item = list.find((x) => x.id === b.id);
        if (item) {
          item.status = "cancelled";
          item.cancelledAt = new Date().toISOString();
          saveBookings(list);
        }
        showToast("Đã hủy đăng ký phòng.");
        render();
      },
    });
  });

  [dateEl, slotEl, typeEl, onlyFreeEl].forEach((el) => el.addEventListener("change", render));
  window.addEventListener("storage", (e) => { if (e.key === STORE.bookings) render(); });
  render();
});
