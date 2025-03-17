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