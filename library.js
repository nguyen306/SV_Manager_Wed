document.addEventListener("DOMContentLoaded", () => {
  /* ========== CẤU HÌNH GIỜ HOẠT ĐỘNG ========== */
  const SESSIONS = [
    { name: "Ca sáng", icon: "fa-sun", start: "07:30", end: "11:30" },
    { name: "Ca chiều", icon: "fa-cloud-sun", start: "13:00", end: "17:00" },
    { name: "Ca tối", icon: "fa-moon", start: "18:00", end: "21:30", closedOnSunday: true },
  ];
  const SEAT_CAPACITY = 100;
  const SEAT_REFRESH_MS = 60 * 1000;

  const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const minutesOf = (d) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

  function duration(mins) {
    mins = Math.ceil(mins);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!h) return `${m} phút`;
    return m ? `${h} giờ ${m} phút` : `${h} giờ`;
  }

  const isOffToday = (s, date) => s.closedOnSunday && date.getDay() === 0;
  const sessionsOn = (date) => SESSIONS.filter((s) => !isOffToday(s, date));

  /* Tính trạng thái tại một thời điểm */
  function getStatus(now) {
    const m = minutesOf(now);
    const today = sessionsOn(now);
    const current = today.find((s) => m >= toMin(s.start) && m < toMin(s.end));
    if (current) {
      return {
        open: true,
        current,
        hint: `Đóng cửa lúc ${current.end} (còn ${duration(toMin(current.end) - m)})`,
      };
    }
    const next = today.find((s) => toMin(s.start) > m);
    if (next) {
      const isBreak = today.some((s) => toMin(s.end) <= m);
      return {
        open: false,
        next,
        hint: `${isBreak ? "Nghỉ giữa ca · " : ""}Mở cửa lúc ${next.start} (sau ${duration(toMin(next.start) - m)})`,
      };
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return { open: false, hint: `Đã hết giờ · Mở cửa lúc ${sessionsOn(tomorrow)[0].start} ngày mai` };
  }

  /* ========== WIDGET GIỜ MỞ CỬA ========== */
  const statusWidget = document.getElementById("statusWidget");

  function renderStatus() {
    const now = new Date();
    const status = getStatus(now);
    const m = minutesOf(now);

    statusWidget.classList.toggle("is-open", status.open);
    statusWidget.classList.toggle("is-closed", !status.open);
    document.getElementById("statusText").textContent = status.open ? "Đang mở cửa" : "Đang đóng cửa";
    document.getElementById("statusHint").textContent = status.hint;
    document.getElementById("clockTime").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    document.getElementById("todayLabel").textContent =
      `${WEEKDAYS[now.getDay()]}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    document.getElementById("sessions").innerHTML = SESSIONS.map((s) => {
      let cls = "";
      let tag = "";
      if (isOffToday(s, now)) {
        cls = "is-off";
        tag = "Nghỉ ngày Chủ Nhật";
      } else if (s === status.current) {
        cls = "is-current";
        tag = "Đang diễn ra";
      } else if (s === status.next) {
        cls = "is-next";
        tag = "Ca tiếp theo";
      } else if (toMin(s.end) <= m) {
        cls = "is-past";
        tag = "Đã kết thúc";
      } else {
        tag = "Sắp tới";
      }
      return `
        <li class="session ${cls}">
          <span class="session__icon"><i class="fa-solid ${s.icon}"></i></span>
          <span><span class="session__name">${s.name}</span><span class="session__tag">${tag}</span></span>
          <span class="session__time">${s.start} - ${s.end}</span>
        </li>`;
    }).join("");

    return status;
  }

  /* ========== WIDGET CHỖ NGỒI ========== */
  // MÔ PHỎNG: chưa có hệ thống đếm người thật, số liệu được ước tính theo giờ trong ngày
  // (vắng buổi sáng sớm, đông nhất khoảng 15h). Khi có API, chỉ cần thay thân hàm này, ví dụ:
  //   const res = await fetch("/api/library/occupancy"); return await res.json();
  async function fetchOccupancy(now) {
    if (!getStatus(now).open) return { used: 0, capacity: SEAT_CAPACITY, updatedAt: now };

    const HOURLY = { 7: 20, 8: 38, 9: 52, 10: 62, 11: 55, 13: 48, 14: 70, 15: 86, 16: 80, 17: 60, 18: 42, 19: 62, 20: 70, 21: 52 };
    const h = now.getHours();
    const from = HOURLY[h] ?? 40;
    const to = HOURLY[h + 1] ?? from;
    const base = from + ((to - from) * now.getMinutes()) / 60;

    // Dao động nhỏ, cố định trong mỗi khung 5 phút để số liệu không nhảy liên tục
    const bucket = Math.floor(now.getTime() / (5 * 60 * 1000));
    const noise = ((bucket * 9301 + 49297) % 233280) / 233280 * 10 - 5;

    const used = Math.max(0, Math.min(SEAT_CAPACITY, Math.round((base + noise) * SEAT_CAPACITY / 100)));
    return { used, capacity: SEAT_CAPACITY, updatedAt: now };
  }

  const seatWidget = document.getElementById("seatWidget");

  function levelOf(pct, open) {
    if (!open) return { cls: "level--closed", text: "Thư viện đang đóng" };
    if (pct < 60) return { cls: "level--low", text: "Còn nhiều chỗ" };
    if (pct < 85) return { cls: "level--medium", text: "Khá đông" };
    return { cls: "level--high", text: "Gần hết chỗ" };
  }

  async function renderSeats() {
    const now = new Date();
    let data;
    try {
      data = await fetchOccupancy(now);
    } catch {
      document.getElementById("seatSummary").textContent = "Không lấy được dữ liệu, vui lòng thử lại.";
      return;
    }
    const open = getStatus(now).open;
    const free = data.capacity - data.used;
    const pct = Math.round((data.used / data.capacity) * 100);
    const level = levelOf(pct, open);

    seatWidget.classList.remove("level--low", "level--medium", "level--high", "level--closed");
    seatWidget.classList.add(level.cls);
    document.getElementById("levelBadge").textContent = level.text;
    document.getElementById("seatCapacity").textContent = data.capacity;
    document.getElementById("seatUsed").textContent = data.used;
    document.getElementById("seatFree").textContent = free;
    document.getElementById("seatFill").style.width = `${pct}%`;
    document.getElementById("seatPercent").textContent = `${pct}%`;
    const bar = document.getElementById("seatBar");
    bar.setAttribute("aria-valuenow", pct);
    bar.setAttribute("aria-valuetext", `${data.used}/${data.capacity} chỗ đã có người`);
    document.getElementById("seatSummary").textContent = open
      ? `Đang có ${data.used}/${data.capacity} sinh viên ngồi học, còn trống ${free} chỗ`
      : "Phòng đọc đóng cửa ngoài giờ hoạt động";
    const t = data.updatedAt;
    document.getElementById("seatUpdated").textContent = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
  }

  const refreshBtn = document.getElementById("seatRefresh");
  refreshBtn.addEventListener("click", () => {
    refreshBtn.classList.remove("is-spinning");
    void refreshBtn.offsetWidth; // chạy lại hiệu ứng xoay
    refreshBtn.classList.add("is-spinning");
    renderSeats();
  });

  /* ================================================================
     MƯỢN / TRẢ SÁCH
     ================================================================ */
  const student = getCurrentStudent();
  if (!student) {
    window.location.href = "login.html";
    return;
  }

  const BOOKS = window.BOOKS || [];
  const bookById = new Map(BOOKS.map((b) => [b.id, b]));
  const LOAN_DAYS = 14;
  const RENEW_DAYS = 7;
  const MAX_RENEWALS = 1;
  const MAX_ACTIVE = 5;
  const STORE_KEY = "library:loans";

  // Màu bìa sách theo chuyên ngành
  const CATEGORY_STYLE = {
    "Lập trình": { c1: "#1e3a8a", c2: "#3b82f6", icon: "fa-code" },
    "Cấu trúc dữ liệu & Giải thuật": { c1: "#4c1d95", c2: "#8b5cf6", icon: "fa-diagram-project" },
    "Cơ sở dữ liệu": { c1: "#065f46", c2: "#10b981", icon: "fa-database" },
    "Mạng máy tính": { c1: "#0e7490", c2: "#22d3ee", icon: "fa-network-wired" },
    "Thiết kế & Lập trình Web": { c1: "#9a3412", c2: "#fb923c", icon: "fa-globe" },
    "Toán học": { c1: "#831843", c2: "#ec4899", icon: "fa-square-root-variable" },
    "Lý luận chính trị": { c1: "#7f1d1d", c2: "#ef4444", icon: "fa-landmark" },
  };
  const styleOf = (cat) => CATEGORY_STYLE[cat] || { c1: "#0b3d91", c2: "#1557c0", icon: "fa-book" };

  /* ---------- Tiện ích ---------- */
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // YYYY-MM-DD theo giờ máy
  const parseDay = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (key, n) => {
    const d = parseDay(key);
    d.setDate(d.getDate() + n);
    return dayKey(d);
  };
  const fmtDay = (key) => {
    const d = parseDay(key);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const daysBetween = (fromKey, toKey) => Math.round((parseDay(toKey) - parseDay(fromKey)) / 86400000);
  const today = () => dayKey(new Date());

  const toast = document.getElementById("toast");
  let toastTimer;
  function showToast(message, type = "") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  /* ---------- Lưu trữ ---------- */
  // Mọi lượt mượn trên trình duyệt này lưu chung một danh sách (giả lập CSDL),
  // nên số sách còn lại tính cả sinh viên khác đã đăng nhập trên cùng máy.
  function loadLoans() {
    try {
      const list = JSON.parse(storageGet(STORE_KEY));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  const saveLoans = (list) => storageSet(STORE_KEY, JSON.stringify(list));
  let loans = loadLoans();

  const activeLoansOf = (bookId) => loans.filter((l) => l.bookId === bookId && l.status === "borrowing");
  const available = (book) => Math.max(0, book.total - book.onLoan - activeLoansOf(book.id).length);
  const myLoans = () => loans.filter((l) => l.msv === student.msv);
  const myActive = () => myLoans().filter((l) => l.status === "borrowing");
  const isOverdue = (loan) => loan.status === "borrowing" && today() > loan.dueDate;

  /* ---------- TAB 1: Danh mục sách ---------- */
  const query = document.getElementById("bookQuery");
  const categoryFilter = document.getElementById("categoryFilter");
  const onlyAvailable = document.getElementById("onlyAvailable");

  [...new Set(BOOKS.map((b) => b.category))].forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  function renderCatalog() {
    const q = normalize(query.value.trim());
    const cat = categoryFilter.value;
    const mine = new Set(myActive().map((l) => l.bookId));
    const list = BOOKS.filter(
      (b) =>
        (!q || normalize(`${b.title} ${b.author} ${b.category} ${b.tags}`).includes(q)) &&
        (!cat || b.category === cat) &&
        (!onlyAvailable.checked || available(b) > 0)
    );

    document.getElementById("resultCount").textContent = `Tìm thấy ${list.length}/${BOOKS.length} đầu sách`;
    document.getElementById("bookGrid").innerHTML = list.length
      ? list
          .map((b) => {
            const left = available(b);
            const st = styleOf(b.category);
            const stock =
              left === 0 ? '<span class="stock stock--out">Hết sách</span>'
              : `<span class="stock ${left <= 1 ? "stock--low" : "stock--ok"}">Còn ${left} quyển</span>`;
            const btn = mine.has(b.id)
              ? `<button type="button" class="btn-borrow is-mine" disabled><i class="fa-solid fa-check"></i> Bạn đang mượn</button>`
              : `<button type="button" class="btn-borrow" data-borrow="${b.id}" ${left === 0 ? "disabled" : ""}>
                   <i class="fa-solid fa-hand-holding"></i> ${left === 0 ? "Tạm hết" : "Mượn sách"}</button>`;
            return `
              <article class="book">
                <div class="book__cover" style="--c1:${st.c1};--c2:${st.c2}" aria-hidden="true">
                  <i class="fa-solid ${st.icon}"></i>
                  <span class="book__cover-cat">${esc(b.category)}</span>
                  <span class="book__cover-title">${esc(b.title)}</span>
                </div>
                <div class="book__body">
                  <h3 class="book__title">${esc(b.title)}</h3>
                  <p class="book__author">${esc(b.author)}</p>
                  <div class="book__meta">
                    <span><i class="fa-solid fa-tag"></i> ${esc(b.category)}</span>
                    <span><i class="fa-solid fa-layer-group"></i> ${stock} / ${b.total}</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${esc(b.shelf)}</span>
                  </div>
                  ${btn}
                </div>
              </article>`;
          })
          .join("")
      : `<div class="empty"><i class="fa-solid fa-book-open-reader"></i><h3>Không tìm thấy sách phù hợp</h3>
           <p>Thử từ khóa khác như "C++", "cơ sở dữ liệu", "mạng máy tính".</p></div>`;
  }

  document.getElementById("bookSearch").addEventListener("submit", (e) => e.preventDefault());
  query.addEventListener("input", renderCatalog);
  categoryFilter.addEventListener("change", renderCatalog);
  onlyAvailable.addEventListener("change", renderCatalog);

  /* ---------- Popup ---------- */
  const modal = document.getElementById("modal");
  let pendingAction = null;

  function openModal({ title, sub = "", icon = "fa-book", body, actions, warn = false, onConfirm = null }) {
    modal.classList.toggle("modal--warn", warn);
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalSub").textContent = sub;
    document.getElementById("modalIcon").className = `fa-solid ${icon}`;
    document.getElementById("modalBody").innerHTML = body;
    document.getElementById("modalActions").innerHTML = actions;
    pendingAction = onConfirm;
    modal.returnValue = "";
    modal.showModal();
  }
  modal.addEventListener("close", () => {
    const action = pendingAction;
    pendingAction = null;
    if (modal.returnValue === "confirm" && action) action();
    if (modal.returnValue === "loans") activate("loans");
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close("cancel"); });

  const studentRows = () => `
    <dt>Họ và tên</dt><dd>${esc(toTitleCase(student.hoTen))}</dd>
    <dt>Mã sinh viên</dt><dd>${esc(student.msv)}</dd>
    <dt>Lớp</dt><dd>${esc(student.lop)}</dd>`;

  document.getElementById("bookGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-borrow]");
    if (!btn || btn.disabled) return;
    const book = bookById.get(btn.dataset.borrow);

    if (myActive().length >= MAX_ACTIVE) {
      openModal({
        warn: true,
        icon: "fa-triangle-exclamation",
        title: "Đã đạt giới hạn mượn",
        body: `<p>Bạn đang mượn ${MAX_ACTIVE} quyển — mức tối đa cho phép. Vui lòng trả bớt sách trước khi mượn thêm.</p>`,
        actions: `<button type="submit" value="cancel" class="btn btn--ghost">Đóng</button>
                  <button type="submit" value="loans" class="btn btn--primary">Xem sách đang mượn</button>`,
      });
      return;
    }

    const borrowDay = today();
    const dueDay = addDays(borrowDay, LOAN_DAYS);
    openModal({
      title: "Xác nhận mượn sách",
      sub: "Kiểm tra thông tin trước khi xác nhận",
      body: `
        <dl class="detail">
          <dt>Tên sách</dt><dd>${esc(book.title)}</dd>
          <dt>Tác giả</dt><dd>${esc(book.author)}</dd>
          <dt>Vị trí</dt><dd>${esc(book.shelf)}</dd>
          <dt>Ngày mượn</dt><dd>${fmtDay(borrowDay)}</dd>
          <dt>Hẹn trả</dt><dd class="hl">${fmtDay(dueDay)} (sau ${LOAN_DAYS} ngày)</dd>
        </dl>
        <p class="modal__section">Thông tin sinh viên</p>
        <dl class="detail">${studentRows()}</dl>
        <p class="modal__note"><i class="fa-solid fa-circle-info"></i> Mang thẻ sinh viên đến quầy để nhận sách tại ${esc(book.shelf)}.</p>`,
      actions: `<button type="submit" value="cancel" class="btn btn--ghost">Hủy</button>
                <button type="submit" value="confirm" class="btn btn--primary"><i class="fa-solid fa-check"></i> Xác nhận mượn</button>`,
      onConfirm: () => borrow(book),
    });
  });

  /* ---------- Xử lý mượn / gia hạn / trả ---------- */
  function borrow(book) {
    loans = loadLoans(); // đọc lại phòng khi tab khác vừa thay đổi
    if (available(book) <= 0) {
      refresh();
      return showToast(`"${book.title}" vừa hết, vui lòng chọn sách khác.`, "error");
    }
    if (myActive().some((l) => l.bookId === book.id)) return showToast("Bạn đang mượn quyển sách này rồi.", "error");
    if (myActive().length >= MAX_ACTIVE) return showToast(`Bạn chỉ được mượn tối đa ${MAX_ACTIVE} quyển.`, "error");

    const borrowDate = today();
    const loan = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      msv: student.msv,
      hoTen: student.hoTen,
      lop: student.lop,
      bookId: book.id,
      title: book.title,
      borrowDate,
      dueDate: addDays(borrowDate, LOAN_DAYS),
      renewals: 0,
      status: "borrowing",
    };
    loans.push(loan);
    if (!saveLoans(loans)) {
      loans.pop();
      return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error");
    }
    refresh();
    showToast(`Mượn "${book.title}" thành công! Hạn trả ${fmtDay(loan.dueDate)}.`, "success");
    setTimeout(() => {
      activate("loans");
      document.querySelector(`[data-loan="${loan.id}"]`)?.classList.add("is-new");
    }, 700);
  }

  function updateLoan(id, change) {
    loans = loadLoans();
    const loan = loans.find((l) => l.id === id && l.msv === student.msv && l.status === "borrowing");
    if (!loan) return null;
    change(loan);
    saveLoans(loans);
    refresh();
    return loan;
  }

  function renew(id) {
    const loan = updateLoan(id, (l) => {
      l.dueDate = addDays(l.dueDate, RENEW_DAYS);
      l.renewals += 1;
    });
    if (loan) showToast(`Đã gia hạn "${loan.title}" đến ${fmtDay(loan.dueDate)}.`, "success");
  }

  function giveBack(id) {
    const loan = updateLoan(id, (l) => {
      l.status = "returned";
      l.returnDate = today();
    });
    if (loan) showToast(`Đã trả "${loan.title}". Cảm ơn bạn!`, "success");
  }

  /* ---------- TAB 2: Sách đang mượn & lịch sử ---------- */
  function statusPill(loan) {
    if (loan.status === "returned") {
      return loan.returnDate > loan.dueDate
        ? '<span class="pill pill--late"><i class="fa-solid fa-clock"></i>Đã trả (trễ hạn)</span>'
        : '<span class="pill pill--returned"><i class="fa-solid fa-circle-check"></i>Đã trả</span>';
    }
    return isOverdue(loan)
      ? '<span class="pill pill--overdue"><i class="fa-solid fa-triangle-exclamation"></i>Quá hạn</span>'
      : '<span class="pill pill--borrowing"><i class="fa-solid fa-book-open"></i>Đang mượn</span>';
  }

  function dueNote(loan) {
    const left = daysBetween(today(), loan.dueDate);
    if (left < 0) return `<small class="late">Trễ ${-left} ngày</small>`;
    if (left === 0) return `<small class="late">Hết hạn hôm nay</small>`;
    return `<small>Còn ${left} ngày</small>`;
  }

  function renderLoans() {
    const active = myActive().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const returned = myLoans()
      .filter((l) => l.status === "returned")
      .sort((a, b) => b.returnDate.localeCompare(a.returnDate));
    const overdue = active.filter(isOverdue).length;

    const count = document.getElementById("loanCount");
    count.hidden = !active.length;
    count.textContent = active.length;
    document.getElementById("loanLimit").textContent = MAX_ACTIVE;

    document.getElementById("loanStats").innerHTML = `
      <div class="loan-stat"><i class="fa-solid fa-book-open" style="background:#dbeafe;color:#1d4ed8"></i>
        <div><b>${active.length}/${MAX_ACTIVE}</b><span>Đang mượn</span></div></div>
      <div class="loan-stat"><i class="fa-solid fa-triangle-exclamation" style="background:var(--closed-soft);color:var(--closed)"></i>
        <div><b>${overdue}</b><span>Quá hạn</span></div></div>
      <div class="loan-stat"><i class="fa-solid fa-circle-check" style="background:var(--open-soft);color:var(--open)"></i>
        <div><b>${returned.length}</b><span>Đã trả</span></div></div>`;

    const bookCell = (l) => {
      const b = bookById.get(l.bookId);
      return `<td class="book-cell"><b>${esc(l.title)}</b><small>${esc(b ? b.shelf : "")}</small></td>`;
    };

    document.getElementById("activeBody").innerHTML = active.length
      ? active
          .map((l, i) => {
            const canRenew = l.renewals < MAX_RENEWALS && !isOverdue(l);
            const renewTitle = isOverdue(l) ? "Sách quá hạn không thể gia hạn"
              : l.renewals >= MAX_RENEWALS ? "Đã dùng hết lượt gia hạn" : `Gia hạn thêm ${RENEW_DAYS} ngày`;
            return `
            <tr data-loan="${esc(l.id)}" class="${isOverdue(l) ? "is-overdue" : ""}">
              <td>${i + 1}</td>
              ${bookCell(l)}
              <td class="date">${fmtDay(l.borrowDate)}</td>
              <td class="date">${fmtDay(l.dueDate)}${dueNote(l)}${l.renewals ? "<small>Đã gia hạn</small>" : ""}</td>
              <td>${statusPill(l)}</td>
              <td><div class="actions">
                <button type="button" class="btn-sm btn-sm--renew" data-renew="${esc(l.id)}" title="${renewTitle}" ${canRenew ? "" : "disabled"}>
                  <i class="fa-solid fa-calendar-plus"></i> Gia hạn</button>
                <button type="button" class="btn-sm btn-sm--return" data-return="${esc(l.id)}">
                  <i class="fa-solid fa-rotate-left"></i> Trả sách</button>
              </div></td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="6" class="empty-row"><i class="fa-regular fa-folder-open"></i> Bạn chưa mượn quyển sách nào.</td></tr>`;

    document.getElementById("historyBody").innerHTML = returned.length
      ? returned
          .map(
            (l, i) => `
            <tr>
              <td>${i + 1}</td>
              ${bookCell(l)}
              <td class="date">${fmtDay(l.borrowDate)}</td>
              <td class="date">${fmtDay(l.dueDate)}</td>
              <td class="date">${fmtDay(l.returnDate)}</td>
              <td>${statusPill(l)}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="empty-row">Chưa có lịch sử trả sách.</td></tr>`;
  }

  document.getElementById("activeBody").addEventListener("click", (e) => {
    const renewBtn = e.target.closest("[data-renew]");
    const returnBtn = e.target.closest("[data-return]");
    const loan = loans.find((l) => l.id === (renewBtn || returnBtn)?.dataset[renewBtn ? "renew" : "return"]);
    if (!loan) return;

    if (renewBtn && !renewBtn.disabled) {
      openModal({
        icon: "fa-calendar-plus",
        title: "Gia hạn sách",
        sub: loan.title,
        body: `<dl class="detail">
            <dt>Hạn trả hiện tại</dt><dd>${fmtDay(loan.dueDate)}</dd>
            <dt>Hạn trả mới</dt><dd class="hl">${fmtDay(addDays(loan.dueDate, RENEW_DAYS))} (+${RENEW_DAYS} ngày)</dd>
          </dl>
          <p class="modal__note">Mỗi quyển chỉ được gia hạn ${MAX_RENEWALS} lần.</p>`,
        actions: `<button type="submit" value="cancel" class="btn btn--ghost">Hủy</button>
                  <button type="submit" value="confirm" class="btn btn--primary"><i class="fa-solid fa-check"></i> Gia hạn</button>`,
        onConfirm: () => renew(loan.id),
      });
    }
    if (returnBtn) {
      const late = daysBetween(loan.dueDate, today());
      openModal({
        icon: "fa-rotate-left",
        title: "Xác nhận trả sách",
        sub: loan.title,
        warn: late > 0,
        body: `<dl class="detail">
            <dt>Ngày mượn</dt><dd>${fmtDay(loan.borrowDate)}</dd>
            <dt>Hạn trả</dt><dd>${fmtDay(loan.dueDate)}</dd>
            <dt>Ngày trả</dt><dd class="hl">${fmtDay(today())}${late > 0 ? ` (trễ ${late} ngày)` : ""}</dd>
          </dl>
          <p class="modal__note">Sau khi xác nhận, sách được cộng lại vào kho để sinh viên khác mượn.</p>`,
        actions: `<button type="submit" value="cancel" class="btn btn--ghost">Hủy</button>
                  <button type="submit" value="confirm" class="btn btn--primary"><i class="fa-solid fa-check"></i> Trả sách</button>`,
        onConfirm: () => giveBack(loan.id),
      });
    }
  });

  /* ---------- Tabs ---------- */
  const tabButtons = document.querySelectorAll(".lib-tabs [data-tab]");
  function activate(name) {
    if (![...tabButtons].some((b) => b.dataset.tab === name)) name = "catalog";
    tabButtons.forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === name));
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
    history.replaceState(null, "", `#${name}`);
  }
  tabButtons.forEach((b) => b.addEventListener("click", () => activate(b.dataset.tab)));

  function refresh() {
    loans = loadLoans();
    renderCatalog();
    renderLoans();
  }
  window.addEventListener("storage", (e) => { if (e.key === STORE_KEY) refresh(); });

  refresh();
  activate(location.hash.slice(1));

  /* ========== CẬP NHẬT TỰ ĐỘNG ========== */
  let wasOpen = renderStatus().open;
  renderSeats();
  setInterval(() => {
    const { open } = renderStatus();
    if (open !== wasOpen) renderSeats(); // vừa mở / vừa đóng cửa thì cập nhật chỗ ngồi ngay
    wasOpen = open;
  }, 1000);
  setInterval(renderSeats, SEAT_REFRESH_MS);
});
