// Dashboard Admin: số liệu tổng hợp từ dữ liệu sinh viên (Excel + Admin), học phí và phản hồi.
document.addEventListener("DOMContentLoaded", () => {
  if (!ADMIN) return;

  function render() {
    const students = getStudents();
    const accounts = loadAccounts();
    const teachers = accounts.staff.filter((s) => s.role === "teacher");
    const finance = financeOverview().filter((x) => x.hasData);
    const sum = (k) => finance.reduce((s, x) => s + x.fin.totals[k], 0);
    const due = sum("payable") - sum("exempt");
    const collected = sum("paid") - sum("withdrawn");
    const debt = sum("debt");
    const debtors = finance.filter((x) => !x.fin.done).length;
    const feedback = loadFeedback();
    const open = feedback.filter((x) => x.status !== "da-giai-quyet");

    $id("updated").textContent = `Cập nhật lúc ${fmtDateTime(new Date().toISOString())} · dữ liệu từ file Excel và các thao tác trên hệ thống`;
    $id("toFeedback").href = pageUrl("qt-phan-hoi");

    $id("stats").innerHTML = `
      <div class="stat stat--info"><span class="stat__icon"><i class="fa-solid fa-user-graduate"></i></span>
        <div><b>${students.length.toLocaleString("vi-VN")}</b><span>Sinh viên · ${new Set(students.map((s) => s.lop)).size} lớp</span></div></div>
      <div class="stat"><span class="stat__icon"><i class="fa-solid fa-chalkboard-user"></i></span>
        <div><b>${teachers.length}</b><span>Giảng viên · ${accounts.staff.filter((s) => s.role === "admin").length} quản trị viên</span></div></div>
      <div class="stat stat--ok"><span class="stat__icon"><i class="fa-solid fa-sack-dollar"></i></span>
        <div><b>${formatMillion(collected)}</b><span>Học phí đã thu</span></div></div>
      <div class="stat stat--bad"><span class="stat__icon"><i class="fa-solid fa-file-invoice-dollar"></i></span>
        <div><b>${formatMillion(debt)}</b><span>Còn nợ · ${debtors} sinh viên</span></div></div>
      <div class="stat stat--warn"><span class="stat__icon"><i class="fa-solid fa-inbox"></i></span>
        <div><b>${open.length}</b><span>Phản hồi cần xử lý / ${feedback.length}</span></div></div>`;

    // 1. Sinh viên theo lớp
    const byClass = {};
    students.forEach((s) => (byClass[s.lop] = (byClass[s.lop] || 0) + 1));
    renderBars(
      $id("chartClass"),
      Object.entries(byClass).sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value, display: `${value} SV` })),
      { caption: "Số sinh viên theo lớp" }
    );

    // 2. Học phí: đã thu / còn phải thu
    renderStack(
      $id("chartTuition"),
      [
        { label: "Đã thu", value: collected, display: formatMoney(collected), color: "var(--series-1)" },
        { label: "Còn phải thu", value: debt, display: formatMoney(debt), color: "var(--series-2)" },
      ],
      { caption: "Học phí đã thu và còn phải thu" }
    );
    $id("tuitionNote").textContent =
      `Tổng phải thu ${formatMoney(due)} · ${finance.length - debtors} SV đã nộp đủ, ${debtors} SV còn nợ`;

    // 3. Xếp loại học lực
    const order = ["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu", "Kém"];
    const ranks = Object.fromEntries(order.map((r) => [r, 0]));
    let noGpa = 0;
    students.forEach((s) => (s.gpa == null ? noGpa++ : ranks[classify(s.gpa).label]++));
    renderBars(
      $id("chartRank"),
      order.map((label) => ({ label, value: ranks[label], display: `${ranks[label]}` })),
      { horizontal: true, caption: "Số sinh viên theo xếp loại học lực" }
    );
    if (noGpa) $id("chartRank").insertAdjacentHTML("beforeend", `<p class="chart-note">${noGpa} sinh viên chưa có điểm.</p>`);

    // 4. Phản hồi theo loại
    renderBars(
      $id("chartFeedback"),
      FEEDBACK_META.categories.map((c) => {
        const n = feedback.filter((x) => x.category === c.id).length;
        return { label: c.label, value: n, display: `${n}` };
      }),
      { horizontal: true, caption: "Số phản hồi theo loại" }
    );
    const count = (id) => feedback.filter((x) => x.status === id).length;
    $id("feedbackNote").textContent = feedback.length
      ? FEEDBACK_META.statuses.map((s) => `${s.label}: ${count(s.id)}`).join(" · ")
      : "Chưa có phản hồi nào.";

    // Phản hồi cần xử lý: khẩn cấp trước, rồi mới nhất
    const rankP = { "khan-cap": 0, "quan-trong": 1, thuong: 2 };
    const list = [...open].sort((a, b) => rankP[a.priority] - rankP[b.priority] || b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
    $id("pending").innerHTML = list.length
      ? list
          .map((x) => {
            const st = metaOf(FEEDBACK_META.statuses, x.status);
            const pr = metaOf(FEEDBACK_META.priorities, x.priority);
            return `<li><a href="${pageUrl("qt-phan-hoi")}">
              <span class="inbox-item__icon"><i class="fa-solid ${metaOf(FEEDBACK_META.categories, x.category).icon}"></i></span>
              <span class="grow"><b>${esc(x.title)}</b><small>${esc(toTitleCase(x.hoTen))} · ${esc(x.lop || "")} · ${fmtDateTime(x.createdAt)}</small></span>
              ${pr.id !== "thuong" ? `<span class="pill pr--${pr.id}">${pr.label}</span>` : ""}
              <span class="pill st--${st.id}">${st.label}</span></a></li>`;
          })
          .join("")
      : `<li class="empty"><i class="fa-regular fa-circle-check"></i>Không có phản hồi nào cần xử lý.</li>`;
  }

  window.addEventListener("storage", render);
  render();
});
