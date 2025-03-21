// orderSuccessful.js

// Profile Dropdown Functionality
function updateProfileUI() {
    const userName = localStorage.getItem("user_name") || "User";
    const firstName = userName.split(" ")[0];

    const profileIcon = document.getElementById("profileDropdownTrigger");
    if (profileIcon) {
        profileIcon.innerHTML = `<i class="fas fa-user"></i> ${firstName}`;
    } else {
        console.warn("Profile dropdown trigger element not found in the DOM.");
        return;
    }

    let profileDropdown = document.querySelector(".bookstore-dash__profile-dropdown");
    if (!profileDropdown) {
        profileDropdown = document.createElement("div");
        profileDropdown.className = "bookstore-dash__profile-dropdown";
        const header = document.querySelector(".bookstore-dash__header");
        if (header) {
            header.appendChild(profileDropdown);
        } else {
            console.warn("Header element not found in the DOM.");
            return;
        }
    }

    profileDropdown.innerHTML = `
        <div class="bookstore-dash__profile-item">Hello, ${userName}</div>
        <div class="bookstore-dash__profile-item bookstore-dash__profile-profile"><i class="fas fa-user"></i> Profile</div>
        <div class="bookstore-dash__profile-item bookstore-dash__profile-orders"><i class="fas fa-shopping-bag"></i> My Orders</div>
        <div class="bookstore-dash__profile-item bookstore-dash__profile-wishlist"><i class="fas fa-heart"></i> My Wishlist</div>
        <div class="bookstore-dash__profile-item bookstore-dash__profile-logout">Logout</div>
    `;

    profileIcon.addEventListener("click", (e) => {
        e.preventDefault();
        profileDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove("active");
        }
    });

    const profileItem = profileDropdown.querySelector(".bookstore-dash__profile-profile");
    if (profileItem) {
        profileItem.addEventListener("click", () => {
            window.location.href = "../pages/profile.html";
        });
    }

    const ordersItem = profileDropdown.querySelector(".bookstore-dash__profile-orders");
    if (ordersItem) {
        ordersItem.addEventListener("click", () => {
            window.location.href = "../pages/bookOrders.html";
        });
    }

    const wishlistItem = profileDropdown.querySelector(".bookstore-dash__profile-wishlist");
    if (wishlistItem) {
        wishlistItem.addEventListener("click", () => {
            window.location.href = "../pages/bookWishlist.html";
        });
    }

    const logoutItem = profileDropdown.querySelector(".bookstore-dash__profile-logout");
    if (logoutItem) {
        logoutItem.addEventListener("click", () => {
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");
            localStorage.removeItem("token");
            localStorage.removeItem("email");
            localStorage.removeItem("mobile_number");
            updateProfileUI();
            window.location.href = "../pages/login.html";
        });
    }
}

// Initial Setup
document.addEventListener("DOMContentLoaded", () => {
    updateProfileUI();
    // Add event listener for Continue Shopping button
    document.querySelector(".continue-button").addEventListener("click", () => {
        window.location.href = "../pages/bookStoreDashboard.html";
    });
});