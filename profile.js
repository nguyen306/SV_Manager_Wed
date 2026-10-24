document.addEventListener("DOMContentLoaded", () => {
  const student = getCurrentStudent();
  const toast = document.getElementById("toast");

  let toastTimer;
  function showToast(message, type = "") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  if (!student) {
    showToast("Không tìm thấy dữ liệu sinh viên. Vui lòng đăng nhập lại.", "error");
    setTimeout(() => (window.location.href = "login.html"), 1500);
    return;
  }

  /* ========== TABS ========== */
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.classList.toggle("active", selected);
        t.setAttribute("aria-selected", selected);
        document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
      });
    })
  );

  /* ========== CỘT TRÁI: THÔNG TIN TỪ DỮ LIỆU ========== */
  const display = {
    hoTen: student.hoTen,
    ngaySinh: student.ngaySinh,
    msv: student.msv,
    nganh: student.nganh,
    lop: student.lop,
  };
  document.querySelectorAll("[data-field]").forEach((dd) => {
    const value = display[dd.dataset.field];
    dd.textContent = value || "Chưa cập nhật";
    dd.classList.toggle("empty", !value);
  });

  const avatarImg = document.getElementById("avatarImg");
  const navAvatar = document.querySelector(".user__avatar");
  avatarImg.src = getAvatar(student.msv) || initialsAvatar(student.hoTen);

  /* Đổi ảnh đại diện: thu nhỏ về 300px rồi lưu vào localStorage */
  document.getElementById("avatarInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Vui lòng chọn một tệp ảnh.", "error");
    if (file.size > 5 * 1024 * 1024) return showToast("Ảnh quá lớn (tối đa 5MB).", "error");

    const img = new Image();
    img.onload = () => {
      const size = 300;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const side = Math.min(img.width, img.height); // cắt hình vuông ở giữa
      canvas.getContext("2d").drawImage(
        img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size
      );
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(img.src);
      avatarImg.src = dataUrl;
      if (navAvatar) navAvatar.src = dataUrl;
      showToast(
        storageSet(`avatar:${student.msv}`, dataUrl)
          ? "Đã cập nhật ảnh đại diện."
          : "Đã đổi ảnh nhưng trình duyệt không cho lưu lại.",
        "success"
      );
    };
    img.onerror = () => showToast("Không đọc được ảnh này.", "error");
    img.src = URL.createObjectURL(file);
  });

  /* ========== CỘT PHẢI: FORM CẬP NHẬT ========== */
  const form = document.getElementById("updateForm");
  const savedAt = document.getElementById("savedAt");
  const STORE_KEY = `profile:${student.msv}`;
  const inputs = {
    sdt: document.getElementById("sdt"),
    soTaiKhoan: document.getElementById("soTaiKhoan"),
    tenNganHang: document.getElementById("tenNganHang"),
  };

  inputs.sdt.placeholder = student.sdt ? `Hiện tại: ${student.sdt}` : "Nhập số điện thoại";

  function loadSaved() {
    try { return JSON.parse(storageGet(STORE_KEY)) || {}; } catch { return {}; }
  }

  function fillForm() {
    const saved = loadSaved();
    Object.entries(inputs).forEach(([key, input]) => (input.value = saved[key] || ""));
    savedAt.textContent = saved.updatedAt
      ? `✔ Đã lưu lúc ${new Date(saved.updatedAt).toLocaleString("vi-VN")}`
      : "";
  }
  fillForm();

  // Chỉ cho gõ số ở SĐT và số tài khoản
  [inputs.sdt, inputs.soTaiKhoan].forEach((input) =>
    input.addEventListener("input", () => (input.value = input.value.replace(/\D/g, "")))
  );

  const rules = {
    sdt: (v) =>
      !v ? "" // để trống = giữ số điện thoại hiện tại
      : /^0(3|5|7|8|9)\d{8}$/.test(v) ? "" : "SĐT phải gồm 10 số, bắt đầu bằng 03/05/07/08/09.",
    soTaiKhoan: (v) =>
      !v ? "Vui lòng nhập số tài khoản."
      : /^\d{6,19}$/.test(v) ? "" : "Số tài khoản gồm 6–19 chữ số.",
    tenNganHang: (v) => (v.trim().length >= 2 ? "" : "Vui lòng nhập tên ngân hàng."),
  };

  function validate(key) {
    const message = rules[key](inputs[key].value);
    inputs[key].closest("td").classList.toggle("invalid", Boolean(message));
    inputs[key].setAttribute("aria-invalid", Boolean(message));
    document.getElementById(`${key}Error`).textContent = message;
    return !message;
  }

  Object.keys(inputs).forEach((key) => {
    inputs[key].addEventListener("blur", () => validate(key));
    inputs[key].addEventListener("input", () => {
      if (inputs[key].closest("td").classList.contains("invalid")) validate(key);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const results = Object.keys(inputs).map(validate);
    if (results.includes(false)) {
      form.querySelector("td.invalid input").focus();
      return showToast("Vui lòng kiểm tra lại các ô được đánh dấu đỏ.", "error");
    }

    const data = {
      sdt: inputs.sdt.value,
      soTaiKhoan: inputs.soTaiKhoan.value,
      tenNganHang: inputs.tenNganHang.value.trim(),
      updatedAt: new Date().toISOString(),
    };
    // TODO: khi có backend, gửi `data` lên API thay vì chỉ lưu localStorage
    if (!storageSet(STORE_KEY, JSON.stringify(data))) {
      return showToast("Trình duyệt không cho phép lưu dữ liệu.", "error");
    }
    fillForm();
    showToast("Đã lưu thông tin thành công!", "success");
  });

  form.addEventListener("reset", (e) => {
    e.preventDefault();
    fillForm();
    Object.keys(inputs).forEach((key) => {
      inputs[key].closest("td").classList.remove("invalid");
      document.getElementById(`${key}Error`).textContent = "";
    });
  });
});
