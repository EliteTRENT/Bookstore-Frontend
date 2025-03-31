const BASE_URL = "http://127.0.0.1:3000";

// DOM Elements
const wishlistContainer = document.getElementById("wishlistContainer");
const loginPrompt = document.getElementById("loginPrompt");
const wishlistItems = document.getElementById("wishlistItems");
const wishlistBooks = document.getElementById("wishlistBooks");
const wishlistTitle = document.getElementById("wishlistTitle");
const loginBtn = document.getElementById("loginBtn");
const profileIcon = document.getElementById("profileDropdownTrigger");
const cartIcon = document.getElementById("cartIcon");

// Token Management
let token = localStorage.getItem("token");
const refreshToken = localStorage.getItem("refresh_token");

async function refreshAccessToken() {
    if (!refreshToken) {
        localStorage.clear();
        setupProfileDropdown();
        window.location.href = "../pages/login.html";
        return false;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/v1/sessions/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.errors || `Refresh failed with status: ${response.status}`);
        }

        token = data.token;
        localStorage.setItem("token", token);
        return true;
    } catch (error) {
        localStorage.clear();
        setupProfileDropdown();
        window.location.href = "../pages/login.html";
        return false;
    }
}

// Profile Dropdown Functionality 
function setupProfileDropdown() {
    const userName = localStorage.getItem("user_name") || "Guest";
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
            window.location.href = "../pages/login.html";
        });
    }
}

// Fetch and update cart count
async function updateCartCount() {
    const userId = localStorage.getItem("user_id");

    if (!userId || !token || !cartIcon) return;

    let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
    try {
        let response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, {
            method: "GET",
            headers: headers
        });

        if (response.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                headers.Authorization = `Bearer ${token}`;
                response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, {
                    method: "GET",
                    headers: headers
                });
            } else {
                return;
            }
        }

        if (!response.ok) {
            throw new Error("Failed to fetch cart data");
        }

        const data = await response.json();
        const cartCount = data.cart?.length || 0;
        cartIcon.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (${cartCount})`;
    } catch (error) {
        cartIcon.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (0)`;
    }
}

// Fetch Wishlist Items
async function fetchWishlist() {
    const userId = localStorage.getItem("user_id");

    if (!token || !userId) {
        showLoginPrompt();
        return;
    }

    let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
    try {
        let response = await fetch(`${BASE_URL}/api/v1/wishlists`, {
            method: "GET",
            headers: headers
        });

        if (response.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                headers.Authorization = `Bearer ${token}`;
                response = await fetch(`${BASE_URL}/api/v1/wishlists`, {
                    method: "GET",
                    headers: headers
                });
            } else {
                return;
            }
        }

        if (!response.ok) {
            return response.json().then((err) => {
                throw new Error(err.error || `HTTP error! Status: ${response.status}`);
            });
        }

        const data = await response.json();
        if (data.message && Array.isArray(data.message)) {
            renderWishlist(data.message);
        } else {
            renderWishlist([]);
        }
    } catch (error) {
        if (error.message.includes("401")) {
            alert("Session expired or invalid token. Please log in again.");
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");
            localStorage.removeItem("token");
            window.location.reload();
        } else {
            if (wishlistBooks) {
                wishlistBooks.innerHTML = `<p>Error loading wishlist: ${error.message}</p>`;
            }
            showWishlistItems();
        }
    }
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
async function deleteWishlistItem(wishlistId) {
    const userId = localStorage.getItem("user_id");

    if (!token || !userId) {
        alert("Please log in to remove items from your wishlist.");
        window.location.href = "../pages/login.html";
        return;
    }

    if (!wishlistId) {
        alert("Cannot delete this item due to missing data.");
        return;
    }

    if (confirm("Are you sure you want to remove this book from your wishlist?")) {
        let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
        try {
            let response = await fetch(`${BASE_URL}/api/v1/wishlists/${wishlistId}`, {
                method: "PATCH",
                headers: headers
            });

            if (response.status === 401) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    headers.Authorization = `Bearer ${token}`;
                    response = await fetch(`${BASE_URL}/api/v1/wishlists/${wishlistId}`, {
                        method: "PATCH",
                        headers: headers
                    });
                } else {
                    return;
                }
            }

            if (!response.ok) {
                return response.json().then((err) => {
                    throw new Error(err.error || `HTTP error! Status: ${response.status}`);
                });
            }

            const data = await response.json();
            if (data.message) {
                alert("Book removed from wishlist!");
                fetchWishlist();
            } else {
                alert("Error removing book from wishlist.");
            }
        } catch (error) {
            if (error.message.includes("401")) {
                alert("Session expired or invalid token. Please log in again.");
                localStorage.removeItem("user_id");
                localStorage.removeItem("user_name");
                localStorage.removeItem("token");
                window.location.href = "../pages/login.html";
            } else {
                alert("Failed to remove book from wishlist: " + error.message);
            }
        }
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

    const userId = localStorage.getItem("user_id");

    if (userId && token) {
        fetchWishlist();
        updateCartCount();
    } else {
        showLoginPrompt();
    }

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            window.location.href = "../pages/login.html";
        });
    } else {
        console.warn("loginBtn element not found in the DOM.");
    }

    if (cartIcon) {
        cartIcon.addEventListener("click", () => {
            window.location.href = "../pages/mycart.html";
        });
    }

    document.querySelector(".bookstore-dash__logo").addEventListener("click", () => {
        window.location.href = "../pages/bookStoreDashboard.html";
    });
});