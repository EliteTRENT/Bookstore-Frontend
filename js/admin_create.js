document.addEventListener("DOMContentLoaded", function () {
  // Check if window.env is loaded
  if (!window.env || !window.env.BACKEND_URL) {
    console.error("Environment variables not loaded. Ensure env.js is included before this script.");
    throw new Error("BACKEND_URL is not defined. Check env.js loading.");
  }

  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  if (role !== "admin" || !token) {
    alert("Access denied. Admins only.");
    window.location.href = "login.html";
    return;
  }

  const adminCreateForm = document.getElementById("adminCreateForm");
  if (!adminCreateForm) return;

  const nameField = document.getElementById("fullName");
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const mobileField = document.getElementById("mobileNumber");
  const roleField = document.getElementById("role");
  const submitButton = adminCreateForm.querySelector(".signup-btn");
  const togglePassword = document.querySelector(".toggle-password");

  const nameRegex = /^[A-Z][a-zA-Z]{2,}(?: [A-Z][a-zA-Z]{2,})*$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%#*?&])[A-Za-z\d@$!#%*?&]{8,}$/;
  const mobileRegex = /^(\+91)?[6-9]\d{9}$/;

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.zIndex = "1000";
    document.body.appendChild(toast);
    toast.offsetWidth;
    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function validateField(field, regex, emptyMessage, invalidMessage) {
    field.addEventListener("input", () => {
      const value = field.value.trim();
      if (!value) field.setCustomValidity(emptyMessage);
      else if (!regex.test(value)) field.setCustomValidity(invalidMessage);
      else field.setCustomValidity("");
      field.reportValidity();
    });
  }

  validateField(nameField, nameRegex, "Name is required.", "Must start with capital letter, min 3 letters per word.");
  validateField(emailField, emailRegex, "Email is required.", "Must be @gmail, @yahoo, or @ask.");
  validateField(passwordField, passwordRegex, "Password is required.", "Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special.");
  validateField(mobileField, mobileRegex, "Mobile is required.", "Must be 10 digits starting with 6-9, optional +91.");

  adminCreateForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = nameField.value.trim();
    const email = emailField.value.trim();
    const password = passwordField.value.trim();
    const mobile = mobileField.value.trim();
    const role = roleField.value;

    if (!nameRegex.test(name) || !emailRegex.test(email) || 
        !passwordRegex.test(password) || !mobileRegex.test(mobile)) {
      adminCreateForm.reportValidity();
      return;
    }

    const userData = {
      user: { name, email, password, mobile_number: mobile, role }
    };

    submitButton.disabled = true;
    submitButton.textContent = "Creating...";

    try {
      console.log("Token:", token); // Debug token
      const response = await fetch(`${window.env.BACKEND_URL}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(userData),
        mode: "cors"
      });

      const responseData = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          showToast("Only admins can create admin users. Verify your credentials.", "error");
          return;
        }
        throw new Error(responseData.errors || `Creation failed: ${response.status}`);
      }

      showToast(responseData.message || "User created successfully!", "success");
      adminCreateForm.reset();
      setTimeout(() => window.location.href = "../pages/bookStoreDashboard.html", 2000);
    } catch (error) {
      console.error("Creation error:", error.message);
      showToast(error.message || "Failed to create user", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Create User";
    }
  });

  togglePassword.addEventListener("click", function () {
    const isPassword = passwordField.type === "password";
    passwordField.type = isPassword ? "text" : "password";
    togglePassword.classList.toggle("fa-eye", !isPassword);
    togglePassword.classList.toggle("fa-eye-slash", isPassword);
  });
});