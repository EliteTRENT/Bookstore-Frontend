// login.js (full updated code)
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    console.log("Login form not found in DOM");
    return;
  }

  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const submitButton = loginForm.querySelector(".login-btn");
  const togglePassword = document.querySelector(".toggle-password");
  const googleSignInBtn = document.getElementById("googleSignInBtn");
  const githubSignInBtn = document.querySelector(".github-btn");

  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!#%*?&])[A-Za-z\d@$!%#*?&]{8,}$/;

  // Toast Notification Function
  function showToast(message, type = "info") {
    console.log(`Showing toast: ${message} (type: ${type})`);
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

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

  const GOOGLE_CLIENT_ID = window.env.GOOGLE_CLIENT_ID;
  const GITHUB_CLIENT_ID = window.env.GITHUB_CLIENT_ID;

  // GitHub Sign-In Handler
  githubSignInBtn.addEventListener("click", function () {
    const redirectUri = "http://localhost:5500/pages/callback.html"; // Updated to callback.html
    const scope = "user:email";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`;
    console.log("Redirecting to GitHub:", authUrl);
    window.location.href = authUrl; // Redirect to GitHub
  });

  // Google Sign-In Handler (unchanged)
  window.handleGoogleSignIn = function (response) {
    const idToken = response.credential;
    console.log("Google ID token received:", idToken);
    fetch("http://localhost:3000/api/v1/google_auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ token: idToken }),
      mode: "cors"
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            try {
              const err = JSON.parse(text);
              throw new Error(err.details || err.error || "Google login failed");
            } catch {
              throw new Error(`Google login failed: Unexpected response - ${text}`);
            }
          });
        }
        return response.json();
      })
      .then(result => {
        console.log("Google login response:", result);
        localStorage.setItem("user_id", result.user_id);
        localStorage.setItem("user_name", result.user_name);
        localStorage.setItem("token", result.token);
        localStorage.setItem("refresh_token", result.refresh_token);
        localStorage.setItem("email", result.email);
        localStorage.setItem("mobile_number", result.mobile_number);
        localStorage.setItem("role", result.role || "user");
        console.log("Stored token:", result.token);
        console.log("Stored refresh_token:", result.refresh_token);
        showToast(result.message || "Login successful!", "success");
        setTimeout(() => {
          window.location.href = "bookStoreDashboard.html";
        }, 1000);
      })
      .catch(error => {
        console.error("Google Sign-In error:", error.message);
        showToast(`Google login failed: ${error.message}`, "error");
      });
  };

  function initializeGoogleSignIn() {
    if (typeof google === "undefined") {
      console.error("Google Identity Services script not loaded");
      googleSignInBtn.textContent = "Google Sign-In Unavailable";
      return;
    }
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: window.handleGoogleSignIn,
      auto_select: false
    });
    google.accounts.id.renderButton(googleSignInBtn, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: "100%"
    });
    googleSignInBtn.disabled = false;
    console.log("Google Sign-In initialized");
    googleSignInBtn.querySelector("div[role=button]").style.backgroundColor = "#db4437";
    googleSignInBtn.querySelector("div[role=button]").style.color = "white";
    googleSignInBtn.querySelector("div[role=button]").style.border = "none";
    googleSignInBtn.querySelector("div[role=button]").style.borderRadius = "0.375rem";
  }

  if (window.google && window.google.accounts) {
    initializeGoogleSignIn();
  } else {
    const checkGoogleLoad = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(checkGoogleLoad);
        initializeGoogleSignIn();
      }
    }, 100);
  }

  // Field Validation
  function validateField(field, regex, emptyMessage, invalidMessage) {
    field.addEventListener("input", () => {
      const value = field.value.trim();
      if (!value) {
        field.setCustomValidity(emptyMessage);
        field.classList.add("error");
      } else if (!regex.test(value)) {
        field.setCustomValidity(invalidMessage);
        field.classList.add("error");
      } else {
        field.setCustomValidity("");
        field.classList.remove("error");
      }
      field.reportValidity();
    });
  }

  validateField(emailField, emailRegex, "Email is required.", "Must be @gmail, @yahoo, or @ask.");
  validateField(passwordField, passwordRegex, "Password is required.", "Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special.");

  // Form Submission
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailField.value.trim();
    const password = passwordField.value.trim();

    if (!email || !password) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    if (!emailRegex.test(email) || !passwordRegex.test(password)) {
      showToast("Invalid email or password format.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ user: { email, password } }),
        mode: "cors"
      });

      console.log("Normal login response status:", response.status);
      const result = await response.json();

      if (response.ok) {
        console.log("Normal login response:", result);
        localStorage.setItem("user_id", result.user_id);
        localStorage.setItem("user_name", result.user_name);
        localStorage.setItem("token", result.token);
        localStorage.setItem("refresh_token", result.refresh_token);
        localStorage.setItem("email", result.email);
        localStorage.setItem("mobile_number", result.mobile_number);
        localStorage.setItem("role", result.role);
        console.log("Stored token:", localStorage.getItem("token"));
        showToast(result.message || "Login successful!", "success");
        loginForm.reset();
        setTimeout(() => {
          window.location.href = "bookStoreDashboard.html";
        }, 1000);
      } else {
        console.error("Normal login error response:", result);
        if (result.errors === "Email not registered.") {
          showToast("Email not registered", "error");
        } else if (result.errors === "Invalid password.") {
          showToast("Wrong email or password", "error");
        } else {
          showToast(result.errors || "Failed to login. Check your credentials.", "error");
        }
      }
    } catch (error) {
      console.error("Normal login error:", error);
      showToast("Network error: Unable to reach server.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Login";
    }
  });

  // Password Toggle
  togglePassword.addEventListener("click", function () {
    const isPassword = passwordField.type === "password";
    passwordField.type = isPassword ? "text" : "password";
    togglePassword.classList.toggle("fa-eye", !isPassword);
    togglePassword.classList.toggle("fa-eye-slash", isPassword);
  });

  // Signup Tab Navigation
  const signupTab = document.getElementById("signup-tab");
  if (signupTab) {
    signupTab.addEventListener("click", function () {
      window.location.href = "signup.html";
    });
  }
});