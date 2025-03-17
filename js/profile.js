// Mock user data
let userData = {
    name: "Ved Prakash",
    email: "Ved2002@gmail.com",
    mobile: "+91 7888465372",
    addresses: [
        {
            street: "Connaught Place Market",
            city: "New Delhi",
            state: "New Delhi",
            zip: "100134"
        }
    ]
};

// Simulate authentication
const isAuthenticated = true;

if (!isAuthenticated) {
    alert("Please log in to view your profile.");
} else {
    function renderProfile() {
        const profileDetails = document.querySelector('.profile-details');
        profileDetails.innerHTML = `
            <div class="detail-group">
                <label>Full Name:</label>
                <span class="detail-value" data-field="name">${userData.name}</span>
            </div>
            <div class="detail-group">
                <label>Email:</label>
                <span class="detail-value" data-field="email">${userData.email}</span>
            </div>
            <div class="detail-group">
                <label>Mobile Number:</label>
                <span class="detail-value" data-field="mobile">${userData.mobile}</span>
            </div>
        `;

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

    document.querySelector('.edit-btn').addEventListener('click', () => {
        document.querySelector('.profile-box').classList.add('edit-mode');

        document.querySelectorAll('.detail-value').forEach(el => {
            const input = document.createElement('input');
            input.classList.add('edit-input');
            input.value = el.textContent;
            input.dataset.field = el.dataset.field;
            el.parentNode.insertBefore(input, el);
            el.style.display = 'none';
        });

        const buttonContainer = document.querySelector('.profile-box');
        const saveBtn = document.createElement('button');
        saveBtn.classList.add('save-btn');
        saveBtn.textContent = 'Save';
        const cancelBtn = document.createElement('button');
        cancelBtn.classList.add('cancel-btn');
        cancelBtn.textContent = 'Cancel';
        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(cancelBtn);

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
            });

            document.querySelector('.profile-box').classList.remove('edit-mode');
            document.querySelectorAll('.edit-input').forEach(el => el.remove());
            document.querySelectorAll('.save-btn, .cancel-btn').forEach(el => el.remove());
            renderProfile();
        });

        cancelBtn.addEventListener('click', () => {
            document.querySelector('.profile-box').classList.remove('edit-mode');
            document.querySelectorAll('.edit-input').forEach(el => el.remove());
            document.querySelectorAll('.save-btn, .cancel-btn').forEach(el => el.remove());
            renderProfile();
        });
    });

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

    renderProfile();
}

// Profile Dropdown Functionality
const profileIcon = document.querySelector('#profileDropdownTrigger');
const profileDropdown = document.createElement('div');
profileDropdown.className = 'bookstore-dash__profile-dropdown';
profileDropdown.innerHTML = `
    <div class="bookstore-dash__profile-item">Hello User,</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-user"></i> Profile</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-shopping-bag"></i> My Orders</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-heart"></i> My Wishlist</div>
    <div class="bookstore-dash__profile-item bookstore-dash__profile-logout">Logout</div>
`;

document.querySelector('.bookstore-dash__header').appendChild(profileDropdown);

profileIcon.addEventListener('click', (e) => {
    e.preventDefault();
    profileDropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('active');
    }
});