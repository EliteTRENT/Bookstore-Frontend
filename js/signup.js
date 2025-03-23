document.addEventListener("DOMContentLoaded", function () {
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) {
    return;
  }

  const nameField = document.getElementById("fullName");
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const mobileField = document.getElementById("mobileNumber");
  const submitButton = signupForm.querySelector(".signup-btn");
  const togglePassword = document.querySelector(".toggle-password");

  const nameRegex = /^[A-Z][a-zA-Z]{2,}(?: [A-Z][a-zA-Z]{2,})*$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%#*?&])[A-Za-z\d@$!#%*?&]{8,}$/;
  const mobileRegex = /^(\+91)?[6-9]\d{9}$/;

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

  validateField(nameField, nameRegex, "Name is required.", "Must start with capital letter, min 3 letters, only alphabets, spaces allowed.");
  validateField(emailField, emailRegex, "Email is required.", "Must be valid and end with @gmail, @yahoo, or @ask and a domain.");
  validateField(passwordField, passwordRegex, "Password is required.", "Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char.");
  validateField(mobileField, mobileRegex, "Mobile number is required.", "Must be 10-digit starting with 6-9, optional +91 prefix.");

  signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = nameField.value.trim();
    const baseEmail = emailField.value.trim();
    const email = emailField.value.trim();
    const password = passwordField.value.trim();
    const mobile = mobileField.value.trim();

    let hasError = false;

    if (!name) {
      nameField.setCustomValidity("Full Name is required.");
      hasError = true;
    } else if (!nameRegex.test(name)) {
      nameField.setCustomValidity("Full Name must be at least 2 characters and only letters.");
      hasError = true;
    } else {
      nameField.setCustomValidity("");
    }

    if (!baseEmail) {
      emailField.setCustomValidity("Email is required.");
      hasError = true;
    } else if (!emailRegex.test(baseEmail)) {
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

    if (!mobile) {
      mobileField.setCustomValidity("Mobile Number is required.");
      hasError = true;
    } else if (!mobileRegex.test(mobile)) {
      mobileField.setCustomValidity("Mobile number must be 10 digits.");
      hasError = true;
    } else {
      mobileField.setCustomValidity("");
    }

    if (hasError) {
      signupForm.reportValidity();
      const firstInvalid = [nameField, emailField, passwordField, mobileField].find(field => !field.validity.valid);
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const signupData = {
      user: {
        name: name,
        email: email,
        password: password,
        mobile_number: mobile
      }
    };

    submitButton.disabled = true;
    submitButton.textContent = "Signing up...";

    try {
      console.log("Signup request payload:", signupData);
      const response = await fetch("http://localhost:3000/api/v1/users/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(signupData),
        mode: "cors"
      });

      console.log("Signup response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Signup error response (raw):", errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.errors || `Signup failed: ${response.status}`);
        } catch (jsonError) {
          throw new Error(`Signup failed with status ${response.status}: ${errorText}`);
        }
      }

      const result = await response.json();
      console.log("Signup response:", result);

      // Store user data (adjust based on actual response)
      localStorage.setItem("user_id", result.user.id);
      localStorage.setItem("user_name", result.user.name);
      localStorage.setItem("email", result.user.email);
      if (result.token) { // Handle token if returned post-Google auth changes
        localStorage.setItem("token", result.token);
        console.log("Stored token:", localStorage.getItem("token"));
      }

      alert(result.message || "Signup successful!");
      signupForm.reset();
      window.location.href = result.token ? "bookStoreDashboard.html" : "login.html"; // Redirect based on token
    } catch (error) {
      console.error("Signup error:", error);
      alert(error.message || "Failed to signup");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Signup";
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

  const loginTab = document.getElementById("login-tab");
  if (loginTab) {
    loginTab.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }
});