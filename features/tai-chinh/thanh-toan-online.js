document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  if (!student) return; // app.js đã chuyển về trang đăng nhập

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (id) => document.getElementById(id);
  const content = transferContent(student.msv);
  const REDIRECT_SECONDS = 5;

  let fin = getFinance(student);
  let selected = "all"; // "all" = toàn bộ nợ, hoặc số năm (1..4)
  let method = ONLINE_METHODS[0];

  // Năm học hiện tại theo ngày hệ thống (năm học bắt đầu tháng 9; Năm 1 = 2025_2026)
  const now = new Date();
  const currentYear = Math.min(4, Math.max(1, (now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1) - 2025 + 1));

  const toast = $("toast");
  let toastTimer;
  function showToast(message, type = "") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  const amountOf = (choice) =>
    choice === "all" ? fin.totals.debt : fin.rows.find((r) => r.year === choice)?.debt || 0;

  /* ---------- Cột trái: hóa đơn ---------- */
  function renderInvoice() {
    fin = getFinance(student);
    if (selected !== "all" && !fin.debtRows.some((r) => r.year === selected)) selected = "all";
    const amount = amountOf(selected);

    const status = $("invStatus");
    status.className = `status ${fin.done ? "status--ok" : "status--bad"}`;
    status.innerHTML = fin.done ? '<i class="fa-solid fa-circle-check"></i> Đã hoàn thành' : '<i class="fa-solid fa-triangle-exclamation"></i> Còn nợ';

    $("amountBox").classList.toggle("is-done", fin.done);
    if (fin.done) {
      // Không còn nợ: hiển thị học phí năm học hiện tại (đã nộp)
      const cur = fin.rows.find((r) => r.year === currentYear) || fin.rows[fin.rows.length - 1];
      $("amountLabel").textContent = cur ? `Học phí ${schoolYearLabel(cur)}` : "Học phí";
      $("amountValue").textContent = formatMoney(cur?.payable);
      $("amountNote").textContent = "Đã nộp đủ · Không có khoản cần thanh toán";
    } else {
      $("amountLabel").textContent = selected === "all" ? "Tổng học phí còn thiếu" : `Học phí còn thiếu Năm ${selected}`;
      $("amountValue").textContent = formatMoney(amount);
      $("amountNote").textContent = `${fin.debtRows.length} khoản chưa hoàn thành · Hạn nộp sớm nhất ${fin.debtRows[0].dueDate}`;
    }

    $("choiceList").innerHTML = fin.done
      ? fin.rows
          .map(
            (r) => `<label class="choice"><input type="radio" disabled ${r.year === currentYear ? "checked" : ""} />
              <span>${esc(schoolYearLabel(r))}<small>Phiếu thu ${esc(r.receipt || "—")}</small></span>
              <b style="color:var(--ok)">Đã nộp</b></label>`
          )
          .join("")
      : [
          `<label class="choice"><input type="radio" name="khoan" value="all" ${selected === "all" ? "checked" : ""} />
             <span>Toàn bộ khoản nợ<small>${fin.debtRows.map((r) => `Năm ${r.year}`).join(", ")}</small></span>
             <b>${formatMoney(fin.totals.debt)}</b></label>`,
          ...fin.debtRows.map(
            (r) => `<label class="choice"><input type="radio" name="khoan" value="${r.year}" ${selected === r.year ? "checked" : ""} />
              <span>${esc(schoolYearLabel(r))}<small>${esc(r.note || "Học phí còn thiếu")}</small></span>
              <b>${formatMoney(r.debt)}</b></label>`
          ),
        ].join("");

    $("invName").textContent = toTitleCase(student.hoTen);
    $("invMsv").textContent = student.msv;
    $("invClass").textContent = student.lop;
    $("invPayable").textContent = formatMoney(fin.totals.payable - fin.totals.exempt);
    $("invPaid").textContent = formatMoney(fin.totals.paid);
    $("transferContent").textContent = content;
    $("stepContent").textContent = content;

    renderGateway();
  }

  $("choiceList").addEventListener("change", (e) => {
    if (e.target.name !== "khoan") return;
    selected = e.target.value === "all" ? "all" : Number(e.target.value);
    renderInvoice();
  });

  $("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content);
      showToast("Đã sao chép nội dung chuyển khoản.", "success");
    } catch {
      showToast(`Nội dung: ${content}`);
    }
  });

  /* ---------- Cột phải: cổng QR ---------- */
  $("methodSelect").innerHTML = ONLINE_METHODS.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("");
  $("methodChips").innerHTML = ONLINE_METHODS.map(
    (m) => `<button type="button" class="method-chip" data-method="${m.id}" style="--chip:${m.color}" aria-pressed="false">
      <i class="fa-solid ${m.icon}"></i>${esc(m.name)}</button>`
  ).join("");

  function setMethod(id) {
    method = ONLINE_METHODS.find((m) => m.id === id) || ONLINE_METHODS[0];
    $("methodSelect").value = method.id;
    renderGateway();
  }
  $("methodSelect").addEventListener("change", (e) => setMethod(e.target.value));
  $("methodChips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-method]");
    if (chip) setMethod(chip.dataset.method);
  });

  function renderGateway() {
    const amount = fin.done ? 0 : amountOf(selected);
    document.querySelectorAll(".method-chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.method === method.id));
    const card = $("qrCard");
    card.style.setProperty("--qr", method.color);
    card.classList.toggle("is-disabled", fin.done);
    $("qrBrand").innerHTML = `<i class="fa-solid ${method.icon}"></i> ${esc(method.name)}`;
    $("qrFrame").innerHTML = illustrativeQr(`${method.id}|${content}|${amount}`);
    $("qrAmount").textContent = fin.done ? "Đã hoàn thành" : formatMoney(amount);
    $("qrOverlay").hidden = !fin.done;
    $("payBtn").disabled = fin.done || amount <= 0;
  }

  /* ---------- Thanh toán ---------- */
  const modal = $("payModal");
  let redirectTimer;
  modal.addEventListener("close", () => clearInterval(redirectTimer));

  $("payBtn").addEventListener("click", () => {
    const amount = amountOf(selected);
    if (amount <= 0) return;
    $("payTitle").textContent = "Xác nhận thanh toán";
    $("paySub").textContent = "Kiểm tra thông tin trước khi xác nhận";
    $("payBody").innerHTML = `
      <dl class="detail">
        <dt>Sinh viên</dt><dd>${esc(toTitleCase(student.hoTen))} · ${esc(student.msv)}</dd>
        <dt>Khoản thanh toán</dt><dd>${selected === "all" ? "Toàn bộ khoản nợ" : `Học phí Năm ${selected}`}</dd>
        <dt>Phương thức</dt><dd>${esc(method.name)}</dd>
        <dt>Nội dung</dt><dd>${esc(content)}</dd>
        <dt>Số tiền</dt><dd class="hl">${formatMoney(amount)}</dd>
      </dl>`;
    $("payActions").innerHTML = `
      <button type="submit" value="cancel" class="btn btn--ghost">Hủy</button>
      <button type="button" class="btn btn--primary" id="confirmPay"><i class="fa-solid fa-check"></i> Xác nhận</button>`;
    $("confirmPay").addEventListener("click", () => process(amount), { once: true });
    modal.showModal();
  });

  function process(amount) {
    $("payTitle").textContent = "Đang xử lý giao dịch";
    $("paySub").textContent = method.name;
    $("payBody").innerHTML = `<div class="processing"><div class="spinner"></div>
      <h4>Đang xác minh giao dịch...</h4><p>Vui lòng không đóng cửa sổ này.</p></div>`;
    $("payActions").innerHTML = "";

    setTimeout(() => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const payment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        msv: student.msv,
        amount,
        method: method.id,
        content,
        year: selected === "all" ? null : selected,
        createdAt: d.toISOString(),
        receipt: `OL${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${String(Date.now()).slice(-5)}`,
      };
      if (!savePayment(payment)) {
        $("payBody").innerHTML = `<p class="empty-row">Trình duyệt không cho phép lưu dữ liệu. Vui lòng thử lại.</p>`;
        $("payActions").innerHTML = `<button type="submit" class="btn btn--ghost">Đóng</button>`;
        return;
      }
      renderInvoice();

      $("payTitle").textContent = "Thanh toán thành công";
      $("paySub").textContent = `Phiếu thu ${payment.receipt}`;
      $("payBody").innerHTML = `<div class="processing">
          <div class="success-check"><i class="fa-solid fa-check"></i></div>
          <h4>Đã ghi nhận ${formatMoney(amount)}</h4>
          <p>Trạng thái học phí: <b style="color:${fin.done ? "var(--ok)" : "var(--bad)"}">${fin.done ? "Đã hoàn thành" : "Còn nợ " + formatMoney(fin.totals.debt)}</b></p>
          <p id="countdown">Tự động chuyển sang trang Học phí sau ${REDIRECT_SECONDS} giây...</p>
        </div>`;
      $("payActions").innerHTML = `
        <button type="submit" value="stay" class="btn btn--ghost">Ở lại trang này</button>
        <a href="${pageUrl("hoc-phi")}" class="btn btn--primary"><i class="fa-solid fa-file-invoice-dollar"></i> Xem trang Học phí</a>`;
      showToast("Thanh toán thành công!", "success");

      let left = REDIRECT_SECONDS;
      redirectTimer = setInterval(() => {
        left -= 1;
        const el = $("countdown");
        if (el) el.textContent = `Tự động chuyển sang trang Học phí sau ${left} giây...`;
        if (left <= 0) {
          clearInterval(redirectTimer);
          window.location.href = pageUrl("hoc-phi");
        }
      }, 1000);
    }, 1600);
  }

  window.addEventListener("storage", (e) => {
    if (e.key === PAYMENTS_KEY) renderInvoice();
  });

  renderInvoice();
});
