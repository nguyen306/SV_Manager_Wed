document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const togglePass = document.getElementById("togglePass");
  const submitBtn = document.getElementById("submitBtn");
  const toast = document.getElementById("toast");

  // Mã sinh viên, email sinh viên, hoặc tài khoản giảng viên / admin (chữ, số, dấu . _ -)
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const USERNAME_RE = /^[\w.-]{3,40}$/;

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
    if (!value) return setError(username, "Vui lòng nhập mã sinh viên, email hoặc tài khoản."), false;
    if (!EMAIL_RE.test(value) && !USERNAME_RE.test(value)) {
      return setError(username, "Tài khoản không hợp lệ."), false;
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
  // Chỉ nhận khóa đã khai báo và vai trò được phép mở (tránh chuyển ra trang ngoài);
  // mặc định về trang chủ của vai trò (SV: Trang chủ, GV: Lịch dạy, Admin: Dashboard).
  function nextPage(role) {
    const [key, hash = ""] = (new URLSearchParams(location.search).get("next") || "").split("#");
    return PAGES[key] && PAGES[key].roles.includes(role) && /^[\w-]*$/.test(hash)
      ? pageUrl(key, hash ? `#${hash}` : "")
      : homeUrl(role);
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
      const result = authenticate(username.value, password.value);
      if (!result.ok) {
        if (result.reason === "not-found") setError(username, "Không tìm thấy tài khoản này trong hệ thống.");
        else if (result.reason === "locked") setError(username, "Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.");
        else setError(password, "Mật khẩu không đúng.");
        throw new Error(result.reason);
      }
      // Lưu tài khoản đăng nhập; mọi trang nhận diện vai trò và nạp dữ liệu theo tài khoản này
      storageSet(SESSION_KEY, result.user.id);
      const user = getCurrentUser();
      showToast(`Xin chào ${user.name} (${ROLES[user.role].label})! Đang chuyển hướng...`, "success");
      setTimeout(() => (window.location.href = nextPage(user.role)), 900);
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
