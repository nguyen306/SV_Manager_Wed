// Phân hệ Phản hồi: sinh viên gửi góp ý, lưu trong localStorage và xem lại lịch sử của mình.
// Chưa có backend nên trạng thái chỉ do phía nhà trường cập nhật; phản hồi mới luôn ở "Đang tiếp nhận".
document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  if (!student) return; // app.js đã chuyển về trang đăng nhập

  const STORE_KEY = "feedback:items";
  const CATEGORIES = [
    { id: "co-so-vat-chat", label: "Cơ sở vật chất", icon: "fa-building-columns" },
    { id: "dao-tao", label: "Đào tạo", icon: "fa-graduation-cap" },
    { id: "hoc-phi", label: "Học phí", icon: "fa-wallet" },
    { id: "he-thong", label: "Hệ thống", icon: "fa-laptop-code" },
    { id: "khac", label: "Khác", icon: "fa-ellipsis" },
  ];
  const PRIORITIES = [
    { id: "thuong", label: "Thường", icon: "fa-circle-info" },
    { id: "quan-trong", label: "Quan trọng", icon: "fa-circle-exclamation" },
    { id: "khan-cap", label: "Khẩn cấp", icon: "fa-triangle-exclamation" },
  ];
  const STATUSES = [
    { id: "tiep-nhan", label: "Đang tiếp nhận", icon: "fa-inbox" },
    { id: "dang-xu-ly", label: "Đang xử lý", icon: "fa-spinner" },
    { id: "da-giai-quyet", label: "Đã giải quyết", icon: "fa-circle-check" },
  ];
  const byId = (list, id) => list.find((x) => x.id === id) || list[list.length - 1];

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const fmtTime = (iso) => {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const toast = $("toast");
  let toastTimer;
  function showToast(message, type = "") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  /* ---------- Lưu trữ ---------- */
  // Mọi phản hồi trên trình duyệt này lưu chung một danh sách; mỗi SV chỉ thấy phản hồi của mình.
  function loadAll() {
    try {
      const list = JSON.parse(storageGet(STORE_KEY));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  const myItems = () =>
    loadAll()
      .filter((x) => x.msv === student.msv)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  /* ---------- Thông tin sinh viên ---------- */
  $("stAvatar").src = getAvatar(student.msv) || initialsAvatar(student.hoTen);
  $("stName").textContent = toTitleCase(student.hoTen);
  $("stMsv").textContent = student.msv;
  $("stClass").textContent = student.lop;

  /* ---------- Form ---------- */
  const form = $("fbForm");
  const fields = { category: $("category"), title: $("title"), content: $("content") };

  CATEGORIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.label;
    fields.category.appendChild(opt);
  });
  $("priorityGroup").innerHTML = PRIORITIES.map(
    (p, i) => `<label class="priority__opt priority__opt--${p.id}">
      <input type="radio" name="priority" value="${p.id}" ${i === 0 ? "checked" : ""} />
      <span><i class="fa-solid ${p.icon}"></i> ${p.label}</span></label>`
  ).join("");

  // Câu hỏi "Đào tạo" có thể chọn môn học -> chuyển tới giảng viên dạy môn đó (trang Học vụ)
  const subjectField = $("subjectField");
  const subjectEl = $("subject");
  (window.SUBJECTS || []).forEach((sub) => {
    const opt = document.createElement("option");
    opt.value = sub.name;
    opt.textContent = `${sub.name} (Năm ${sub.year})`;
    subjectEl.appendChild(opt);
  });
  const toggleSubject = () => {
    subjectField.hidden = fields.category.value !== "dao-tao";
    if (subjectField.hidden) subjectEl.value = "";
  };
  fields.category.addEventListener("change", toggleSubject);

  const rules = {
    category: (v) => (v ? "" : "Vui lòng chọn loại phản hồi."),
    title: (v) =>
      !v.trim() ? "Vui lòng nhập tiêu đề." : v.trim().length < 5 ? "Tiêu đề cần ít nhất 5 ký tự." : "",
    content: (v) =>
      !v.trim() ? "Vui lòng nhập nội dung." : v.trim().length < 20 ? "Nội dung cần ít nhất 20 ký tự để nhà trường nắm rõ vấn đề." : "",
  };
  function validate(key) {
    const message = rules[key](fields[key].value);
    fields[key].closest(".field").classList.toggle("invalid", Boolean(message));
    fields[key].setAttribute("aria-invalid", Boolean(message));
    $(`${key}Error`).textContent = message;
    return !message;
  }
  Object.keys(fields).forEach((key) => {
    fields[key].addEventListener("blur", () => validate(key));
    fields[key].addEventListener("input", () => {
      if (fields[key].closest(".field").classList.contains("invalid")) validate(key);
    });
  });

  const counter = $("counter");
  const updateCounter = () => {
    const n = fields.content.value.length;
    counter.textContent = `${n}/2000`;
    counter.classList.toggle("near", n > 1800);
  };
  fields.content.addEventListener("input", updateCounter);

  form.addEventListener("reset", () => {
    setTimeout(() => {
      Object.keys(fields).forEach((key) => {
        fields[key].closest(".field").classList.remove("invalid");
        $(`${key}Error`).textContent = "";
      });
      updateCounter();
      toggleSubject();
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = Object.keys(fields).map(validate).every(Boolean);
    if (!ok) {
      form.querySelector(".invalid select, .invalid input, .invalid textarea")?.focus();
      return showToast("Vui lòng kiểm tra lại các ô được đánh dấu đỏ.", "error");
    }

    const now = new Date();
    const item = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      code: `PH${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(now.getTime()).slice(-4)}`,
      msv: student.msv,
      hoTen: student.hoTen,
      lop: student.lop,
      category: fields.category.value,
      subject: fields.category.value === "dao-tao" ? subjectEl.value : "",
      title: fields.title.value.trim(),
      content: fields.content.value.trim(),
      priority: form.querySelector('input[name="priority"]:checked').value,
      status: "tiep-nhan",
      createdAt: now.toISOString(),
    };
    const all = loadAll();
    all.push(item);
    if (!storageSet(STORE_KEY, JSON.stringify(all))) {
      return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error");
    }

    form.reset();
    activeFilter = "all";
    render(item.id);
    showToast(`Đã gửi phản hồi ${item.code}. Nhà trường sẽ tiếp nhận sớm nhất.`, "success");
  });

  /* ---------- Lịch sử ---------- */
  let activeFilter = "all";
  const filterEl = $("statusFilter");

  function render(newId = null) {
    const items = myItems();
    const countOf = (id) => items.filter((x) => x.status === id).length;

    $("statChips").innerHTML = `
      <span class="chip"><b>${items.length}</b> đã gửi</span>
      ${STATUSES.map((s) => `<span class="chip chip--${s.id}"><b>${countOf(s.id)}</b> ${s.label.toLowerCase()}</span>`).join("")}`;
    $("historyCount").textContent = items.length;

    filterEl.innerHTML = [{ id: "all", label: "Tất cả" }, ...STATUSES]
      .map(
        (s) => `<button type="button" role="radio" data-filter="${s.id}" aria-checked="${s.id === activeFilter}">
          ${s.label} <span>${s.id === "all" ? items.length : countOf(s.id)}</span></button>`
      )
      .join("");

    const shown = activeFilter === "all" ? items : items.filter((x) => x.status === activeFilter);
    $("historyList").innerHTML = shown.length
      ? shown
          .map((x) => {
            const cat = byId(CATEGORIES, x.category);
            const pri = byId(PRIORITIES, x.priority);
            const st = byId(STATUSES, x.status);
            // Chỉ hiện trả lời công khai của giảng viên / admin (không hiện ghi chú nội bộ)
            const replies = (x.thread || []).filter((t) => t.kind === "reply" && !t.internal);
            return `
            <li class="item${x.id === newId ? " is-new" : ""}">
              <details>
                <summary>
                  <span class="item__icon"><i class="fa-solid ${cat.icon}"></i></span>
                  <span class="item__main">
                    <span class="item__title">${esc(x.title)}</span>
                    <span class="item__meta">
                      <span>${esc(x.code)}</span>·<span>${cat.label}${x.subject ? ` – ${esc(x.subject)}` : ""}</span>·<span><i class="fa-regular fa-clock"></i> ${fmtTime(x.createdAt)}</span>
                    </span>
                  </span>
                  <span class="item__badges">
                    <span class="badge-status badge-status--${st.id}"><i class="fa-solid ${st.icon}"></i> ${st.label}</span>
                    ${pri.id !== "thuong" ? `<span class="badge-pri badge-pri--${pri.id}">${pri.label}</span>` : ""}
                    ${replies.length ? `<span class="badge-reply"><i class="fa-solid fa-reply"></i> ${replies.length} trả lời</span>` : ""}
                  </span>
                </summary>
                <div class="item__body">
                  <p>${esc(x.content).replace(/\n/g, "<br />")}</p>
                  ${replies.length ? `<ul class="replies">${replies
                    .map((r) => `<li class="reply reply--${esc(r.role)}">
                        <div class="reply__who"><i class="fa-solid ${r.role === "admin" ? "fa-user-shield" : "fa-chalkboard-user"}"></i>
                          <b>${esc(r.byName)}</b><span>${r.role === "admin" ? "Phòng quản trị" : "Giảng viên"}</span><time>${fmtTime(r.at)}</time></div>
                        <p>${esc(r.text).replace(/\n/g, "<br />")}</p></li>`)
                    .join("")}</ul>` : ""}
                  <ol class="steps">
                    ${STATUSES.map((s, i) => {
                      const reached = i <= STATUSES.findIndex((z) => z.id === x.status);
                      return `<li class="${reached ? "done" : ""}"><i class="fa-solid ${s.icon}"></i> ${s.label}</li>`;
                    }).join("")}
                  </ol>
                </div>
              </details>
            </li>`;
          })
          .join("")
      : `<li class="empty"><i class="fa-regular fa-comments"></i>
           ${items.length ? "Không có phản hồi nào ở trạng thái này." : "Bạn chưa gửi phản hồi nào. Hãy chia sẻ ý kiến ở mục \"Gửi ý kiến mới\"."}</li>`;
  }

  filterEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    render();
  });

  // Gửi phản hồi ở tab khác -> cập nhật ngay
  window.addEventListener("storage", (e) => {
    if (e.key === STORE_KEY) render();
  });

  render();
});
