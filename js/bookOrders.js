// Check if window.env is loaded
if (!window.env || !window.env.BACKEND_URL) {
    console.error("Environment variables not loaded. Ensure env.js is included before this script.");
    throw new Error("BACKEND_URL is not defined. Check env.js loading.");
  }
  
  // DOM Elements
  const ordersContainer = document.getElementById("ordersContainer");
  const loginPrompt = document.getElementById("loginPrompt");
  const orderItems = document.getElementById("orderItems");
  const ordersList = document.getElementById("ordersList");
  const ordersTitle = document.getElementById("ordersTitle");
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
          if (header) header.appendChild(profileDropdown);
          else console.warn("Header element not found in DOM");
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
              window.location.href = "../pages/bookOrders.html"; // Fixed: Actually navigate to orders page
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
  
  // Fetch and update cart count
  async function updateCartCount() {
      const userId = localStorage.getItem("user_id");
  
      if (!userId || !token || !cartIcon) {
          return;
      }
  
      let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts/${userId}`, {
              method: "GET",
              headers: headers
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/carts/${userId}`, {
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
  
  // Fetch Orders from Backend
  async function fetchOrders() {
      const userId = localStorage.getItem("user_id");
  
      if (!token || !userId) {
          showLoginPrompt();
          return;
      }
  
      let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      try {
          let response = await fetch(`${window.env.BACKEND_URL}/api/v1/orders`, {
              method: "GET",
              headers: headers
          });
  
          if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                  headers.Authorization = `Bearer ${token}`;
                  response = await fetch(`${window.env.BACKEND_URL}/api/v1/orders`, {
                      method: "GET",
                      headers: headers
                  });
              } else {
                  return;
              }
          }
  
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || errorData.errors || `HTTP error! Status: ${response.status}`);
          }
  
          const data = await response.json();
          renderOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (error) {
          if (error.message.includes("401")) {
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
      }
  }
  
  // Render Orders
  function renderOrders(orders) {
      ordersList.innerHTML = "";
      const activeOrders = orders.filter(order => order.status !== "cancelled");
      ordersTitle.textContent = `My Orders (${activeOrders.length})`;
  
      if (activeOrders.length === 0) {
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
  
      activeOrders.forEach((order) => {
          fetch(`${window.env.BACKEND_URL}/api/v1/books/${order.book_id}`, {
              headers: { "Authorization": `Bearer ${token}` }
          })
              .then((response) => {
                  if (response.status === 401) {
                      return refreshAccessToken().then(refreshed => {
                          if (refreshed) {
                              return fetch(`${window.env.BACKEND_URL}/api/v1/books/${order.book_id}`, {
                                  headers: { "Authorization": `Bearer ${token}` }
                              });
                          } else {
                              throw new Error("Token refresh failed");
                          }
                      });
                  }
                  if (!response.ok) {
                      throw new Error(`HTTP error! Status: ${response.status}`);
                  }
                  return response;
              })
              .then((response) => response.json())
              .then((bookData) => {
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
  
                  const totalPrice = Number(order.total_price) || 0;
                  const mrp = Number(book.mrp) || totalPrice;
  
                  const cancelButton = order.status === "pending" ? `
                      <button class="cancel-order-btn" data-order-id="${order.id}">Cancel</button>
                  ` : '';
  
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
                          ${cancelButton}
                      </div>
                  `;
                  
                  ordersList.appendChild(orderItem);
  
                  const cancelBtn = orderItem.querySelector('.cancel-order-btn');
                  if (cancelBtn) {
                      cancelBtn.addEventListener('click', () => {
                          cancelOrder(order.id, orderItem);
                      });
                  }
              })
              .catch((error) => {
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
              });
      });
  
      showOrderItems();
  }
  
  // Handle order cancellation
  async function cancelOrder(orderId, orderElement) {
      if (!token) {
          alert("Please log in to cancel an order");
          return;
      }
  
      if (confirm("Are you sure you want to cancel this order?")) {
          let headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
          try {
              let response = await fetch(`${window.env.BACKEND_URL}/api/v1/orders/${orderId}`, {
                  method: "PATCH",
                  headers: headers,
                  body: JSON.stringify({ status: "cancelled" })
              });
  
              if (response.status === 401) {
                  const refreshed = await refreshAccessToken();
                  if (refreshed) {
                      headers.Authorization = `Bearer ${token}`;
                      response = await fetch(`${window.env.BACKEND_URL}/api/v1/orders/${orderId}`, {
                          method: "PATCH",
                          headers: headers,
                          body: JSON.stringify({ status: "cancelled" })
                      });
                  } else {
                      return;
                  }
              }
  
              if (!response.ok) {
                  const errData = await response.json();
                  throw new Error(errData.errors?.join(", ") || `HTTP error! Status: ${response.status}`);
              }
  
              const data = await response.json();
              if (data.message === "Order status updated successfully") {
                  fetchOrders();
                  alert("Order cancelled successfully");
              }
          } catch (error) {
              alert("Failed to cancel order: " + error.message);
          }
      }
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
  
      if (userId && token) {
          fetchOrders();
          updateCartCount();
      } else {
          showLoginPrompt();
      }
  
      if (loginBtn) {
          loginBtn.addEventListener("click", () => {
              window.location.href = "../pages/login.html";
          });
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