/* ========== DÙNG CHUNG CHO PHÂN HỆ QUẢN TRỊ ========== */
const ADMIN = CURRENT_USER && CURRENT_USER.role === "admin" ? CURRENT_USER : null;

// Tài chính của toàn bộ sinh viên (dữ liệu Excel + thanh toán online + nộp bổ sung)
function financeOverview() {
  return getStudents().map((student) => {
    const fin = getFinance(student);
    return { student, fin, hasData: fin.rows.length > 0 };
  });
}

/* ---------- Biểu đồ cột (HTML/CSS) ----------
   rows: [{ label, value, display? }]
   opts: { horizontal, color, format(v), caption } — một chuỗi dữ liệu nên không có chú giải,
   tiêu đề của khung đã gọi tên số liệu. Có tooltip khi rê chuột / focus và bảng dữ liệu ẩn cho trình đọc màn hình. */
function renderBars(container, rows, opts = {}) {
  const fmt = opts.format || ((v) => v.toLocaleString("vi-VN"));
  const max = Math.max(1, ...rows.map((r) => r.value));
  const color = opts.color || "var(--series-1)";
  const kind = opts.horizontal ? "hbars" : "vbars";
  container.innerHTML = `
    <div class="${kind}" style="--bar:${color}" role="img" aria-label="${esc(opts.caption || "")}">
      ${rows
        .map((r) => {
          const pct = (r.value / max) * 100;
          const tip = `${r.label}: ${r.display || fmt(r.value)}`;
          return `<div class="${kind}__row" tabindex="0" data-tip="${esc(tip)}">
              <span class="${kind}__label">${esc(r.label)}</span>
              <span class="${kind}__track"><span class="${kind}__bar" style="--v:${pct.toFixed(2)}%"></span></span>
              <span class="${kind}__value">${esc(r.display || fmt(r.value))}</span>
            </div>`;
        })
        .join("")}
    </div>
    <table class="sr-only"><caption>${esc(opts.caption || "")}</caption>
      <tbody>${rows.map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.display || fmt(r.value))}</td></tr>`).join("")}</tbody></table>`;
  bindTooltip(container);
}

// Thanh xếp chồng 2 phần (VD: đã thu / còn phải thu) — 2 chuỗi nên có chú giải + nhãn trực tiếp
function renderStack(container, parts, opts = {}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  container.innerHTML = `
    <div class="stack" role="img" aria-label="${esc(opts.caption || "")}">
      ${parts
        .map(
          (p) => `<span class="stack__seg" tabindex="0" style="--w:${((p.value / total) * 100).toFixed(2)}%;--seg:${p.color}"
                   data-tip="${esc(`${p.label}: ${p.display} (${((p.value / total) * 100).toFixed(1)}%)`)}"></span>`
        )
        .join("")}
    </div>
    <ul class="legend-list">
      ${parts
        .map(
          (p) => `<li><i style="background:${p.color}"></i><span>${esc(p.label)}</span>
                 <b>${esc(p.display)}</b><small>${((p.value / total) * 100).toFixed(1)}%</small></li>`
        )
        .join("")}
    </ul>`;
  bindTooltip(container);
}

function bindTooltip(container) {
  let tip = document.getElementById("chartTip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "chartTip";
    tip.className = "chart-tip";
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);
  }
  const show = (el) => {
    tip.textContent = el.dataset.tip;
    const r = el.getBoundingClientRect();
    tip.style.left = `${Math.min(window.innerWidth - 12, Math.max(12, r.left + r.width / 2))}px`;
    tip.style.top = `${r.top + window.scrollY - 8}px`;
    tip.classList.add("show");
  };
  const hide = () => tip.classList.remove("show");
  container.querySelectorAll("[data-tip]").forEach((el) => {
    el.addEventListener("mouseenter", () => show(el));
    el.addEventListener("focus", () => show(el));
    el.addEventListener("mouseleave", hide);
    el.addEventListener("blur", hide);
  });
}

const formatMillion = (v) => `${(v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
