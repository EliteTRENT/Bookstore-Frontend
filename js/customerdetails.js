// Check if window.env is loaded
if (!window.env || !window.env.BACKEND_URL) {
    console.error("Environment variables not loaded. Ensure env.js is included before this script.");
    throw new Error("BACKEND_URL is not defined. Check env.js loading.");
  }
  
  // Token Management
  let token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refresh_token");
  
  async function refreshAccessToken() {
      if (!refreshToken) {
          localStorage.clear();
          updateProfileUI();
          window.location.href = "../pages/login.html";
          return false;
      }
  
      try {
          const response = await fetch(`${window.env.BACKEND_URL}/api/v1/sessions/refresh`, {
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
          updateProfileUI();
          window.location.href = "../pages/login.html";
          return false;
      }
  }
  
  document.addEventListener("DOMContentLoaded", async () => {
      const userId = localStorage.getItem('user_id');
  
      if (!token || !userId) {
          alert("Please log in to view your cart.");
          window.location.href = '/pages/login.html';
          return;
      }
  
      const addAddressModal = document.getElementById("addAddressModal");
      if (addAddressModal) {
          addAddressModal.style.display = "none";
      }
  
      setupUIEventListeners();
      setupAddressModalListeners();
      updateProfileUI();
      await loadCartItems(userId);
      await loadCustomerDetails(userId);
  
      document.querySelector(".bookstore-dash__logo").addEventListener("click", () => {
          window.location.href = "../pages/bookStoreDashboard.html";
      });
  
      // Add geolocation trigger
      setupGeolocation();
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
  
      let headers = getAuthHeaders();
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts/${userId}`, {
              method: 'GET',
              headers: headers
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts/${userId}`, {
                      method: 'GET',
                      headers: headers
                  });
              } else {
                  return;
              }
          }
  
          if (!response.ok) {
              throw new Error(`Error ${response.status}: Failed to fetch cart items`);
          }
  
          const data = await response.json();
          if (!data.success) {
              throw new Error(data.error || 'Failed to fetch cart items');
          }
  
          const cartItems = data.cart || [];
          localStorage.setItem('cartItems', JSON.stringify(cartItems));
          renderCartItems(cartItems);
          updateCartCount(cartItems.length);
          setupCartEventListeners();
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
  
      let headers = getAuthHeaders();
      try {
          const requestBody = {
              cart: {
                  book_id: bookId,
                  quantity: newQuantity
              }
          };
  
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts`, {
              method: 'PATCH',
              headers: headers,
              body: JSON.stringify(requestBody)
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts`, {
                      method: 'PATCH',
                      headers: headers,
                      body: JSON.stringify(requestBody)
                  });
              } else {
                  return;
              }
          }
  
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
  
      let headers = getAuthHeaders();
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts/${bookId}`, {
              method: 'DELETE',
              headers: headers
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts/${bookId}`, {
                      method: 'DELETE',
                      headers: headers
                  });
              } else {
                  return;
              }
          }
  
          if (response.status === 204 || (response.status >= 200 && response.status < 300)) {
              await loadCartItems(userId);
              showToast("Item removed successfully!", 'success');
              return;
          }
  
          const rawResponse = await response.text();
          let data;
          try {
              data = rawResponse ? JSON.parse(rawResponse) : {};
          } catch (parseError) {
              throw new Error('Failed to parse response from server: ' + parseError.message);
          }
  
          if (!response.ok) {
              throw new Error(data.error || `HTTP error ${response.status}: Failed to remove item`);
          }
  
          if (data.success || (data.message && data.message.toLowerCase().includes("successfully"))) {
              await loadCartItems(userId);
              showToast("Item removed successfully!", 'success');
          } else {
              throw new Error(data.error || "Failed to remove item: Unexpected response");
          }
      } catch (error) {
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
      let headers = getAuthHeaders();
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses`, {
              method: 'GET',
              headers: headers
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses`, {
                      method: 'GET',
                      headers: headers
                  });
              } else {
                  return;
              }
          }
  
          if (!response.ok) {
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
              showToast("No saved address found. Use geolocation to fetch your current location?", 'info');
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
      let headers = getAuthHeaders();
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses`, {
              method: "POST",
              headers: headers,
              body: JSON.stringify({ address: addressData })
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses`, {
                      method: "POST",
                      headers: headers,
                      body: JSON.stringify({ address: addressData })
                  });
              } else {
                  return;
              }
          }
  
          if (response.status !== 201 && !response.ok) {
              const text = await response.text();
              let errorMessage = "Failed to add address";
              try {
                  const errorData = JSON.parse(text);
                  errorMessage = Array.isArray(errorData.message)
                      ? errorData.message.join(", ")
                      : errorData.message || errorMessage;
              } catch {
                  errorMessage = "Server error: " + text.slice(0, 100);
              }
              throw new Error(errorMessage);
          }
  
          const result = await response.json();
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
          showToast(error.message, 'error');
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
  
  // New Geolocation Functions
  function setupGeolocation() {
      const geolocationBtn = document.createElement('button');
      geolocationBtn.className = 'geolocation-btn';
      geolocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Use My Location';
      geolocationBtn.style.marginTop = '10px';
  
      const customerDetailsSection = document.querySelector('.section');
      if (!customerDetailsSection) {
          return;
      }
  
      const firstFormGroup = customerDetailsSection.querySelector('.form-group:not(#addAddressModal .form-group)');
      if (!firstFormGroup) {
          customerDetailsSection.appendChild(geolocationBtn);
      } else {
          customerDetailsSection.insertBefore(geolocationBtn, firstFormGroup);
      }
  
      geolocationBtn.addEventListener('click', () => {
          fetchGeolocation();
      });
  
      if (!localStorage.getItem('selected_address_id') && !customerDetailsSection.querySelector('.geolocation-btn')) {
          fetchGeolocation();
      }
  }
  
  async function fetchGeolocation() {
      if (!navigator.geolocation) {
          showToast("Geolocation is not supported by your browser.", 'error');
          return;
      }
  
      showToast("Fetching your location...", 'info');
  
      const MAX_ATTEMPTS = 3;
      let attempt = 1;
  
      while (attempt <= MAX_ATTEMPTS) {
          try {
              const position = await new Promise((resolve, reject) => {
                  const geoOptions = {
                      timeout: 30000,
                      enableHighAccuracy: false,
                      maximumAge: 0
                  };
                  navigator.geolocation.getCurrentPosition(
                      resolve,
                      reject,
                      geoOptions
                  );
              });
  
              const { latitude, longitude } = position.coords;
              try {
                  const address = await reverseGeocode(latitude, longitude);
  
                  // Adjust street to meet minimum length requirement
                  let adjustedStreet = address.street || "";
                  if (adjustedStreet.length < 5) {
                      adjustedStreet = adjustedStreet.padEnd(5, " ") + " Road";
                  }
  
                  const adjustedAddress = {
                      street: adjustedStreet,
                      city: address.city,
                      state: address.state,
                      zip_code: address.zip_code,
                      country: address.country,
                      type: "home",
                      is_default: true,
                      user_id: localStorage.getItem('user_id')
                  };
  
                  await addNewAddress(adjustedAddress);
  
                  showToast("Location fetched and saved successfully!", 'success');
                  return;
              } catch (error) {
                  populateGeolocationAddress(address);
                  enableManualEntry();
                  showToast(`Failed to save location: ${error.message}. Please edit and save manually.`, 'error');
                  return;
              }
          } catch (error) {
              let errorMessage = "Unable to retrieve your location.";
              switch (error.code) {
                  case error.PERMISSION_DENIED:
                      errorMessage = "Location access denied. Please allow permissions in your browser settings.";
                      break;
                  case error.POSITION_UNAVAILABLE:
                      errorMessage = `Location unavailable (Attempt ${attempt}/${MAX_ATTEMPTS}).`;
                      break;
                  case error.TIMEOUT:
                      errorMessage = "Location request timed out.";
                      break;
                  default:
                      errorMessage = `Unknown error: ${error.message}`;
              }
  
              if (error.code === error.PERMISSION_DENIED) {
                  showToast(errorMessage, 'error');
                  enableManualEntry();
                  return;
              } else if (attempt === MAX_ATTEMPTS) {
                  showToast("All attempts failed. Please enter your address manually.", 'error');
                  enableManualEntry();
                  return;
              }
              showToast(errorMessage, 'warning');
              await new Promise(resolve => setTimeout(resolve, 3000));
              attempt++;
          }
      }
  }
  
  function enableManualEntry() {
      const fields = ['address-street', 'address-city', 'address-state'];
      fields.forEach(id => {
          const element = document.getElementById(id);
          if (element) {
              element.removeAttribute('readonly');
              element.style.backgroundColor = '#fff';
              element.style.border = '1px solid #ccc';
              element.placeholder = "Enter manually";
          }
      });
      const typeRadios = document.getElementsByName('address-type');
      typeRadios.forEach(radio => {
          radio.disabled = false;
          radio.checked = radio.value === 'Home';
      });
  }
  
  async function reverseGeocode(lat, lon) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
      try {
          const response = await fetch(url, {
              headers: {
                  'User-Agent': 'BookstoreApp/1.0 (contact@example.com)'
              }
          });
          if (!response.ok) {
              throw new Error(`HTTP error ${response.status}`);
          }
          const data = await response.json();
          if (!data.address) {
              throw new Error("No address found for these coordinates.");
          }
  
          return {
              street: data.address.road || data.address.street || '',
              city: data.address.city || data.address.town || data.address.village || '',
              state: data.address.state || data.address.region || '',
              zip_code: data.address.postcode || '',
              country: data.address.country || '',
              type: 'Home'
          };
      } catch (error) {
          throw new Error(`Reverse geocoding failed: ${error.message}`);
      }
  }
  
  function populateGeolocationAddress(address) {
      document.getElementById('address-street').value = address.street;
      document.getElementById('address-city').value = address.city;
      document.getElementById('address-state').value = address.state;
  
      const typeRadios = document.getElementsByName('address-type');
      typeRadios.forEach(radio => {
          radio.checked = radio.value === address.type;
      });
  
      const addressData = {
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zip_code,
          country: address.country,
          type: address.type.toLowerCase(),
          is_default: true
      };
      localStorage.setItem('selectedAddress', JSON.stringify(addressData));
  }
  
  updateProfileUI();