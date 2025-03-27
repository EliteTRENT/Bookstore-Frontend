document.getElementById('reset-password-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const otpField = document.getElementById('otp');
  const newPasswordField = document.getElementById('new-password');
  const otp = otpField.value.trim();
  const newPassword = newPasswordField.value.trim();
  const messageDiv = document.getElementById('message');
  const button = document.querySelector('.reset-btn');

  if (!messageDiv) {
      console.error('Message div not found in HTML');
      return;
  }

  // OTP validation
  const otpRegex = /^\d{6}$/;
  if (!otp) {
      messageDiv.style.color = 'red';
      messageDiv.textContent = 'OTP is required.';
      return;
  } else if (!otpRegex.test(otp)) {
      messageDiv.style.color = 'red';
      messageDiv.textContent = 'OTP must be a 6-digit number.';
      return;
  }

  // Password validation from signup.js
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%#*?&])[A-Za-z\d@$!#%*?&]{8,}$/;
  if (!newPassword) {
      messageDiv.style.color = 'red';
      messageDiv.textContent = 'Password is required.';
      return;
  } else if (!passwordRegex.test(newPassword)) {
      messageDiv.style.color = 'red';
      messageDiv.textContent = 'Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char.';
      return;
  }

  console.log('Checking localStorage for userId...');
  const userId = localStorage.getItem('userId');
  console.log('Retrieved userId:', userId);

  if (!userId) {
      messageDiv.style.color = 'red';
      messageDiv.textContent = 'No user ID found. Please start the reset process again.';
      console.log('userId is null or undefined');
      return;
  }

  button.disabled = true;
  button.textContent = 'Resetting...';

  try {
      const url = `http://localhost:3000/api/v1/users/password/reset/${userId}`;
      console.log('Fetching URL:', url);
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
              user: { 
                  otp: otp,
                  new_password: newPassword // Fixed to match backend expectation
              } 
          }),
      });

      const data = await response.json();
      console.log('Reset Response:', data);

      if (data.success) {
          messageDiv.style.color = 'green';
          messageDiv.textContent = data.message || 'Password reset successful!';
          localStorage.removeItem('userId');
          localStorage.removeItem('resetEmail');
          setTimeout(() => {
              window.location.href = 'login.html';
          }, 2500);
      } else {
          messageDiv.style.color = 'red';
          messageDiv.textContent = data.error || 'Invalid OTP';
      }
  } catch (error) {
      messageDiv.style.color = 'red';
      messageDiv.textContent = 'Network error: Unable to reach server.';
      console.error('Reset Fetch Error:', error);
  } finally {
      button.disabled = false;
      button.textContent = 'RESET PASSWORD';
  }
});

// Real-time validation function
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

// Apply real-time validation to OTP and password fields
const otpField = document.getElementById('otp');
validateField(
  otpField,
  /^\d{6}$/,
  'OTP is required.',
  'OTP must be a 6-digit number.'
);

const newPasswordField = document.getElementById('new-password');
validateField(
  newPasswordField,
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%#*?&])[A-Za-z\d@$!#%*?&]{8,}$/,
  'Password is required.',
  'Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char.'
);

// Password visibility toggle
const togglePassword = document.querySelector('.toggle-password');
if (togglePassword) {
  togglePassword.addEventListener('click', function () {
      if (newPasswordField.type === 'password') {
          newPasswordField.type = 'text';
          togglePassword.classList.remove('fa-eye');
          togglePassword.classList.add('fa-eye-slash');
      } else {
          newPasswordField.type = 'password';
          togglePassword.classList.remove('fa-eye-slash');
          togglePassword.classList.add('fa-eye');
      }
  });
}

function startTimer(durationInSeconds) {
  const countdownSpan = document.getElementById('countdown');
  let timeRemaining = durationInSeconds;

  const updateTimerDisplay = () => {
      const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
      const seconds = String(timeRemaining % 60).padStart(2, '0');
      countdownSpan.textContent = `${minutes}:${seconds}`;
  };

  updateTimerDisplay();

  const countdown = setInterval(() => {
      timeRemaining--;

      if (timeRemaining < 0) {
        clearInterval(countdown);
        countdownSpan.textContent = '00:00';
        document.getElementById('otp').disabled = true;
        document.getElementById('new-password').disabled = true;
        document.querySelector('.reset-btn').disabled = true;
    
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = 'OTP expired. Redirecting to request a new one...';
        }
    
        setTimeout(() => {
            window.location.href = 'forgotPassword.html';
        }, 3000);
    } else {
      updateTimerDisplay();  
    }
  }, 1000);
}

startTimer(117);

