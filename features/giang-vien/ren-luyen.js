// Chấm điểm rèn luyện cho sinh viên các lớp phụ trách. Lưu tại STORE.conduct với khóa "<năm>|<msv>";
// sinh viên xem kết quả ở tab "Điểm rèn luyện" của trang Học tập.
document.addEventListener("DOMContentLoaded", () => {
  if (!TEACHER) return;

  const yearEl = $id("year");
  const lopEl = $id("lop");
  const searchEl = $id("search");
  const classes = teacherClasses();
  const pending = new Map(); // msv -> { score, note } chưa lưu

  yearEl.innerHTML = [1, 2, 3, 4]
    .map((y) => `<option value="${y}">Năm ${y} (${schoolYearLabel(y)})</option>`)
    .join("");
  yearEl.value = String(currentStudyYear());
  lopEl.innerHTML = classes.map((c) => `<option>${esc(c)}</option>`).join("") || "<option value=''>— Chưa được phân công —</option>";

  const loadScores = () => readJSON(STORE.conduct, {}) || {};
  const keyOf = (msv) => `${yearEl.value}|${msv}`;

  function current(msv, saved) {
    if (pending.has(msv)) return pending.get(msv);
    const s = saved[keyOf(msv)];
    return { score: s ? String(s.score) : "", note: s ? s.note || "" : "" };
  }

  const validScore = (v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) <= 100);

  function render() {
    const saved = loadScores();
    const all = studentsOfClass(lopEl.value);
    const q = normalizeText(searchEl.value.trim());
    const list = all.filter((s) => !q || normalizeText(`${s.msv} ${s.hoTen}`).includes(q));

    // Thống kê cả lớp (gồm thay đổi chưa lưu)
    const scores = all.map((s) => current(s.msv, saved).score).filter((v) => v !== "" && validScore(v)).map(Number);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const good = scores.filter((v) => v >= 80).length;
    $id("stats").innerHTML = `
      <div class="stat stat--info"><span class="stat__icon"><i class="fa-solid fa-users"></i></span>
        <div><b>${all.length}</b><span>Sinh viên trong lớp</span></div></div>
      <div class="stat stat--ok"><span class="stat__icon"><i class="fa-solid fa-check-double"></i></span>
        <div><b>${scores.length}/${all.length}</b><span>Đã chấm điểm</span></div></div>
      <div class="stat"><span class="stat__icon"><i class="fa-solid fa-chart-simple"></i></span>
        <div><b>${avg == null ? "—" : avg.toFixed(1)}</b><span>Điểm trung bình lớp</span></div></div>
      <div class="stat stat--warn"><span class="stat__icon"><i class="fa-solid fa-medal"></i></span>
        <div><b>${good}</b><span>Đạt loại Tốt trở lên</span></div></div>`;

    $id("body").innerHTML = list.length
      ? list
          .map((s, i) => {
            const v = current(s.msv, saved);
            const rec = saved[keyOf(s.msv)];
            const rank = classifyConduct(validScore(v.score) ? v.score : "");
            return `<tr data-msv="${s.msv}" class="${pending.has(s.msv) ? "is-dirty" : ""}">
              <td>${i + 1}</td>
              <td class="nowrap">${s.msv}</td>
              <td><b>${esc(toTitleCase(s.hoTen))}</b></td>
              <td class="center"><input class="ui-input ui-input--sm score-input ${validScore(v.score) ? "" : "is-bad"}" data-field="score"
                    inputmode="numeric" maxlength="3" value="${esc(v.score)}" aria-label="Điểm rèn luyện ${esc(s.hoTen)}" /></td>
              <td><span class="pill ${rank.cls}">${rank.label}</span></td>
              <td><input class="ui-input ui-input--sm" data-field="note" maxlength="100" value="${esc(v.note)}" placeholder="—" aria-label="Ghi chú" /></td>
              <td class="nowrap">${rec ? `<small>${fmtDateTime(rec.at)}</small>` : "<small>—</small>"}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="7" class="empty-row">${all.length ? "Không tìm thấy sinh viên." : "Lớp chưa có sinh viên."}</td></tr>`;

    const note = $id("dirtyNote");
    note.hidden = !pending.size;
    note.textContent = `${pending.size} thay đổi chưa lưu`;
  }

  // Nhập liệu: ghi nhận thay đổi chưa lưu, cập nhật xếp loại tại chỗ
  $id("body").addEventListener("input", (e) => {
    const input = e.target.closest("[data-field]");
    if (!input) return;
    const tr = input.closest("tr");
    const msv = tr.dataset.msv;
    const saved = loadScores();
    const v = { ...current(msv, saved) };
    if (input.dataset.field === "score") input.value = input.value.replace(/\D/g, "").slice(0, 3);
    v[input.dataset.field] = input.value;
    pending.set(msv, v);
    tr.classList.add("is-dirty");
    if (input.dataset.field === "score") {
      input.classList.toggle("is-bad", !validScore(input.value));
      const rank = classifyConduct(validScore(input.value) ? input.value : "");
      const pill = tr.querySelector(".pill");
      pill.className = `pill ${rank.cls}`;
      pill.textContent = rank.label;
    }
    const note = $id("dirtyNote");
    note.hidden = false;
    note.textContent = `${pending.size} thay đổi chưa lưu`;
  });

  $id("saveBtn").addEventListener("click", () => {
    if (!pending.size) return showToast("Không có thay đổi nào cần lưu.");
    const bad = [...pending.values()].filter((v) => !validScore(v.score));
    if (bad.length) return showToast("Điểm rèn luyện phải là số nguyên từ 0 đến 100.", "error");
    const scores = loadScores();
    const at = new Date().toISOString();
    pending.forEach((v, msv) => {
      const key = keyOf(msv);
      if (v.score === "") delete scores[key];
      else scores[key] = { score: Number(v.score), note: v.note.trim(), lop: lopEl.value, by: TEACHER.username, byName: TEACHER.name, at };
    });
    if (!writeJSON(STORE.conduct, scores)) return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error");
    showToast(`Đã lưu điểm rèn luyện cho ${pending.size} sinh viên.`, "success");
    pending.clear();
    render();
  });

  $id("resetBtn").addEventListener("click", () => {
    pending.clear();
    render();
  });

  // Đổi năm / lớp khi còn thay đổi chưa lưu -> hỏi trước
  let lastYear = yearEl.value;
  let lastLop = lopEl.value;
  function guardChange(e) {
    if (pending.size && !confirm("Bạn có thay đổi chưa lưu. Bỏ các thay đổi này?")) {
      yearEl.value = lastYear;
      lopEl.value = lastLop;
      return;
    }
    pending.clear();
    lastYear = yearEl.value;
    lastLop = lopEl.value;
    render();
  }
  yearEl.addEventListener("change", guardChange);
  lopEl.addEventListener("change", guardChange);
  searchEl.addEventListener("input", render);
  window.addEventListener("beforeunload", (e) => {
    if (pending.size) e.preventDefault();
  });

  render();
});
