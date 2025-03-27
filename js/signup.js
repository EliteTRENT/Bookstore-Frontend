document.addEventListener("DOMContentLoaded", function () {
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) {
    console.log("Signup form not found in DOM");
    return;
  }

  // DOM Elements
  const nameField = document.getElementById("fullName");
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const mobileField = document.getElementById("mobileNumber");
  const submitButton = signupForm.querySelector(".signup-btn");
  const togglePassword = document.querySelector(".toggle-password");

  // Regex Patterns
  const nameRegex = /^[A-Z][a-zA-Z]{2,}(?: [A-Z][a-zA-Z]{2,})*$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%#*?&])[A-Za-z\d@$!#%*?&]{8,}$/;
  const mobileRegex = /^(\+91)?[6-9]\d{9}$/;

  // Toast Notification Function
  function showToast(message, type = "info") {
    console.log(`Showing toast: ${message} (type: ${type})`);
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.position = "fixed"; // Ensure position is set
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.zIndex = "1000"; // Ensure it’s above other elements
    document.body.appendChild(toast);

    // Force reflow to ensure animation works
    toast.offsetWidth;

    setTimeout(() => {
      toast.classList.add("show");
      console.log("Toast should be visible now");
    }, 100);

    setTimeout(() => {
      toast.classList.remove("show");
      console.log("Toast fading out");
      setTimeout(() => {
        toast.remove();
        console.log("Toast removed from DOM");
      }, 300);
    }, 3000);
  }

  // Field Validation
  function validateField(field, regex, emptyMessage, invalidMessage) {
    field.addEventListener("input", () => {
      const value = field.value.trim();
      if (!value) {
        field.setCustomValidity(emptyMessage);
      } else if (!regex.test(value)) {
        field.setCustomValidity(invalidMessage);
      } else {
        field.setCustomValidity("");
      }
      field.reportValidity();
    });
  }

  validateField(nameField, nameRegex, "Name is required.", "Must start with capital letter, min 3 letters per word.");
  validateField(emailField, emailRegex, "Email is required.", "Must be @gmail, @yahoo, or @ask.");
  validateField(passwordField, passwordRegex, "Password is required.", "Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special.");
  validateField(mobileField, mobileRegex, "Mobile is required.", "Must be 10 digits starting with 6-9, optional +91.");

  // Form Submission
  signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = nameField.value.trim();
    const email = emailField.value.trim();
    const password = passwordField.value.trim();
    const mobile = mobileField.value.trim();

    // Final validation before submission
    if (!nameRegex.test(name) || !emailRegex.test(email) || 
        !passwordRegex.test(password) || !mobileRegex.test(mobile)) {
      signupForm.reportValidity();
      const firstInvalid = [nameField, emailField, passwordField, mobileField]
        .find(field => !field.validity.valid);
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const signupData = {
      user: { name, email, password, mobile_number: mobile }
    };

    submitButton.disabled = true;
    submitButton.textContent = "Signing up...";

    try {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(signupData),
        mode: "cors"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors || `Signup failed: ${response.status}`);
      }

      const result = await response.json();

      // Store user data
      localStorage.setItem("user_id", result.user.id);
      localStorage.setItem("user_name", result.user.name);
      localStorage.setItem("email", result.user.email);
      if (result.token) {
        localStorage.setItem("token", result.token);
      }

      showToast(result.message || "Signup successful!", "success");
      signupForm.reset();
      setTimeout(() => {
        window.location.href = result.token ? "bookStoreDashboard.html" : "login.html";
      }, 1000); // Slight delay to show toast before redirect
    } catch (error) {
      console.error("Signup error:", error);
      showToast(error.message || "Failed to signup", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Signup";
    }
  });

  // Password Toggle
  togglePassword.addEventListener("click", function () {
    const isPassword = passwordField.type === "password";
    passwordField.type = isPassword ? "text" : "password";
    togglePassword.classList.toggle("fa-eye", !isPassword);
    togglePassword.classList.toggle("fa-eye-slash", isPassword);
  });

  // Login Tab Navigation
  const loginTab = document.getElementById("login-tab");
  if (loginTab) {
    loginTab.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }
});