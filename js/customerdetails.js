const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
        alert("Please log in to view your cart.");
        window.location.href = '/pages/login.html';
        return;
    }

    // Ensure the modal is hidden on page load
    const addAddressModal = document.getElementById("addAddressModal");
    if (addAddressModal) {
        addAddressModal.style.display = "none";
    }

    setupUIEventListeners();
    setupAddressModalListeners();
    updateProfileUI();
    await loadCartItems(userId);
    await loadCustomerDetails(userId);

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
    const addAddressBtn = document.querySelector('.add-address');
    const continueBtn = document.querySelector('.continue');
    const profileTrigger = document.getElementById('profileDropdownTrigger');
    const profileDropdown = document.getElementById('profileDropdown');

    if (cartIcon) {
        cartIcon.addEventListener('click', () => {
            alert('You are already on the customer details page!');
        });
    }

    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', () => {
            const addAddressModal = document.getElementById("addAddressModal");
            if (addAddressModal) {
                addAddressModal.style.display = "block";
            }
        });
    }

    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            saveCustomerDetails(localStorage.getItem('user_id'));
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

        const cartItems = data.cart || [];
        localStorage.setItem('cartItems', JSON.stringify(cartItems)); // Update localStorage
        renderCartItems(cartItems);
        updateCartCount(cartItems.length);
        setupCartEventListeners();
    } catch (error) {
        console.error("Error loading cart items:", error.message);
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

    console.log("Updating quantity for bookId:", bookId, "userId:", userId);

    if (!bookId || !userId || !quantityElement || !priceElement) {
        showToast("Error: Missing required elements.", 'error');
        return;
    }

    let currentQuantity = parseInt(quantityElement.value, 10);
    console.log("Current quantity:", currentQuantity);

    if (isNaN(currentQuantity)) {
        showToast("Error: Invalid quantity.", 'error');
        return;
    }

    const newQuantity = currentQuantity + change;
    console.log("New quantity:", newQuantity);

    if (newQuantity <= 0) {
        console.log("Quantity <= 0, removing item...");
        await removeCartItem(button);
        return;
    }

    const perUnitPrice = parseFloat(cartItem.dataset.price);
    console.log("Per unit price:", perUnitPrice);

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
        console.log("Sending request to update quantity:", requestBody);

        const response = await fetch(`${API_BASE_URL}/carts/update_quantity`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestBody)
        });

        console.log("Response status:", response.status);

        const rawResponse = await response.text();
        console.log("Raw response:", rawResponse);

        let data;
        try {
            data = JSON.parse(rawResponse);
            console.log("Parsed response data:", data);
        } catch (parseError) {
            throw new Error('Failed to parse response from server');
        }

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${data.error || 'Failed to update quantity'}`);
        }

        if (!data.success) {
            throw new Error(data.error || "Failed to update quantity");
        }

        console.log("Quantity updated successfully, reloading cart...");
        await loadCartItems(userId);
    } catch (error) {
        console.error("Error updating quantity:", error.message);
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

        if (response.status === 204 || (response.status >= 200 && response.status < 300)) {
            console.log(`Item removed successfully (status ${response.status}), reloading cart...`);
            await loadCartItems(userId);
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
            showToast("Item removed successfully!", 'success');
        } else {
            console.log("Success condition not met, throwing error...");
            throw new Error(data.error || "Failed to remove item: Unexpected response");
        }
    } catch (error) {
        console.error("Error removing item:", error.message);
        showToast(`Failed to remove item: ${error.message}`, 'error');
        await loadCartItems(userId);
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

        if (data.user) {
            localStorage.setItem('user_name', data.user.name || 'User');
            localStorage.setItem('mobile_number', data.user.number || '');
        }

        const firstAddress = data.addresses && data.addresses.length > 0 ? data.addresses[0] : {};
        if (firstAddress.id) {
            localStorage.setItem('selected_address_id', firstAddress.id);
            localStorage.setItem('selectedAddress', JSON.stringify({
                id: firstAddress.id,
                street: firstAddress.street,
                city: firstAddress.city,
                state: firstAddress.state,
                address_type: firstAddress.type
            }));
        } else {
            alert("No address found. Please add an address before proceeding.");
            return;
        }

        populateCustomerDetails(data.user, firstAddress);
    } catch (error) {
        showToast(`Failed to load customer details: ${error.message}`, 'error');
    }
}

function populateCustomerDetails(userData, address) {
    const fullNameInput = document.querySelector('input[value="Poonam Yadav"]');
    const mobileInput = document.querySelector('input[value="81678954778"]');

    if (fullNameInput) {
        fullNameInput.value = userData.name || 'Poonam Yadav';
    }
    if (mobileInput) {
        mobileInput.value = userData.number || '81678954778';
    }

    document.getElementById('address-street').value = address.street || '';
    document.getElementById('address-city').value = address.city || '';
    document.getElementById('address-state').value = address.state || '';

    const typeRadios = document.getElementsByName('address-type');
    let addressType = address.type
        ? address.type.charAt(0).toUpperCase() + address.type.slice(1).toLowerCase()
        : 'Work';

    const validTypes = ['Home', 'Work', 'Other'];
    if (!validTypes.includes(addressType)) {
        addressType = 'Work';
    }

    typeRadios.forEach(radio => {
        radio.checked = radio.value === addressType;
    });
}

async function saveCustomerDetails(userId) {
    const street = document.getElementById('address-street').value;
    const city = document.getElementById('address-city').value;
    const state = document.getElementById('address-state').value;
    const type = document.querySelector('input[name="address-type"]:checked')?.value;

    if (!street || !city || !state || !type) {
        showToast("Please ensure all address fields are filled.", 'error');
        return;
    }

    const selectedAddress = {
        id: localStorage.getItem('selected_address_id'),
        street,
        city,
        state,
        address_type: type
    };
    localStorage.setItem('selectedAddress', JSON.stringify(selectedAddress));

    window.location.href = '/pages/ordersummary.html';
}

async function addNewAddress(addressData) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_BASE_URL}/addresses/add`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ address: addressData })
        });

        if (response.status !== 201 && !response.ok) {
            if (response.status === 401) {
                alert("Session expired. Please log in again.");
                localStorage.removeItem("token");
                localStorage.removeItem("user_id");
                localStorage.removeItem("user_name");
                updateProfileUI();
                window.location.href = "/pages/login.html";
                return;
            }
            const text = await response.text();
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.errors || "Failed to add address");
            } catch {
                throw new Error("Server returned an unexpected response: " + text.slice(0, 100));
            }
        }

        const result = await response.json();
        if (result.success === false) {
            throw new Error(result.error || "Failed to add address");
        }

        showToast(result.message || "Address added successfully!");

        if (result.address) {
            const userData = {
                name: localStorage.getItem('user_name') || "Poonam Yadav",
                number: localStorage.getItem('mobile_number') || "81678954778"
            };
            populateCustomerDetails(userData, result.address);
            localStorage.setItem('selected_address_id', result.address.id);
            localStorage.setItem('selectedAddress', JSON.stringify({
                id: result.address.id,
                street: result.address.street,
                city: result.address.city,
                state: result.address.state,
                address_type: result.address.type
            }));
        } else {
            await loadCustomerDetails(localStorage.getItem("user_id"));
        }
    } catch (error) {
        showToast("Failed to add address: " + error.message, 'error');
    }
}

function setupAddressModalListeners() {
    const addAddressModal = document.getElementById("addAddressModal");
    const addAddressForm = document.getElementById("addAddressForm");
    const closeModal = document.querySelector(".modal-close");

    if (closeModal) {
        closeModal.addEventListener("click", () => {
            addAddressModal.style.display = "none";
            addAddressForm.reset();
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === addAddressModal) {
            addAddressModal.style.display = "none";
            addAddressForm.reset();
        }
    });

    if (addAddressForm) {
        addAddressForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = addAddressForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = "Saving...";

            const addressData = {
                street: document.getElementById("newStreet").value,
                city: document.getElementById("newCity").value,
                state: document.getElementById("newState").value,
                zip_code: document.getElementById("newZipCode").value,
                country: document.getElementById("newCountry").value,
                type: document.querySelector('input[name="newAddressType"]:checked').value.toLowerCase(),
                is_default: document.querySelector('input[name="newAddressIsDefault"]:checked').value === 'true'
            };

            if (addressData.street && addressData.city && addressData.state && addressData.zip_code && addressData.country && addressData.type) {
                await addNewAddress(addressData);
                addAddressModal.style.display = "none";
                addAddressForm.reset();
            } else {
                showToast("All fields are required", 'error');
            }

            submitBtn.disabled = false;
            submitBtn.textContent = "Save Address";
        });
    }
}

// Ensure profile UI is updated on page load
updateProfileUI();