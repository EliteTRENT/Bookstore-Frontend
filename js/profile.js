// Check if window.env is loaded
if (!window.env || !window.env.BACKEND_URL) {
    console.error("Environment variables not loaded. Ensure env.js is included before this script.");
    throw new Error("BACKEND_URL is not defined. Check env.js loading.");
  }
  
  // Toast Notification
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
  
  // Validation Functions
  function validateStreet(street) {
      return street.length >= 5 && street.length <= 100;
  }
  
  function validateCity(city) {
      return /^[a-zA-Z\s-]{2,50}$/.test(city);
  }
  
  function validateState(state) {
      return /^[a-zA-Z\s]{2,50}$/.test(state);
  }
  
  function validateZipCode(zipCode) {
      return /^[a-zA-Z0-9\s-]{3,10}$/.test(zipCode);
  }
  
  function validateCountry(country) {
      return /^[a-zA-Z\s]{2,50}$/.test(country);
  }
  
  function validateForm(addressData) {
      const errors = [];
      if (!validateStreet(addressData.street)) {
          errors.push("Street must be 5-100 characters");
      }
      if (!validateCity(addressData.city)) {
          errors.push("City must be 2-50 letters, spaces, or hyphens");
      }
      if (!validateState(addressData.state)) {
          errors.push("State must be 2-50 letters or spaces (no numbers)");
      }
      if (!validateZipCode(addressData.zip_code)) {
          errors.push("Zip code must be 3-10 characters (letters, numbers, spaces, or hyphens)");
      }
      if (!validateCountry(addressData.country)) {
          errors.push("Country must be 2-50 letters or spaces (no numbers)");
      }
      return errors;
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
  
  // Profile Dropdown Functionality
  function updateProfileUI() {
      const userName = localStorage.getItem("user_name") || "Guest";
      const firstName = userName.split(" ")[0];
  
      const profileIcon = document.getElementById("profileDropdownTrigger");
      if (profileIcon) {
          profileIcon.innerHTML = `<i class="fas fa-user"></i> ${firstName}`;
      } else {
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
  
  // Fetch and Update Cart Count
  async function updateCartCount() {
      const userId = localStorage.getItem("user_id");
      const cartIcon = document.getElementById("cartIcon");
  
      if (!userId || !token || !cartIcon) {
          return;
      }
  
      let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts/${userId}`, {
              method: "GET",
              headers: headers,
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts/${userId}`, {
                      method: "GET",
                      headers: headers,
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
          showToast("Failed to fetch cart count", "error");
      }
  }
  
  // Fetch and Display User Data and Addresses
  async function loadUserData() {
      const userId = localStorage.getItem("user_id");
      const userName = localStorage.getItem("user_name");
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
  
          let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
          let addressResponse = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses`, {
              method: "GET",
              headers: headers,
          });
  
          if (addressResponse.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  addressResponse = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses`, {
                      method: "GET",
                      headers: headers,
                  });
              } else {
                  return;
              }
          }
  
          if (!addressResponse.ok) {
              const text = await addressResponse.text();
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
          showToast("Failed to load profile data: " + error.message, 'error');
      }
  }
  
  // Address CRUD Operations
  async function addNewAddress(addressData) {
      let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
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
  
          if (!response.ok) {
              const text = await response.text();
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
          showToast("Failed to add address: " + error.message, 'error');
      }
  }
  
  async function updateAddress(addressId, addressData) {
      let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses/${addressId}`, {
              method: "PATCH",
              headers: headers,
              body: JSON.stringify({ address: addressData })
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses/${addressId}`, {
                      method: "PATCH",
                      headers: headers,
                      body: JSON.stringify({ address: addressData })
                  });
              } else {
                  return;
              }
          }
  
          if (!response.ok) {
              const text = await response.text();
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
          showToast("Failed to update address: " + error.message, 'error');
      }
  }
  
  async function removeAddress(addressId) {
      let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses/${addressId}`, {
              method: "DELETE",
              headers: headers,
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/addresses/${addressId}`, {
                      method: "DELETE",
                      headers: headers,
                  });
              } else {
                  return;
              }
          }
  
          const result = await response.json();
  
          if (result.success) {
              showToast(result.message);
              loadUserData();
          } else {
              showToast(result.message, 'error');
          }
      } catch (error) {
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
          ['newStreet', 'newCity', 'newState', 'newZipCode', 'newCountry'].forEach(id => {
              const input = document.getElementById(id);
              input.addEventListener('input', () => {
                  let isValid = true;
                  switch(id) {
                      case 'newStreet': isValid = validateStreet(input.value); break;
                      case 'newCity': isValid = validateCity(input.value); break;
                      case 'newState': isValid = validateState(input.value); break;
                      case 'newZipCode': isValid = validateZipCode(input.value); break;
                      case 'newCountry': isValid = validateCountry(input.value); break;
                  }
                  input.style.borderColor = isValid ? '#ddd' : 'red';
              });
          });
  
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
  
              const errors = validateForm(addressData);
              if (errors.length > 0) {
                  showToast(errors.join(", "), 'error');
              } else {
                  addNewAddress(addressData);
                  addAddressModal.style.display = "none";
                  addAddressForm.reset();
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
                      input.addEventListener('input', () => {
                          let isValid = true;
                          if (input.classList.contains('street-input')) isValid = validateStreet(input.value);
                          else if (input.classList.contains('city-input')) isValid = validateCity(input.value);
                          else if (input.classList.contains('state-input')) isValid = validateState(input.value);
                          else if (input.classList.contains('zip-code-input')) isValid = validateZipCode(input.value);
                          else if (input.classList.contains('country-input')) isValid = validateCountry(input.value);
                          input.style.borderColor = isValid ? '#ddd' : 'red';
                      });
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
                      
                      const errors = validateForm(addressData);
                      if (errors.length > 0) {
                          showToast(errors.join(", "), "error");
                      } else {
                          updateAddress(addressId, addressData);
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
      updateCartCount();
  
      document.querySelector(".bookstore-dash__logo").addEventListener("click", () => {
          window.location.href = "../pages/bookStoreDashboard.html";
      });
  });