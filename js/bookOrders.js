const BASE_URL = "http://127.0.0.1:3000";

// DOM Elements
const ordersContainer = document.getElementById("ordersContainer");
const loginPrompt = document.getElementById("loginPrompt");
const orderItems = document.getElementById("orderItems");
const ordersList = document.getElementById("ordersList");
const ordersTitle = document.getElementById("ordersTitle");
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
        if (header) header.appendChild(profileDropdown);
    }

    profileDropdown.innerHTML = `
        <div class="bookstore-dash__profile-item">Hello, ${userName}</div>
        <div class="bookstore-dash__profile-item bookstore-dash__profile-profile"><i class="fas fa-user"></i> Profile</div>
        <div class="bookstore-dash__profile-item bookstore-dash__profile-orders"><i class="fas fa-shopping-bag"></i> My Orders</div>
        <div class="bookstore-dash__profile-item"><i class="fas fa-heart"></i> My Wishlist</div>
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

    const wishlistItem = profileDropdown.querySelector(".bookstore-dash__profile-item:nth-child(4)");
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

// Fetch Orders from Backend
function fetchOrders() {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");

    if (!token || !userId) {
        showLoginPrompt();
        return;
    }

    fetch(`${BASE_URL}/api/v1/orders`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
        .then((response) => {
            if (!response.ok) {
                return response.json().then((err) => {
                    throw new Error(err.error || err.errors || `HTTP error! Status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then((data) => {
            console.log("Orders Data:", data);
            if (Array.isArray(data.orders)) {
                renderOrders(data.orders);
            } else {
                renderOrders([]);
            }
        })
        .catch((error) => {
            console.error("Error fetching orders:", error.message);
            if (error.message.includes("401")) {
                alert("Session expired or invalid token. Please log in again.");
                localStorage.removeItem("user_id");
                localStorage.removeItem("user_name");
                localStorage.removeItem("token");
                window.location.reload();
            } else if (error.message.includes("No orders found")) {
                renderOrders([]);
            } else {
                ordersList.innerHTML = `<p>Error loading orders: ${error.message}</p>`;
                showOrderItems();
            }
        });
}

// Render Orders
function renderOrders(orders) {
    ordersList.innerHTML = "";
    ordersTitle.textContent = `My Orders (${orders.length})`;
    console.log("Orders received:", orders);

    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="orders-empty">
                <h2>You Have No Orders</h2>
                <p>Place an order to see it here!</p>
                <div class="orders-icon">
                    <i class="fa-solid fa-box"></i>
                    <i class="fa-solid fa-receipt orders-receipt"></i>
                </div>
            </div>
        `;
        showOrderItems();
        return;
    }

    orders.forEach((order) => {
        console.log("Fetching book for order:", order.id, "Book ID:", order.book_id);
        fetch(`${BASE_URL}/api/v1/books/show/${order.book_id}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        })
            .then((response) => {
                console.log("Book fetch status:", response.status);
                if (!response.ok) {
                    return response.json().then((err) => {
                        throw new Error(err.error || `HTTP error! Status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then((bookData) => {
                console.log("Book data received:", JSON.stringify(bookData, null, 2));
                const book = bookData.book || {};
                const orderItem = document.createElement("div");
                orderItem.className = "order-item";
                orderItem.dataset.orderId = order.id;

                const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit"
                });

                const statusMap = {
                    "pending": "Order Placed",
                    "processing": "Processing",
                    "shipped": "Shipped",
                    "delivered": "Delivered",
                    "cancelled": "Cancelled"
                };
                const statusText = statusMap[order.status] || order.status;

                // Convert prices to numbers with fallbacks
                const totalPrice = Number(order.total_price) || 0;
                const mrp = Number(book.mrp) || totalPrice; // Use totalPrice if mrp is invalid

                orderItem.innerHTML = `
                    <div class="order-content">
                        <img src="${book.book_image || "https://via.placeholder.com/100x150/a52a2a/ffffff?text=" + encodeURIComponent(book.name || "No Image")}" alt="${book.name || "Book"}" class="order-book-image">
                        <div class="order-book-details">
                            <h3 class="order-book-title">${book.name || "Unknown Title"}</h3>
                            <p class="order-book-author">by ${book.author || "Unknown Author"}</p>
                            <p class="order-book-price">
                                Rs. ${totalPrice.toFixed(2)}
                                <span class="order-book-original-price">Rs. ${mrp.toFixed(2)}</span>
                            </p>
                        </div>
                        <div class="order-status ${order.status}">
                            <span class="status-dot"></span>
                            <span class="status-text">${statusText} on ${orderDate}</span>
                        </div>
                    </div>
                `;
                ordersList.appendChild(orderItem);
                console.log("Order item added:", orderItem.outerHTML);
            })
            .catch((error) => {
                console.error("Error fetching book for order:", order.id, "Error:", error.message);
                const orderItem = document.createElement("div");
                orderItem.className = "order-item";
                orderItem.dataset.orderId = order.id;

                const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit"
                });

                const statusMap = {
                    "pending": "Order Placed",
                    "processing": "Processing",
                    "shipped": "Shipped",
                    "delivered": "Delivered",
                    "cancelled": "Cancelled"
                };
                const statusText = statusMap[order.status] || order.status;

                const totalPrice = Number(order.total_price) || 0;

                orderItem.innerHTML = `
                    <div class="order-content">
                        <img src="https://via.placeholder.com/100x150" alt="Error" class="order-book-image">
                        <div class="order-book-details">
                            <h3 class="order-book-title">Book Details Unavailable</h3>
                            <p class="order-book-price">Rs. ${totalPrice.toFixed(2)}</p>
                        </div>
                        <div class="order-status ${order.status}">
                            <span class="status-dot"></span>
                            <span class="status-text">${statusText} on ${orderDate}</span>
                        </div>
                    </div>
                `;
                ordersList.appendChild(orderItem);
                console.log("Fallback order item added:", orderItem.outerHTML);
            });
    });

    showOrderItems();
}

// Show Login Prompt
function showLoginPrompt() {
    if (loginPrompt && orderItems) {
        loginPrompt.style.display = "block";
        orderItems.style.display = "none";
    }
}

// Show Order Items
function showOrderItems() {
    if (loginPrompt && orderItems) {
        loginPrompt.style.display = "none";
        orderItems.style.display = "block";
    }
}

// Initial Setup
document.addEventListener("DOMContentLoaded", () => {
    setupProfileDropdown();

    const userId = localStorage.getItem("user_id");
    const token = localStorage.getItem("token");

    if (userId && token) {
        fetchOrders();
    } else {
        showLoginPrompt();
    }

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            window.location.href = "../pages/login.html";
        });
    }
});