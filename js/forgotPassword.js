// Check if window.env is loaded
if (!window.env || !window.env.BACKEND_URL) {
    console.error("Environment variables not loaded. Ensure env.js is included before this script.");
    throw new Error("BACKEND_URL is not defined. Check env.js loading.");
  }
  
  document.getElementById('reset-password-form').addEventListener('submit', async function (e) {
      e.preventDefault();
  
      const emailField = document.getElementById('email');
      const email = emailField.value.trim(); // Trim whitespace
      const messageDiv = document.getElementById('message');
      const button = document.querySelector('.reset-btn');
  
      if (!messageDiv) {
          console.error('Message div not found in HTML');
          return;
      }
  
      // Email validation from signup.js
      const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/;
      if (!email) {
          messageDiv.style.color = 'red';
          messageDiv.textContent = 'Email is required.';
          return;
      } else if (!emailRegex.test(email)) {
          messageDiv.style.color = 'red';
          messageDiv.textContent = 'Email must end with @gmail, @yahoo, or @ask and have a valid domain.';
          return;
      }
  
      button.disabled = true;
      button.textContent = 'Sending...';
  
      try {
          const response = await fetch(`${window.env.BACKEND_URL}/api/v1/users/password/forgot`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ user: { email: email } }),
          });
  
          const data = await response.json();
          console.log('Response:', data);
  
          if (data.success) {
              messageDiv.style.color = 'green';
              messageDiv.textContent = data.message;
              // Store user ID and email in localStorage
              if (data.user_id) {
                  localStorage.setItem('userId', data.user_id);
                  localStorage.setItem('resetEmail', email);
              } else {
                  console.error('User ID not returned from backend');
              }
              // Redirect after 2.5 seconds
              setTimeout(() => {
                  window.location.href = 'resetPassword.html';
              }, 2500);
          } else {
              messageDiv.style.color = 'red';
              messageDiv.textContent = data.error ? data.error : 'Unknown error occurred.';
          }
      } catch (error) {
          messageDiv.style.color = 'red';
          messageDiv.textContent = 'Network error: Unable to reach server.';
          console.error('Fetch Error:', error);
      } finally {
          button.disabled = false;
          button.textContent = 'RESET PASSWORD';
      }
  });
  
  // Real-time validation function from signup.js
  function validateField(field, regex, emptyMessage, invalidMessage) {
      field.addEventListener('input', () => {
          const value = field.value.trim();
          if (!value) {
              field.setCustomValidity(emptyMessage);
          } else if (!regex.test(value)) {
              field.setCustomValidity(invalidMessage);
          } else {
              field.setCustomValidity('');
          }
          field.reportValidity();
      });
  }
  
  // Apply real-time validation to email field
  const emailField = document.getElementById('email');
  validateField(
      emailField,
      /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|ask)\.[a-zA-Z]{2,}$/,
      'Email is required.',
      'Email must end with @gmail, @yahoo, or @ask and have a valid domain.'
  );