/* ========== HỘP THƯ PHẢN HỒI (dùng chung: Học vụ của Giảng viên + Quản trị phản hồi của Admin) ==========
   Mỗi phản hồi có mảng thread: [{ kind:"reply"|"status", text, internal, from, to, by, byName, role, at }]
   - reply  (internal=false): trả lời hiển thị cho sinh viên trên trang Phản hồi
   - reply  (internal=true) : ghi chú nội bộ, sinh viên không thấy
   - status : lịch sử đổi trạng thái                                                                  */

function feedbackBadges(x) {
  const st = metaOf(FEEDBACK_META.statuses, x.status);
  const pr = metaOf(FEEDBACK_META.priorities, x.priority);
  return `<span class="pill st--${st.id}"><i class="fa-solid ${st.icon}"></i>${st.label}</span>${
    pr.id !== "thuong" ? `<span class="pill pr--${pr.id}">${pr.label}</span>` : ""
  }`;
}

function feedbackThreadHtml(x, { showInternal }) {
  const items = (x.thread || []).filter((t) => showInternal || !t.internal);
  if (!items.length) return `<p class="thread__empty">Chưa có trao đổi nào.</p>`;
  return `<ol class="thread">${items
    .map((t) =>
      t.kind === "status"
        ? `<li class="thread__status"><i class="fa-solid fa-arrow-right-arrow-left"></i>
             ${esc(t.byName)} đổi trạng thái: <b>${metaOf(FEEDBACK_META.statuses, t.from).label}</b> → <b>${metaOf(FEEDBACK_META.statuses, t.to).label}</b>
             <time>${fmtDateTime(t.at)}</time></li>`
        : `<li class="thread__msg ${t.internal ? "is-internal" : ""} role-${esc(t.role)}">
             <div class="thread__who"><b>${esc(t.byName)}</b><span class="pill pill--${esc(t.role)}">${ROLES[t.role] ? ROLES[t.role].label : ""}</span>
               ${t.internal ? '<span class="pill pill--muted"><i class="fa-solid fa-lock"></i>Ghi chú nội bộ</span>' : ""}<time>${fmtDateTime(t.at)}</time></div>
             <p>${esc(t.text).replace(/\n/g, "<br />")}</p></li>`
    )
    .join("")}</ol>`;
}

/* Khởi tạo hộp thư.
   cfg = { scope(item) -> bool, listEl, detailEl, statsEl, filters: { search, status, category, subject, priority },
           allowInternal, emptyText } */
function createFeedbackInbox(cfg) {
  const user = CURRENT_USER;
  let activeId = null;

  const f = cfg.filters;
  if (f.status) FEEDBACK_META.statuses.forEach((s) => f.status.insertAdjacentHTML("beforeend", `<option value="${s.id}">${s.label}</option>`));
  if (f.category) FEEDBACK_META.categories.forEach((c) => f.category.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.label}</option>`));
  if (f.priority) FEEDBACK_META.priorities.forEach((p) => f.priority.insertAdjacentHTML("beforeend", `<option value="${p.id}">${p.label}</option>`));

  const inScope = () => loadFeedback().filter(cfg.scope).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function filtered(items) {
    const q = normalizeText(f.search ? f.search.value.trim() : "");
    return items.filter(
      (x) =>
        (!q || normalizeText(`${x.title} ${x.hoTen} ${x.msv} ${x.code} ${x.subject || ""}`).includes(q)) &&
        (!f.status || !f.status.value || x.status === f.status.value) &&
        (!f.category || !f.category.value || x.category === f.category.value) &&
        (!f.priority || !f.priority.value || x.priority === f.priority.value) &&
        (!f.subject || !f.subject.value || x.subject === f.subject.value)
    );
  }

  function renderStats(items) {
    if (!cfg.statsEl) return;
    const count = (id) => items.filter((x) => x.status === id).length;
    const urgent = items.filter((x) => x.priority === "khan-cap" && x.status !== "da-giai-quyet").length;
    cfg.statsEl.innerHTML = `
      <div class="stat"><span class="stat__icon"><i class="fa-solid fa-envelope-open-text"></i></span><div><b>${items.length}</b><span>Tổng phản hồi</span></div></div>
      <div class="stat stat--info"><span class="stat__icon"><i class="fa-solid fa-inbox"></i></span><div><b>${count("tiep-nhan")}</b><span>Đang tiếp nhận</span></div></div>
      <div class="stat stat--warn"><span class="stat__icon"><i class="fa-solid fa-spinner"></i></span><div><b>${count("dang-xu-ly")}</b><span>Đang xử lý</span></div></div>
      <div class="stat stat--ok"><span class="stat__icon"><i class="fa-solid fa-circle-check"></i></span><div><b>${count("da-giai-quyet")}</b><span>Đã giải quyết</span></div></div>
      <div class="stat stat--bad"><span class="stat__icon"><i class="fa-solid fa-triangle-exclamation"></i></span><div><b>${urgent}</b><span>Khẩn cấp chưa xong</span></div></div>`;
  }

  function renderList() {
    const all = inScope();
    renderStats(all);
    const list = filtered(all);
    if (activeId && !list.some((x) => x.id === activeId)) activeId = null;
    if (!activeId && list.length) activeId = list[0].id;

    cfg.listEl.innerHTML = list.length
      ? list
          .map((x) => {
            const cat = metaOf(FEEDBACK_META.categories, x.category);
            const replies = (x.thread || []).filter((t) => t.kind === "reply").length;
            return `<li><button type="button" class="inbox-item ${x.id === activeId ? "is-active" : ""} ${x.status === "tiep-nhan" ? "is-new" : ""}" data-id="${esc(x.id)}">
              <span class="inbox-item__icon"><i class="fa-solid ${cat.icon}"></i></span>
              <span class="inbox-item__main">
                <b>${esc(x.title)}</b>
                <span>${esc(toTitleCase(x.hoTen))} · ${esc(x.lop || "")}</span>
                <span class="inbox-item__meta">${cat.label}${x.subject ? ` · ${esc(x.subject)}` : ""} · ${fmtDateTime(x.createdAt)}${replies ? ` · <i class="fa-regular fa-comment"></i> ${replies}` : ""}</span>
              </span>
              <span class="inbox-item__badges">${feedbackBadges(x)}</span>
            </button></li>`;
          })
          .join("")
      : `<li class="empty"><i class="fa-regular fa-envelope-open"></i>${all.length ? "Không có phản hồi phù hợp bộ lọc." : cfg.emptyText}</li>`;
    renderDetail();
  }

  function renderDetail() {
    const x = activeId && loadFeedback().find((i) => i.id === activeId);
    if (!x) {
      cfg.detailEl.innerHTML = `<div class="empty"><i class="fa-regular fa-hand-pointer"></i>Chọn một phản hồi để xem chi tiết.</div>`;
      return;
    }
    const cat = metaOf(FEEDBACK_META.categories, x.category);
    cfg.detailEl.innerHTML = `
      <div class="box__head"><h2><i class="fa-solid ${cat.icon}"></i> ${esc(x.code)}</h2><span class="detail-badges">${feedbackBadges(x)}</span></div>
      <div class="detail-body">
        <h3 class="detail-title">${esc(x.title)}</h3>
        <dl class="kv">
          <dt>Sinh viên</dt><dd>${esc(toTitleCase(x.hoTen))} · ${esc(x.msv)}</dd>
          <dt>Lớp</dt><dd>${esc(x.lop || "—")}</dd>
          <dt>Loại / Môn</dt><dd>${cat.label}${x.subject ? ` · ${esc(x.subject)}` : ""}</dd>
          <dt>Thời gian gửi</dt><dd>${fmtDateTime(x.createdAt)}</dd>
        </dl>
        <div class="detail-content">${esc(x.content).replace(/\n/g, "<br />")}</div>
        <h4 class="detail-sub"><i class="fa-regular fa-comments"></i> Trao đổi</h4>
        ${feedbackThreadHtml(x, { showInternal: true })}
        <form class="reply-form" id="replyForm" novalidate>
          <label class="ui-field"><span>Trả lời sinh viên</span>
            <textarea class="ui-textarea" id="replyText" maxlength="1500" placeholder="Nhập nội dung giải đáp..."></textarea></label>
          <div class="reply-form__row">
            <label class="ui-field"><span>Trạng thái</span>
              <select class="ui-select" id="replyStatus">${FEEDBACK_META.statuses
                .map((s) => `<option value="${s.id}" ${s.id === x.status ? "selected" : ""}>${s.label}</option>`)
                .join("")}</select></label>
            ${cfg.allowInternal ? `<label class="ui-check"><input type="checkbox" id="replyInternal" /> Ghi chú nội bộ (sinh viên không thấy)</label>` : ""}
            <button type="submit" class="btn btn--primary"><i class="fa-solid fa-paper-plane"></i> Gửi</button>
          </div>
        </form>
      </div>`;

    cfg.detailEl.querySelector("#replyForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const text = cfg.detailEl.querySelector("#replyText").value.trim();
      const status = cfg.detailEl.querySelector("#replyStatus").value;
      const internal = Boolean(cfg.detailEl.querySelector("#replyInternal")?.checked);
      if (!text && status === x.status) return showToast("Nhập nội dung trả lời hoặc đổi trạng thái.", "error");
      const at = new Date().toISOString();
      const by = { by: user.id, byName: user.name, role: user.role, at };
      const saved = updateFeedback(x.id, (item) => {
        item.thread = item.thread || [];
        if (text) item.thread.push({ kind: "reply", text, internal, ...by });
        if (status !== item.status) {
          item.thread.push({ kind: "status", from: item.status, to: status, ...by });
          item.status = status;
        }
        // Có trả lời công khai mà phản hồi còn "Đang tiếp nhận" -> chuyển sang "Đang xử lý"
        if (text && !internal && item.status === "tiep-nhan" && status === "tiep-nhan") {
          item.thread.push({ kind: "status", from: "tiep-nhan", to: "dang-xu-ly", ...by });
          item.status = "dang-xu-ly";
        }
      });
      if (!saved) return showToast("Không lưu được. Vui lòng thử lại.", "error");
      showToast(text ? (internal ? "Đã lưu ghi chú nội bộ." : "Đã gửi trả lời cho sinh viên.") : "Đã cập nhật trạng thái.", "success");
      renderList();
    });
  }

  cfg.listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id]");
    if (!btn) return;
    activeId = btn.dataset.id;
    renderList();
    cfg.detailEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  Object.values(f).filter(Boolean).forEach((el) => el.addEventListener(el.tagName === "INPUT" ? "input" : "change", renderList));
  // SV gửi phản hồi mới ở tab khác -> cập nhật ngay
  window.addEventListener("storage", (e) => { if (e.key === STORE.feedback) renderList(); });

  renderList();
  return { refresh: renderList };
}
