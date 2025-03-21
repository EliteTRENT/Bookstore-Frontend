document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    return;
  }

  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const submitButton = loginForm.querySelector(".login-btn");
  const togglePassword = document.querySelector(".toggle-password");

  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!#%*?&])[A-Za-z\d@$!%#*?&]{8,}$/;

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

    let hasError = false;

    if (!email) {
      emailField.setCustomValidity("Email is required.");
      hasError = true;
    } else if (!emailRegex.test(email)) {
      emailField.setCustomValidity("Email must end with @gmail, @yahoo, or @ask and have a valid domain.");
      hasError = true;
    } else {
      emailField.setCustomValidity("");
    }

    if (!password) {
      passwordField.setCustomValidity("Password is required.");
      hasError = true;
    } else if (!passwordRegex.test(password)) {
      passwordField.setCustomValidity("Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char.");
      hasError = true;
    } else {
      passwordField.setCustomValidity("");
    }

    if (hasError) {
      loginForm.reportValidity();
      const firstInvalid = [emailField, passwordField].find(field => !field.validity.valid);
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const loginData = {
      user: {
        email: email,
        password: password
      }
    };

    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
      const response = await fetch("http://localhost:3000/api/v1/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(loginData),
        mode: "cors"
      });

      const result = await response.json();
      console.log(result);
      if (!response.ok) {
        let errorMessage = "Login failed due to an unknown error";
        if (result && result.errors) {
          if (Array.isArray(result.errors)) {
            errorMessage = result.errors.join(", ");
          } else if (typeof result.errors === "string") {
            errorMessage = result.errors;
          }
        }
        throw new Error(errorMessage);
      }

      // Store all relevant user data in localStorage
      localStorage.setItem('user_id', result.user_id);
      localStorage.setItem('user_name', result.user_name);
      localStorage.setItem('token', result.token);
      localStorage.setItem('email', result.email);
      localStorage.setItem('mobile_number', result.mobile_number);

      alert(result.message || "Login successful!");
      loginForm.reset();
      window.location.href = "bookStoreDashboard.html";
    } catch (error) {
      alert(error.message);
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