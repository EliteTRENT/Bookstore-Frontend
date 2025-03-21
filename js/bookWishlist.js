const BASE_URL = "http://127.0.0.1:3000";

// DOM Elements
const wishlistContainer = document.getElementById("wishlistContainer");
const loginPrompt = document.getElementById("loginPrompt");
const wishlistItems = document.getElementById("wishlistItems");
const wishlistBooks = document.getElementById("wishlistBooks");
const wishlistTitle = document.getElementById("wishlistTitle");
const loginBtn = document.getElementById("loginBtn");
const profileIcon = document.getElementById("profileDropdownTrigger");

// Profile Dropdown Functionality 
function setupProfileDropdown() {
    const userName = localStorage.getItem("user_name") || "User";
    const firstName = userName.split(" ")[0];

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

    // Toggle dropdown on click
    profileIcon.addEventListener("click", (e) => {
        e.preventDefault();
        profileDropdown.classList.toggle("active");
    });

    // Close dropdown when clicking outside
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

    // Navigate to wishlist
    const wishlistItem = profileDropdown.querySelector(".bookstore-dash__profile-wishlist");
    if (wishlistItem) {
        wishlistItem.addEventListener("click", () => {
            window.location.href = "../pages/bookWishlist.html";
        });
    }

    // Logout functionality
    const logoutItem = profileDropdown.querySelector(".bookstore-dash__profile-logout");
    if (logoutItem) {
        logoutItem.addEventListener("click", () => {
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");
            localStorage.removeItem("token");
            window.location.href = "../pages/login.html";
        });
    }
}

// Fetch Wishlist Items
function fetchWishlist() {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");

    console.log("Fetching wishlist...");
    console.log("User ID:", userId);
    console.log("Token:", token);

    if (!token || !userId) {
        console.log("User not logged in. Showing login prompt.");
        showLoginPrompt();
        return;
    }

    console.log("User is logged in. Fetching wishlist data...");

    fetch(`${BASE_URL}/api/v1/wishlists/getAll`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
        .then((response) => {
            console.log("Wishlist Fetch API Response Status:", response.status);
            if (!response.ok) {
                return response.json().then((err) => {
                    throw new Error(err.error || `HTTP error! Status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then((data) => {
            console.log("Wishlist API Response:", data);
            if (data.message && Array.isArray(data.message)) {
                console.log("Rendering wishlist with", data.message.length, "items.");
                renderWishlist(data.message);
            } else {
                console.log("Invalid response format. Treating as empty wishlist.");
                renderWishlist([]);
            }
        })
        .catch((error) => {
            console.error("Error fetching wishlist:", error.message);
            if (error.message.includes("401")) {
                console.log("Unauthorized: Token might be invalid or expired.");
                alert("Session expired or invalid token. Please log in again.");
                localStorage.removeItem("user_id");
                localStorage.removeItem("user_name");
                localStorage.removeItem("token");
                window.location.reload();
            } else {
                console.log("Showing error message on wishlist page.");
                if (wishlistBooks) {
                    wishlistBooks.innerHTML = `<p>Error loading wishlist: ${error.message}</p>`;
                } else {
                    console.warn("wishlistBooks element not found in the DOM.");
                }
                showWishlistItems();
            }
        });
}

// Render Wishlist Items
function renderWishlist(wishlists) {
    if (!wishlistBooks || !wishlistTitle) {
        console.warn("wishlistBooks or wishlistTitle element not found in the DOM.");
        return;
    }

    wishlistBooks.innerHTML = "";
    wishlistTitle.textContent = `My Wishlist (${wishlists.length})`;

    if (wishlists.length === 0) {
        wishlistBooks.innerHTML = `
            <div class="wishlist-empty">
                <h2>Your Wishlist is Empty</h2>
                <p>Add some books to your wishlist to see them here!</p>
                <div class="wishlist-icon">
                    <i class="fa-regular fa-file-lines"></i>
                    <i class="fa-solid fa-heart wishlist-heart"></i>
                </div>
            </div>
        `;
        showWishlistItems();
        return;
    }

    wishlists.forEach((wishlist) => {
        const book = wishlist.book;
        const wishlistItem = document.createElement("div");
        wishlistItem.className = "wishlist-book";
        wishlistItem.dataset.wishlistId = wishlist.id;

        if (!book || !book.id) {
            console.warn("Wishlist item is missing book data:", wishlist);
            return;
        }

        wishlistItem.dataset.bookId = book.id;
        wishlistItem.innerHTML = `
            <img src="${book.book_image || "https://via.placeholder.com/100x150/a52a2a/ffffff?text=" + encodeURIComponent(book.name || "No Image")}" alt="${book.name || "Book"}" class="wishlist-book-image">
            <div class="wishlist-book-details">
                <h3 class="wishlist-book-title">${book.name || "Unknown Title"}</h3>
                <p class="wishlist-book-author">by ${book.author || "Unknown Author"}</p>
                <p class="wishlist-book-price">
                    Rs. ${book.discounted_price ? parseFloat(book.discounted_price).toFixed(2) : "0.00"} 
                    <span class="wishlist-book-original-price">Rs. ${book.mrp ? parseFloat(book.mrp).toFixed(2) : "0.00"}</span>
                </p>
            </div>
            <button class="delete-wishlist-btn" title="Remove from wishlist">
                <i class="fas fa-trash"></i>
            </button>
        `;
        wishlistBooks.appendChild(wishlistItem);
    });

    // Add delete event listeners
    document.querySelectorAll(".delete-wishlist-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const wishlistItem = e.target.closest(".wishlist-book");
            const wishlistId = wishlistItem.dataset.wishlistId;
            deleteWishlistItem(wishlistId);
        });
    });

    showWishlistItems();
}

// Delete Wishlist Item
function deleteWishlistItem(wishlistId) {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");

    console.log("Deleting wishlist item...");
    console.log("User ID:", userId);
    console.log("Token:", token);
    console.log("Wishlist ID:", wishlistId);

    if (!token || !userId) {
        console.log("User is not logged in. Redirecting to login page.");
        alert("Please log in to remove items from your wishlist.");
        window.location.href = "../pages/login.html";
        return;
    }

    if (!wishlistId) {
        console.error("Wishlist ID is missing. Cannot delete item.");
        alert("Cannot delete this item due to missing data.");
        return;
    }

    if (confirm("Are you sure you want to remove this book from your wishlist?")) {
        fetch(`${BASE_URL}/api/v1/wishlists/destroyByWishlistId/${wishlistId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })
            .then((response) => {
                console.log("Wishlist Delete API Response Status:", response.status);
                if (!response.ok) {
                    return response.json().then((err) => {
                        throw new Error(err.error || `HTTP error! Status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then((data) => {
                console.log("Delete Wishlist Response:", data);
                if (data.message) {
                    alert("Book removed from wishlist!");
                    fetchWishlist(); // Refresh wishlist
                } else {
                    alert("Error removing book from wishlist.");
                }
            })
            .catch((error) => {
                console.error("Error deleting wishlist item:", error.message);
                if (error.message.includes("401")) {
                    console.log("Unauthorized: Token might be invalid or expired.");
                    alert("Session expired or invalid token. Please log in again.");
                    localStorage.removeItem("user_id");
                    localStorage.removeItem("user_name");
                    localStorage.removeItem("token");
                    window.location.href = "../pages/login.html";
                } else {
                    alert("Failed to remove book from wishlist: " + error.message);
                }
            });
    }
}

// Show Login Prompt
function showLoginPrompt() {
    if (loginPrompt && wishlistItems) {
        loginPrompt.style.display = "block";
        wishlistItems.style.display = "none";
    } else {
        console.warn("loginPrompt or wishlistItems element not found in the DOM.");
    }
}

// Show Wishlist Items
function showWishlistItems() {
    if (loginPrompt && wishlistItems) {
        loginPrompt.style.display = "none";
        wishlistItems.style.display = "block";
    } else {
        console.warn("loginPrompt or wishlistItems element not found in the DOM.");
    }
}

// Initial Setup
document.addEventListener("DOMContentLoaded", () => {
    setupProfileDropdown();

    // Check login status
    const userId = localStorage.getItem("user_id");
    const token = localStorage.getItem("token");

    if (userId && token) {
        fetchWishlist();
    } else {
        showLoginPrompt();
    }

    // Login button redirect
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            window.location.href = "../pages/login.html";
        });
    } else {
        console.warn("loginBtn element not found in the DOM.");
    }
});