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
    updateProfileUI(); // Add this to set up the profile UI immediately
    await loadCartItems(userId);
    await loadCustomerDetails(userId);
});

// Setup UI event listeners for header and customer details buttons
function setupUIEventListeners() {
    const cartIcon = document.getElementById('cartIcon');
    const addAddressBtn = document.querySelector('.add-address');
    const continueBtn = document.querySelector('.continue');

    if (cartIcon) {
        cartIcon.addEventListener('click', () => {
            alert('You are already on the customer details page!');
        });
    }

    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', () => {
            toggleAddressEdit(true);
        });
    }

    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            saveCustomerDetails(localStorage.getItem('user_id'));
        });
    }
}

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Update cart count in UI
function updateCartCount(count) {
    const headerCount = document.querySelector('#cartIcon');
    const sectionCount = document.getElementById('cartItemCount');
    if (headerCount) headerCount.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (${count})`;
    if (sectionCount) sectionCount.textContent = count;
}

// Fetch and display cart items
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
                updateProfileUI(); // Reset profile UI on logout
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

// Render cart items
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

// Setup event listeners for cart actions
function setupCartEventListeners() {
    document.querySelectorAll('.increase').forEach(button => {
        button.addEventListener('click', function() {
            updateQuantity(this, 1);
        });
    });

    document.querySelectorAll('.decrease').forEach(button => {
        button.addEventListener('click', function() {
            updateQuantity(this, -1);
        });
    });

    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            removeCartItem(this);
        });
    });
}

// Update quantity
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

// Remove item
async function removeCartItem(button) {
    const cartItem = button.closest('.cart-item');
    const bookId = cartItem.dataset.id;
    const userId = localStorage.getItem('user_id');

    if (!bookId) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/remove_book/${bookId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Failed to remove item");
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || "Failed to remove item");
        }

        await loadCartItems(userId);
    } catch (error) {
        alert("Failed to remove item: " + error.message);
    }
}

// Update cart summary (for order summary section)
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

// Profile Dropdown Functionality
function updateProfileUI() {
    const userName = localStorage.getItem("user_name") || "User";
    const firstName = userName.split(" ")[0]; // Extract first name

    const profileIcon = document.querySelector("#cartProfileDropdownTrigger");
    if (profileIcon) {
        profileIcon.innerHTML = `<i class="fas fa-user"></i> ${firstName}`;
    }

    let profileDropdown = document.querySelector("#cartProfileDropdown");
    if (!profileDropdown && profileIcon) {
        profileDropdown = document.createElement("div");
        profileDropdown.className = "bookstore-dash__profile-dropdown";
        profileDropdown.id = "cartProfileDropdown";
        document.querySelector(".bookstore-dash__header").appendChild(profileDropdown);
    }

    if (profileDropdown) {
        profileDropdown.innerHTML = `
            <div class="bookstore-dash__profile-item">Hello, ${userName}</div>
            <div class="bookstore-dash__profile-item"><i class="fas fa-user"></i> Profile</div>
            <div class="bookstore-dash__profile-item"><i class="fas fa-shopping-bag"></i> My Orders</div>
            <div class="bookstore-dash__profile-item bookstore-dash__profile-wishlist"><i class="fas fa-heart"></i> My Wishlist</div>
            <div class="bookstore-dash__profile-item bookstore-dash__profile-logout"><i class="fas fa-sign-out-alt"></i> Logout</div>
        `;

        profileIcon.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            profileDropdown.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove("active");
            }
        });

        // Add event listener for My Wishlist navigation
        const wishlistItem = profileDropdown.querySelector(".bookstore-dash__profile-wishlist");
        if (wishlistItem) {
            wishlistItem.addEventListener("click", () => {
                window.location.href = "/pages/bookWishlist.html";
            });
        }

        // Logout functionality
        profileDropdown.querySelector(".bookstore-dash__profile-logout").addEventListener("click", () => {
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");
            localStorage.removeItem("token");
            updateProfileUI(); // Reset to "User"
            window.location.href = "/pages/login.html";
        });
    }
}

// New Functionality for Customer Details

// Load customer details
async function loadCustomerDetails(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/address`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Session expired. Please log in again.");
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                updateProfileUI(); // Reset profile UI on logout
                window.location.href = '/pages/login.html';
                return;
            }
            throw new Error(`Error ${response.status}: Failed to fetch customer details`);
        }

        const data = await response.json();
        if (data.success && data.address) {
            populateCustomerDetails(data.address);
        }
    } catch (error) {
        alert(`Failed to load customer details: ${error.message}`);
    }
}

// Populate customer details form
function populateCustomerDetails(address) {
    document.querySelector('input[readonly][value="Poonam Yadav"]').value = address.full_name || 'Poonam Yadav';
    document.querySelector('input[readonly][value="81678954778"]').value = address.mobile_number || '81678954778';
    document.getElementById('address-street').value = address.street || '';
    document.getElementById('address-city').value = address.city || '';
    document.getElementById('address-state').value = address.state || '';
    const typeRadios = document.getElementsByName('address-type');
    typeRadios.forEach(radio => {
        if (radio.value.toLowerCase() === (address.type || 'work').toLowerCase()) {
            radio.checked = true;
        }
    });
}

// Toggle edit mode for address fields
function toggleAddressEdit(enable) {
    const inputs = document.querySelectorAll('.form-group input, .form-group textarea');
    const radios = document.getElementsByName('address-type');
    inputs.forEach(input => input.readOnly = !enable);
    radios.forEach(radio => radio.disabled = !enable);
}

// Save customer details
async function saveCustomerDetails(userId) {
    const fullName = document.querySelector('input[readonly][value="Poonam Yadav"]').value;
    const mobileNumber = document.querySelector('input[readonly][value="81678954778"]').value;
    const street = document.getElementById('address-street').value;
    const city = document.getElementById('address-city').value;
    const state = document.getElementById('address-state').value;
    const type = document.querySelector('input[name="address-type"]:checked').value;

    if (!street || !city || !state) {
        alert("Please fill in all address fields.");
        return;
    }

    const addressData = {
        address: {
            full_name: fullName,
            mobile_number: mobileNumber,
            street: street,
            city: city,
            state: state,
            type: type
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/address`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(addressData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: Failed to save address`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || "Failed to save address");
        }

        alert("Address saved successfully!");
        toggleAddressEdit(false); // Disable editing after saving
        window.location.href = '/pages/order-confirmation.html'; // Redirect to confirmation page
    } catch (error) {
        alert(`Failed to save address: ${error.message}`);
    }
}

// Initial Setup
updateProfileUI();