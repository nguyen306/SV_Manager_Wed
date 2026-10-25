// Quản lý tài khoản: thêm / sửa / xóa / khóa sinh viên và cán bộ; phân quyền theo vai trò.
// Dữ liệu lưu trong kho tài khoản (ACCOUNTS_KEY, xem app.js), ghi đè lên dữ liệu Excel.
document.addEventListener("DOMContentLoaded", () => {
  if (!ADMIN) return;

  const PAGE_SIZE = 15;
  const excelIds = new Set((window.STUDENTS || []).map((s) => s.msv));
  const allClasses = () => [...new Set(getStudents().map((s) => s.lop))].sort();
  let stPage = 1;

  /* ---------- Tabs ---------- */
  const tabs = $id("tabs");
  function activate(name) {
    tabs.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === name));
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
    history.replaceState(null, "", `#${name}`);
  }
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) activate(b.dataset.tab);
  });

  /* =================== SINH VIÊN =================== */
  function studentStatus(s, store) {
    const locked = store.students.locked.includes(s.msv);
    const changed = s.addedByAdmin || Boolean(store.students.edited[s.msv]);
    return { locked, changed };
  }

  function renderStudents() {
    const store = loadAccounts();
    const all = getStudents();
    $id("cntStudents").textContent = all.length;
    const q = normalizeText($id("stSearch").value.trim());
    const lop = $id("stClass").value;
    const status = $id("stStatus").value;
    const list = all.filter((s) => {
      const st = studentStatus(s, store);
      return (
        (!q || normalizeText(`${s.msv} ${s.hoTen} ${s.email}`).includes(q)) &&
        (!lop || s.lop === lop) &&
        (!status || (status === "locked" && st.locked) || (status === "active" && !st.locked) || (status === "changed" && st.changed))
      );
    });
    const pg = paginate(list, stPage, PAGE_SIZE);
    stPage = pg.page;
    $id("stBody").innerHTML = pg.items.length
      ? pg.items
          .map((s) => {
            const st = studentStatus(s, store);
            return `<tr class="${st.locked ? "is-muted" : ""}">
              <td class="nowrap"><b>${esc(s.msv)}</b></td>
              <td>${esc(toTitleCase(s.hoTen))}</td>
              <td>${esc(s.lop)}</td>
              <td>${esc(s.email || "—")}</td>
              <td class="nowrap">${esc(s.sdt || "—")}</td>
              <td>${s.addedByAdmin ? '<span class="pill pill--info">Thêm mới</span>' : store.students.edited[s.msv] ? '<span class="pill pill--warn">Excel · đã sửa</span>' : '<span class="pill pill--muted">Excel</span>'}</td>
              <td>${st.locked ? '<span class="pill pill--bad"><i class="fa-solid fa-lock"></i>Bị khóa</span>' : '<span class="pill pill--ok">Hoạt động</span>'}</td>
              <td><div class="actions">
                <button type="button" class="icon-action" data-st-edit="${esc(s.msv)}" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="icon-action" data-st-lock="${esc(s.msv)}" title="${st.locked ? "Mở khóa" : "Khóa"}"><i class="fa-solid ${st.locked ? "fa-lock-open" : "fa-lock"}"></i></button>
                <button type="button" class="icon-action icon-action--bad" data-st-del="${esc(s.msv)}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
              </div></td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="8" class="empty-row">Không có sinh viên phù hợp.</td></tr>`;
    $id("stPager").innerHTML = pagerHtml(pg, PAGE_SIZE);
  }

  function studentForm(s) {
    const classes = allClasses();
    return `<div class="ui-form">
      <label class="ui-field"><span>Mã sinh viên *</span>
        <input class="ui-input" id="fMsv" inputmode="numeric" maxlength="12" value="${esc(s?.msv || "")}" ${s ? "readonly" : ""} />
        <small class="ui-error" data-for="fMsv"></small></label>
      <label class="ui-field"><span>Họ và tên *</span>
        <input class="ui-input" id="fName" maxlength="60" value="${esc(s ? s.hoTen : "")}" />
        <small class="ui-error" data-for="fName"></small></label>
      <label class="ui-field"><span>Lớp *</span>
        <input class="ui-input" id="fLop" list="classList" maxlength="60" value="${esc(s?.lop || "")}" placeholder="Chọn hoặc nhập lớp" />
        <datalist id="classList">${classes.map((c) => `<option value="${esc(c)}"></option>`).join("")}</datalist>
        <small class="ui-error" data-for="fLop"></small></label>
      <label class="ui-field"><span>Số điện thoại</span>
        <input class="ui-input" id="fPhone" inputmode="numeric" maxlength="10" value="${esc(s?.sdt || "")}" />
        <small class="ui-error" data-for="fPhone"></small></label>
      <label class="ui-field full"><span>Email</span>
        <input class="ui-input" id="fEmail" type="email" maxlength="80" value="${esc(s?.email || "")}" placeholder="VD: ten123456789@lms.utc.edu.vn" />
        <small class="ui-error" data-for="fEmail"></small></label>
      <label class="ui-field full"><span>${s ? "Đặt lại mật khẩu" : "Mật khẩu"}</span>
        <input class="ui-input" id="fPass" maxlength="40" placeholder="${s ? "Để trống để giữ nguyên" : `Để trống = mặc định (${DEMO_PASSWORD})`}" /></label>
    </div>`;
  }

  function openStudentModal(msv) {
    const s = msv ? getStudents().find((x) => x.msv === msv) : null;
    openModal({
      title: s ? "Sửa thông tin sinh viên" : "Thêm sinh viên mới",
      sub: s ? `${s.msv} · ${s.addedByAdmin ? "thêm bởi Admin" : "dữ liệu Excel"}` : "Sinh viên mới chưa có điểm, thời khóa biểu theo lớp đã chọn",
      icon: s ? "fa-user-pen" : "fa-user-plus",
      wide: true,
      body: studentForm(s),
      actions: [{ value: "cancel", label: "Hủy" }, { value: "save", label: "Lưu", kind: "primary", icon: "fa-floppy-disk" }],
      onAction: (value, dlg) => {
        if (value !== "save") return;
        const v = (id) => dlg.querySelector(`#${id}`).value.trim();
        const data = { msv: v("fMsv"), hoTen: v("fName").toUpperCase(), lop: v("fLop"), sdt: v("fPhone"), email: v("fEmail").toLowerCase() };
        const others = getStudents().filter((x) => x.msv !== data.msv);
        const ok = [
          fieldError(dlg, "fMsv", !/^\d{6,12}$/.test(data.msv) ? "Mã SV gồm 6–12 chữ số." : !s && getStudents().some((x) => x.msv === data.msv) ? "Mã SV đã tồn tại." : ""),
          fieldError(dlg, "fName", data.hoTen.length < 3 ? "Nhập họ và tên." : ""),
          fieldError(dlg, "fLop", data.lop.length < 2 ? "Nhập lớp." : ""),
          fieldError(dlg, "fPhone", data.sdt && !/^0\d{9}$/.test(data.sdt) ? "SĐT gồm 10 số, bắt đầu bằng 0." : ""),
          fieldError(dlg, "fEmail", data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? "Email không hợp lệ."
            : data.email && others.some((x) => String(x.email).toLowerCase() === data.email) ? "Email đã được dùng." : ""),
        ].every(Boolean);
        if (!ok) return false;

        const store = loadAccounts();
        const st = store.students;
        const fields = { hoTen: data.hoTen, lop: data.lop, sdt: data.sdt, email: data.email };
        st.deleted = st.deleted.filter((x) => x !== data.msv);
        if (excelIds.has(data.msv)) st.edited[data.msv] = fields;
        else {
          const i = st.added.findIndex((x) => x.msv === data.msv);
          if (i >= 0) st.added[i] = { ...st.added[i], ...fields };
          else st.added.push({ msv: data.msv, ...fields });
        }
        const pass = v("fPass");
        if (pass) st.passwords[data.msv] = pass;
        if (!saveAccounts(store)) return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error"), false;
        showToast(s ? `Đã cập nhật sinh viên ${data.msv}.` : `Đã thêm sinh viên ${data.msv}.`, "success");
        renderAll();
      },
    });
  }

  $id("addStudent").addEventListener("click", () => openStudentModal(null));
  $id("stBody").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-st-edit]");
    const lock = e.target.closest("[data-st-lock]");
    const del = e.target.closest("[data-st-del]");
    if (edit) return openStudentModal(edit.dataset.stEdit);
    if (lock) {
      const msv = lock.dataset.stLock;
      const store = loadAccounts();
      const locked = store.students.locked.includes(msv);
      store.students.locked = locked ? store.students.locked.filter((x) => x !== msv) : [...store.students.locked, msv];
      saveAccounts(store);
      showToast(locked ? `Đã mở khóa ${msv}.` : `Đã khóa ${msv}. Sinh viên không thể đăng nhập.`, locked ? "success" : "");
      return renderAll();
    }
    if (del) {
      const s = getStudents().find((x) => x.msv === del.dataset.stDel);
      openModal({
        title: "Xóa sinh viên?",
        sub: `${s.msv} · ${toTitleCase(s.hoTen)}`,
        icon: "fa-triangle-exclamation",
        warn: true,
        body: `<p>Sinh viên sẽ không còn trong danh sách và không thể đăng nhập.${
          s.addedByAdmin ? "" : " Dữ liệu gốc trong file Excel không bị thay đổi; có thể khôi phục bằng cách thêm lại đúng mã SV."
        }</p>`,
        actions: [{ value: "cancel", label: "Hủy" }, { value: "ok", label: "Xóa", kind: "danger", icon: "fa-trash" }],
        onAction: (value) => {
          if (value !== "ok") return;
          const store = loadAccounts();
          const st = store.students;
          if (s.addedByAdmin) st.added = st.added.filter((x) => x.msv !== s.msv);
          else if (!st.deleted.includes(s.msv)) st.deleted.push(s.msv);
          delete st.edited[s.msv];
          delete st.passwords[s.msv];
          st.locked = st.locked.filter((x) => x !== s.msv);
          saveAccounts(store);
          showToast(`Đã xóa sinh viên ${s.msv}.`);
          renderAll();
        },
      });
    }
  });
  $id("stPager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (b && !b.disabled) {
      stPage = Number(b.dataset.page);
      renderStudents();
    }
  });
  ["stSearch", "stClass", "stStatus"].forEach((id) =>
    $id(id).addEventListener(id === "stSearch" ? "input" : "change", () => {
      stPage = 1;
      renderStudents();
    })
  );

  /* =================== CÁN BỘ =================== */
  const activeAdmins = (staff) => staff.filter((s) => s.role === "admin" && s.active);

  function renderStaff() {
    const staff = loadAccounts().staff;
    $id("cntStaff").textContent = staff.length;
    const q = normalizeText($id("sfSearch").value.trim());
    const role = $id("sfRole").value;
    const list = staff.filter((s) => (!q || normalizeText(`${s.username} ${s.name}`).includes(q)) && (!role || s.role === role));
    $id("sfBody").innerHTML = list.length
      ? list
          .map((s) => {
            const self = s.username === ADMIN.id;
            return `<tr class="${s.active ? "" : "is-muted"}">
              <td class="nowrap"><b>${esc(s.username)}</b>${self ? "<small>(bạn)</small>" : ""}</td>
              <td>${esc(s.name)}</td>
              <td><span class="pill pill--${esc(s.role)}">${ROLES[s.role].label}</span></td>
              <td>${s.role === "teacher"
                ? `${(s.subjects || []).length} môn × ${(s.classes || []).length} lớp<small>${esc((s.subjects || []).join(", ") || "Chưa phân công")}</small>`
                : "—"}</td>
              <td>${s.active ? '<span class="pill pill--ok">Hoạt động</span>' : '<span class="pill pill--bad"><i class="fa-solid fa-lock"></i>Bị khóa</span>'}</td>
              <td><div class="actions">
                <button type="button" class="icon-action" data-sf-edit="${esc(s.username)}" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="icon-action" data-sf-lock="${esc(s.username)}" title="${s.active ? "Khóa" : "Mở khóa"}" ${self ? "disabled" : ""}><i class="fa-solid ${s.active ? "fa-lock" : "fa-lock-open"}"></i></button>
                <button type="button" class="icon-action icon-action--bad" data-sf-del="${esc(s.username)}" title="Xóa" ${self ? "disabled" : ""}><i class="fa-solid fa-trash"></i></button>
              </div></td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="6" class="empty-row">Không có tài khoản phù hợp.</td></tr>`;
  }

  function openStaffModal(username) {
    const s = username ? loadAccounts().staff.find((x) => x.username === username) : null;
    const self = s && s.username === ADMIN.id;
    const subjects = (window.SUBJECTS || []).map((x) => x.name);
    const classes = allClasses();
    const checks = (name, items, selected) =>
      items
        .map((it) => `<label class="ui-check"><input type="checkbox" name="${name}" value="${esc(it)}" ${selected.includes(it) ? "checked" : ""} /> ${esc(it)}</label>`)
        .join("");
    const dlg = openModal({
      title: s ? "Sửa tài khoản cán bộ" : "Thêm tài khoản cán bộ",
      sub: s ? s.username : "Giảng viên hoặc quản trị viên",
      icon: "fa-id-badge",
      wide: true,
      body: `<div class="ui-form">
          <label class="ui-field"><span>Tên đăng nhập *</span>
            <input class="ui-input" id="fUser" maxlength="30" value="${esc(s?.username || "")}" ${s ? "readonly" : ""} placeholder="VD: gv.nguyenvana" />
            <small class="ui-error" data-for="fUser"></small></label>
          <label class="ui-field"><span>Họ và tên *</span>
            <input class="ui-input" id="fName" maxlength="60" value="${esc(s?.name || "")}" />
            <small class="ui-error" data-for="fName"></small></label>
          <label class="ui-field"><span>Vai trò *</span>
            <select class="ui-select" id="fRole" ${self ? "disabled" : ""}>
              <option value="teacher" ${s?.role === "teacher" ? "selected" : ""}>Giảng viên</option>
              <option value="admin" ${s?.role === "admin" ? "selected" : ""}>Quản trị viên</option>
            </select>
            <small class="ui-error" data-for="fRole"></small></label>
          <label class="ui-field"><span>${s ? "Đặt lại mật khẩu" : "Mật khẩu *"}</span>
            <input class="ui-input" id="fPass" maxlength="40" placeholder="${s ? "Để trống để giữ nguyên" : "Tối thiểu 4 ký tự"}" />
            <small class="ui-error" data-for="fPass"></small></label>
          <div class="ui-field full" id="assignBox">
            <span>Môn giảng dạy</span><div class="check-grid">${checks("subj", subjects, s?.subjects || [])}</div>
            <span style="margin-top:8px">Lớp phụ trách</span><div class="check-grid">${checks("cls", classes, s?.classes || [])}</div>
            <small class="note" style="margin-top:6px"><i class="fa-solid fa-circle-info"></i> Lịch dạy = các buổi của môn đã chọn ở các lớp đã chọn, theo thời khóa biểu trong Excel.</small>
          </div>
        </div>`,
      actions: [{ value: "cancel", label: "Hủy" }, { value: "save", label: "Lưu", kind: "primary", icon: "fa-floppy-disk" }],
      onAction: (value, d) => {
        if (value !== "save") return;
        const v = (id) => d.querySelector(`#${id}`).value.trim();
        const store = loadAccounts();
        const data = { username: v("fUser").toLowerCase(), name: v("fName"), role: self ? s.role : v("fRole"), password: v("fPass") };
        const taken = !s && (store.staff.some((x) => x.username.toLowerCase() === data.username) || findStudent(data.username));
        const wasActiveAdmin = s && s.role === "admin" && s.active;
        const ok = [
          fieldError(d, "fUser", !/^[a-z][a-z0-9._-]{2,29}$/.test(data.username) ? "3–30 ký tự, bắt đầu bằng chữ cái (a-z, 0-9, . _ -)." : taken ? "Tên đăng nhập đã tồn tại." : ""),
          fieldError(d, "fName", data.name.length < 3 ? "Nhập họ và tên." : ""),
          fieldError(d, "fPass", !s && data.password.length < 4 ? "Mật khẩu tối thiểu 4 ký tự." : s && data.password && data.password.length < 4 ? "Mật khẩu tối thiểu 4 ký tự." : ""),
          fieldError(d, "fRole", wasActiveAdmin && data.role !== "admin" && activeAdmins(store.staff).length <= 1 ? "Phải còn ít nhất một quản trị viên." : ""),
        ].every(Boolean);
        if (!ok) return false;
        const checked = (name) => [...d.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
        const record = {
          username: data.username,
          name: data.name,
          role: data.role,
          active: s ? s.active : true,
          password: data.password || s.password,
          subjects: data.role === "teacher" ? checked("subj") : [],
          classes: data.role === "teacher" ? checked("cls") : [],
        };
        if (s) store.staff[store.staff.findIndex((x) => x.username === s.username)] = record;
        else store.staff.push(record);
        if (!saveAccounts(store)) return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error"), false;
        showToast(s ? `Đã cập nhật tài khoản ${record.username}.` : `Đã tạo tài khoản ${record.username}.`, "success");
        renderAll();
      },
    });
    // Ẩn phần phân công khi vai trò là quản trị viên
    const roleEl = dlg.querySelector("#fRole");
    const toggleAssign = () => (dlg.querySelector("#assignBox").hidden = roleEl.value !== "teacher");
    roleEl.addEventListener("change", toggleAssign);
    toggleAssign();
  }

  $id("addStaff").addEventListener("click", () => openStaffModal(null));
  $id("sfBody").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-sf-edit]");
    const lock = e.target.closest("[data-sf-lock]");
    const del = e.target.closest("[data-sf-del]");
    if (edit) return openStaffModal(edit.dataset.sfEdit);
    const store = loadAccounts();
    if (lock && !lock.disabled) {
      const s = store.staff.find((x) => x.username === lock.dataset.sfLock);
      if (s.active && s.role === "admin" && activeAdmins(store.staff).length <= 1) return showToast("Phải còn ít nhất một quản trị viên hoạt động.", "error");
      s.active = !s.active;
      saveAccounts(store);
      showToast(s.active ? `Đã mở khóa ${s.username}.` : `Đã khóa ${s.username}.`, s.active ? "success" : "");
      return renderAll();
    }
    if (del && !del.disabled) {
      const s = store.staff.find((x) => x.username === del.dataset.sfDel);
      if (s.role === "admin" && s.active && activeAdmins(store.staff).length <= 1) return showToast("Không thể xóa quản trị viên cuối cùng.", "error");
      openModal({
        title: "Xóa tài khoản cán bộ?",
        sub: `${s.username} · ${s.name}`,
        icon: "fa-triangle-exclamation",
        warn: true,
        body: "<p>Tài khoản sẽ bị xóa và không thể đăng nhập. Dữ liệu đã nhập (điểm, đăng ký phòng, trả lời phản hồi) vẫn được giữ.</p>",
        actions: [{ value: "cancel", label: "Hủy" }, { value: "ok", label: "Xóa", kind: "danger", icon: "fa-trash" }],
        onAction: (value) => {
          if (value !== "ok") return;
          const st = loadAccounts();
          st.staff = st.staff.filter((x) => x.username !== s.username);
          saveAccounts(st);
          showToast(`Đã xóa tài khoản ${s.username}.`);
          renderAll();
        },
      });
    }
  });
  $id("sfSearch").addEventListener("input", renderStaff);
  $id("sfRole").addEventListener("change", renderStaff);

  /* =================== PHÂN QUYỀN =================== */
  function renderRoles() {
    const store = loadAccounts();
    const counts = {
      student: getStudents().length,
      teacher: store.staff.filter((s) => s.role === "teacher").length,
      admin: store.staff.filter((s) => s.role === "admin").length,
    };
    const desc = {
      student: "Học tập, lịch học, KTX, thư viện, học phí, gửi phản hồi",
      teacher: "Lịch dạy, đăng ký phòng, nhập điểm, chấm rèn luyện, trả lời học vụ",
      admin: "Thống kê, quản lý tài khoản, xử lý phản hồi, quản lý tài chính",
    };
    $id("roleCards").innerHTML = Object.entries(ROLES)
      .map(([id, r]) => `<div class="role-card" style="--c:${r.color}"><span class="pill pill--${id}">${r.label}</span>
          <b style="display:block;margin-top:6px">${counts[id]}</b><p>${desc[id]}</p></div>`)
      .join("");
    $id("matrixBody").innerHTML = Object.entries(PAGES)
      .filter(([key]) => key !== "dang-nhap")
      .map(([, p]) => `<tr><td>${esc(p.label)}<small>${esc(p.path)}</small></td>${["student", "teacher", "admin"]
        .map((r) => (p.roles.includes(r) ? '<td class="yes"><i class="fa-solid fa-circle-check" aria-label="Được truy cập"></i></td>' : '<td class="no"><i class="fa-solid fa-minus" aria-label="Không"></i></td>'))
        .join("")}</tr>`)
      .join("");
  }

  function renderAll() {
    const lopEl = $id("stClass");
    const selected = lopEl.value;
    lopEl.innerHTML = `<option value="">Tất cả lớp</option>${allClasses().map((c) => `<option ${c === selected ? "selected" : ""}>${esc(c)}</option>`).join("")}`;
    renderStudents();
    renderStaff();
    renderRoles();
  }

  window.addEventListener("storage", (e) => { if (e.key === ACCOUNTS_KEY) renderAll(); });
  renderAll();
  activate(["students", "staff", "roles"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "students");
});
