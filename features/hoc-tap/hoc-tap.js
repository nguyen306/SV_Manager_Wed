// Toàn bộ dữ liệu lấy từ data/students.js (sinh từ file Excel):
//   window.SUBJECTS: tên môn, số tín chỉ, năm học (Năm 1..4)
//   student.diem:    điểm hệ 4 của từng môn
document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  if (!student) {
    window.location.href = pageUrl("dang-nhap");
    return;
  }

  const subjects = window.SUBJECTS || [];
  // Năm 1 = 2025_2026, Năm 2 = 2026_2027, Năm 3 = 2027_2028, Năm 4 = 2028_2029
  const START_YEAR = 2025;

  /* ========== HÀM TIỆN ÍCH ========== */
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 2) => (n == null || Number.isNaN(n) ? "—" : n.toFixed(d));
  const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
  const schoolYear = (y) => `${START_YEAR + y - 1}_${START_YEAR + y}`;
  const yearLabel = (y) => `Năm học ${schoolYear(y)}`;
  const yearShort = (y) => `Năm ${y} (${schoolYear(y)})`;

  // Excel chỉ có điểm hệ 4; quy đổi hệ 10 = hệ 4 × 2.5 (làm tròn 1 chữ số), điểm chữ xếp theo hệ 10.
  const toTen = (h4) => Math.round(h4 * 2.5 * 10) / 10;
  function letterOf(ten) {
    if (ten >= 8.5) return "A";
    if (ten >= 8.0) return "B+";
    if (ten >= 7.0) return "B";
    if (ten >= 6.5) return "C+";
    if (ten >= 5.5) return "C";
    if (ten >= 5.0) return "D+";
    if (ten >= 4.0) return "D";
    return "F";
  }

  const sumCredits = (list) => list.reduce((s, r) => s + r.subject.credits, 0);
  function weighted(list, key) {
    const credits = sumCredits(list);
    return credits ? list.reduce((s, r) => s + r.subject.credits * r[key], 0) / credits : null;
  }

  /* ========== KẾT QUẢ CỦA SINH VIÊN ========== */
  // Môn phải học phụ đạo tối (điểm < 2.0) theo sheet "Danh Sách SV Phụ Đạo Tối"
  const tutoringByName = new Map(getTutoring(student.msv).map((t) => [t.subject, t]));
  const results = subjects
    .filter((s) => student.diem[s.name] != null)
    .map((subject) => {
      const h4 = student.diem[subject.name];
      const h10 = toTen(h4);
      return { subject, h4, h10, letter: letterOf(h10), pass: h10 >= 4.0, tutoring: tutoringByName.get(subject.name) };
    });
  const resultByName = new Map(results.map((r) => [r.subject.name, r]));
  const years = [...new Set(results.map((r) => r.subject.year))].sort((a, b) => b - a);

  function stats(list) {
    const passed = list.filter((r) => r.pass);
    return {
      credits: sumCredits(list),
      passedCredits: sumCredits(passed),
      avg10: weighted(list, "h10"),
      avg4: weighted(list, "h4"),
      cum10: weighted(passed, "h10"),
      cum4: weighted(passed, "h4"),
    };
  }
  const total = stats(results);
  const programCredits = subjects.reduce((s, x) => s + x.credits, 0);

  // Ghi chú: học lại (không đạt) và/hoặc lịch phụ đạo tối (điểm < 2.0)
  const noteOf = (r) =>
    [
      r.pass ? "" : "Học lại",
      r.tutoring ? `<a class="tutor-link" href="${pageUrl("lich-hoc")}">Phụ đạo tối ${esc(r.tutoring.schedule.split(" (")[0])}</a>` : "",
    ].filter(Boolean).join("<br />");

  const passPill = (r) =>
    r.pass ? '<span class="pill pill--pass">ĐẠT</span>' : '<span class="pill pill--fail">KHÔNG ĐẠT</span>';
  const detailBtn = (name) =>
    `<button class="btn-detail" data-name="${esc(name)}" aria-label="Chi tiết ${esc(name)}"><i class="fa-regular fa-eye"></i></button>`;
  function emptyState(icon, title, text) {
    return `<div class="box empty-state"><i class="fa-regular ${icon}"></i><h4>${title}</h4><p>${text}</p></div>`;
  }

  /* ========== CỘT TRÁI ========== */
  document.getElementById("sideAvatar").src = getAvatar(student.msv) || initialsAvatar(student.hoTen);
  document.getElementById("sideName").textContent = student.hoTen;
  document.getElementById("kvName").textContent = toTitleCase(student.hoTen);
  document.getElementById("kvMsv").textContent = student.msv;
  document.getElementById("kvClass").textContent = student.lop;

  document.getElementById("quickGrades").innerHTML = results
    .map(
      (r) => `
      <li class="${r.pass ? "" : "qg--fail"}">
        <div>
          <div class="qg__code">Năm ${r.subject.year} · ${r.subject.credits} TC${r.tutoring ? ' · <span class="qg__tutor">Phụ đạo</span>' : ""}</div>
          <div class="qg__name">${esc(r.subject.name)}</div>
        </div>
        <div class="qg__score"><b>${fmt(r.h4, 1)}</b><small>hệ 4 · ${r.letter}</small></div>
      </li>`
    )
    .join("");

  const gpa4 = student.gpa ?? total.avg4;
  const rank = classify(gpa4);
  const rankPill = (avg4) => {
    const r = classify(avg4);
    return `<span class="rank ${r.cls}">${r.label}</span>`;
  };

  document.getElementById("summaryTable").innerHTML = `
    <tr><td>Tổng số tín chỉ chương trình</td><td>${programCredits}</td></tr>
    <tr><td>Tổng số tín chỉ đã học</td><td>${total.credits}</td></tr>
    <tr><td>Tổng số tín chỉ tích lũy</td><td>${total.passedCredits}</td></tr>
    <tr><td>Điểm trung bình hệ 10</td><td>${fmt(total.avg10)}</td></tr>
    <tr><td>Điểm trung bình hệ 4</td><td>${fmt(gpa4)}</td></tr>
    <tr class="hl"><td>Điểm TB tích lũy (hệ 10 / hệ 4)</td><td>${fmt(total.cum10)} / ${fmt(total.cum4)}</td></tr>
    <tr><td>Xếp loại học lực</td><td><span class="rank ${rank.cls}">${rank.label}</span></td></tr>
    ${tutoringByName.size
      ? `<tr><td>Môn phải học phụ đạo</td><td><a class="tutor-link" href="${pageUrl("lich-hoc")}">${tutoringByName.size} môn</a></td></tr>`
      : ""}`;

  /* ========== TAB: BẢNG ĐIỂM (theo năm học) ========== */
  function renderTranscript() {
    const panel = document.getElementById("panel-bang-diem");
    if (!results.length) {
      panel.innerHTML = emptyState("fa-file-lines", "Chưa có điểm", "Sinh viên chưa có kết quả học tập.");
      return;
    }
    panel.innerHTML = years
      .map((y) => {
        const list = results.filter((r) => r.subject.year === y);
        const st = stats(list);
        const cum = stats(results.filter((r) => r.subject.year <= y));
        return `
        <section class="box box--flush semester">
          <div class="semester__head">${yearLabel(y)}<span>Năm ${y} · ${list.length} học phần</span></div>
          <div class="table-wrap">
            <table class="data-table grade-table">
              <thead><tr>
                <th>STT</th><th class="text-left">Tên học phần</th><th>Số tín chỉ</th>
                <th>Điểm hệ 10</th><th>Điểm hệ 4</th><th>Điểm chữ</th>
                <th>Đánh giá</th><th>Ghi chú</th><th>Chi tiết</th>
              </tr></thead>
              <tbody>${list
                .map(
                  (r, i) => `
                <tr>
                  <td class="c-stt">${i + 1}</td>
                  <td class="text-left c-name">${esc(r.subject.name)}</td>
                  <td class="c-tc" data-label="Tín chỉ">${r.subject.credits}</td>
                  <td class="score c-h10" data-label="Hệ 10">${fmt(r.h10, 1)}</td>
                  <td class="score c-h4" data-label="Hệ 4">${fmt(r.h4, 1)}</td>
                  <td class="c-letter" data-label="Điểm chữ"><b>${r.letter}</b></td>
                  <td class="c-eval">${passPill(r)}</td>
                  <td class="c-note">${noteOf(r)}</td>
                  <td class="c-detail">${detailBtn(r.subject.name)}</td>
                </tr>`
                )
                .join("")}</tbody>
            </table>
          </div>
          <dl class="semester__sum">
            <div><dt>Tổng tín chỉ</dt><dd>${st.credits}</dd></div>
            <div><dt>Điểm TB năm hệ 10</dt><dd>${fmt(st.avg10)}</dd></div>
            <div><dt>Điểm TB năm hệ 4</dt><dd>${fmt(st.avg4)}</dd></div>
            <div><dt>Tín chỉ tích lũy</dt><dd>${cum.passedCredits}</dd></div>
            <div><dt>Điểm TB tích lũy hệ 10</dt><dd>${fmt(cum.cum10)}</dd></div>
            <div><dt>Điểm TB tích lũy hệ 4</dt><dd>${fmt(cum.cum4)}</dd></div>
            <div><dt>Xếp loại năm học</dt><dd>${rankPill(st.avg4)}</dd></div>
            <div><dt>Xếp loại đến hết năm</dt><dd>${rankPill(cum.avg4)}</dd></div>
            <div><dt>Môn phải phụ đạo</dt><dd>${list.filter((r) => r.tutoring).length}</dd></div>
          </dl>
        </section>`;
      })
      .join("");
  }

  /* ========== TAB: HỌC PHẦN NỢ ========== */
  function renderDebt() {
    const failed = results.filter((r) => !r.pass);
    const panel = document.getElementById("panel-hoc-phan-no");
    if (!failed.length) {
      panel.innerHTML = `<div class="notice notice--ok"><i class="fa-solid fa-circle-check"></i>Bạn không còn học phần nợ nào.</div>`;
      return;
    }
    panel.innerHTML = `
      <div class="notice notice--warn"><i class="fa-solid fa-triangle-exclamation"></i>
        Bạn đang nợ ${failed.length} học phần (${sumCredits(failed)} tín chỉ).</div>
      <div class="box box--flush"><div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>STT</th><th class="text-left">Tên học phần</th><th>Số tín chỉ</th><th>Năm học</th>
            <th>Điểm hệ 4</th><th>Điểm chữ</th><th>Chi tiết</th></tr></thead>
          <tbody>${failed
            .map(
              (r, i) => `<tr>
              <td>${i + 1}</td><td class="text-left">${esc(r.subject.name)}</td><td>${r.subject.credits}</td>
              <td>${yearShort(r.subject.year)}</td><td class="score">${fmt(r.h4, 1)}</td><td><b>${r.letter}</b></td>
              <td>${detailBtn(r.subject.name)}</td>
            </tr>`
            )
            .join("")}</tbody>
        </table>
      </div></div>`;
  }

  /* ========== TAB: KẾT QUẢ ĐĂNG KÝ HỌC ========== */
  function renderRegistration() {
    document.getElementById("panel-ket-qua-dang-ky").innerHTML = years
      .map((y) => {
        const list = results.filter((r) => r.subject.year === y);
        return `<section class="box box--flush">
          <div class="semester__head">${yearLabel(y)}<span>${sumCredits(list)} tín chỉ</span></div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>STT</th><th class="text-left">Tên học phần</th><th>Số tín chỉ</th><th>Trạng thái</th></tr></thead>
            <tbody>${list
              .map(
                (r, i) => `<tr><td>${i + 1}</td><td class="text-left">${esc(r.subject.name)}</td>
                <td>${r.subject.credits}</td><td><span class="pill pill--pass">Đã có điểm</span></td></tr>`
              )
              .join("")}</tbody>
          </table></div>
        </section>`;
      })
      .join("");
  }

  /* ========== CÁC TAB FILE EXCEL CHƯA CÓ DỮ LIỆU ========== */
  const noData = "File dữ liệu hiện chưa có thông tin này.";
  document.getElementById("panel-khoi-kien-thuc").innerHTML = emptyState("fa-folder-open", "Chưa có dữ liệu khối kiến thức", noData);
  document.getElementById("panel-quyet-dinh").innerHTML = emptyState("fa-file-lines", "Chưa có quyết định", noData);
  document.getElementById("panel-van-bang").innerHTML = emptyState("fa-id-card", "Chưa có văn bằng - chứng chỉ", noData);
  document.getElementById("panel-canh-bao").innerHTML = emptyState("fa-bell", "Chưa có dữ liệu cảnh báo học vụ", noData);

  /* ========== TAB: ĐIỂM RÈN LUYỆN (giảng viên chấm ở trang Điểm rèn luyện) ========== */
  function renderConduct() {
    const scores = (() => {
      try { return JSON.parse(storageGet("conduct:scores")) || {}; } catch { return {}; }
    })();
    const rows = [1, 2, 3, 4]
      .map((y) => ({ y, rec: scores[`${y}|${student.msv}`] }))
      .filter((x) => x.rec);
    const panel = document.getElementById("panel-ren-luyen");
    if (!rows.length) {
      panel.innerHTML = emptyState("fa-star", "Chưa có điểm rèn luyện", "Giảng viên phụ trách lớp chưa chấm điểm rèn luyện cho bạn.");
      return;
    }
    const avg = rows.reduce((sum, x) => sum + x.rec.score, 0) / rows.length;
    panel.innerHTML = `
      <section class="box box--flush">
        <div class="semester__head">Điểm rèn luyện<span>Trung bình ${avg.toFixed(1)} · ${classifyConduct(avg).label}</span></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Năm học</th><th>Điểm</th><th>Xếp loại</th><th class="text-left">Nhận xét</th><th>Người chấm</th><th>Cập nhật</th></tr></thead>
          <tbody>${rows
            .map(({ y, rec }) => {
              const rank = classifyConduct(rec.score);
              return `<tr><td class="nowrap">${yearLabel(y)}</td><td class="score">${rec.score}</td>
                <td><span class="pill ${rank.cls}">${rank.label}</span></td>
                <td class="text-left">${esc(rec.note || "—")}</td><td>${esc(rec.byName || rec.by)}</td>
                <td class="nowrap">${new Date(rec.at).toLocaleDateString("vi-VN")}</td></tr>`;
            })
            .join("")}</tbody>
        </table></div>
      </section>
      <div class="notice"><i class="fa-solid fa-circle-info"></i>Thang 100: Xuất sắc ≥ 90 · Tốt ≥ 80 · Khá ≥ 65 · Trung bình ≥ 50 · Yếu ≥ 35 · Kém &lt; 35.</div>`;
  }
  renderConduct();

  /* ========== TAB: CHƯƠNG TRÌNH HỌC ========== */
  // Danh sách chương trình lấy từ các lớp có trong file, VD "Công nghệ thông tin 2 K66" -> "K66 - Công nghệ thông tin"
  const programName = (s) => `${(s.lop.match(/K\d+/) || [""])[0]} - ${s.nganh}`;
  const programs = [...new Set(getStudents().map(programName))].sort();
  const programSelect = document.getElementById("programSelect");
  const courseSearch = document.getElementById("courseSearch");
  programSelect.innerHTML = programs
    .map((p) => `<option ${p === programName(student) ? "selected" : ""}>${esc(p)}</option>`)
    .join("");

  function renderProgram() {
    const q = normalize(courseSearch.value.trim());
    const list = subjects.filter((s) => !q || normalize(s.name).includes(q));
    document.getElementById("programBody").innerHTML = list.length
      ? list
          .map((s, i) => {
            const r = resultByName.get(s.name);
            return `<tr>
              <td>${i + 1}</td>
              <td class="text-left">${esc(s.name)}</td>
              <td>${s.credits}</td>
              <td>${yearShort(s.year)}</td>
              <td class="score">${r ? fmt(r.h4, 1) : "—"}</td>
              <td>${r ? passPill(r) : '<span class="pill pill--muted">Chưa có điểm</span>'}</td>
              <td>${detailBtn(s.name)}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="7">Không tìm thấy học phần phù hợp.</td></tr>`;
    document.getElementById("programCount").textContent =
      `Hiển thị ${list.length}/${subjects.length} học phần · Tổng chương trình: ${programCredits} tín chỉ`;
  }
  programSelect.addEventListener("change", renderProgram);
  courseSearch.addEventListener("input", renderProgram);

  /* ========== MODAL CHI TIẾT ========== */
  const modal = document.getElementById("courseModal");
  document.getElementById("modalClose").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

  document.querySelector(".study-main").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-detail");
    if (!btn) return;
    const subject = subjects.find((s) => s.name === btn.dataset.name);
    if (!subject) return;
    const r = resultByName.get(subject.name);
    // Điểm thành phần do giảng viên nhập ở trang Lớp học phần (nếu có)
    const parts = (() => {
      try { return (JSON.parse(storageGet("course:grades")) || {})[`${subject.name}|${student.msv}`]; } catch { return null; }
    })();
    document.getElementById("modalTitle").textContent = subject.name;
    document.getElementById("modalBody").innerHTML = `
      <dl class="detail-list">
        <div><dt>Số tín chỉ</dt><dd>${subject.credits}</dd></div>
        <div><dt>Năm học</dt><dd>${yearShort(subject.year)}</dd></div>
        ${r
          ? `<div><dt>Điểm hệ 4</dt><dd><span class="score" style="color:var(--orange)">${fmt(r.h4, 1)}</span></dd></div>
             <div><dt>Điểm hệ 10 (quy đổi)</dt><dd>${fmt(r.h10, 1)}</dd></div>
             <div><dt>Điểm chữ</dt><dd>${r.letter}</dd></div>
             <div><dt>Đánh giá</dt><dd>${passPill(r)}</dd></div>`
          : `<div><dt>Kết quả</dt><dd><span class="pill pill--muted">Chưa có điểm</span></dd></div>`}
        ${parts
          ? `<div><dt>Điểm giữa kỳ (GV nhập)</dt><dd>${parts.mid ?? "—"}</dd></div>
             <div><dt>Điểm cuối kỳ (GV nhập)</dt><dd>${parts.final ?? "—"}</dd></div>
             <div><dt>Tổng kết thành phần</dt><dd>${parts.total != null ? `<b>${fmt(parts.total, 1)}</b> <small>(30% GK + 70% CK)</small>` : "—"}</dd></div>
             <div><dt>Giảng viên</dt><dd>${esc(parts.byName || parts.by)} · ${new Date(parts.at).toLocaleDateString("vi-VN")}</dd></div>`
          : ""}
      </dl>`;
    modal.showModal();
  });

  /* ========== CHUYỂN TAB (giữ tab trên URL: hoc-tap.html#chuong-trinh) ========== */
  const tabButtons = document.querySelectorAll("#studyTabs [data-tab]");
  function activate(name) {
    if (![...tabButtons].some((b) => b.dataset.tab === name)) name = "bang-diem";
    tabButtons.forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === name));
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
  }
  tabButtons.forEach((b) =>
    b.addEventListener("click", () => {
      history.replaceState(null, "", `#${b.dataset.tab}`);
      activate(b.dataset.tab);
    })
  );
  window.addEventListener("hashchange", () => activate(location.hash.slice(1)));

  window.addEventListener("storage", (e) => { if (e.key === "conduct:scores") renderConduct(); });
  renderTranscript();
  renderDebt();
  renderRegistration();
  renderProgram();
  activate(location.hash.slice(1));
});
