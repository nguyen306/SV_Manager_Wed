// Nhập điểm giữa kỳ / cuối kỳ cho sinh viên các lớp học phần giảng viên phụ trách.
// Lưu tại STORE.grades với khóa "<môn>|<msv>"; sinh viên xem trong Chi tiết học phần (trang Học tập).
const GRADE_WEIGHTS = { mid: 0.3, final: 0.7 }; // Tỉ trọng mẫu: 30% giữa kỳ + 70% cuối kỳ

// Điểm chữ theo thang hệ 10 (giống trang Học tập)
function letterOf10(ten) {
  if (ten >= 8.5) return "A";
  if (ten >= 8.0) return "B+";
  if (ten >= 7.0) return "B";
  if (ten >= 6.5) return "C+";
  if (ten >= 5.5) return "C";
  if (ten >= 5.0) return "D+";
  if (ten >= 4.0) return "D";
  return "F";
}
// Tổng kết hệ 10 (làm tròn 1 chữ số); null nếu chưa đủ 2 điểm thành phần
function totalOf(mid, final) {
  if (mid === "" || final === "" || mid == null || final == null) return null;
  return Math.round((Number(mid) * GRADE_WEIGHTS.mid + Number(final) * GRADE_WEIGHTS.final) * 10) / 10;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!TEACHER) return;

  const sections = teacherSections();
  const pending = new Map(); // msv -> {mid, final}
  let active = sections.find((s) => s.year === currentStudyYear()) || sections[0];

  $id("weightNote").textContent =
    `Tổng kết = ${GRADE_WEIGHTS.mid * 100}% giữa kỳ + ${GRADE_WEIGHTS.final * 100}% cuối kỳ · Điểm thang 10, nhập 0–10 (cho phép 1 chữ số thập phân)`;
  $id("sectionCount").textContent = sections.length;

  const loadGrades = () => readJSON(STORE.grades, {}) || {};
  const keyOf = (msv) => `${active.subject}|${msv}`;
  const validMark = (v) => v === "" || (/^\d{1,2}(\.\d)?$/.test(v) && Number(v) <= 10);

  function current(msv, saved) {
    if (pending.has(msv)) return pending.get(msv);
    const g = saved[keyOf(msv)];
    return { mid: g && g.mid != null ? String(g.mid) : "", final: g && g.final != null ? String(g.final) : "" };
  }

  function renderSections() {
    const saved = loadGrades();
    $id("sectionList").innerHTML = sections.length
      ? sections
          .map((s) => {
            const students = studentsOfClass(s.lop);
            const done = students.filter((x) => {
              const g = saved[`${s.subject}|${x.msv}`];
              return g && g.mid != null && g.final != null;
            }).length;
            return `<button type="button" role="option" class="section-item" data-id="${esc(s.id)}" aria-selected="${active && s.id === active.id}">
                <b>${esc(s.subject)}</b>
                <span>${esc(s.lop)} · Năm ${s.year}</span>
                <span class="section-item__meta"><span>${students.length} SV</span><span class="${done === students.length && students.length ? "ok" : ""}">Đã nhập ${done}/${students.length}</span></span>
              </button>`;
          })
          .join("")
      : `<p class="empty"><i class="fa-regular fa-folder-open"></i>Chưa được phân công lớp học phần.</p>`;
  }

  function renderTable() {
    if (!active) {
      $id("sectionTitle").textContent = "Chưa có lớp học phần";
      $id("body").innerHTML = `<tr><td colspan="9" class="empty-row">Liên hệ quản trị viên để được phân công giảng dạy.</td></tr>`;
      return;
    }
    const saved = loadGrades();
    const all = studentsOfClass(active.lop);
    const q = normalizeText($id("search").value.trim());
    const list = all.filter((s) => !q || normalizeText(`${s.msv} ${s.hoTen}`).includes(q));

    $id("sectionTitle").textContent = `${active.subject} – ${active.lop}`;
    $id("sectionMeta").textContent =
      `Năm ${active.year} (${schoolYearLabel(active.year)}) · ${subjectCredits(active.subject) ?? "?"} TC · ${active.sessions.map((x) => `${x.day} ${x.key}`).join(", ")}`;

    const totals = all.map((s) => {
      const v = current(s.msv, saved);
      return validMark(v.mid) && validMark(v.final) ? totalOf(v.mid, v.final) : null;
    }).filter((t) => t != null);
    const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
    $id("stats").innerHTML = `
      <div class="stat stat--info"><span class="stat__icon"><i class="fa-solid fa-users"></i></span><div><b>${all.length}</b><span>Sinh viên</span></div></div>
      <div class="stat stat--ok"><span class="stat__icon"><i class="fa-solid fa-check-double"></i></span><div><b>${totals.length}/${all.length}</b><span>Đã đủ điểm</span></div></div>
      <div class="stat"><span class="stat__icon"><i class="fa-solid fa-chart-simple"></i></span><div><b>${avg == null ? "—" : avg.toFixed(2)}</b><span>Điểm TB lớp (hệ 10)</span></div></div>
      <div class="stat stat--bad"><span class="stat__icon"><i class="fa-solid fa-user-xmark"></i></span><div><b>${totals.filter((t) => t < 4).length}</b><span>Dưới 4.0 (không đạt)</span></div></div>`;

    $id("body").innerHTML = list.length
      ? list
          .map((s, i) => {
            const v = current(s.msv, saved);
            const excel = s.diem ? s.diem[active.subject] : undefined;
            return `<tr data-msv="${s.msv}" class="${pending.has(s.msv) ? "is-dirty" : ""}">
              <td>${i + 1}</td>
              <td class="nowrap">${s.msv}</td>
              <td><b>${esc(toTitleCase(s.hoTen))}</b></td>
              <td class="center"><input class="ui-input ui-input--sm mark-input ${validMark(v.mid) ? "" : "is-bad"}" data-field="mid" inputmode="decimal" maxlength="4" value="${esc(v.mid)}" aria-label="Điểm giữa kỳ ${esc(s.hoTen)}" /></td>
              <td class="center"><input class="ui-input ui-input--sm mark-input ${validMark(v.final) ? "" : "is-bad"}" data-field="final" inputmode="decimal" maxlength="4" value="${esc(v.final)}" aria-label="Điểm cuối kỳ ${esc(s.hoTen)}" /></td>
              ${resultCells(v)}
              <td class="center">${excel != null ? `<span class="excel-mark">${excel}</span>` : "—"}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="9" class="empty-row">${all.length ? "Không tìm thấy sinh viên." : "Lớp chưa có sinh viên."}</td></tr>`;
    updateDirty();
  }

  // 3 ô kết quả: tổng kết hệ 10, hệ 4, điểm chữ
  function resultCells(v) {
    const ok = validMark(v.mid) && validMark(v.final);
    const t = ok ? totalOf(v.mid, v.final) : null;
    if (t == null) return `<td class="center result">—</td><td class="center result">—</td><td class="center result">—</td>`;
    const fail = t < 4;
    return `<td class="center result"><b class="${fail ? "mark-fail" : "mark-ok"}">${t.toFixed(1)}</b></td>
      <td class="center result">${(t / 2.5).toFixed(1)}</td>
      <td class="center result"><b>${letterOf10(t)}</b></td>`;
  }

  function updateDirty() {
    const note = $id("dirtyNote");
    note.hidden = !pending.size;
    note.textContent = `${pending.size} thay đổi chưa lưu`;
  }

  $id("body").addEventListener("input", (e) => {
    const input = e.target.closest("[data-field]");
    if (!input) return;
    input.value = input.value.replace(",", ".").replace(/[^\d.]/g, "");
    const tr = input.closest("tr");
    const msv = tr.dataset.msv;
    const v = { ...current(msv, loadGrades()), [input.dataset.field]: input.value };
    pending.set(msv, v);
    tr.classList.add("is-dirty");
    input.classList.toggle("is-bad", !validMark(input.value));
    tr.querySelectorAll(".result").forEach((td) => td.remove());
    tr.lastElementChild.insertAdjacentHTML("beforebegin", resultCells(v));
    updateDirty();
  });

  $id("saveBtn").addEventListener("click", () => {
    if (!active || !pending.size) return showToast("Không có thay đổi nào cần lưu.");
    if ([...pending.values()].some((v) => !validMark(v.mid) || !validMark(v.final))) {
      return showToast("Điểm phải từ 0 đến 10, tối đa 1 chữ số thập phân.", "error");
    }
    const grades = loadGrades();
    const at = new Date().toISOString();
    pending.forEach((v, msv) => {
      const key = keyOf(msv);
      if (v.mid === "" && v.final === "") delete grades[key];
      else grades[key] = {
        mid: v.mid === "" ? null : Number(v.mid),
        final: v.final === "" ? null : Number(v.final),
        total: totalOf(v.mid, v.final),
        lop: active.lop, by: TEACHER.username, byName: TEACHER.name, at,
      };
    });
    if (!writeJSON(STORE.grades, grades)) return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error");
    showToast(`Đã lưu điểm ${active.subject} cho ${pending.size} sinh viên.`, "success");
    pending.clear();
    renderSections();
    renderTable();
  });

  $id("resetBtn").addEventListener("click", () => {
    pending.clear();
    renderTable();
  });

  $id("sectionList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id]");
    if (!btn || btn.dataset.id === active?.id) return;
    if (pending.size && !confirm("Bạn có thay đổi chưa lưu. Bỏ các thay đổi này?")) return;
    pending.clear();
    active = sections.find((s) => s.id === btn.dataset.id);
    $id("search").value = "";
    renderSections();
    renderTable();
  });
  $id("search").addEventListener("input", renderTable);
  window.addEventListener("beforeunload", (e) => { if (pending.size) e.preventDefault(); });

  renderSections();
  renderTable();
});
