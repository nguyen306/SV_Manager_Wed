document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const togglePass = document.getElementById("togglePass");
  const submitBtn = document.getElementById("submitBtn");
  const toast = document.getElementById("toast");

  // Email sinh viên (vd: nguyen251210934@lms.utc.edu.vn) hoặc mã sinh viên 6–12 chữ số
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const STUDENT_ID_RE = /^\d{6,12}$/;

  /* ---------- Thông báo ---------- */
  let toastTimer;
  function showToast(message, type = "") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  /* ---------- Ẩn / hiện mật khẩu ---------- */
  togglePass.addEventListener("click", () => {
    const hidden = password.type === "password";
    password.type = hidden ? "text" : "password";
    togglePass.innerHTML = hidden
      ? '<i class="fa-regular fa-eye-slash"></i>'
      : '<i class="fa-regular fa-eye"></i>';
    togglePass.setAttribute("aria-label", hidden ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    password.focus();
  });

  /* ---------- Kiểm tra dữ liệu ---------- */
  function setError(input, message) {
    const field = input.closest(".field");
    field.classList.toggle("invalid", Boolean(message));
    document.getElementById(`${input.id}Error`).textContent = message;
    input.setAttribute("aria-invalid", Boolean(message));
  }

  function validateUsername() {
    const value = username.value.trim();
    if (!value) return setError(username, "Vui lòng nhập email hoặc mã sinh viên."), false;
    if (!EMAIL_RE.test(value) && !STUDENT_ID_RE.test(value)) {
      return setError(username, "Email hoặc mã sinh viên không hợp lệ."), false;
    }
    setError(username, "");
    return true;
  }

  function validatePassword() {
    if (!password.value) return setError(password, "Vui lòng nhập mật khẩu."), false;
    setError(password, "");
    return true;
  }

  // Trang cần quay lại sau khi đăng nhập: ?next=<khóa trang trong PAGES>[#tab].
  // Chỉ nhận khóa đã khai báo (tránh chuyển ra trang ngoài); mặc định về Trang chủ.
  function nextPage() {
    const [key, hash = ""] = (new URLSearchParams(location.search).get("next") || "").split("#");
    return PAGES[key] && key !== "dang-nhap" && /^[\w-]*$/.test(hash)
      ? pageUrl(key, hash ? `#${hash}` : "")
      : pageUrl("trang-chu");
  }

  username.addEventListener("blur", validateUsername);
  password.addEventListener("blur", validatePassword);
  // Xóa lỗi ngay khi người dùng gõ lại
  [username, password].forEach((input) =>
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("invalid")) setError(input, "");
    })
  );

  /* ---------- Gửi form ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = [validateUsername(), validatePassword()].every(Boolean);
    if (!ok) {
      form.querySelector(".invalid input").focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>ĐANG XỬ LÝ...</span>';

    try {
      // TODO: thay bằng lời gọi API thật, ví dụ:
      // await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ username: username.value.trim(), password: password.value }) });
      await new Promise((r) => setTimeout(r, 600));
      if (!findStudent(username.value)) {
        setError(username, "Không tìm thấy mã sinh viên này trong hệ thống.");
        throw new Error("not-found");
      }
      const student = authenticate(username.value, password.value);
      if (!student) {
        setError(password, "Mật khẩu không đúng.");
        throw new Error("wrong-password");
      }
      // Đổi tài khoản: lưu mã SV mới, mọi trang sẽ nạp dữ liệu theo mã này
      storageSet(SESSION_KEY, student.msv);
      showToast(`Xin chào ${toTitleCase(student.hoTen)}! Đang chuyển hướng...`, "success");
      setTimeout(() => (window.location.href = nextPage()), 900);
    } catch {
      showToast("Đăng nhập thất bại. Vui lòng kiểm tra lại.", "error");
      form.querySelector(".invalid input")?.focus();
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<span class="btn-text">ĐĂNG NHẬP</span><i class="fa-solid fa-arrow-right-to-bracket"></i>';
    }
  });

  /* ---------- Liên kết phụ ---------- */
  document.getElementById("forgotLink").addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Vui lòng liên hệ Phòng Đào tạo hoặc dùng email sinh viên để đặt lại mật khẩu.");
  });

  document.getElementById("helpLink").addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Hỗ trợ 24/7: hotro@utc.edu.vn");
  });

  document.getElementById("msBtn").addEventListener("click", () => {
    // TODO: chuyển hướng tới luồng OAuth của Microsoft (Azure AD / Entra ID)
    showToast("Đang chuyển tới trang đăng nhập Microsoft...");
  });
});
