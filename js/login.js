document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    return;
  }

  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const submitButton = loginForm.querySelector(".login-btn");
  const togglePassword = document.querySelector(".toggle-password");
  const googleSignInBtn = document.getElementById("googleSignInBtn");

  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!#%*?&])[A-Za-z\d@$!%#*?&]{8,}$/;

  // Google Sign-In Setup (unchanged)
  const GOOGLE_CLIENT_ID = "892883759524-crgr5ag4eu4o21c1ginihfbsouhm9u1v.apps.googleusercontent.com";

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
          return response.json().then(err => {
            throw new Error(`Google login failed: ${JSON.stringify(err)}`);
          });
        }
        return response.json();
      })
      .then(result => {
        console.log("Google login response:", result);
        localStorage.setItem("user_id", result.user_id);
        localStorage.setItem("user_name", result.user_name);
        localStorage.setItem("token", result.token);
        localStorage.setItem("email", result.email);
        localStorage.setItem("mobile_number", result.mobile_number)
        console.log("Stored token:", result.token);
        // Decode token manually (for debugging)
        const tokenParts = result.token.split(".");
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log("Google token payload:", payload);
        alert(result.message || "Google login successful!");
        window.location.href = "bookStoreDashboard.html";
      })
      .catch(error => {
        console.error("Google Sign-In error:", error);
        alert(error.message || "Failed to login with Google");
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
      shape: "rectangular"
    });
    googleSignInBtn.disabled = false;
    console.log("Google Sign-In initialized");
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

  validateField(emailField, emailRegex, "Email is required.", "Email must end with @gmail, @yahoo, or @ask and have a valid domain.");
  validateField(passwordField, passwordRegex, "Password is required.", "Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char.");

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailField.value.trim();
    const password = passwordField.value.trim();

    if (!email || !password) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!emailRegex.test(email) || !passwordRegex.test(password)) {
      alert("Invalid email or password format.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
      const response = await fetch("http://localhost:3000/api/v1/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ user: { email, password } }),
        mode: "cors"
      });

      console.log("Normal login response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Normal login error response (raw):", errorText);
        throw new Error(`Login failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Normal login response:", result);

      // Adjusted to match login response structure
      localStorage.setItem("user_id", result.user_id);
      localStorage.setItem("user_name", result.user_name);
      localStorage.setItem("token", result.token);
      localStorage.setItem("email", result.email);
      localStorage.setItem("mobile_number", result.mobile_number)
      console.log("Stored token:", localStorage.getItem("token"));

      alert(result.message || "Login successful!");
      loginForm.reset();
      window.location.href = "bookStoreDashboard.html";
    } catch (error) {
      console.error("Normal login error:", error);
      alert(error.message || "Failed to login. Check your credentials.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Login";
    }
  });

  togglePassword.addEventListener("click", function () {
    if (passwordField.type === "password") {
      passwordField.type = "text";
      togglePassword.classList.remove("fa-eye");
      togglePassword.classList.add("fa-eye-slash");
    } else {
      passwordField.type = "password";
      togglePassword.classList.remove("fa-eye-slash");
      togglePassword.classList.add("fa-eye");
    }
  });

  const signupTab = document.getElementById("signup-tab");
  if (signupTab) {
    signupTab.addEventListener("click", function () {
      window.location.href = "signup.html";
    });
  }
});