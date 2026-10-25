/* ========== TIỆN ÍCH GIAO DIỆN DÙNG CHUNG (nạp sau app.js) ==========
   Dùng cho các trang Giảng viên, Quản trị và trang Phản hồi của sinh viên. */

// Khóa localStorage dùng chung giữa các phân hệ (SV ↔ Giảng viên ↔ Admin)
const STORE = {
  feedback: "feedback:items",    // phản hồi của SV (+ trả lời của GV/Admin)
  conduct: "conduct:scores",     // điểm rèn luyện:   { "<năm>|<msv>": {score, note, by, at} }
  grades: "course:grades",       // điểm học phần:    { "<môn>|<msv>": {mid, final, by, at} }
  bookings: "room:bookings",     // đăng ký phòng & ca dạy của giảng viên
  payments: "tuition:payments",  // thanh toán học phí (online của SV + nộp bổ sung do Admin ghi nhận)
  loans: "library:loans",        // mượn sách: SV gửi yêu cầu (pending) -> Admin duyệt (borrowing) / từ chối (rejected)
};

// Phân loại / mức độ / trạng thái phản hồi
const FEEDBACK_META = {
  categories: [
    { id: "co-so-vat-chat", label: "Cơ sở vật chất", icon: "fa-building-columns" },
    { id: "dao-tao", label: "Đào tạo", icon: "fa-graduation-cap" },
    { id: "hoc-phi", label: "Học phí", icon: "fa-wallet" },
    { id: "he-thong", label: "Hệ thống", icon: "fa-laptop-code" },
    { id: "khac", label: "Khác", icon: "fa-ellipsis" },
  ],
  priorities: [
    { id: "thuong", label: "Thường", icon: "fa-circle-info" },
    { id: "quan-trong", label: "Quan trọng", icon: "fa-circle-exclamation" },
    { id: "khan-cap", label: "Khẩn cấp", icon: "fa-triangle-exclamation" },
  ],
  statuses: [
    { id: "tiep-nhan", label: "Đang tiếp nhận", icon: "fa-inbox" },
    { id: "dang-xu-ly", label: "Đang xử lý", icon: "fa-spinner" },
    { id: "da-giai-quyet", label: "Đã giải quyết", icon: "fa-circle-check" },
  ],
};
const metaOf = (list, id) => list.find((x) => x.id === id) || list[list.length - 1];

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $id = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2, "0");
const normalizeText = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const fmtDate = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDayKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ---------- Toast ---------- */
let toastTimer;
function showToast(message, type = "") {
  let el = $id("uiToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "uiToast";
    el.className = "ui-toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `ui-toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

/* ---------- Popup ----------
   openModal({ title, sub, icon, body, actions:[{value,label,kind,icon}], warn, onAction(value, dialog) })
   onAction trả về false để giữ popup mở (VD: dữ liệu nhập chưa hợp lệ). */
function openModal({ title, sub = "", icon = "fa-circle-info", body = "", actions = [], warn = false, wide = false, onAction }) {
  let dlg = $id("uiModal");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "uiModal";
    dlg.className = "ui-modal";
    dlg.innerHTML = `<form method="dialog" novalidate>
        <div class="ui-modal__head"><div class="ui-modal__icon"><i></i></div>
          <div><h3></h3><p></p></div>
          <button type="button" class="ui-modal__close" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="ui-modal__body"></div>
        <div class="ui-modal__actions"></div>
      </form>`;
    document.body.appendChild(dlg);
    dlg.querySelector(".ui-modal__close").addEventListener("click", () => dlg.close("cancel"));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close("cancel"); });
  }
  dlg.classList.toggle("ui-modal--warn", warn);
  dlg.classList.toggle("ui-modal--wide", wide);
  dlg.querySelector(".ui-modal__icon i").className = `fa-solid ${icon}`;
  dlg.querySelector("h3").textContent = title;
  dlg.querySelector(".ui-modal__head p").textContent = sub;
  dlg.querySelector(".ui-modal__body").innerHTML = body;
  const actionsEl = dlg.querySelector(".ui-modal__actions");
  actionsEl.innerHTML = actions
    .map(
      (a) => `<button type="button" class="btn btn--${a.kind || "ghost"}" data-value="${esc(a.value)}">
        ${a.icon ? `<i class="fa-solid ${a.icon}"></i> ` : ""}${esc(a.label)}</button>`
    )
    .join("");
  actionsEl.onclick = (e) => {
    const btn = e.target.closest("[data-value]");
    if (!btn) return;
    const value = btn.dataset.value;
    if (value === "cancel") return dlg.close("cancel");
    if (onAction && onAction(value, dlg) === false) return;
    dlg.close(value);
  };
  dlg.returnValue = "";
  dlg.showModal();
  dlg.querySelector(".ui-modal__body input, .ui-modal__body select, .ui-modal__body textarea")?.focus();
  return dlg;
}

// Hiện lỗi dưới một ô nhập trong popup / form (cần <small class="ui-error" data-for="<id>">)
function fieldError(root, id, message) {
  const input = root.querySelector(`#${id}`);
  const err = root.querySelector(`.ui-error[data-for="${id}"]`);
  input?.closest(".ui-field")?.classList.toggle("invalid", Boolean(message));
  if (err) err.textContent = message || "";
  return !message;
}

/* ---------- Phân trang đơn giản ---------- */
function paginate(list, page, size) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { items: list.slice((current - 1) * size, current * size), page: current, pages, total: list.length };
}
function pagerHtml({ page, pages, total }, size) {
  if (pages <= 1) return `<span class="pager__info">${total} dòng</span>`;
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return `<span class="pager__info">${from}–${to} / ${total}</span>
    <button type="button" class="pager__btn" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""} aria-label="Trang trước"><i class="fa-solid fa-chevron-left"></i></button>
    <span class="pager__page">Trang ${page}/${pages}</span>
    <button type="button" class="pager__btn" data-page="${page + 1}" ${page >= pages ? "disabled" : ""} aria-label="Trang sau"><i class="fa-solid fa-chevron-right"></i></button>`;
}

/* ---------- Dữ liệu phản hồi ---------- */
function loadFeedback() {
  const list = readJSON(STORE.feedback, []);
  return Array.isArray(list) ? list : [];
}
function saveFeedback(list) {
  return writeJSON(STORE.feedback, list);
}
// Cập nhật một phản hồi theo id (đọc lại kho trước khi ghi để không đè thay đổi ở tab khác)
function updateFeedback(id, change) {
  const list = loadFeedback();
  const item = list.find((x) => x.id === id);
  if (!item) return null;
  change(item);
  item.updatedAt = new Date().toISOString();
  return saveFeedback(list) ? item : null;
}
