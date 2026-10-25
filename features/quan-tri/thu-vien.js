// Duyệt mượn sách: sinh viên gửi yêu cầu ở trang Thư viện (status "pending"), Admin duyệt -> "borrowing"
// (tính ngày mượn + hạn trả từ lúc duyệt) hoặc từ chối -> "rejected" kèm lý do.
// Mỗi lần duyệt / từ chối gửi một thông báo tới sinh viên (pushNotification trong app.js).
document.addEventListener("DOMContentLoaded", () => {
  if (!ADMIN) return;

  const LOAN_DAYS = 14; // trùng với LOAN_DAYS ở features/thu-vien/library.js
  const BOOKS = window.BOOKS || [];
  const bookById = new Map(BOOKS.map((b) => [b.id, b]));
  const VALID_TABS = ["pending", "borrowing", "history"];
  let tab = VALID_TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "pending";
  let loans = [];

  const loadLoans = () => {
    const list = readJSON(STORE.loans, []);
    return Array.isArray(list) ? list : [];
  };
  const today = () => dayKey(new Date());
  const addDays = (key, n) => {
    const d = parseDayKey(key);
    d.setDate(d.getDate() + n);
    return dayKey(d);
  };
  const fmtDay = (key) => (key ? fmtDate(parseDayKey(key)) : "—");
  const isOverdue = (l) => l.status === "borrowing" && today() > l.dueDate;

  const groups = () => ({
    pending: loans.filter((l) => l.status === "pending").sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)),
    borrowing: loans.filter((l) => l.status === "borrowing").sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    history: loans
      .filter((l) => l.status === "returned" || l.status === "rejected")
      .sort((a, b) => (b.returnDate || b.decidedAt || "").localeCompare(a.returnDate || a.decidedAt || "")),
  });

  const studentCell = (l) =>
    `<td><b>${esc(toTitleCase(l.hoTen))}</b><small>${esc(l.msv)} · ${esc(l.lop)}</small></td>`;
  const bookCell = (l) => {
    const b = bookById.get(l.bookId);
    return `<td><b>${esc(l.title)}</b><small>${esc(b ? `${b.author} · ${b.shelf}` : "")}</small></td>`;
  };

  function render() {
    const g = groups();
    const overdue = g.borrowing.filter(isOverdue).length;
    $id("stats").innerHTML = `
      <div class="stat stat--warn"><span class="stat__icon"><i class="fa-solid fa-hourglass-half"></i></span>
        <div><b>${g.pending.length}</b><span>Yêu cầu chờ duyệt</span></div></div>
      <div class="stat stat--info"><span class="stat__icon"><i class="fa-solid fa-book-open"></i></span>
        <div><b>${g.borrowing.length}</b><span>Sách đang được mượn</span></div></div>
      <div class="stat stat--bad"><span class="stat__icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
        <div><b>${overdue}</b><span>Quá hạn chưa trả</span></div></div>
      <div class="stat stat--ok"><span class="stat__icon"><i class="fa-solid fa-circle-check"></i></span>
        <div><b>${loans.filter((l) => l.status === "returned").length}</b><span>Lượt đã trả</span></div></div>`;
    $id("cntPending").textContent = g.pending.length;
    $id("cntBorrowing").textContent = g.borrowing.length;
    $id("cntHistory").textContent = g.history.length;
    $id("tabs").querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));

    const q = normalizeText($id("search").value.trim());
    const list = g[tab].filter((l) => !q || normalizeText(`${l.msv} ${l.hoTen} ${l.lop} ${l.title}`).includes(q));

    if (tab === "pending") {
      $id("head").innerHTML = `<tr><th>Sinh viên</th><th>Sách</th><th>Thời gian gửi</th><th>Kho còn</th><th class="num">Thao tác</th></tr>`;
      $id("body").innerHTML = list.length
        ? list
            .map((l) => {
              const b = bookById.get(l.bookId);
              return `<tr>
                ${studentCell(l)}${bookCell(l)}
                <td class="nowrap">${fmtDateTime(l.requestedAt)}</td>
                <td class="nowrap">${b ? `${b.total - b.onLoan - loans.filter((x) => x.bookId === l.bookId && x.status === "borrowing").length}/${b.total} quyển` : "—"}</td>
                <td><div class="actions">
                  <button type="button" class="btn btn--ok btn--sm" data-approve="${esc(l.id)}"><i class="fa-solid fa-check"></i> Duyệt</button>
                  <button type="button" class="btn btn--ghost btn--sm" data-reject="${esc(l.id)}"><i class="fa-solid fa-xmark"></i> Từ chối</button>
                </div></td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="5" class="empty-row"><i class="fa-regular fa-circle-check"></i> Không có yêu cầu nào đang chờ duyệt.</td></tr>`;
    } else if (tab === "borrowing") {
      $id("head").innerHTML = `<tr><th>Sinh viên</th><th>Sách</th><th>Ngày mượn</th><th>Hạn trả</th><th>Trạng thái</th></tr>`;
      $id("body").innerHTML = list.length
        ? list
            .map(
              (l) => `<tr>
                ${studentCell(l)}${bookCell(l)}
                <td class="nowrap">${fmtDay(l.borrowDate)}</td>
                <td class="nowrap">${fmtDay(l.dueDate)}${l.renewals ? "<small>Đã gia hạn</small>" : ""}</td>
                <td>${isOverdue(l)
                  ? '<span class="pill pill--bad"><i class="fa-solid fa-triangle-exclamation"></i>Quá hạn</span>'
                  : '<span class="pill pill--info"><i class="fa-solid fa-book-open"></i>Đang mượn</span>'}</td>
              </tr>`
            )
            .join("")
        : `<tr><td colspan="5" class="empty-row">Chưa có sinh viên nào đang mượn sách.</td></tr>`;
    } else {
      $id("head").innerHTML = `<tr><th>Sinh viên</th><th>Sách</th><th>Ngày gửi</th><th>Kết quả</th><th>Ghi chú</th></tr>`;
      $id("body").innerHTML = list.length
        ? list
            .map(
              (l) => `<tr>
                ${studentCell(l)}${bookCell(l)}
                <td class="nowrap">${l.requestedAt ? fmtDateTime(l.requestedAt) : fmtDay(l.borrowDate)}</td>
                <td>${l.status === "returned"
                  ? '<span class="pill pill--ok"><i class="fa-solid fa-circle-check"></i>Đã trả</span>'
                  : '<span class="pill pill--bad"><i class="fa-solid fa-circle-xmark"></i>Từ chối</span>'}</td>
                <td>${l.status === "returned"
                  ? `Mượn ${fmtDay(l.borrowDate)} · trả ${fmtDay(l.returnDate)}`
                  : esc(l.rejectReason || "—")}</td>
              </tr>`
            )
            .join("")
        : `<tr><td colspan="5" class="empty-row">Chưa có lịch sử.</td></tr>`;
    }
  }

  function refresh() {
    loans = loadLoans();
    render();
  }

  // Đọc lại kho trước khi ghi; trả về null nếu yêu cầu đã bị hủy / đã được xử lý ở tab khác
  function decide(id, change) {
    loans = loadLoans();
    const loan = loans.find((l) => l.id === id && l.status === "pending");
    if (!loan) {
      render();
      showToast("Yêu cầu này đã được xử lý hoặc sinh viên đã hủy.", "error");
      return null;
    }
    change(loan);
    loan.decidedAt = new Date().toISOString();
    loan.decidedBy = ADMIN.id;
    if (!writeJSON(STORE.loans, loans)) {
      showToast("Trình duyệt không cho phép lưu dữ liệu.", "error");
      return null;
    }
    render();
    return loan;
  }

  function openApprove(id) {
    const l = loans.find((x) => x.id === id);
    if (!l) return;
    const b = bookById.get(l.bookId);
    const borrowDate = today();
    const dueDate = addDays(borrowDate, LOAN_DAYS);
    openModal({
      title: "Duyệt yêu cầu mượn sách",
      sub: `${l.msv} · ${toTitleCase(l.hoTen)} · ${l.lop}`,
      icon: "fa-book",
      body: `<div class="table-wrap"><table class="tbl">
          <tbody>
            <tr><th>Tên sách</th><td>${esc(l.title)}</td></tr>
            <tr><th>Vị trí</th><td>${esc(b ? b.shelf : "—")}</td></tr>
            <tr><th>Gửi yêu cầu lúc</th><td>${fmtDateTime(l.requestedAt)}</td></tr>
            <tr><th>Ngày mượn</th><td>${fmtDay(borrowDate)}</td></tr>
            <tr><th>Hạn trả</th><td><b>${fmtDay(dueDate)}</b> (sau ${LOAN_DAYS} ngày)</td></tr>
          </tbody></table></div>
        <p class="note" style="margin-top:12px"><i class="fa-solid fa-bell"></i>
          <span>Sinh viên sẽ nhận được thông báo mượn sách thành công.</span></p>`,
      actions: [{ value: "cancel", label: "Hủy" }, { value: "ok", label: "Xác nhận duyệt", kind: "ok", icon: "fa-check" }],
      onAction: (value) => {
        if (value !== "ok") return;
        const loan = decide(id, (x) => {
          x.status = "borrowing";
          x.borrowDate = borrowDate;
          x.dueDate = dueDate;
        });
        if (!loan) return;
        pushNotification({
          to: loan.msv,
          type: "success",
          icon: "fa-circle-check",
          title: "Mượn sách thành công",
          message: `Thư viện đã duyệt yêu cầu mượn "${loan.title}". Hạn trả ${fmtDay(loan.dueDate)}. Mang thẻ sinh viên đến quầy để nhận sách${b ? ` tại ${b.shelf}` : ""}.`,
          link: { page: "thu-vien", hash: "loans" },
        });
        showToast(`Đã duyệt "${loan.title}" cho ${loan.msv}. Đã gửi thông báo tới sinh viên.`, "success");
      },
    });
  }

  function openReject(id) {
    const l = loans.find((x) => x.id === id);
    if (!l) return;
    openModal({
      title: "Từ chối yêu cầu mượn sách",
      sub: `${l.title} · ${l.msv} · ${toTitleCase(l.hoTen)}`,
      icon: "fa-circle-xmark",
      warn: true,
      body: `<label class="ui-field"><span>Lý do từ chối *</span>
          <textarea class="ui-textarea" id="rReason" maxlength="200" placeholder="VD: Sách đang được bảo trì, vui lòng chọn đầu sách khác."></textarea>
          <small class="ui-error" data-for="rReason"></small></label>`,
      actions: [{ value: "cancel", label: "Hủy" }, { value: "ok", label: "Từ chối", kind: "danger", icon: "fa-xmark" }],
      onAction: (value, dlg) => {
        if (value !== "ok") return;
        const reason = dlg.querySelector("#rReason").value.trim();
        if (!fieldError(dlg, "rReason", reason ? "" : "Nhập lý do để sinh viên biết.")) return false;
        const loan = decide(id, (x) => {
          x.status = "rejected";
          x.rejectReason = reason;
        });
        if (!loan) return;
        pushNotification({
          to: loan.msv,
          type: "error",
          icon: "fa-circle-xmark",
          title: "Yêu cầu mượn sách bị từ chối",
          message: `"${loan.title}": ${reason}`,
          link: { page: "thu-vien", hash: "loans" },
        });
        showToast(`Đã từ chối yêu cầu của ${loan.msv}.`, "success");
      },
    });
  }

  $id("body").addEventListener("click", (e) => {
    const approve = e.target.closest("[data-approve]");
    const reject = e.target.closest("[data-reject]");
    if (approve) openApprove(approve.dataset.approve);
    if (reject) openReject(reject.dataset.reject);
  });
  $id("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    tab = b.dataset.tab;
    history.replaceState(null, "", `#${tab}`);
    render();
  });
  $id("search").addEventListener("input", render);
  // Bấm thông báo "Yêu cầu mượn sách mới" khi đang ở trang này -> chuyển về tab Chờ duyệt
  window.addEventListener("hashchange", () => {
    if (VALID_TABS.includes(location.hash.slice(1))) {
      tab = location.hash.slice(1);
      render();
    }
  });
  window.addEventListener("storage", (e) => { if (e.key === STORE.loans) refresh(); });

  refresh();
});
