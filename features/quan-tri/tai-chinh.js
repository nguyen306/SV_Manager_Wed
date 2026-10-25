// Quản lý tài chính: danh sách SV đã nộp đủ / chưa nộp đủ, ghi nhận khoản nộp bổ sung.
// Khoản nộp bổ sung lưu vào STORE.payments (method "admin"); getFinance() trừ vào năm còn nợ,
// cộng vào học phí đã nộp và cập nhật trạng thái — trang Học phí của SV thấy ngay.
document.addEventListener("DOMContentLoaded", () => {
  if (!ADMIN) return;

  const PAGE_SIZE = 15;
  let tab = "debt";
  let page = 1;
  let data = [];

  const methodName = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.name || id;

  function load() {
    data = financeOverview().filter((x) => x.hasData);
    const lopEl = $id("lop");
    const selected = lopEl.value;
    lopEl.innerHTML = `<option value="">Tất cả lớp</option>${[...new Set(data.map((x) => x.student.lop))]
      .sort()
      .map((c) => `<option ${c === selected ? "selected" : ""}>${esc(c)}</option>`)
      .join("")}`;
  }

  function render() {
    const sum = (list, k) => list.reduce((s, x) => s + x.fin.totals[k], 0);
    const debtors = data.filter((x) => !x.fin.done);
    const done = data.filter((x) => x.fin.done);
    const collected = sum(data, "paid") - sum(data, "withdrawn");
    const due = sum(data, "payable") - sum(data, "exempt");
    $id("stats").innerHTML = `
      <div class="stat stat--info"><span class="stat__icon"><i class="fa-solid fa-file-invoice"></i></span>
        <div><b>${formatMillion(due)}</b><span>Tổng phải thu</span></div></div>
      <div class="stat stat--ok"><span class="stat__icon"><i class="fa-solid fa-sack-dollar"></i></span>
        <div><b>${formatMillion(collected)}</b><span>Đã thu (${due ? ((collected / due) * 100).toFixed(1) : 0}%)</span></div></div>
      <div class="stat stat--bad"><span class="stat__icon"><i class="fa-solid fa-file-circle-exclamation"></i></span>
        <div><b>${formatMillion(sum(data, "debt"))}</b><span>Còn phải thu</span></div></div>
      <div class="stat stat--warn"><span class="stat__icon"><i class="fa-solid fa-user-clock"></i></span>
        <div><b>${debtors.length}</b><span>SV chưa nộp đủ / ${data.length}</span></div></div>
      <div class="stat"><span class="stat__icon"><i class="fa-solid fa-piggy-bank"></i></span>
        <div><b>${formatMillion(sum(data, "surplus"))}</b><span>Học phí thừa</span></div></div>`;
    $id("cntDebt").textContent = debtors.length;
    $id("cntDone").textContent = done.length;
    $id("thDebt").textContent = tab === "debt" ? "Còn nợ" : "Thừa";

    const q = normalizeText($id("search").value.trim());
    const lop = $id("lop").value;
    const sort = $id("sort").value;
    const list = (tab === "debt" ? debtors : done)
      .filter((x) => (!q || normalizeText(`${x.student.msv} ${x.student.hoTen}`).includes(q)) && (!lop || x.student.lop === lop))
      .sort((a, b) =>
        sort === "msv" ? a.student.msv.localeCompare(b.student.msv)
        : sort === "name" ? a.student.hoTen.localeCompare(b.student.hoTen, "vi")
        : b.fin.totals.debt - a.fin.totals.debt || a.student.msv.localeCompare(b.student.msv)
      );

    const pg = paginate(list, page, PAGE_SIZE);
    page = pg.page;
    $id("body").innerHTML = pg.items.length
      ? pg.items
          .map(({ student: s, fin }) => {
            const t = fin.totals;
            const admin = fin.payments.filter((p) => p.method === "admin").length;
            return `<tr>
              <td class="nowrap"><b>${esc(s.msv)}</b></td>
              <td>${esc(toTitleCase(s.hoTen))}</td>
              <td>${esc(s.lop)}</td>
              <td class="num">${formatMoney(t.payable - t.exempt)}</td>
              <td class="num money-paid">${formatMoney(t.paid)}${admin ? `<small>${admin} lần nộp bổ sung</small>` : ""}</td>
              <td class="num ${tab === "debt" ? "money-debt" : ""}">${formatMoney(tab === "debt" ? t.debt : t.surplus)}</td>
              <td>${fin.done ? '<span class="pill pill--ok"><i class="fa-solid fa-circle-check"></i>Đã hoàn thành</span>' : `<span class="pill pill--bad">Còn nợ · ${fin.debtRows.length} năm</span>`}</td>
              <td><div class="actions">
                ${!fin.done ? `<button type="button" class="btn btn--ok btn--sm" data-pay="${esc(s.msv)}"><i class="fa-solid fa-plus"></i> Nộp bổ sung</button>` : ""}
                <button type="button" class="icon-action" data-history="${esc(s.msv)}" title="Lịch sử nộp"><i class="fa-solid fa-receipt"></i></button>
              </div></td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="8" class="empty-row">${tab === "debt" ? "Không có sinh viên nào còn nợ phù hợp bộ lọc." : "Không có sinh viên phù hợp."}</td></tr>`;
    $id("foot").innerHTML = list.length
      ? `<tr><td colspan="3">Tổng (${list.length} SV)</td>
          <td class="num">${formatMoney(sum(list, "payable") - sum(list, "exempt"))}</td>
          <td class="num">${formatMoney(sum(list, "paid"))}</td>
          <td class="num">${formatMoney(sum(list, tab === "debt" ? "debt" : "surplus"))}</td><td colspan="2"></td></tr>`
      : "";
    $id("pager").innerHTML = pagerHtml(pg, PAGE_SIZE);
  }

  /* ---------- Nộp bổ sung ---------- */
  function openPayModal(msv) {
    const entry = data.find((x) => x.student.msv === msv);
    const { student: s, fin } = entry;
    const debt = fin.totals.debt;
    openModal({
      title: "Ghi nhận học phí nộp bổ sung",
      sub: `${s.msv} · ${toTitleCase(s.hoTen)} · ${s.lop}`,
      icon: "fa-cash-register",
      wide: true,
      body: `
        <table class="tbl" style="margin-bottom:14px">
          <thead><tr><th>Năm học</th><th class="num">Phải nộp</th><th class="num">Đã nộp</th><th class="num">Còn nợ</th><th>Ghi chú</th></tr></thead>
          <tbody>${fin.debtRows
            .map((r) => `<tr><td>${esc(schoolYearLabel(r))}</td><td class="num">${formatMoney(r.payable)}</td><td class="num">${formatMoney(r.totalPaid)}</td>
              <td class="num money-debt">${formatMoney(r.debt)}</td><td>${esc(r.note || "")}</td></tr>`)
            .join("")}</tbody>
          <tfoot><tr><td colspan="3">Tổng còn nợ</td><td class="num">${formatMoney(debt)}</td><td></td></tr></tfoot>
        </table>
        <div class="ui-form">
          <label class="ui-field"><span>Số tiền nộp (VNĐ) *</span>
            <input class="ui-input" id="pAmount" inputmode="numeric" value="${debt.toLocaleString("vi-VN")}" />
            <small class="ui-error" data-for="pAmount"></small></label>
          <label class="ui-field"><span>Trừ vào khoản</span>
            <select class="ui-select" id="pYear">
              <option value="">Tự động (năm nợ cũ nhất trước)</option>
              ${fin.debtRows.map((r) => `<option value="${r.year}">${esc(schoolYearLabel(r))} – nợ ${formatMoney(r.debt)}</option>`).join("")}
            </select></label>
          <label class="ui-field full"><span>Ghi chú / Số biên lai</span>
            <input class="ui-input" id="pNote" maxlength="120" placeholder="VD: Nộp tiền mặt tại quầy, biên lai số 0123" /></label>
        </div>
        <p class="note" id="pPreview" style="margin-top:12px"></p>`,
      actions: [{ value: "cancel", label: "Hủy" }, { value: "ok", label: "Xác nhận đã thu", kind: "ok", icon: "fa-check" }],
      onAction: (value, dlg) => {
        if (value !== "ok") return;
        const amount = parseAmount(dlg.querySelector("#pAmount").value);
        if (!fieldError(dlg, "pAmount", amount <= 0 ? "Nhập số tiền lớn hơn 0." : amount > 1e9 ? "Số tiền quá lớn." : "")) return false;
        const yearVal = dlg.querySelector("#pYear").value;
        const d = new Date();
        const payment = {
          id: newId(),
          msv: s.msv,
          amount,
          method: "admin",
          content: `SV${s.msv} Nop hoc phi (bo sung)`,
          note: dlg.querySelector("#pNote").value.trim(),
          year: yearVal ? Number(yearVal) : null,
          by: ADMIN.id,
          createdAt: d.toISOString(),
          receipt: `TC${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${String(d.getTime()).slice(-5)}`,
        };
        if (!savePayment(payment)) return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error"), false;
        const after = getFinance(s);
        showToast(
          `Đã ghi nhận ${formatMoney(amount)} cho ${s.msv}. ${after.done ? "Sinh viên đã hoàn thành học phí." : `Còn nợ ${formatMoney(after.totals.debt)}.`}`,
          "success"
        );
        load();
        render();
      },
    });

    // Xem trước kết quả khi nhập số tiền
    const dlg = $id("uiModal");
    const amountEl = dlg.querySelector("#pAmount");
    const preview = () => {
      const amount = parseAmount(amountEl.value);
      const left = Math.max(0, debt - amount);
      const extra = Math.max(0, amount - debt);
      dlg.querySelector("#pPreview").innerHTML = `<i class="fa-solid fa-calculator"></i>
        <span>Đã nộp: <b>${formatMoney(fin.totals.paid)}</b> → <b>${formatMoney(fin.totals.paid + amount)}</b> ·
        Còn nợ: <b>${formatMoney(debt)}</b> → <b>${formatMoney(left)}</b>${
          extra ? ` · <b style="color:var(--warn)">Thừa ${formatMoney(extra)}</b> (ghi nhận là học phí thừa)` : ""
        }${left === 0 ? " · Trạng thái: <b style=\"color:var(--ok)\">Đã hoàn thành</b>" : ""}</span>`;
    };
    amountEl.addEventListener("input", () => {
      const n = parseAmount(amountEl.value);
      amountEl.value = n ? n.toLocaleString("vi-VN") : "";
      preview();
    });
    preview();
  }

  const parseAmount = (text) => Number(String(text).replace(/\D/g, "")) || 0;

  function openHistory(msv) {
    const { student: s, fin } = data.find((x) => x.student.msv === msv);
    const rows = fin.rows.filter((r) => r.receipt).map((r) => ({
      receipt: r.receipt, when: `Hạn ${r.dueDate}`, method: "Theo dữ liệu Excel", amount: r.paid, note: schoolYearLabel(r),
    }));
    const payments = fin.payments.map((p) => ({
      receipt: p.receipt, when: fmtDateTime(p.createdAt), method: methodName(p.method), amount: p.amount, note: p.note || p.content,
    }));
    openModal({
      title: "Lịch sử nộp học phí",
      sub: `${s.msv} · ${toTitleCase(s.hoTen)}`,
      icon: "fa-receipt",
      wide: true,
      body: `<div class="table-wrap"><table class="tbl">
        <thead><tr><th>Số phiếu</th><th>Thời gian</th><th>Hình thức</th><th>Ghi chú</th><th class="num">Số tiền</th></tr></thead>
        <tbody>${[...rows, ...payments]
          .map((r) => `<tr><td class="nowrap">${esc(r.receipt)}</td><td class="nowrap">${esc(r.when)}</td><td>${esc(r.method)}</td><td>${esc(r.note)}</td><td class="num money-paid">${formatMoney(r.amount)}</td></tr>`)
          .join("") || '<tr><td colspan="5" class="empty-row">Chưa có khoản nộp.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="4">Tổng đã nộp</td><td class="num">${formatMoney(fin.totals.paid)}</td></tr></tfoot>
      </table></div>`,
      actions: [{ value: "cancel", label: "Đóng" }],
    });
  }

  $id("body").addEventListener("click", (e) => {
    const pay = e.target.closest("[data-pay]");
    const hist = e.target.closest("[data-history]");
    if (pay) openPayModal(pay.dataset.pay);
    if (hist) openHistory(hist.dataset.history);
  });
  $id("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    tab = b.dataset.tab;
    page = 1;
    $id("tabs").querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", x === b));
    render();
  });
  $id("pager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (b && !b.disabled) {
      page = Number(b.dataset.page);
      render();
    }
  });
  $id("search").addEventListener("input", () => { page = 1; render(); });
  $id("lop").addEventListener("change", () => { page = 1; render(); });
  $id("sort").addEventListener("change", render);
  window.addEventListener("storage", (e) => {
    if (e.key === STORE.payments || e.key === ACCOUNTS_KEY) { load(); render(); }
  });

  load();
  render();
});
