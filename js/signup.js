document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    console.error("Login form not found");
    return;
  }

  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const submitButton = loginForm.querySelector(".login-btn");
  const togglePassword = document.querySelector(".toggle-password");

  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

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

  // Attach validation on input
  validateField(
    emailField,
    emailRegex,
    "Email is required.",
    "Email must end with @gmail, @yahoo, or @ask and have a valid domain."
  );

  validateField(
    passwordField,
    passwordRegex,
    "Password is required.",
    "Password must be at least 8 characters long, with at least one uppercase letter, one lowercase letter, one digit, and one special character."
  );

  loginForm.addEventListener("submit", async function (event) {
    console.log("Submit event triggered");
    event.preventDefault();

    const email = emailField.value.trim();
    const password = passwordField.value.trim();
    console.log("Email:", email, "Password:", password);

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
      passwordField.setCustomValidity("Password must be at least 8 characters long, with at least one uppercase letter, one lowercase letter, one digit, and one special character.");
      hasError = true;
    } else {
      passwordField.setCustomValidity("");
    }
    console.log("hasError:", hasError);

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
    console.log(loginData);

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
      if (!response.ok) {
        let errorMessage = "Login failed due to an unknown error";
      
        if (result) {
          if (typeof result === "string") {
            errorMessage = result;
          } else if (result.error) {
            if (Array.isArray(result.error)) {
              errorMessage = result.error.join(", ");
            } else if (typeof result.error === "string") {
              errorMessage = result.error;
            } else if (typeof result.error === "object") {
              const messages = Object.values(result.error).flat().join(", ");
              errorMessage = messages || errorMessage;
            }
          } else if (result.message) {
            errorMessage = result.message;
          }
        }
      
        throw new Error(errorMessage);
      }
      

      alert(result.message || "Login successful!");
      loginForm.reset();
      window.location.href = "dashboard.html";

    } catch (error) {
      console.error("Login error:", error.message);
      alert(error.message);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Login";
    }
  });

  // Toggle Password Visibility
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

  // Redirect to Signup
  const signupTab = document.getElementById("signup-tab");
  if (signupTab) {
    signupTab.addEventListener("click", function () {
      window.location.href = "signup.html";
    });
  }
});
