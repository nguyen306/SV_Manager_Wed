document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  if (!student) return; // app.js đã chuyển về trang đăng nhập

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (id) => document.getElementById(id);
  const methodName = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.name || id;

  function statusPill(row) {
    if (row.status === "paid") return '<span class="pill pill--ok"><i class="fa-solid fa-circle-check"></i>Đã nộp đủ</span>';
    if (row.status === "partial") return '<span class="pill pill--warn"><i class="fa-solid fa-circle-half-stroke"></i>Nộp thiếu</span>';
    return '<span class="pill pill--bad"><i class="fa-solid fa-circle-xmark"></i>Chưa nộp</span>';
  }

  function render() {
    const fin = getFinance(student);
    const t = fin.totals;

    /* Thông tin sinh viên */
    $("stAvatar").src = getAvatar(student.msv) || initialsAvatar(student.hoTen);
    $("stName").textContent = toTitleCase(student.hoTen);
    $("stMsv").textContent = student.msv;
    $("stClass").textContent = student.lop;
    $("stPhone").textContent = student.sdt || "—";
    const status = $("stStatus");
    status.className = `status ${fin.done ? "status--ok" : "status--bad"}`;
    status.innerHTML = fin.done
      ? '<i class="fa-solid fa-circle-check"></i> Đã hoàn thành'
      : '<i class="fa-solid fa-triangle-exclamation"></i> Còn nợ';
    $("payDot").hidden = fin.done;
    $("payNowBtn").hidden = fin.done;

    /* Phần 1 */
    $("debtTotal").textContent = formatMoney(t.debt);
    $("debtNote").textContent = fin.debtRows.length
      ? `${fin.debtRows.length} khoản chưa hoàn thành`
      : "Không có khoản nợ";
    $("surplusTotal").textContent = formatMoney(t.surplus);
    $("surplusNote").textContent = t.surplus > 0 ? "Có thể rút hoặc trừ vào kỳ sau" : "Không có khoản thừa";

    /* Phần 2 */
    $("mPayable").textContent = formatMoney(t.payable);
    $("mPayableNote").textContent = `Môn học ${formatMoney(t.tuition)} + phụ đạo ${formatMoney(t.tutorFee)}`;
    $("mExempt").textContent = formatMoney(t.exempt);
    $("mPaid").textContent = formatMoney(t.paid);
    $("mPaidNote").textContent = fin.payments.length
      ? `Gồm ${fin.payments.length} lần thanh toán online`
      : "Theo phiếu thu của nhà trường";
    $("mWithdrawn").textContent = formatMoney(t.withdrawn);

    const due = t.payable - t.exempt;
    const pct = due > 0 ? Math.min(100, Math.round(((t.paid - t.withdrawn) / due) * 100)) : 100;
    $("progressText").textContent = `${pct}% · ${formatMoney(t.paid - t.withdrawn)} / ${formatMoney(due)}`;
    $("progressFill").style.width = `${pct}%`;
    $("progressBar").setAttribute("aria-valuenow", pct);

    /* Phần 3: theo năm học */
    $("feeBody").innerHTML = fin.rows.length
      ? fin.rows
          .map(
            (r) => `
          <tr class="${r.debt > 0 ? "is-debt" : ""}">
            <td><b>${esc(schoolYearLabel(r))}</b><small>Hạn nộp ${esc(r.dueDate)}</small></td>
            <td>${r.subjects} × ${formatMoney(r.unitPrice)}</td>
            <td class="num">${formatMoney(r.tuition)}</td>
            <td class="num">${r.tutorSubjects ? `${formatMoney(r.tutorFee)}<small>${r.tutorSubjects} môn × ${formatMoney(window.TUITION_CONFIG?.tutorFee)}</small>` : "—"}</td>
            <td class="num">${r.exempt ? formatMoney(r.exempt) : "—"}</td>
            <td class="num"><b>${formatMoney(r.payable)}</b></td>
            <td class="num money-paid">${formatMoney(r.totalPaid)}${r.onlinePaid ? `<small>online ${formatMoney(r.onlinePaid)}</small>` : ""}</td>
            <td class="num ${r.debt > 0 ? "money-debt" : ""}">${r.debt > 0 ? formatMoney(r.debt) : "—"}</td>
            <td>${statusPill(r)}${r.note && r.debt > 0 ? `<small>${esc(r.note)}</small>` : ""}</td>
            <td class="receipt">${esc(r.receipt) || "—"}${r.payments.map((p) => `<br />${esc(p.receipt)}`).join("")}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="10" class="empty-row">Chưa có dữ liệu học phí.</td></tr>`;
    $("feeFoot").innerHTML = fin.rows.length
      ? `<tr>
          <td colspan="2">Tổng cộng</td>
          <td class="num">${formatMoney(t.tuition)}</td>
          <td class="num">${formatMoney(t.tutorFee)}</td>
          <td class="num">${formatMoney(t.exempt)}</td>
          <td class="num">${formatMoney(due)}</td>
          <td class="num">${formatMoney(t.paid)}</td>
          <td class="num">${formatMoney(t.debt)}</td>
          <td colspan="2"></td>
        </tr>`
      : "";

    /* Phiếu thu online */
    $("onlineBody").innerHTML = fin.payments.length
      ? [...fin.payments]
          .reverse()
          .map((p) => {
            const appliedTo = fin.rows
              .filter((r) => r.payments.some((x) => x.id === p.id))
              .map((r) => `Năm ${r.year}`)
              .join(", ");
            return `<tr>
              <td class="receipt">${esc(p.receipt)}</td>
              <td>${new Date(p.createdAt).toLocaleString("vi-VN")}</td>
              <td><span class="pill pill--method">${esc(methodName(p.method))}</span></td>
              <td>${esc(p.content)}</td>
              <td>${esc(appliedTo || "Học phí thừa")}</td>
              <td class="num money-paid">${formatMoney(p.amount)}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="6" class="empty-row">Chưa có giao dịch online. ${
          fin.done ? "" : '<a href="thanh-toan-online.html">Thanh toán ngay</a>'
        }</td></tr>`;

    return fin;
  }

  let fin = render();

  /* Popup chi tiết */
  const modal = $("detailModal");
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  document.querySelectorAll("[data-detail]").forEach((btn) =>
    btn.addEventListener("click", () => {
      fin = render();
      const isDebt = btn.dataset.detail === "debt";
      const rows = isDebt ? fin.debtRows : fin.surplusRows;
      $("detailTitle").textContent = isDebt ? "Danh sách nợ học phí" : "Danh sách học phí thừa";
      $("detailSub").textContent = `${toTitleCase(student.hoTen)} · ${student.msv}`;
      $("detailBody").innerHTML = rows.length
        ? `<table class="fin-table">
            <thead><tr><th>Năm học</th><th class="num">Phải nộp</th><th class="num">Đã nộp</th><th class="num">${isDebt ? "Còn nợ" : "Thừa"}</th></tr></thead>
            <tbody>${rows
              .map(
                (r) => `<tr>
                  <td><b>${esc(schoolYearLabel(r))}</b>${r.note && isDebt ? `<small>${esc(r.note)}</small>` : ""}</td>
                  <td class="num">${formatMoney(r.payable)}</td>
                  <td class="num">${formatMoney(r.totalPaid)}</td>
                  <td class="num ${isDebt ? "money-debt" : "money-paid"}">${formatMoney(isDebt ? r.debt : r.surplus)}</td>
                </tr>`
              )
              .join("")}</tbody>
          </table>`
        : `<p class="empty-row"><i class="fa-solid fa-circle-check" style="color:var(--ok)"></i>
             ${isDebt ? "Bạn không có khoản nợ học phí nào." : "Bạn không có khoản học phí thừa."}</p>`;
      $("detailActions").innerHTML =
        `<button type="submit" class="btn btn--ghost">Đóng</button>` +
        (isDebt && rows.length ? `<a href="thanh-toan-online.html" class="btn btn--pay"><i class="fa-solid fa-qrcode"></i> Thanh toán</a>` : "");
      modal.showModal();
    })
  );

  // Thanh toán ở tab khác -> cập nhật ngay
  window.addEventListener("storage", (e) => {
    if (e.key === PAYMENTS_KEY) fin = render();
  });
});
