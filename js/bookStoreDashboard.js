// bookStoreDashboard.js
// Constants
const bookGrid = document.getElementById("bookGrid");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const paginationPages = document.getElementById("paginationPages");
const searchInput = document.getElementById("searchInput");
const totalItems = document.getElementById("totalItems");
const sortSelect = document.getElementById("sortSelect");

let currentPage = 1;
const perPage = 12;
const BASE_URL = "http://127.0.0.1:3000";

let debounceTimeout = null;
let abortController = null;

// Get token and user ID from localStorage
let token = localStorage.getItem("token");
const refreshToken = localStorage.getItem("refresh_token");
const userId = localStorage.getItem("user_id");

// Headers with token (updated dynamically)
let headers = token
  ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  : { "Content-Type": "application/json" };

// Toast Notification Function (adapted from login.js)
function showToast(message, type = "info") {
  console.log(`Showing toast: ${message} (type: ${type})`);
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Function to refresh the access token
async function refreshAccessToken() {
  if (!refreshToken) {
    localStorage.clear();
    updateProfileUI();
    window.location.href = "../pages/login.html";
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/v1/sessions/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.errors || `Refresh failed with status: ${response.status}`);

    token = data.token;
    localStorage.setItem("token", token);
    headers.Authorization = `Bearer ${token}`;
    return true;
  } catch (error) {
    localStorage.clear();
    updateProfileUI();
    window.location.href = "../pages/login.html";
    return false;
  }
}

// Fetch Cart Count
async function fetchCartCount() {
  if (!token || !userId) {
    updateCartCount(0);
    return;
  }

  try {
    let response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, { method: "GET", headers });
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return;
      response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, { method: "GET", headers });
    }

    if (!response.ok) throw new Error(`Error ${response.status}: Failed to fetch cart items`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch cart items");

    updateCartCount(data.cart?.length || 0);
  } catch (error) {
    updateCartCount(0);
  }
}

// Update Cart Icon with Count
function updateCartCount(count) {
  const cartIcon = document.getElementById("cartIcon");
  if (cartIcon) {
    cartIcon.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (${count})`;
    cartIcon.style.display = token ? "block" : "none";
  }
}

// Fetch Books
async function fetchBooks(page = 1, sort = "relevance") {
  if (abortController) abortController.abort();
  abortController = new AbortController();

  let url = `${BASE_URL}/api/v1/books?page=${page}&per_page=${perPage}`;
  if (sort && sort !== "relevance") url += `&sort_by=${encodeURIComponent(sort)}`;
  const fallbackUrl = `http://127.0.0.1:3001/books?page=${page}&per_page=${perPage}`;

  try {
    let response = await fetch(url, { method: "GET", headers, signal: abortController.signal });
    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return;
      response = await fetch(url, { method: "GET", headers, signal: abortController.signal });
    }

    if (!response.ok) {
      throw new Error(`Books error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.books || !Array.isArray(data.books) || !data.pagination) {
      throw new Error(data.message || "Invalid response format: Failed to retrieve books");
    }
    renderBooks(data.books);
    renderPagination(data.pagination);
    totalItems.textContent = data.pagination.total_count;
  } catch (error) {
    if (error.name === "AbortError") return;

    // Fallback to json-server
    console.warn("Main backend failed, falling back to json-server:", error.message);
    try {
      const fallbackResponse = await fetch(fallbackUrl, {
        method: "GET",
        signal: abortController.signal
      });
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback error: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      // Since json-server returns just the books array at /books, wrap it in the expected structure
      const mockData = {
        books: fallbackData,
        pagination: {
          current_page: page,
          per_page: perPage,
          total_pages: 1, // Adjust based on your mock data
          total_count: fallbackData.length
        }
      };
      renderBooks(mockData.books);
      renderPagination(mockData.pagination);
      totalItems.textContent = mockData.pagination.total_count;
      showToast("Using fallback data due to backend unavailability", "warning");
    } catch (fallbackError) {
      if (fallbackError.name === "AbortError") return;
      bookGrid.innerHTML = `<p class="error-message">Error: ${fallbackError.message}</p>`;
    }
  }
}

// Fetch Search Suggestions
async function searchBooks(query) {
  if (abortController) abortController.abort();
  abortController = new AbortController();

  if (!query || query.trim().length === 0) {
    fetchBooks(1, sortSelect.value);
    return;
  }

  try {
    let response = await fetch(`${BASE_URL}/api/v1/books/search_suggestions?query=${encodeURIComponent(query)}`, {
      method: "GET",
      headers,
      signal: abortController.signal
    });

    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return;
      response = await fetch(`${BASE_URL}/api/v1/books/search_suggestions?query=${encodeURIComponent(query)}`, {
        method: "GET",
        headers,
        signal: abortController.signal
      });
    }

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(`Search error: ${JSON.stringify(errData)}`);
    }

    const data = await response.json();
    if (!data.suggestions || !Array.isArray(data.suggestions)) {
      throw new Error(data.message || "Invalid response format: Failed to retrieve search suggestions");
    }
    renderBooks(data.suggestions);
    renderPagination({ current_page: 1, total_pages: 1 });
    totalItems.textContent = data.suggestions.length;
  } catch (error) {
    if (error.name === "AbortError") return;
    bookGrid.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
  }
}

// Render Books
function renderBooks(books) {
  bookGrid.innerHTML = "";
  if (!books || books.length === 0) {
    bookGrid.innerHTML = '<p class="no-results">No books found.</p>';
    return;
  }

  books.forEach(book => {
    const discountedPrice = parseFloat(book.discounted_price) || 0;
    const mrp = parseFloat(book.mrp) || 0;
    const quantity = parseInt(book.quantity, 10) || 0;
    const averageRating = parseFloat(book.average_rating) || 0;
    const totalReviews = parseInt(book.total_reviews) || 0;
    const imageUrl = book.book_image || "https://via.placeholder.com/150";

    addBookToUI(
      book.name,
      book.author,
      imageUrl,
      discountedPrice,
      mrp,
      quantity,
      averageRating,
      totalReviews,
      book.id
    );
  });

  // Remove old listeners and add a single event delegation
  bookGrid.removeEventListener("click", handleBookGridClick);
  bookGrid.addEventListener("click", handleBookGridClick);
}

function handleBookGridClick(e) {
  const quickViewBtn = e.target.closest(".bookstore-dash__quick-view");
  const deleteBtn = e.target.closest(".bookstore-dash__delete-btn");

  if (quickViewBtn) {
    const bookCard = quickViewBtn.closest(".bookstore-dash__book-card");
    const bookId = bookCard.getAttribute("data-book-id");
    window.location.href = `/pages/bookdetails.html?bookId=${bookId}`;
  } else if (deleteBtn) {
    const bookId = deleteBtn.getAttribute("data-book-id");
    deleteBook(bookId);
  }
}

// Delete Book
async function deleteBook(bookId) {
  if (!token) {
    showToast("Please log in to delete a book.", "error");
    window.location.href = "../pages/login.html";
    return;
  }

  if (!confirm("Are you sure you want to delete this book?")) return;

  try {
    console.log(`Attempting to delete book with ID: ${bookId}`);
    const response = await fetch(`${BASE_URL}/api/v1/books/delete/${bookId}`, {
      method: "PATCH",
      headers
    });

    const responseData = await response.json();
    console.log(`Delete response status: ${response.status}, data:`, responseData);

    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        showToast("Session expired. Please log in again.", "error");
        return;
      }
      const retryResponse = await fetch(`${BASE_URL}/api/v1/books/delete/${bookId}`, {
        method: "PATCH",
        headers
      });
      const retryData = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new Error(retryData.error || `Retry failed with status: ${retryResponse.status}`);
      }
      handleDeleteSuccess(retryData);
    } else if (!response.ok) {
      throw new Error(responseData.error || `HTTP error! Status: ${response.status}`);
    } else {
      handleDeleteSuccess(responseData);
    }
  } catch (error) {
    console.error("Error deleting book:", error.message);
    showToast(`Failed to delete book: ${error.message}`, "error");
  }
}

// Handle Delete Success with Toast
function handleDeleteSuccess(data) {
  console.log("Handling delete success with data:", data);
  if (data.message === "Book deleted successfully" || data.message === "Book restored successfully" || data.message === "Book marked as deleted") {
    showToast("Book deleted successfully!", "success");
    fetchBooks(currentPage, sortSelect.value);
  } else {
    showToast(`Error deleting book: ${data.error || "Unknown error"}`, "error");
  }
}

// Add a Book Card to the UI
function addBookToUI(name, author, image, discounted_price, mrp, quantity, averageRating, totalReviews, bookId) {
  const bookCard = document.createElement("div");
  bookCard.className = "bookstore-dash__book-card";
  bookCard.setAttribute("data-book-id", bookId);

  const role = localStorage.getItem("role");
  const isAdmin = role === "admin";

  bookCard.innerHTML = `
    <div class="bookstore-dash__book-image-wrapper">
      <img src="${image}" alt="${name}" class="bookstore-dash__book-image">
      <div class="bookstore-dash__quick-view">Quick View</div>
      ${quantity === 0 ? '<p class="bookstore-dash__book-out-of-stock">Out of Stock</p>' : ""}
      ${isAdmin ? `<button class="bookstore-dash__delete-btn" data-book-id="${bookId}"><i class="fas fa-trash"></i> Delete</button>` : ""}
    </div>
    <div class="bookstore-dash__book-details">
      <h3 class="bookstore-dash__book-title">${name}</h3>
      <p class="bookstore-dash__book-author">by ${author}</p>
      <p class="bookstore-dash__book-rating">
        <span class="bookstore-dash__rating-value"><i class="fas fa-star"></i> ${averageRating.toFixed(1)}</span>
        <span class="bookstore-dash__review-count">(${totalReviews})</span>
      </p>
      <p class="bookstore-dash__book-price">Rs. ${discounted_price.toFixed(2)} <del>Rs. ${mrp.toFixed(2)}</del></p>
    </div>
  `;

  bookGrid.appendChild(bookCard);
}

// Render Pagination
function renderPagination(pagination) {
  currentPage = pagination.current_page;
  const totalPages = pagination.total_pages;

  paginationPages.innerHTML = "";
  if (totalPages <= 1) return;

  const maxPagesToShow = 8;
  let startPage = Math.max(1, currentPage - 3);
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageSpan = document.createElement("span");
    pageSpan.className = `bookstore-dash__pagination-page ${i === currentPage ? "active" : ""}`;
    pageSpan.textContent = i;
    pageSpan.onclick = () => fetchBooks(i, sortSelect.value);
    paginationPages.appendChild(pageSpan);
  }

  if (endPage < totalPages) {
    const ellipsis = document.createElement("span");
    ellipsis.textContent = "...";
    paginationPages.appendChild(ellipsis);

    const lastPage = document.createElement("span");
    lastPage.className = "bookstore-dash__pagination-page";
    lastPage.textContent = totalPages;
    lastPage.onclick = () => fetchBooks(totalPages, sortSelect.value);
    paginationPages.appendChild(lastPage);
  }

  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;

  prevPageBtn.onclick = () => currentPage > 1 && fetchBooks(currentPage - 1, sortSelect.value);
  nextPageBtn.onclick = () => currentPage < totalPages && fetchBooks(currentPage + 1, sortSelect.value);
}

// Event Listeners
searchInput.addEventListener("input", e => {
  const query = e.target.value.trim();
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => searchBooks(query), 300);
});

sortSelect.addEventListener("change", () => fetchBooks(1, sortSelect.value));

// Profile Dropdown Functionality
function updateProfileUI() {
  const profileIcon = document.querySelector("#profileDropdownTrigger");
  if (!profileIcon) return console.error("Profile icon not found");

  const role = localStorage.getItem("role");
  const userName = token && userId ? (localStorage.getItem("user_name") || "Guest") : "Guest";
  const firstName = userName.split(" ")[0];
  profileIcon.innerHTML = `<i class="fas fa-user"></i> ${firstName}`;

  let profileDropdown = document.querySelector(".bookstore-dash__profile-dropdown");
  if (!profileDropdown) {
    profileDropdown = document.createElement("div");
    profileDropdown.className = "bookstore-dash__profile-dropdown";
    document.querySelector(".bookstore-dash__header").appendChild(profileDropdown);
  }

  profileDropdown.innerHTML = token && userId
    ? `
        <div class="bookstore-dash__profile-item bookstore-dash__profile"><i class="fas fa-user"></i> Profile</div>
        <div class="bookstore-dash__profile-item bookstore-dash__orders"><i class="fas fa-shopping-bag"></i> My Orders</div>
        <div class="bookstore-dash__profile-item bookstore-dash__wishlist"><i class="fas fa-heart"></i> My Wishlist</div>
        ${role === "admin" ? '<div class="bookstore-dash__profile-item bookstore-dash__profile-create-user"><i class="fas fa-user-plus"></i> Create User</div>' : ""}
        <div class="bookstore-dash__profile-item bookstore-dash__logout"><i class="fas fa-sign-out-alt"></i> Logout</div>
      `
    : `
        <div class="bookstore-dash__profile-item">Hello, Guest</div>
        <div class="bookstore-dash__profile-item bookstore-dash__profile-login"><i class="fas fa-sign-in-alt"></i> Login</div>
        <div class="bookstore-dash__profile-item bookstore-dash__wishlist"><i class="fas fa-heart"></i> My Wishlist</div>
        <div class="bookstore-dash__profile-item bookstore-dash__orders"><i class="fas fa-shopping-bag"></i> My Orders</div>
      `;

  // Toggle dropdown
  profileIcon.onclick = e => {
    e.preventDefault();
    profileDropdown.classList.toggle("active");
  };

  document.onclick = e => {
    if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.remove("active");
    }
  };

  // Attach event listeners
  if (token && userId) {
    profileDropdown.querySelector(".bookstore-dash__profile").onclick = () => window.location.href = "../pages/profile.html";
    profileDropdown.querySelector(".bookstore-dash__orders").onclick = () => window.location.href = "../pages/bookOrders.html";
    profileDropdown.querySelector(".bookstore-dash__wishlist").onclick = () => window.location.href = "../pages/bookWishlist.html";
    profileDropdown.querySelector(".bookstore-dash__logout").onclick = () => {
      localStorage.clear();
      updateProfileUI();
      window.location.href = "../pages/login.html";
    };
    if (role === "admin") {
      profileDropdown.querySelector(".bookstore-dash__profile-create-user").onclick = () => window.location.href = "../pages/admin_create.html";
    }
  } else {
    profileDropdown.querySelector(".bookstore-dash__profile-login").onclick = () => window.location.href = "../pages/login.html";
    profileDropdown.querySelector(".bookstore-dash__wishlist").onclick = () => window.location.href = "../pages/bookWishlist.html";
    profileDropdown.querySelector(".bookstore-dash__orders").onclick = () => window.location.href = "../pages/bookOrders.html";
  }
}

// Cart Icon Click rococoFunctionality
function setupCartIconListener() {
  const cartIcon = document.getElementById("cartIcon");
  if (cartIcon) {
    cartIcon.onclick = () => window.location.href = "../pages/mycart.html";
  }
}

// Initial Setup
updateProfileUI();
setupCartIconListener();
fetchBooks();
if (token && userId) fetchCartCount();