document.getElementById('reset-password-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const messageDiv = document.getElementById('message');
    const button = document.querySelector('.reset-btn');

    if (!messageDiv) {
        console.error('Message div not found in HTML');
        return;
    }

    button.disabled = true;
    button.textContent = 'Sending...';

    try {
        const response = await fetch('http://localhost:3000/api/v1/users/forget', {
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
            if (data.user_id) { // Assuming backend returns user_id
                localStorage.setItem('userId', data.user_id);
                localStorage.setItem('resetEmail', email); // Still useful for resend OTP
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