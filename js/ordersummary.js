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
    await loadCustomerDetails(userId);
    await loadOrderSummary();
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

    if (cartIcon) {
        cartIcon.addEventListener('click', () => {
            alert('You are already on the order summary page!');
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
        const response = await fetch(`${API_BASE_URL}/remove_book/${bookId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        console.log("Remove response status:", response.status);
        console.log("Response headers:", [...response.headers.entries()]);

        // Handle success status codes (200-299) and 204 No Content
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

        // Check for success in the response
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
        // Still attempt to reload the cart, in case the backend operation succeeded
        await loadCartItems(userId);
        await loadOrderSummary();
    }
}

function updateProfileUI() {
    const userName = localStorage.getItem("user_name") || "User";
    const firstName = userName.split(" ")[0];

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

        const wishlistItem = profileDropdown.querySelector(".bookstore-dash__profile-wishlist");
        if (wishlistItem) {
            wishlistItem.addEventListener("click", () => {
                window.location.href = "/pages/bookWishlist.html";
            });
        }

        profileDropdown.querySelector(".bookstore-dash__profile-logout").addEventListener("click", () => {
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");
            localStorage.removeItem("token");
            updateProfileUI();
            window.location.href = "/pages/login.html";
        });
    }
}

async function loadCustomerDetails(userId) {
    // Retrieve user and address data from localStorage
    const userData = {
        name: localStorage.getItem('user_name') || 'User',
        number: localStorage.getItem('mobile_number') || ''
    };
    let selectedAddress = JSON.parse(localStorage.getItem('selectedAddress') || '{}');

    // If selectedAddress is not set in localStorage, fetch it from the API as a fallback
    if (!selectedAddress.id) {
        try {
            const response = await fetch(`${API_BASE_URL}/addresses/list`, {
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

            // Update user data in localStorage if not already set
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

            // Use the first address as a fallback if selectedAddress is not set
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

    // Populate the UI with the data from localStorage
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

    console.log("Cart Items:", cartItems);

    if (!cartItems.length) {
        alert("Your cart is empty. Please add items to proceed.");
        window.location.href = '/pages/bookStoreDashboard.html';
        return;
    }

    if (!selectedAddress.id) {
        alert("No address selected. Please select an address.");
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

    // Remove any existing event listeners to prevent duplicates
    const checkoutButton = document.querySelector('.checkout');
    checkoutButton.removeEventListener('click', handleCheckout); // Remove previous listener if it exists
    checkoutButton.addEventListener('click', handleCheckout);
}

async function handleCheckout() {
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const selectedAddress = JSON.parse(localStorage.getItem('selectedAddress') || '{}');
    let remainingCartItems = [...cartItems];
    let allOrdersSuccessful = true;

    console.log("Starting checkout process with cart items:", cartItems);

    try {
        // Step 1: Fetch stock quantities for all books in the cart
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
        console.log("Stock data:", stockData);

        if (!stockData.success) {
            showToast(`Failed to fetch stock quantities: ${stockData.error || "Unknown error"}`, 'error');
            return;
        }

        // Step 2: Validate stock quantities against requested quantities
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

        // Step 3: If there are items with insufficient stock, show an error toast and stop
        if (insufficientStockItems.length > 0) {
            const errorMessages = insufficientStockItems.map(item =>
                `Not enough stock for ${item.book_name}. Requested: ${item.requested}, Available: ${item.available}`
            ).join('; ');
            showToast(errorMessages, 'error');
            return;
        }

        // Step 4: Proceed with placing orders if all stock checks pass
        for (const item of cartItems) {
            console.log(`Processing item: Book ID ${item.book_id}`);

            const discountedPrice = parseFloat(item.discounted_price || item.price) || 0;
            const quantity = parseInt(item.quantity, 10) || 1;
            const itemTotal = (discountedPrice * quantity).toFixed(2);

            console.log(`Sending order for Book ID ${item.book_id}:`, {
                user_id: localStorage.getItem('user_id'),
                address_id: selectedAddress.id,
                book_id: item.book_id,
                quantity: quantity,
                price_at_purchase: discountedPrice,
                total_price: itemTotal
            });

            const response = await fetch(`${API_BASE_URL}/orders/create`, {
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

            console.log(`Response status for Book ID ${item.book_id}:`, response.status);

            if (response.status === 401) {
                console.log("Unauthorized response, redirecting to login");
                alert("Session expired. Please log in again.");
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                updateProfileUI();
                window.location.href = '/pages/login.html';
                return;
            }

            const orderData = await response.json();
            console.log(`Response data for Book ID ${item.book_id}:`, JSON.stringify(orderData, null, 2));

            if (!response.ok) {
                console.log(`Response not OK for Book ID ${item.book_id}`);
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
                console.log(`Order not successful for Book ID ${item.book_id}`);
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

            console.log(`Order successful for Book ID ${item.book_id}, updating remaining cart items`);
            remainingCartItems = remainingCartItems.filter(cartItem => cartItem.book_id && cartItem.book_id !== item.book_id);
            console.log("Remaining cart items after update:", remainingCartItems);
        }

        console.log("Loop completed, allOrdersSuccessful:", allOrdersSuccessful);

        if (allOrdersSuccessful) {
            console.log("All orders successful, clearing cart and redirecting");
            showToast("All orders placed successfully!", 'success');
            localStorage.removeItem('cartItems');
            localStorage.removeItem('selectedAddress');
            localStorage.removeItem('selected_address_id');
            window.location.href = '/pages/orderSuccessful.html';
        } else {
            console.log("Some orders failed, updating cart with remaining items:", remainingCartItems);
            localStorage.setItem('cartItems', JSON.stringify(remainingCartItems));
            showToast("Some items were not ordered successfully. Please try again.", 'error');
        }
    } catch (error) {
        console.log("Caught error in loop:", error);
        console.error(`Error placing order: ${error.message}`);
        localStorage.setItem('cartItems', JSON.stringify(remainingCartItems));
        showToast(`Failed to place order: ${error.message}`, 'error');
    }
}