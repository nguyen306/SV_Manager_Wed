document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  if (!student) {
    window.location.href = pageUrl("dang-nhap");
    return;
  }

  /* ========== CẤU HÌNH LOẠI PHÒNG ========== */
  // Mỗi loại: nửa đầu là khu Nam, nửa sau là khu Nữ.
  const ROOM_TYPES = [
    { capacity: 10, price: 1000000, total: 20, prefix: "A", icon: "fa-people-group" },
    { capacity: 8, price: 1500000, total: 10, prefix: "B", icon: "fa-users" },
    { capacity: 5, price: 2000000, total: 10, prefix: "C", icon: "fa-user-group" },
  ];

  // Số người đã ở sẵn trong phòng — DỮ LIỆU MẪU để demo, khi có dữ liệu thật thì thay bằng
  // kết quả từ server (hoặc đặt tất cả bằng 0).
  function seedOccupancy(type, index) {
    if (index % 7 === 3) return type.capacity; // vài phòng đã đầy
    return (index * 3 + type.capacity) % type.capacity;
  }

  const ROOMS = ROOM_TYPES.flatMap((type) =>
    Array.from({ length: type.total }, (_, i) => {
      const id = `${type.prefix}${String(i + 1).padStart(2, "0")}`;
      return {
        id,
        name: `Phòng ${id}`,
        type,
        gender: i < type.total / 2 ? "nam" : "nu",
        seed: seedOccupancy(type, i),
      };
    })
  );
  const roomById = new Map(ROOMS.map((r) => [r.id, r]));

  /* ========== LƯU TRỮ (localStorage) ========== */
  // Mọi lượt đăng ký trên trình duyệt này lưu chung một danh sách (giả lập CSDL),
  // nhờ vậy số người trong phòng tính cả sinh viên khác đã đăng nhập trên máy.
  const STORE_KEY = "dorm:registrations";

  function loadRegistrations() {
    try {
      const list = JSON.parse(storageGet(STORE_KEY));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  function saveRegistrations(list) {
    return storageSet(STORE_KEY, JSON.stringify(list));
  }

  let registrations = loadRegistrations();

  const occupancy = (room) =>
    Math.min(room.type.capacity, room.seed + registrations.filter((r) => r.roomId === room.id && r.status === "active").length);
  const myRegistrations = () => registrations.filter((r) => r.msv === student.msv);
  const myActive = () => myRegistrations().find((r) => r.status === "active");

  /* ========== TIỆN ÍCH ========== */
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `${n.toLocaleString("vi-VN")} VNĐ`;
  const genderLabel = (g) => (g === "nam" ? "Khu Nam" : "Khu Nữ");
  const genderIcon = (g) => (g === "nam" ? "fa-mars" : "fa-venus");

  const toast = document.getElementById("toast");
  let toastTimer;
  function showToast(message, type = "") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  /* ========== TAB 1: ĐĂNG KÝ PHÒNG ========== */
  const filters = { gender: "all", onlyAvailable: false };

  function renderStats() {
    const free = ROOMS.reduce((s, r) => s + (r.type.capacity - occupancy(r)), 0);
    const availableRooms = ROOMS.filter((r) => occupancy(r) < r.type.capacity).length;
    const mine = myActive();
    document.getElementById("stats").innerHTML = `
      <div class="stat"><div class="stat__icon" style="background:#e0e7ff;color:var(--navy)"><i class="fa-solid fa-building"></i></div>
        <div><b>${ROOMS.length}</b><span>Tổng số phòng</span></div></div>
      <div class="stat"><div class="stat__icon" style="background:#dcfce7;color:var(--success)"><i class="fa-solid fa-door-open"></i></div>
        <div><b>${availableRooms}</b><span>Phòng còn chỗ</span></div></div>
      <div class="stat"><div class="stat__icon" style="background:#ffedd5;color:var(--orange)"><i class="fa-solid fa-bed"></i></div>
        <div><b>${free}</b><span>Chỗ trống còn lại</span></div></div>
      <div class="stat"><div class="stat__icon" style="background:#f0fdf4;color:var(--success)"><i class="fa-solid fa-house-user"></i></div>
        <div><b>${mine ? esc(mine.roomName) : "—"}</b><span>Phòng của bạn</span></div></div>`;

    const notice = document.getElementById("currentNotice");
    notice.hidden = !mine;
    if (mine) {
      notice.innerHTML = `<i class="fa-solid fa-circle-check"></i>
        <span>Bạn đã đăng ký <b>${esc(mine.roomName)}</b> (phòng ${mine.capacity} người, ${genderLabel(mine.gender)}).
        Mỗi sinh viên chỉ giữ 1 phòng — hủy phòng hiện tại nếu muốn đổi.</span>
        <button type="button" data-goto="history">Xem lịch sử</button>`;
    }
  }

  function roomTile(room, mineId) {
    const count = occupancy(room);
    const full = count >= room.type.capacity;
    const mine = room.id === mineId;
    const pct = Math.round((count / room.type.capacity) * 100);
    const state = mine ? "Phòng của bạn" : full ? "Hết chỗ" : `Còn ${room.type.capacity - count} chỗ`;
    const cls = ["room", `room--${room.gender}`, full && !mine ? "room--full" : "", mine ? "room--mine" : ""].join(" ");
    return `
      <button type="button" class="${cls}" data-room="${room.id}" ${full && !mine ? "disabled" : ""}
        aria-label="${esc(room.name)}, ${genderLabel(room.gender)}, ${count}/${room.type.capacity} người, ${state}">
        <span class="room__name">${esc(room.name)}<i class="fa-solid ${genderIcon(room.gender)}"></i></span>
        <span class="room__count"><b>${count}/${room.type.capacity}</b> người${full ? " - Hết chỗ" : ""}</span>
        <span class="room__bar"><span style="width:${pct}%"></span></span>
        <span class="room__state">${state}</span>
      </button>`;
  }

  function renderRooms() {
    const mineId = myActive()?.roomId;
    document.getElementById("roomTypes").innerHTML = ROOM_TYPES.map((type) => {
      const rooms = ROOMS.filter((r) => r.type === type);
      const free = rooms.reduce((s, r) => s + (type.capacity - occupancy(r)), 0);
      const zones = ["nam", "nu"]
        .filter((g) => filters.gender === "all" || filters.gender === g)
        .map((g) => {
          const list = rooms.filter(
            (r) => r.gender === g && (!filters.onlyAvailable || occupancy(r) < type.capacity || r.id === mineId)
          );
          return `
            <div class="zone zone--${g}">
              <div class="zone__title"><i class="fa-solid ${genderIcon(g)}"></i>${genderLabel(g)} · ${list.length} phòng</div>
              ${list.length
                ? `<div class="room-grid">${list.map((r) => roomTile(r, mineId)).join("")}</div>`
                : `<p class="zone__empty">Không có phòng phù hợp với bộ lọc.</p>`}
            </div>`;
        })
        .join("");
      return `
        <section class="box type-box">
          <div class="box__head">
            <h2><i class="fa-solid ${type.icon}"></i> Phòng ${type.capacity} người <small>· ${type.total} phòng</small></h2>
            <span class="price-tag">${money(type.price)}/người/tháng</span>
          </div>
          <div class="type-box__meta">
            <span>Khu Nam: <b>${type.total / 2} phòng</b></span>
            <span>Khu Nữ: <b>${type.total / 2} phòng</b></span>
            <span>Chỗ trống: <b>${free}/${type.total * type.capacity}</b></span>
          </div>
          ${zones}
        </section>`;
    }).join("");
  }

  document.querySelector(".segmented").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-gender]");
    if (!btn) return;
    filters.gender = btn.dataset.gender;
    document.querySelectorAll(".segmented [data-gender]").forEach((b) => b.setAttribute("aria-checked", b === btn));
    renderRooms();
  });
  document.getElementById("onlyAvailable").addEventListener("change", (e) => {
    filters.onlyAvailable = e.target.checked;
    renderRooms();
  });

  /* ========== POPUP ========== */
  const modal = document.getElementById("confirmModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalActions = document.getElementById("modalActions");
  let pendingAction = null;

  function openModal({ title, body, actions, warn = false, onConfirm = null }) {
    modal.classList.toggle("modal--warn", warn);
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    modalActions.innerHTML = actions;
    pendingAction = onConfirm;
    modal.returnValue = ""; // đóng bằng Esc sẽ không chạy lại hành động cũ
    modal.showModal();
  }

  modal.addEventListener("close", () => {
    const action = pendingAction;
    pendingAction = null;
    if (modal.returnValue === "confirm" && action) action();
    if (modal.returnValue === "history") activate("history");
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close("cancel"); });

  function studentRows() {
    return `
      <dt>Sinh viên</dt><dd>${esc(toTitleCase(student.hoTen))}</dd>
      <dt>Mã sinh viên</dt><dd>${esc(student.msv)}</dd>
      <dt>Lớp</dt><dd>${esc(student.lop)}</dd>`;
  }

  document.getElementById("roomTypes").addEventListener("click", (e) => {
    const tile = e.target.closest("[data-room]");
    if (!tile || tile.disabled) return;
    const room = roomById.get(tile.dataset.room);
    const mine = myActive();

    if (mine && mine.roomId === room.id) {
      activate("history");
      return;
    }
    if (mine) {
      openModal({
        warn: true,
        title: "Bạn đã có phòng",
        body: `<p>Bạn đang giữ <b>${esc(mine.roomName)}</b>. Mỗi sinh viên chỉ được đăng ký 1 phòng.</p>
               <p class="modal__note">Hãy hủy đăng ký phòng hiện tại ở tab "Lịch sử đăng ký của tôi" trước khi chọn phòng khác.</p>`,
        actions: `<button type="submit" value="cancel" class="btn btn--ghost">Đóng</button>
                  <button type="submit" value="history" class="btn btn--primary"><i class="fa-solid fa-clock-rotate-left"></i> Xem lịch sử</button>`,
      });
      return;
    }

    const count = occupancy(room);
    openModal({
      title: "Xác nhận đăng ký phòng",
      body: `
        <dl class="detail">
          <dt>Tên phòng</dt><dd>${esc(room.name)}</dd>
          <dt>Loại phòng</dt><dd>Phòng ${room.type.capacity} người</dd>
          <dt>Khu</dt><dd><span class="pill pill--${room.gender}"><i class="fa-solid ${genderIcon(room.gender)}"></i>${genderLabel(room.gender)}</span></dd>
          <dt>Hiện có</dt><dd>${count}/${room.type.capacity} người (còn ${room.type.capacity - count} chỗ)</dd>
          <dt>Mức giá</dt><dd class="price">${money(room.type.price)}/người/tháng</dd>
          ${studentRows()}
        </dl>
        <p class="modal__note"><i class="fa-solid fa-circle-info"></i> Vui lòng chọn đúng khu theo giới tính của bạn.</p>`,
      actions: `<button type="submit" value="cancel" class="btn btn--ghost">Hủy</button>
                <button type="submit" value="confirm" class="btn btn--primary"><i class="fa-solid fa-check"></i> Xác nhận đăng ký</button>`,
      onConfirm: () => register(room),
    });
  });

  /* ========== XỬ LÝ ĐĂNG KÝ / HỦY ========== */
  function register(room) {
    // Kiểm tra lại ngay trước khi lưu (phòng có thể vừa đầy ở tab khác)
    registrations = loadRegistrations();
    if (myActive()) return showToast("Bạn đã có phòng, không thể đăng ký thêm.", "error");
    if (occupancy(room) >= room.type.capacity) {
      refresh();
      return showToast(`${room.name} vừa hết chỗ, vui lòng chọn phòng khác.`, "error");
    }

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      msv: student.msv,
      hoTen: student.hoTen,
      lop: student.lop,
      roomId: room.id,
      roomName: room.name,
      capacity: room.type.capacity,
      gender: room.gender,
      price: room.type.price,
      createdAt: new Date().toISOString(),
      status: "active",
    };
    registrations.push(record);
    if (!saveRegistrations(registrations)) {
      registrations.pop();
      return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error");
    }

    refresh();
    document.querySelector(`[data-room="${room.id}"]`)?.classList.add("room--bump");
    showToast(`Đăng ký ${room.name} thành công!`, "success");
    setTimeout(() => {
      activate("history");
      document.querySelector(`[data-reg="${record.id}"]`)?.classList.add("is-new");
    }, 700);
  }

  function cancelRegistration(id) {
    registrations = loadRegistrations();
    const reg = registrations.find((r) => r.id === id && r.msv === student.msv);
    if (!reg || reg.status !== "active") return;
    reg.status = "cancelled";
    reg.cancelledAt = new Date().toISOString();
    saveRegistrations(registrations);
    refresh();
    showToast(`Đã hủy đăng ký ${reg.roomName}.`);
  }

  /* ========== TAB 2: LỊCH SỬ ========== */
  function renderHistory() {
    const list = myRegistrations().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const count = document.getElementById("historyCount");
    count.hidden = !list.length;
    count.textContent = list.length;

    document.getElementById("historyBody").innerHTML = list.length
      ? list
          .map(
            (r, i) => `
          <tr data-reg="${esc(r.id)}">
            <td>${i + 1}</td>
            <td><b>${esc(toTitleCase(r.hoTen))}</b></td>
            <td>${esc(r.msv)}</td>
            <td>${esc(r.lop)}</td>
            <td class="room-cell">${esc(r.roomName)}<br />
              <span class="pill pill--${r.gender}"><i class="fa-solid ${genderIcon(r.gender)}"></i>${genderLabel(r.gender)}</span></td>
            <td>Phòng ${r.capacity} người</td>
            <td class="price">${money(r.price)}<br /><small style="color:var(--muted);font-weight:500">/người/tháng</small></td>
            <td>${new Date(r.createdAt).toLocaleString("vi-VN")}</td>
            <td>${r.status === "active"
              ? '<span class="pill pill--ok"><i class="fa-solid fa-circle-check"></i>Đăng ký thành công</span>'
              : `<span class="pill pill--cancel">Đã hủy</span>${r.cancelledAt ? `<br /><small style="color:var(--muted)">${new Date(r.cancelledAt).toLocaleDateString("vi-VN")}</small>` : ""}`}</td>
            <td>${r.status === "active" ? `<button type="button" class="btn-cancel" data-cancel="${esc(r.id)}">Hủy đăng ký</button>` : "—"}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="10"><div class="empty"><i class="fa-regular fa-folder-open"></i>
          Bạn chưa đăng ký phòng nào.<br /><button type="button" data-goto="register">Đăng ký phòng ngay</button></div></td></tr>`;
  }

  document.getElementById("historyBody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    const reg = registrations.find((r) => r.id === btn.dataset.cancel);
    if (!reg) return;
    openModal({
      warn: true,
      title: "Hủy đăng ký phòng?",
      body: `<p>Bạn chắc chắn muốn hủy đăng ký <b>${esc(reg.roomName)}</b> (phòng ${reg.capacity} người)?</p>
             <p class="modal__note">Chỗ của bạn sẽ được trả lại cho sinh viên khác.</p>`,
      actions: `<button type="submit" value="cancel" class="btn btn--ghost">Không</button>
                <button type="submit" value="confirm" class="btn btn--danger"><i class="fa-solid fa-xmark"></i> Hủy đăng ký</button>`,
      onConfirm: () => cancelRegistration(reg.id),
    });
  });

  /* ========== TABS ========== */
  const tabButtons = document.querySelectorAll(".dorm-tabs [data-tab]");
  function activate(name) {
    if (![...tabButtons].some((b) => b.dataset.tab === name)) name = "register";
    tabButtons.forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === name));
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
    history.replaceState(null, "", `#${name}`);
  }
  tabButtons.forEach((b) => b.addEventListener("click", () => activate(b.dataset.tab)));
  document.querySelector(".dorm").addEventListener("click", (e) => {
    const go = e.target.closest("[data-goto]");
    if (go) activate(go.dataset.goto);
  });

  // Đồng bộ khi đăng ký ở tab trình duyệt khác
  window.addEventListener("storage", (e) => {
    if (e.key === STORE_KEY) refresh();
  });

  function refresh() {
    registrations = loadRegistrations();
    renderStats();
    renderRooms();
    renderHistory();
  }

  refresh();
  activate(location.hash.slice(1));
});
