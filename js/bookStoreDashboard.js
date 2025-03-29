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

// Get token and user ID from localStorage (optional for logged-in users)
const token = localStorage.getItem("token");
const userId = localStorage.getItem("user_id");

// Headers with token (only used if token exists)
const headers = token
  ? {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  : { "Content-Type": "application/json" };

// Fetch Cart Count (only for logged-in users)
async function fetchCartCount() {
  if (!token || !userId) {
    updateCartCount(0);
    return;
  }

  try {
    console.log("Fetching cart with token:", token);
    const response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, {
      method: "GET",
      headers: headers
    });

    if (!response.ok) {
      console.error(`Cart fetch failed with status: ${response.status}`);
      if (response.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.clear();
        updateProfileUI();
        window.location.href = "../pages/login.html";
        return;
      }
      throw new Error(`Error ${response.status}: Failed to fetch cart items`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to fetch cart items");
    }

    const cartItems = data.cart || [];
    updateCartCount(cartItems.length);
  } catch (error) {
    console.error("Error fetching cart count:", error.message);
    updateCartCount(0);
  }
}

// Update Cart Icon with Count
function updateCartCount(count) {
  const cartIcon = document.getElementById("cartIcon");
  if (cartIcon) {
    cartIcon.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (${count})`;
    cartIcon.style.display = token ? "block" : "none"; // Hide cart if not logged in
  }
}

// Fetch Books from Backend (works for both logged-in and logged-out users)
function fetchBooks(page = 1, sort = "relevance") {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  let url = `${BASE_URL}/api/v1/books?page=${page}&per_page=${perPage}`;
  if (sort && sort !== "relevance") {
    url += `&sort_by=${encodeURIComponent(sort)}`;
  }

  fetch(url, {
    method: "GET",
    headers: headers,
    signal: abortController.signal
  })
    .then(response => {
      if (!response.ok) {
        console.error(`Books fetch failed with status: ${response.status}`);
        if (response.status === 401 && token) {
          alert("Session expired");
          localStorage.clear();
          window.location.href = "../pages/login.html";
        }
        return response.json().then(err => {
          throw new Error(`Books error: ${JSON.stringify(err)}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (!data.books || !Array.isArray(data.books) || !data.pagination) {
        const errorMessage = data.message || "Invalid response format: Failed to retrieve books";
        console.error("Error fetching books:", errorMessage);
        bookGrid.innerHTML = `<p class="error-message">Error: ${errorMessage}</p>`;
        return;
      }
      renderBooks(data.books);
      renderPagination(data.pagination);
      totalItems.textContent = data.pagination.total_count;
    })
    .catch(error => {
      if (error.name === "AbortError") {
        console.log("Fetch aborted");
        return;
      }
      console.error("Books fetch error:", error.message);
      bookGrid.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
    });
}

// Fetch Search Suggestions (works for both logged-in and logged-out users)
function searchBooks(query) {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  if (!query || query.trim().length === 0) {
    fetchBooks(1, sortSelect.value);
    return;
  }

  fetch(`${BASE_URL}/api/v1/books/search_suggestions?query=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: headers,
    signal: abortController.signal
  })
    .then(response => {
      if (!response.ok) {
        console.error(`Search fetch failed with status: ${response.status}`);
        if (response.status === 401 && token) {
          alert("Session expired");
          localStorage.clear();
          window.location.href = "../pages/login.html";
        }
        return response.json().then(err => {
          throw new Error(`Search error: ${JSON.stringify(err)}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        const errorMessage = data.message || "Invalid response format: Failed to retrieve search suggestions";
        console.error("Error fetching suggestions:", errorMessage);
        bookGrid.innerHTML = `<p class="error-message">Error: ${errorMessage}</p>`;
        return;
      }
      renderBooks(data.suggestions);
      renderPagination({ current_page: 1, total_pages: 1 });
      totalItems.textContent = data.suggestions.length;
    })
    .catch(error => {
      if (error.name === "AbortError") {
        console.log("Fetch aborted");
        return;
      }
      console.error("Search fetch error:", error.message);
      bookGrid.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
    });
}

// Render Books to the Grid
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

  // Attach event listeners for Quick View buttons
  document.querySelectorAll(".bookstore-dash__quick-view").forEach(button => {
    button.addEventListener("click", e => {
      const bookCard = e.target.closest(".bookstore-dash__book-card");
      const bookId = bookCard.getAttribute("data-book-id");
      window.location.href = `/pages/bookdetails.html?bookId=${bookId}`;
    });
  });

  // Attach event listeners for Delete buttons (only for admins)
  document.querySelectorAll(".bookstore-dash__delete-btn").forEach(button => {
    button.addEventListener("click", e => {
      const bookId = e.target.closest(".bookstore-dash__delete-btn").getAttribute("data-book-id");
      deleteBook(bookId);
    });
  });
}

function deleteBook(bookId) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in to delete a book.");
    window.location.href = "../pages/login.html";
    return;
  }

  if (confirm("Are you sure you want to delete this book?")) {
    fetch(`${BASE_URL}/api/v1/books/delete/${bookId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((response) => {
        const contentType = response.headers.get("Content-Type");
        if (!response.ok) {
          if (contentType && contentType.includes("application/json")) {
            return response.json().then((err) => {
              throw new Error(err.error || `HTTP error! Status: ${response.status}`);
            });
          } else {
            throw new Error(`HTTP error! Status: ${response.status} (non-JSON response)`);
          }
        }
        if (contentType && contentType.includes("application/json")) {
          return response.json();
        } else {
          return { message: "Book marked as deleted" };
        }
      })
      .then((data) => {
        console.log("Toggle Delete Book Response:", data);
        if (
          data.message === "Book deleted successfully" ||
          data.message === "Book restored successfully" ||
          data.message === "Book marked as deleted" // Added this condition
        ) {
          alert("Book deleted successfully!");
          fetchBooks(currentPage, sortSelect.value); // Refresh the book list
        } else {
          alert("Error deleting book: " + (data.error || "Unknown error"));
        }
      })
      .catch((error) => {
        console.error("Error deleting book:", error.message);
        if (error.message.includes("401")) {
          alert("Session expired. Please log in again.");
          localStorage.clear();
          window.location.href = "../pages/login.html";
        } else {
          alert("Failed to delete book: " + error.message);
        }
      });
  }
}

// Add a Book Card to the UI
function addBookToUI(name, author, image, discounted_price, mrp, quantity, averageRating, totalReviews, bookId) {
  const bookCard = document.createElement("div");
  bookCard.className = "bookstore-dash__book-card";
  bookCard.setAttribute("data-book-id", bookId);

  // Check if the user is an admin
  const role = localStorage.getItem("role");
  const isAdmin = role === "admin";

  bookCard.innerHTML = `
    <div class="bookstore-dash__book-image-wrapper">
      <img src="${image}" alt="${name}" class="bookstore-dash__book-image">
      <div class="bookstore-dash__quick-view">Quick View</div>
      ${quantity === 0 ? '<p class="bookstore-dash__book-out-of-stock">Out of Stock</p>' : ""}
      ${
        isAdmin
          ? `<button class="bookstore-dash__delete-btn" data-book-id="${bookId}"><i class="fas fa-trash"></i> Delete</button>`
          : ""
      }
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

  prevPageBtn.onclick = () => {
    if (currentPage > 1) fetchBooks(currentPage - 1, sortSelect.value);
  };
  nextPageBtn.onclick = () => {
    if (currentPage < totalPages) fetchBooks(currentPage + 1, sortSelect.value);
  };
}

// Event Listeners
searchInput.addEventListener("input", e => {
  const query = e.target.value.trim();
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => searchBooks(query), 300);
});

sortSelect.addEventListener("change", () => {
  fetchBooks(1, sortSelect.value);
});

// Profile Dropdown Functionality
// Profile Dropdown Functionality
function updateProfileUI() {
  const profileIcon = document.querySelector("#profileDropdownTrigger");
  if (!profileIcon) {
    console.error("Profile icon not found");
    return;
  }

  const role = localStorage.getItem("role");
  const userName = token && userId ? (localStorage.getItem("user_name") || "Guest") : "Guest";
  const firstName = userName.split(" ")[0];
  profileIcon.innerHTML = `<i class="fas fa-user"></i> ${firstName}`;

  // Create or update the dropdown
  let profileDropdown = document.querySelector(".bookstore-dash__profile-dropdown");
  if (!profileDropdown) {
    profileDropdown = document.createElement("div");
    profileDropdown.className = "bookstore-dash__profile-dropdown";
    document.querySelector(".bookstore-dash__header").appendChild(profileDropdown);
  }

  // Set dropdown content based on login status
  if (token && userId) {
    let profileContent = `
      <div class="bookstore-dash__profile-item bookstore-dash__profile"><i class="fas fa-user"></i> Profile</div>
      <div class="bookstore-dash__profile-item bookstore-dash__orders"><i class="fas fa-shopping-bag"></i> My Orders</div>
      <div class="bookstore-dash__profile-item bookstore-dash__wishlist"><i class="fas fa-heart"></i> My Wishlist</div>
    `;
    if (role === "admin") {
      profileContent += `
        <div class="bookstore-dash__profile-item bookstore-dash__profile-create-user"><i class="fas fa-user-plus"></i> Create User</div>
      `;
    }
    profileContent += `
      <div class="bookstore-dash__profile-item bookstore-dash__logout"><i class="fas fa-sign-out-alt"></i> Logout</div>
    `;
    profileDropdown.innerHTML = profileContent;

    // Add event listeners for logged-in user
    profileDropdown.querySelector(".bookstore-dash__profile").addEventListener("click", () => {
      window.location.href = "../pages/profile.html";
    });
    profileDropdown.querySelector(".bookstore-dash__orders").addEventListener("click", () => {
      window.location.href = "../pages/bookOrders.html";
    });
    profileDropdown.querySelector(".bookstore-dash__wishlist").addEventListener("click", () => {
      window.location.href = "../pages/bookWishlist.html";
    });
    profileDropdown.querySelector(".bookstore-dash__logout").addEventListener("click", () => {
      localStorage.clear();
      updateProfileUI();
      window.location.href = "../pages/login.html";
    });
    if (role === "admin") {
      profileDropdown.querySelector(".bookstore-dash__profile-create-user").addEventListener("click", () => {
        window.location.href = "../pages/admin_create.html";
      });
    }
  } else {
    profileDropdown.innerHTML = `
      <div class="bookstore-dash__profile-item">Hello, Guest</div>
      <div class="bookstore-dash__profile-item bookstore-dash__profile-login"><i class="fas fa-sign-in-alt"></i> Login</div>
      <div class="bookstore-dash__profile-item bookstore-dash__wishlist"><i class="fas fa-heart"></i> My Wishlist</div>
      <div class="bookstore-dash__profile-item bookstore-dash__orders"><i class="fas fa-shopping-bag"></i> My Orders</div>
    `;

    // Add event listeners for guest user
    profileDropdown.querySelector(".bookstore-dash__profile-login").addEventListener("click", () => {
      window.location.href = "../pages/login.html";
    });
    profileDropdown.querySelector(".bookstore-dash__wishlist").addEventListener("click", () => {
      window.location.href = "../pages/bookWishlist.html";
    });
    profileDropdown.querySelector(".bookstore-dash__orders").addEventListener("click", () => {
      window.location.href = "../pages/bookOrders.html";
    });
  }

  // Remove existing click listener to prevent stacking
  const newProfileIcon = profileIcon.cloneNode(true);
  profileIcon.parentNode.replaceChild(newProfileIcon, profileIcon);

  // Toggle dropdown on click
  newProfileIcon.addEventListener("click", e => {
    e.preventDefault();
    profileDropdown.classList.toggle("active");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", e => {
    if (!newProfileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.remove("active");
    }
  });
}

// Cart Icon Click Functionality
function setupCartIconListener() {
  const cartIcon = document.getElementById("cartIcon");
  if (cartIcon) {
    cartIcon.addEventListener("click", () => {
      if (!token || !userId) {
        window.location.href = "../pages/mycart.html"; // Direct redirect, no alert
        return;
      }
      window.location.href = "../pages/mycart.html";
    });
  }
}

// Initial Setup
updateProfileUI();
setupCartIconListener();
fetchBooks();
if (token && userId) fetchCartCount();