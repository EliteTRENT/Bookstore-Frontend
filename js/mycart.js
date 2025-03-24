// API Base URL
const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
        alert("Please log in to view your cart.");
        window.location.href = '/pages/login.html';
        return;
    }

    setupUIEventListeners();
    updateProfileUI();
    await loadCartItems(userId);
});

function setupUIEventListeners() {
    const cartIcon = document.getElementById('cartIcon');
    const placeOrderBtn = document.querySelector('.place-order');
    const profileTrigger = document.getElementById('profileDropdownTrigger');
    const profileDropdown = document.getElementById('profileDropdown');

    if (cartIcon) {
        cartIcon.addEventListener('click', () => {
            alert('You are already on the cart page!');
        });
    }

    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', () => {
            const cartItemCount = parseInt(document.getElementById('cartItemCount').textContent, 10);
            if (cartItemCount === 0) {
                alert('Your cart is empty. Please add items to proceed.');
                return;
            }
            window.location.href = '/pages/customerdetails.html';
        });
    }

    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            profileDropdown.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!profileTrigger.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove("active");
            }
        });
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function updateCartCount(count) {
    const headerCount = document.querySelector('#cartIcon');
    const sectionCount = document.getElementById('cartItemCount');
    if (headerCount) headerCount.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (${count})`;
    if (sectionCount) sectionCount.textContent = count;
}

async function loadCartItems(userId) {
    const cartContainer = document.getElementById('cartItemsList');
    if (!cartContainer) return;

    cartContainer.innerHTML = '<p>Loading cart...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/carts/${userId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Session expired. Please log in again.");
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                updateProfileUI();
                window.location.href = '/pages/login.html';
                return;
            }
            throw new Error(`Error ${response.status}: Failed to fetch cart items`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch cart items');
        }

        renderCartItems(data.cart || []);
        updateCartCount(data.cart?.length || 0);
        setupCartEventListeners();
        updateCartSummary(data.cart || []);
    } catch (error) {
        cartContainer.innerHTML = `<p>Error loading cart: ${error.message}</p>`;
    }
}

function renderCartItems(cartItems) {
    const cartContainer = document.getElementById('cartItemsList');
    if (!cartContainer) return;

    if (!cartItems || cartItems.length === 0) {
        cartContainer.innerHTML = `<p>Your cart is empty.</p>`;
        updateCartCount(0);
        updateCartSummary([]);
        return;
    }

    cartContainer.innerHTML = cartItems.map(item => {
        const totalPrice = (item.price * (item.quantity || 1)).toFixed(2);
        return `
        <div class="cart-item" data-id="${item.book_id}" data-cart-id="${item.cart_id}" data-price="${item.price}">
            <img src="${item.image_url || 'https://via.placeholder.com/150'}" alt="${item.book_name || 'Unknown'}" class="cart-item-image">
            <div class="cart-item-details">
                <h3>${item.book_name || 'Untitled'}</h3>
                <p>by ${item.author_name || 'Unknown'}</p>
                <div class="cart-item-price">
                    <span class="current-price">Rs. ${totalPrice}</span>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity">
                        <button class="quantity-btn decrease">-</button>
                        <input type="text" class="quantity-input" value="${item.quantity || 1}" readonly>
                        <button class="quantity-btn increase">+</button>
                    </div>
                    <button class="remove-btn">Remove</button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function setupCartEventListeners() {
    const increaseButtons = document.querySelectorAll('.increase');
    const decreaseButtons = document.querySelectorAll('.decrease');
    const removeButtons = document.querySelectorAll('.remove-btn');

    increaseButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            updateQuantity(this, 1);
        });
    });

    decreaseButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            updateQuantity(this, -1);
        });
    });

    removeButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            removeCartItem(this);
        });
    });
}

async function updateQuantity(button, change) {
    const cartItem = button.closest('.cart-item');
    if (!cartItem) {
        alert("Error: Cart item not found.");
        return;
    }

    const bookId = cartItem.dataset.id;
    const userId = localStorage.getItem('user_id');
    const quantityElement = cartItem.querySelector('.quantity-input');
    const priceElement = cartItem.querySelector('.current-price');

    if (!bookId || !userId || !quantityElement || !priceElement) {
        alert("Error: Missing required elements.");
        return;
    }

    let currentQuantity = parseInt(quantityElement.value, 10);

    if (isNaN(currentQuantity)) {
        alert("Error: Invalid quantity.");
        return;
    }

    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
        await removeCartItem(button);
        return;
    }

    const perUnitPrice = parseFloat(cartItem.dataset.price);
    if (isNaN(perUnitPrice)) {
        alert("Error: Invalid price.");
        return;
    }

    try {
        const requestBody = {
            cart: {
                book_id: bookId,
                quantity: newQuantity
            }
        };

        const response = await fetch(`${API_BASE_URL}/carts/update_quantity`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestBody)
        });

        const rawResponse = await response.text();
        let data;
        try {
            data = JSON.parse(rawResponse);
        } catch (parseError) {
            throw new Error('Failed to parse response from server');
        }

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${data.error || 'Failed to update quantity'}`);
        }

        if (!data.success) {
            throw new Error(data.error || "Failed to update quantity");
        }

        await loadCartItems(userId);
    } catch (error) {
        alert(`Failed to update quantity: ${error.message}`);
        quantityElement.value = currentQuantity;
    }
}

async function removeCartItem(button) {
    const cartItem = button.closest('.cart-item');
    const bookId = cartItem.dataset.id;
    const userId = localStorage.getItem('user_id');

    if (!bookId) {
        alert("Error: Book ID not found.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/remove_book/${bookId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.status === 404) {
            try {
                await loadCartItems(userId);
            } catch (loadError) {
                alert("Item already removed, but failed to reload cart: " + loadError.message);
            }
            return;
        }

        if (response.status !== 204 && response.status !== 200) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (parseError) {
                throw new Error(`HTTP error ${response.status}: ${errorText || 'Failed to remove item'}`);
            }
            throw new Error(`HTTP error ${response.status}: ${errorData.error || 'Failed to remove item'}`);
        }

        if (response.status === 200) {
            const text = await response.text();
            if (!text) {
                throw new Error("Empty response body");
            }
            const data = JSON.parse(text);
            if (data.message && (data.message.includes("Book not found in cart") || data.message.includes("already removed"))) {
                try {
                    await loadCartItems(userId);
                } catch (loadError) {
                    alert("Item already removed, but failed to reload cart: " + loadError.message);
                }
                return;
            }
            if (!data.message || !data.message.includes("Book removed from cart")) {
                throw new Error(data.error || "Failed to remove item");
            }
        }

        try {
            await loadCartItems(userId);
        } catch (loadError) {
            alert("Item removed, but failed to reload cart: " + loadError.message);
        }
    } catch (error) {
        alert("Failed to remove item: " + error.message);
    }
}

function updateCartSummary(cartItems) {
    const totalPriceElement = document.getElementById('cart-total');
    if (!totalPriceElement) return;

    if (!cartItems || cartItems.length === 0) {
        totalPriceElement.textContent = '0';
        return;
    }

    const totalPrice = cartItems.reduce((sum, item) => {
        return sum + (item.price * (item.quantity || 1));
    }, 0).toFixed(2);

    totalPriceElement.textContent = totalPrice;
}

function updateProfileUI() {
    const userName = localStorage.getItem("user_name") || "User";
    const firstName = userName.split(" ")[0];
    const profileIcon = document.getElementById("profileDropdownTrigger");
    const profileDropdown = document.getElementById("profileDropdown");

    if (profileIcon) {
        profileIcon.innerHTML = `<i class="fas fa-user"></i> ${firstName}`;
    }

    if (profileDropdown) {
        profileDropdown.innerHTML = `
            <div class="bookstore-dash__profile-item">Hello, ${userName}</div>
            <div class="bookstore-dash__profile-item bookstore-dash__profile-profile"><i class="fas fa-user"></i> Profile</div>
            <div class="bookstore-dash__profile-item bookstore-dash__profile-orders"><i class="fas fa-shopping-bag"></i> My Orders</div>
            <div class="bookstore-dash__profile-item bookstore-dash__profile-wishlist"><i class="fas fa-heart"></i> Wishlist</div>
            <div class="bookstore-dash__profile-item bookstore-dash__profile-logout"><i class="fas fa-sign-out-alt"></i> Logout</div>
        `;

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
                updateProfileUI();
                window.location.href = "/pages/login.html";
            });
        }
    }
}

// Initial Setup
updateProfileUI();