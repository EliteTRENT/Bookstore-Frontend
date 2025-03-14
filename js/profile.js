// Mock user data (to be replaced with backend data)
let userData = {
    name: "John Doe",
    email: "john.doe@example.com",
    mobile: "+91 9876543210",
    addresses: [
        {
            street: "123 Main Street",
            city: "Mumbai",
            state: "Maharashtra",
            zip: "400001"
        }
    ]
};

// Simulate authentication (to be replaced with real logic)
const isAuthenticated = true; // Assume user is logged in for now

if (!isAuthenticated) {
    alert("Please log in to view your profile.");
    // window.location.href = '/login'; // Redirect to Login Page when integrated
} else {
    // Initialize the page with user data
    function renderProfile() {
        document.querySelectorAll('.detail-value[data-field="name"]').forEach(el => el.textContent = userData.name);
        document.querySelectorAll('.detail-value[data-field="email"]').forEach(el => el.textContent = userData.email);
        document.querySelectorAll('.detail-value[data-field="mobile"]').forEach(el => el.textContent = userData.mobile);

        const addressList = document.querySelector('.address-list');
        addressList.innerHTML = '';
        userData.addresses.forEach((address, index) => {
            const addressItem = document.createElement('div');
            addressItem.classList.add('address-item');
            addressItem.innerHTML = `
                <div class="detail-group">
                    <label>Street:</label>
                    <span class="detail-value" data-field="street${index + 1}">${address.street}</span>
                </div>
                <div class="detail-group">
                    <label>City:</label>
                    <span class="detail-value" data-field="city${index + 1}">${address.city}</span>
                </div>
                <div class="detail-group">
                    <label>State:</label>
                    <span class="detail-value" data-field="state${index + 1}">${address.state}</span>
                </div>
                <div class="detail-group">
                    <label>Zip Code:</label>
                    <span class="detail-value" data-field="zip${index + 1}">${address.zip}</span>
                </div>
            `;
            addressList.appendChild(addressItem);
        });
    }

    // Enable edit mode
    document.querySelector('.edit-btn').addEventListener('click', () => {
        document.querySelector('.profile-box').classList.add('edit-mode');

        // Replace spans with inputs
        document.querySelectorAll('.detail-value').forEach(el => {
            const input = document.createElement('input');
            input.classList.add('edit-input');
            input.value = el.textContent;
            input.dataset.field = el.dataset.field;
            el.parentNode.insertBefore(input, el);
            el.style.display = 'none';
        });

        // Add save and cancel buttons
        const buttonContainer = document.querySelector('.profile-box');
        const saveBtn = document.createElement('button');
        saveBtn.classList.add('save-btn');
        saveBtn.textContent = 'Save';
        const cancelBtn = document.createElement('button');
        cancelBtn.classList.add('cancel-btn');
        cancelBtn.textContent = 'Cancel';
        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(cancelBtn);

        // Save changes
        saveBtn.addEventListener('click', () => {
            document.querySelectorAll('.edit-input').forEach(input => {
                const field = input.dataset.field;
                if (field.startsWith('name') || field.startsWith('email') || field.startsWith('mobile')) {
                    userData[field.replace(/\d+/, '')] = input.value;
                } else if (field.startsWith('street') || field.startsWith('city') || field.startsWith('state') || field.startsWith('zip')) {
                    const index = parseInt(field.match(/\d+/)[0]) - 1;
                    const addressField = field.replace(/\d+/, '');
                    userData.addresses[index][addressField] = input.value;
                }
                const span = input.previousElementSibling;
                span.textContent = input.value;
            });

            // Clean up
            document.querySelector('.profile-box').classList.remove('edit-mode');
            document.querySelectorAll('.edit-input').forEach(el => el.remove());
            document.querySelectorAll('.save-btn, .cancel-btn').forEach(el => el.remove());
        });

        // Cancel editing
        cancelBtn.addEventListener('click', () => {
            document.querySelector('.profile-box').classList.remove('edit-mode');
            document.querySelectorAll('.edit-input').forEach(el => el.remove());
            document.querySelectorAll('.save-btn, .cancel-btn').forEach(el => el.remove());
            renderProfile(); // Re-render original data
        });
    });

    // Add new address
    document.querySelector('.add-address-btn').addEventListener('click', () => {
        const newAddress = {
            street: `New Street ${userData.addresses.length + 1}`,
            city: "New City",
            state: "New State",
            zip: "000000"
        };
        userData.addresses.push(newAddress);
        renderProfile();
    });

    // Initial render
    renderProfile();
}