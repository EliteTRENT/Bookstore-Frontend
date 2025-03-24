document.getElementById('reset-password-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const otp = document.getElementById('otp').value;
  const newPassword = document.getElementById('new-password').value;
  const messageDiv = document.getElementById('message');
  const button = document.querySelector('.reset-btn');

  if (!messageDiv) {
      console.error('Message div not found in HTML');
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
      const url = `http://localhost:3000/api/v1/users/reset/${userId}`; 
      console.log('Fetching URL:', url);
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
              user: { 
                  otp: otp,
                  new_password: newPassword 
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
          messageDiv.textContent = data.error || 'Failed to reset password.';
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