const BASE_URL = "http://127.0.0.1:3000";

// Toast notification function
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
        <div class="bookstore-dash__profile-item"><i class="fas fa-user"></i> Profile</div>
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

    const ordersItem = profileDropdown.querySelector(".bookstore-dash__profile-orders");
    if (ordersItem) {
        ordersItem.addEventListener("click", () => {
            window.location.href = "../pages/bookOrders.html";
        });
    }

    const wishlistItem = document.querySelector(".bookstore-dash__profile-wishlist");
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

// Fetch and update cart count
async function updateCartCount() {
    const userId = localStorage.getItem("user_id");
    const token = localStorage.getItem("token");
    const cartIcon = document.getElementById("cartIcon");

    if (!userId || !token || !cartIcon) return;

    try {
        const response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                showToast("Session expired. Please log in again.", "error");
                localStorage.removeItem("token");
                localStorage.removeItem("user_id");
                localStorage.removeItem("user_name");
                window.location.href = "../pages/login.html";
                return;
            }
            throw new Error("Failed to fetch cart data");
        }

        const data = await response.json();
        const cartCount = data.cart?.length || 0;
        cartIcon.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (${cartCount})`;
    } catch (error) {
        console.error("Error fetching cart count:", error.message);
        cartIcon.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (0)`;
    }
}

// Fetch and display user data and addresses
async function loadUserData() {
    const userId = localStorage.getItem("user_id");
    const userName = localStorage.getItem("user_name");
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    const mobileNumber = localStorage.getItem("mobile_number");

    if (!userId || !token) {
        window.location.href = "../pages/login.html";
        return;
    }

    try {
        document.getElementById("name").textContent = userName || "Unknown";
        document.getElementById("email").textContent = email || "[Not Available]";
        document.getElementById("mobile_number").textContent = mobileNumber || "[Not Available]";

        const addressResponse = await fetch(`${BASE_URL}/api/v1/addresses/list`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!addressResponse.ok) {
            const text = await addressResponse.text();
            console.log("Fetch addresses raw response:", text);
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.errors || "Failed to fetch addresses");
            } catch {
                throw new Error("Server returned an unexpected response: " + text.slice(0, 100));
            }
        }

        const addressData = await addressResponse.json();
        const addresses = addressData.addresses || [];

        const addressContainer = document.getElementById("addressDetails");
        addressContainer.innerHTML = "";

        if (addresses.length === 0) {
            addressContainer.innerHTML = `
                <div class="no-addresses">
                    <p>No Addresses Found</p>
                    <p class="no-addresses-subtext">Add a new address!</p>
                </div>
            `;
        } else {
            addresses.forEach((address, index) => {
                addressContainer.innerHTML += `
                    <div class="address-item" data-address-id="${address.id}">
                        <div class="address-header">
                            <h3>${index + 1}. ${address.type.toUpperCase()}</h3>
                            <div class="address-actions">
                                <a href="#" class="edit-link" data-address-id="${address.id}">Edit</a>
                                <a href="#" class="remove-link" data-address-id="${address.id}">Remove</a>
                            </div>
                        </div>
                        <div class="address-content">
                            <div class="address-text">
                                <div class="address-field">
                                    <label>Address</label>
                                    <p class="address-value">${address.street || "N/A"}</p>
                                    <textarea class="address-input street-input" style="display: none;">${address.street || ""}</textarea>
                                </div>
                                <div class="address-field city-state">
                                    <div class="city-field">
                                        <label>City/Town</label>
                                        <p class="address-value">${address.city || "N/A"}</p>
                                        <input type="text" class="address-input city-input" style="display: none;" value="${address.city || ""}">
                                    </div>
                                    <div class="state-field">
                                        <label>State</label>
                                        <p class="address-value">${address.state || "N/A"}</p>
                                        <input type="text" class="address-input state-input" style="display: none;" value="${address.state || ""}">
                                    </div>
                                </div>
                                <div class="address-field">
                                    <label>Zip Code</label>
                                    <p class="address-value">${address.zip_code || "N/A"}</p>
                                    <input type="text" class="address-input zip-code-input" style="display: none;" value="${address.zip_code || ""}">
                                </div>
                                <div class="address-field">
                                    <label>Country</label>
                                    <p class="address-value">${address.country || "N/A"}</p>
                                    <input type="text" class="address-input country-input" style="display: none;" value="${address.country || ""}">
                                </div>
                            </div>
                            <div class="address-type">
                                <span class="type-label">Type</span>
                                <div class="type-options">
                                    <label class="radio-option">
                                        <input type="radio" name="addressType${address.id}" value="home" ${address.type === "home" ? "checked" : ""}>
                                        <span class="radio-text">Home</span>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="addressType${address.id}" value="work" ${address.type === "work" ? "checked" : ""}>
                                        <span class="radio-text">Work</span>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="addressType${address.id}" value="other" ${address.type === "other" ? "checked" : ""}>
                                        <span class="radio-text">Other</span>
                                    </label>
                                </div>
                            </div>
                            <button class="update-address-btn" style="display: none;">Update</button>
                        </div>
                    </div>
                `;
            });
            setupAddressEventListeners();
        }
    } catch (error) {
        console.error("Error loading user data:", error.message);
        showToast("Failed to load profile data: " + error.message, 'error');
    }
}

// Address CRUD operations
async function addNewAddress(addressData) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${BASE_URL}/api/v1/addresses/add`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ address: addressData })
        });

        if (!response.ok) {
            const text = await response.text();
            console.log("Add address raw response:", text);
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.errors || "Failed to add address");
            } catch {
                throw new Error("Server returned an unexpected response: " + text.slice(0, 100));
            }
        }

        const result = await response.json();
        showToast(result.message);
        loadUserData();
    } catch (error) {
        console.error("Error adding address:", error.message);
        showToast("Failed to add address: " + error.message, 'error');
    }
}

async function updateAddress(addressId, addressData) {
    const token = localStorage.getItem("token");
    try {
        console.log("Sending update payload:", addressData);
        const response = await fetch(`${BASE_URL}/api/v1/addresses/update/${addressId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ address: addressData })
        });

        if (!response.ok) {
            const text = await response.text();
            console.log("Update address raw response:", text);
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.errors || "Failed to update address");
            } catch {
                throw new Error("Server returned an unexpected response: " + text.slice(0, 100));
            }
        }

        const result = await response.json();
        showToast(result.message);
        loadUserData();
    } catch (error) {
        console.error("Error updating address:", error.message);
        showToast("Failed to update address: " + error.message, 'error');
    }
}

async function removeAddress(addressId) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${BASE_URL}/api/v1/addresses/remove/${addressId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();
        console.log("Remove address response:", result);

        if (result.success) {
            showToast(result.message);
            loadUserData(); // Refresh the address list
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error("Error removing address:", error.message);
        showToast("An unexpected error occurred while removing the address", 'error');
    }
}

// Event Listeners
function setupEventListeners() {
    const editPersonalDetails = document.getElementById("editPersonalDetails");
    if (editPersonalDetails) {
        editPersonalDetails.addEventListener("click", (e) => {
            e.preventDefault();
            showToast("Edit Personal Details not available", 'error');
        });
    }

    const addAddressBtn = document.getElementById("addAddressBtn");
    const addAddressModal = document.getElementById("addAddressModal");
    const addAddressForm = document.getElementById("addAddressForm");
    const closeModal = document.querySelector(".modal-close");
    const cartIcon = document.getElementById("cartIcon");

    if (addAddressBtn) {
        addAddressBtn.addEventListener("click", () => {
            addAddressModal.style.display = "block";
        });
    }

    if (closeModal) {
        closeModal.addEventListener("click", () => {
            addAddressModal.style.display = "none";
            addAddressForm.reset();
        });
    }

    if (cartIcon) {
        cartIcon.addEventListener("click", () => {
            window.location.href = "../pages/mycart.html";
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === addAddressModal) {
            addAddressModal.style.display = "none";
            addAddressForm.reset();
        }
    });

    if (addAddressForm) {
        addAddressForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const addressData = {
                street: document.getElementById("newStreet").value,
                city: document.getElementById("newCity").value,
                state: document.getElementById("newState").value,
                zip_code: document.getElementById("newZipCode").value,
                country: document.getElementById("newCountry").value,
                type: document.querySelector('input[name="newAddressType"]:checked').value
            };

            if (addressData.street && addressData.city && addressData.state && addressData.zip_code && addressData.country && addressData.type) {
                addNewAddress(addressData);
                addAddressModal.style.display = "none";
                addAddressForm.reset();
            } else {
                showToast("All fields are required", 'error');
            }
        });
    }
}

function setupAddressEventListeners() {
    document.querySelectorAll(".edit-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const addressId = e.target.dataset.addressId;
            const addressItem = document.querySelector(`.address-item[data-address-id="${addressId}"]`);
            
            const isEditing = addressItem.classList.contains("editing");
            if (!isEditing) {
                addressItem.classList.add("editing");
                link.textContent = "Cancel";
                
                addressItem.querySelectorAll(".address-value").forEach(value => {
                    value.style.display = "none";
                });
                addressItem.querySelectorAll(".address-input").forEach(input => {
                    input.style.display = "block";
                });
                
                const updateBtn = addressItem.querySelector(".update-address-btn");
                updateBtn.style.display = "block";
                
                updateBtn.onclick = () => {
                    const addressData = {
                        street: addressItem.querySelector(".street-input").value,
                        city: addressItem.querySelector(".city-input").value,
                        state: addressItem.querySelector(".state-input").value,
                        zip_code: addressItem.querySelector(".zip-code-input").value,
                        country: addressItem.querySelector(".country-input").value,
                        type: addressItem.querySelector(`input[name="addressType${addressId}"]:checked`).value
                    };
                    
                    console.log("Address data to update:", addressData); // Debug payload
                    
                    if (addressData.street && addressData.city && addressData.state && addressData.zip_code && addressData.country) {
                        updateAddress(addressId, addressData);
                    } else {
                        showToast("All fields are required", "error");
                    }
                };
            } else {
                addressItem.classList.remove("editing");
                link.textContent = "Edit";
                
                addressItem.querySelectorAll(".address-value").forEach(value => {
                    value.style.display = "block";
                });
                addressItem.querySelectorAll(".address-input").forEach(input => {
                    input.style.display = "none";
                });
                
                const updateBtn = addressItem.querySelector(".update-address-btn");
                updateBtn.style.display = "none";
            }
        });
    });

    document.querySelectorAll(".remove-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const addressId = e.target.dataset.addressId;
            if (confirm("Are you sure you want to remove this address?")) {
                removeAddress(addressId);
            }
        });
    });
}

// Initial Setup
document.addEventListener("DOMContentLoaded", () => {
    updateProfileUI();
    setupEventListeners();
    loadUserData();
    updateCartCount(); // Fetch and display cart count on page load

    // Redirect to dashboard when clicking the logo
    document.querySelector(".bookstore-dash__logo").addEventListener("click", () => {
        window.location.href = "../pages/bookStoreDashboard.html";
    });
});