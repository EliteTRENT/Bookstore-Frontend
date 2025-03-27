const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
        alert("Please log in to view your order summary.");
        window.location.href = '/pages/login.html';
        return;
    }

    setupUIEventListeners();
    updateProfileUI();
    await loadCartItems(userId);
    await loadCustomerDetails(userId);
    await loadOrderSummary();

    // Redirect to dashboard when clicking the logo
    document.querySelector(".bookstore-dash__logo").addEventListener("click", () => {
        window.location.href = "../pages/bookStoreDashboard.html";
    });
});

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function setupUIEventListeners() {
    const cartIcon = document.getElementById('cartIcon');
    const profileTrigger = document.getElementById('profileDropdownTrigger');
    const profileDropdown = document.getElementById('profileDropdown');

    if (cartIcon) {
        cartIcon.addEventListener('click', () => {
            alert('You are already on the order summary page!');
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

        localStorage.setItem('cartItems', JSON.stringify(data.cart || []));
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
        return;
    }

    cartContainer.innerHTML = cartItems.map(item => {
        const totalDiscountedPrice = (parseFloat(item.discounted_price || item.price) * (parseInt(item.quantity, 10) || 1)).toFixed(2);
        return `
        <div class="cart-item" data-id="${item.book_id}" data-cart-id="${item.cart_id}" data-price="${item.discounted_price || item.price}">
            <img src="${item.image_url || 'https://placehold.co/150x150'}" alt="${item.book_name || 'Unknown'}" class="cart-item-image">
            <div class="cart-item-details">
                <h3>${item.book_name || 'Untitled'}</h3>
                <p>by ${item.author_name || 'Unknown'}</p>
                <div class="cart-item-price">
                    <span class="current-price">Rs. ${totalDiscountedPrice}</span>
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

async function updateQuantity(button, change) {
    const cartItem = button.closest('.cart-item');
    if (!cartItem) {
        showToast("Error: Cart item not found.", 'error');
        return;
    }

    const bookId = cartItem.dataset.id;
    const userId = localStorage.getItem('user_id');
    const quantityElement = cartItem.querySelector('.quantity-input');
    const priceElement = cartItem.querySelector('.current-price');

    if (!bookId || !userId || !quantityElement || !priceElement) {
        showToast("Error: Missing required elements.", 'error');
        return;
    }

    let currentQuantity = parseInt(quantityElement.value, 10);

    if (isNaN(currentQuantity)) {
        showToast("Error: Invalid quantity.", 'error');
        return;
    }

    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
        await removeCartItem(button);
        return;
    }

    const perUnitPrice = parseFloat(cartItem.dataset.price);
    if (isNaN(perUnitPrice)) {
        showToast("Error: Invalid price.", 'error');
        return;
    }

    try {
        const requestBody = {
            cart: {
                book_id: bookId,
                quantity: newQuantity
            }
        };

        const response = await fetch(`${API_BASE_URL}/carts`, {
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
        await loadOrderSummary();
    } catch (error) {
        showToast(`Failed to update quantity: ${error.message}`, 'error');
        quantityElement.value = currentQuantity;
    }
}

async function removeCartItem(button) {
    const cartItem = button.closest('.cart-item');
    const bookId = cartItem.dataset.id;
    const userId = localStorage.getItem('user_id');

    if (!bookId) {
        showToast("Error: Book ID not found.", 'error');
        return;
    }

    try {
        console.log(`Removing item with bookId: ${bookId}`);
        const response = await fetch(`${API_BASE_URL}/carts/${bookId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        console.log("Remove response status:", response.status);
        console.log("Response headers:", [...response.headers.entries()]);

        if (response.status === 204 || (response.status >= 200 && response.status < 300)) {
            console.log(`Item removed successfully (status ${response.status}), reloading cart...`);
            await loadCartItems(userId);
            await loadOrderSummary();
            showToast("Item removed successfully!", 'success');
            return;
        }

        const rawResponse = await response.text();
        console.log("Raw response:", rawResponse || "Empty response");

        let data;
        try {
            data = rawResponse ? JSON.parse(rawResponse) : {};
            console.log("Parsed response data:", data);
        } catch (parseError) {
            console.error("Parsing error:", parseError.message);
            throw new Error('Failed to parse response from server: ' + parseError.message);
        }

        if (!response.ok) {
            console.log("Response not OK, throwing error...");
            throw new Error(data.error || `HTTP error ${response.status}: Failed to remove item`);
        }

        console.log("Checking success condition...");
        if (data.success || (data.message && data.message.toLowerCase().includes("successfully"))) {
            console.log("Success condition met, reloading cart...");
            await loadCartItems(userId);
            await loadOrderSummary();
            showToast("Item removed successfully!", 'success');
        } else {
            console.log("Success condition not met, throwing error...");
            throw new Error(data.error || "Failed to remove item: Unexpected response");
        }
    } catch (error) {
        console.error("Error removing item:", error.message);
        showToast(`Failed to remove item: ${error.message}`, 'error');
        await loadCartItems(userId);
        await loadOrderSummary();
    }
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

async function loadCustomerDetails(userId) {
    const userData = {
        name: localStorage.getItem('user_name') || 'User',
        number: localStorage.getItem('mobile_number') || ''
    };
    let selectedAddress = JSON.parse(localStorage.getItem('selectedAddress') || '{}');

    if (!selectedAddress.id) {
        try {
            const response = await fetch(`${API_BASE_URL}/addresses`, {
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
                const errorData = await response.json();
                throw new Error(`Error ${response.status}: ${errorData.error || 'Failed to fetch customer details'}`);
            }

            const data = await response.json();

            if (data.user) {
                if (!localStorage.getItem('user_name')) {
                    localStorage.setItem('user_name', data.user.name || 'User');
                }
                if (!localStorage.getItem('mobile_number')) {
                    localStorage.setItem('mobile_number', data.user.number || '');
                }
                userData.name = localStorage.getItem('user_name');
                userData.number = localStorage.getItem('mobile_number');
            }

            const firstAddress = data.addresses && data.addresses.length > 0 ? data.addresses[0] : {};
            if (firstAddress.id) {
                selectedAddress = {
                    id: firstAddress.id,
                    street: firstAddress.street,
                    city: firstAddress.city,
                    state: firstAddress.state,
                    address_type: firstAddress.type
                };
                localStorage.setItem('selected_address_id', firstAddress.id);
                localStorage.setItem('selectedAddress', JSON.stringify(selectedAddress));
            } else {
                alert("No address found. Please add an address before proceeding.");
                return;
            }
        } catch (error) {
            showToast(`Failed to load customer details: ${error.message}`, 'error');
            return;
        }
    }

    populateCustomerDetails(userData, selectedAddress);
}

function populateCustomerDetails(userData, address) {
    const fullNameInput = document.querySelector('.form-group input[value="Poonam Yadav"]');
    const mobileInput = document.querySelector('.form-group input[value="81678954778"]');
    
    if (fullNameInput) fullNameInput.value = userData.name || 'Poonam Yadav';
    if (mobileInput) mobileInput.value = userData.number || '81678954778';

    document.getElementById('address-street').value = address.street || '';
    document.getElementById('address-city').value = address.city || '';
    document.getElementById('address-state').value = address.state || '';

    const typeRadios = document.getElementsByName('address-type');
    let addressType = address.address_type
        ? address.address_type.charAt(0).toUpperCase() + address.address_type.slice(1).toLowerCase()
        : 'Work';

    const validTypes = ['Home', 'Work', 'Other'];
    if (!validTypes.includes(addressType)) addressType = 'Work';

    typeRadios.forEach(radio => {
        radio.checked = radio.value === addressType;
    });
}

async function loadOrderSummary() {
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const selectedAddress = JSON.parse(localStorage.getItem('selectedAddress') || '{}');

    if (!cartItems.length) {
        alert("Your cart is empty. Please add items to proceed.");
        window.location.href = '/pages/bookStoreDashboard.html';
        return;
    }

    if (!selectedAddress.id) {
        alert("No address selected. Please select an address.");
        window.location.href = '/pages/customerdetails.html';
        return;
    }

    const summarySection = document.getElementById('order-summary-section');
    if (!summarySection) return;

    const totalPrice = cartItems.reduce((sum, item) => {
        const discountedPrice = parseFloat(item.discounted_price || item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 1;
        const itemTotal = discountedPrice * quantity;
        return sum + itemTotal;
    }, 0).toFixed(2);

    const summaryItems = cartItems.map(item => {
        const discountedPrice = parseFloat(item.discounted_price || item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 1;
        const itemTotal = (discountedPrice * quantity).toFixed(2);
        return `
        <div class="summary-item">
            <img src="${item.image_url || 'https://placehold.co/150x150'}" alt="${item.book_name || 'Unknown'}">
            <div class="summary-item-details">
                <h3>${item.book_name || 'Untitled'}</h3>
                <p>by ${item.author_name || 'Unknown'}</p>
                <p>Rs. ${itemTotal}</p>
                <p>Quantity: ${quantity}</p>
            </div>
        </div>
        `;
    }).join('');

    summarySection.innerHTML = `
        <h2>Order Summary</h2>
        ${summaryItems}
        <p>Total Price: Rs. ${totalPrice}</p>
        <button class="checkout">CHECKOUT</button>
    `;

    const checkoutButton = document.querySelector('.checkout');
    checkoutButton.removeEventListener('click', handleCheckout);
    checkoutButton.addEventListener('click', handleCheckout);
}

async function handleCheckout() {
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const selectedAddress = JSON.parse(localStorage.getItem('selectedAddress') || '{}');
    let remainingCartItems = [...cartItems];
    let allOrdersSuccessful = true;

    try {
        const bookIds = cartItems.map(item => item.book_id).join(',');
        const stockResponse = await fetch(`${API_BASE_URL}/books/stock?book_ids=${bookIds}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!stockResponse.ok) {
            showToast("Failed to fetch stock quantities. Please try again.", 'error');
            return;
        }

        const stockData = await stockResponse.json();
        if (!stockData.success) {
            showToast(`Failed to fetch stock quantities: ${stockData.error || "Unknown error"}`, 'error');
            return;
        }

        const stockMap = new Map(stockData.stock.map(item => [item.book_id, item.quantity]));
        const insufficientStockItems = [];

        for (const item of cartItems) {
            const requestedQuantity = parseInt(item.quantity, 10) || 1;
            const availableStock = stockMap.get(item.book_id) || 0;

            if (requestedQuantity > availableStock) {
                insufficientStockItems.push({
                    book_name: item.book_name,
                    requested: requestedQuantity,
                    available: availableStock
                });
            }
        }

        if (insufficientStockItems.length > 0) {
            const errorMessages = insufficientStockItems.map(item =>
                `Not enough stock for ${item.book_name}. Requested: ${item.requested}, Available: ${item.available}`
            ).join('; ');
            showToast(errorMessages, 'error');
            return;
        }

        for (const item of cartItems) {
            const discountedPrice = parseFloat(item.discounted_price || item.price) || 0;
            const quantity = parseInt(item.quantity, 10) || 1;
            const itemTotal = (discountedPrice * quantity).toFixed(2);

            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    order: {
                        user_id: localStorage.getItem('user_id'),
                        address_id: selectedAddress.id,
                        book_id: item.book_id,
                        quantity: quantity,
                        price_at_purchase: discountedPrice,
                        total_price: itemTotal
                    }
                })
            });

            if (response.status === 401) {
                alert("Session expired. Please log in again.");
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                updateProfileUI();
                window.location.href = '/pages/login.html';
                return;
            }

            const orderData = await response.json();

            if (!response.ok) {
                allOrdersSuccessful = false;
                const errorMessage = orderData.error || orderData.errors || "Unknown error occurred";
                if (errorMessage.includes("Invalid quantity")) {
                    const availableStock = errorMessage.match(/\d+/)[0];
                    showToast(`Not enough stock for ${item.book_name}. Available: ${availableStock}. Removing from cart.`, 'error');
                } else {
                    showToast(`Failed to place order for ${item.book_name}: ${errorMessage}`, 'error');
                }
                continue;
            }

            if (!(orderData.success || (response.status === 201 && orderData.message && orderData.message.trim() === "Order placed successfully"))) {
                allOrdersSuccessful = false;
                const errorMessage = orderData.error || orderData.errors || "Unknown error occurred";
                if (errorMessage.includes("Invalid quantity")) {
                    const availableStock = errorMessage.match(/\d+/)[0];
                    showToast(`Not enough stock for ${item.book_name}. Available: ${availableStock}. Removing from cart.`, 'error');
                } else {
                    showToast(`Failed to place order for ${item.book_name}: ${errorMessage}`, 'error');
                }
                continue;
            }

            remainingCartItems = remainingCartItems.filter(cartItem => cartItem.book_id !== item.book_id);
        }

        if (allOrdersSuccessful) {
            showToast("All orders placed successfully!", 'success');
            localStorage.removeItem('cartItems');
            localStorage.removeItem('selectedAddress');
            localStorage.removeItem('selected_address_id');
            window.location.href = '/pages/orderSuccessful.html';
        } else {
            localStorage.setItem('cartItems', JSON.stringify(remainingCartItems));
            showToast("Some items were not ordered successfully. Please try again.", 'error');
        }
    } catch (error) {
        console.error(`Error placing order: ${error.message}`);
        localStorage.setItem('cartItems', JSON.stringify(remainingCartItems));
        showToast(`Failed to place order: ${error.message}`, 'error');
    }
}