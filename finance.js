/* ========== DÙNG CHUNG CHO PHÂN HỆ TÀI CHÍNH (hoc-phi.html, thanh-toan-online.html) ==========
   Nguồn dữ liệu:
     - window.TUITION: học phí theo năm của từng SV (sheet "Chi Tiết Học Phí" trong data/students.xlsx)
     - localStorage "tuition:payments": các lần thanh toán online trên trình duyệt này
   Số liệu hiển thị = dữ liệu Excel + các khoản thanh toán online. */
const PAYMENTS_KEY = "tuition:payments";

const PAYMENT_METHODS = [
  { id: "shb", name: "SHB QR Code", icon: "fa-qrcode", color: "#f97316" },
  { id: "vnpay", name: "VNPay", icon: "fa-credit-card", color: "#1d4ed8" },
  { id: "momo", name: "MoMo", icon: "fa-wallet", color: "#be185d" },
  { id: "vcb", name: "Vietcombank", icon: "fa-building-columns", color: "#15803d" },
];

const formatMoney = (n) => `${Math.round(n || 0).toLocaleString("vi-VN")} đ`;
const schoolYearLabel = (row) => `Năm ${row.year} (${row.schoolYear})`;
const transferContent = (msv) => `SV${msv} Nop hoc phi`;

function loadPayments() {
  try {
    const list = JSON.parse(storageGet(PAYMENTS_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function savePayment(payment) {
  const list = loadPayments();
  list.push(payment);
  return storageSet(PAYMENTS_KEY, JSON.stringify(list));
}

/* Tổng hợp tài chính của một sinh viên.
   Mỗi khoản thanh toán online được trừ vào năm được chọn trước, phần dư trừ vào các năm còn nợ
   cũ nhất; nếu vẫn còn dư thì tính là học phí thừa. */
function getFinance(student) {
  const rows = (window.TUITION || [])
    .filter((r) => r.msv === student.msv)
    .sort((a, b) => a.year - b.year)
    .map((r) => ({ ...r, onlinePaid: 0, payments: [] }));
  const payments = loadPayments()
    .filter((p) => p.msv === student.msv)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let extraSurplus = 0;
  for (const p of payments) {
    let left = p.amount;
    const order = [...rows].sort((a, b) => (b.year === p.year) - (a.year === p.year) || a.year - b.year);
    for (const row of order) {
      const owed = row.payable - (row.paid + row.onlinePaid - row.withdrawn);
      if (owed <= 0 || left <= 0) continue;
      const used = Math.min(owed, left);
      row.onlinePaid += used;
      row.payments.push({ ...p, used });
      left -= used;
    }
    extraSurplus += left;
  }

  for (const r of rows) {
    const net = r.paid + r.onlinePaid - r.withdrawn;
    r.totalPaid = r.paid + r.onlinePaid;
    r.debt = Math.max(0, r.payable - net);
    r.surplus = Math.max(0, net - r.payable);
    r.status = r.debt > 0 ? (r.totalPaid > 0 ? "partial" : "unpaid") : "paid";
  }

  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  const totals = {
    tuition: sum("tuition"),
    tutorFee: sum("tutorFee"),
    payable: sum("payable") + sum("exempt"), // khoản phải nộp trước miễn giảm
    exempt: sum("exempt"),
    paid: sum("totalPaid"),
    withdrawn: sum("withdrawn"),
    debt: sum("debt"),
    surplus: sum("surplus") + extraSurplus,
  };
  return {
    rows,
    payments,
    totals,
    debtRows: rows.filter((r) => r.debt > 0),
    surplusRows: rows.filter((r) => r.surplus > 0),
    done: totals.debt <= 0,
  };
}

/* Ảnh QR MINH HỌA (không phải mã chuyển khoản thật): vẽ bằng SVG từ nội dung + số tiền,
   có 3 ô định vị như mã QR thật để giao diện trực quan. */
function illustrativeQr(seedText, size = 29) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;

  const inFinder = (x, y) =>
    [[0, 0], [size - 7, 0], [0, size - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
  let cells = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inFinder(x, y) && rand() < 0.48) cells += `M${x} ${y}h1v1h-1z`;
    }
  }
  const finder = (x, y) =>
    `<rect x="${x}" y="${y}" width="7" height="7" fill="#0f172a"/>
     <rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/>
     <rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#0f172a"/>`;
  return `<svg viewBox="-2 -2 ${size + 4} ${size + 4}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="Mã QR minh họa">
    <rect x="-2" y="-2" width="${size + 4}" height="${size + 4}" fill="#fff"/>
    <path d="${cells}" fill="#0f172a"/>
    ${finder(0, 0)}${finder(size - 7, 0)}${finder(0, size - 7)}
  </svg>`;
}
