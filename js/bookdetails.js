const BASE_URL = "http://127.0.0.1:3000";

const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get("bookId");
let token = localStorage.getItem("token");
const refreshToken = localStorage.getItem("refresh_token");
const userId = localStorage.getItem("user_id");

let headers = token
  ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  : { "Content-Type": "application/json" };

const bookImage = document.getElementById("bookImage");
const bookTitle = document.getElementById("bookTitle");
const bookAuthor = document.getElementById("bookAuthor");
const ratingValue = document.getElementById("ratingValue");
const reviewCount = document.getElementById("reviewCount");
const discountedPrice = document.getElementById("discountedPrice");
const mrp = document.getElementById("mrp");
const bookDetails = document.getElementById("bookDetails");
const bookNameBreadcrumb = document.getElementById("bookNameBreadcrumb");
const reviewsContainer = document.getElementById("reviewsContainer");
const ratingStars = document.getElementById("ratingStars");
const ratingInput = document.getElementById("ratingInput");
const wishlistBtn = document.getElementById("wishlistBtn");

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

    if (!response.ok) {
      throw new Error(data.errors || `Refresh failed with status: ${response.status}`);
    }

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

async function fetchBookDetails(bookId) {
  try {
    let response = await fetch(`${BASE_URL}/api/v1/books/${bookId}`, {
      method: "GET",
      headers: headers,
    });

    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(`${BASE_URL}/api/v1/books/${bookId}`, {
          method: "GET",
          headers: headers,
        });
      } else {
        return;
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.book || !data.book.id) {
      throw new Error(data.errors || "Failed to retrieve book details");
    }
    renderBookDetails(data.book);
    checkWishlistStatus(bookId);
  } catch (error) {
    bookTitle.textContent = "Error Loading Book";
    bookDetails.textContent = `Error: ${error.message}`;
    ratingValue.textContent = "N/A";
    reviewCount.textContent = "(0)";
    discountedPrice.textContent = "0.00";
    mrp.textContent = "0.00";
  }
}

function setupEditBookForm(book) {
  const role = localStorage.getItem("role");
  const isAdmin = role === "admin";
  const editBookBtn = document.getElementById("editBookBtn");
  const editBookForm = document.getElementById("editBookForm");
  const editBookFormElement = document.getElementById("editBookFormElement");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  if (isAdmin && editBookBtn) {
    editBookBtn.style.display = "inline-block";
    editBookBtn.addEventListener("click", () => {
      // Populate the form with current book details
      document.getElementById("editName").value = book.name || "";
      document.getElementById("editAuthor").value = book.author || "";
      document.getElementById("editMrp").value = book.mrp || 0;
      document.getElementById("editDiscountedPrice").value = book.discounted_price || 0;
      document.getElementById("editQuantity").value = book.quantity || 0;
      document.getElementById("editBookDetails").value = book.book_details || "";
      document.getElementById("editGenre").value = book.genre || "";
      document.getElementById("editBookImage").value = book.book_image || "";

      editBookForm.style.display = "block";
      editBookBtn.style.display = "none";
    });

    cancelEditBtn.addEventListener("click", () => {
      editBookForm.style.display = "none";
      editBookBtn.style.display = "inline-block";
    });

    editBookFormElement.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(editBookFormElement);
      const bookData = {
        book: {
          name: formData.get("name"),
          author: formData.get("author"),
          mrp: parseFloat(formData.get("mrp")),
          discounted_price: parseFloat(formData.get("discounted_price")),
          quantity: parseInt(formData.get("quantity")),
          book_details: formData.get("book_details"),
          genre: formData.get("genre"),
          book_image: formData.get("book_image"),
        },
      };

      fetch(`${BASE_URL}/api/v1/books/${bookId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(bookData),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((err) => {
              throw new Error(err.error || `HTTP error! Status: ${response.status}`);
            });
          }
          return response.json();
        })
        .then((data) => {
          console.log("Update Book Response:", data);
          // Check for different possible response structures
          let updatedBook = null;
          let isSuccess = false;

          if (data.success) {
            isSuccess = true;
            updatedBook = data.book || data.data || null;
          } else if (data.message && data.message.toLowerCase().includes("success")) {
            isSuccess = true;
            updatedBook = data.book || data.data || null;
          } else if (data.id) {
            // If the response is just the book object
            isSuccess = true;
            updatedBook = data;
          }

          if (isSuccess && updatedBook) {
            alert("Book updated successfully!");
            renderBookDetails(updatedBook);
            editBookForm.style.display = "none";
            editBookBtn.style.display = "inline-block";
          } else {
            const errorMessage = Array.isArray(data.errors)
              ? data.errors.join(", ")
              : data.error || "Unknown error occurred";
            alert(`Error: ${errorMessage}`);
          }
        })
        .catch((error) => {
          console.error("Error updating book:", error.message);
          if (error.message.includes("401")) {
            alert("Session expired. Please log in again.");
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");
            localStorage.removeItem("token");
            window.location.href = "../pages/login.html";
          } else {
            alert("Failed to update book: " + error.message);
          }
        });
    });
  }
}

// Render Book Details
function renderBookDetails(book) {
  bookImage.src =
    book.book_image ||
    "https://via.placeholder.com/300x400/a52a2a/ffffff?text=" +
      encodeURIComponent(book.name || "No Image");
  bookImage.alt = book.name || "Book Cover";
  bookTitle.textContent = book.name || "Unknown Title";
  bookAuthor.textContent = `by ${book.author || "Unknown Author"}`;

  const avgRating = typeof book.average_rating === "number" ? book.average_rating : 0;
  ratingValue.textContent = `${avgRating.toFixed(1)} ★`;
  reviewCount.textContent = `(${book.total_reviews || 0})`;

  const discountPrice = book.discounted_price ? parseFloat(book.discounted_price) : 0;
  const originalPrice = book.mrp ? parseFloat(book.mrp) : 0;
  discountedPrice.textContent = discountPrice.toFixed(2);
  mrp.textContent = originalPrice.toFixed(2);

  bookDetails.textContent = book.book_details || "No details available.";
  bookNameBreadcrumb.textContent = book.name || "Book";

  const rating = Math.round(avgRating);
  ratingStars.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className = "star";
    star.textContent = i <= rating ? "★" : "☆";
    if (i <= rating) star.classList.add("filled");
    ratingStars.appendChild(star);
  }

  fetchReviews(book.id);
}

async function fetchReviews(bookId) {
  try {
    let response = await fetch(`${BASE_URL}/api/v1/reviews/${bookId}`, {
      method: "GET",
      headers: headers,
    });

    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(`${BASE_URL}/api/v1/reviews/${bookId}`, {
          method: "GET",
          headers: headers,
        });
      } else {
        return;
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.data && data.data.reviews && Array.isArray(data.data.reviews)) {
      renderReviews(data.data.reviews);
      reviewCount.textContent = `(${data.data.total_reviews || 0})`;
      ratingValue.textContent = `${(data.data.average_rating || 0).toFixed(1)} ★`;
      updateRatingStars(data.data.average_rating || 0);
    } else {
      reviewsContainer.innerHTML = "<p>No reviews available.</p>";
    }
  } catch (error) {
    reviewsContainer.innerHTML = `<p>Error loading reviews: ${error.message}</p>`;
  }
}

function updateRatingStars(avgRating) {
  const rating = Math.round(avgRating);
  ratingStars.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className = "star";
    star.textContent = i <= rating ? "★" : "☆";
    if (i <= rating) star.classList.add("filled");
    ratingStars.appendChild(star);
  }
}

function renderReviews(reviews) {
  reviewsContainer.innerHTML = "";
  const currentUserId = parseInt(localStorage.getItem("user_id"));
  reviews.forEach((review) => {
    const reviewDiv = document.createElement("div");
    reviewDiv.className = "review";
    reviewDiv.dataset.reviewId = review.id;
    reviewDiv.innerHTML = `
      <div class="reviewer">
        <span class="reviewer-badge">${
          review.user_name ? review.user_name.slice(0, 2).toUpperCase() : "AN"
        }</span>
        <span class="reviewer-name">${review.user_name || "Anonymous"}</span>
      </div>
      <div class="review-stars">
        ${Array(5)
          .fill(0)
          .map(
            (_, i) =>
              `<span class="star${i < (review.rating || 0) ? " filled" : ""}">★</span>`
          )
          .join("")}
      </div>
      <div class="review-text">${review.comment || "No comment provided."}</div>
      ${review.user_id === currentUserId ? '<button class="delete-review-btn">Delete</button>' : ""}
    `;
    reviewsContainer.appendChild(reviewDiv);
  });

  document.querySelectorAll(".delete-review-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const reviewDiv = e.target.closest(".review");
      const reviewId = reviewDiv.dataset.reviewId;
      deleteReview(reviewId);
    });
  });
}

let selectedRating = 0;
if (ratingInput) {
  ratingInput.querySelectorAll(".star").forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.getAttribute("data-value"));
      ratingInput.querySelectorAll(".star").forEach((s) => {
        s.classList.toggle("filled", parseInt(s.getAttribute("data-value")) <= selectedRating);
      });
    });
  });
}

async function deleteReview(reviewId) {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    alert("Please log in to delete a review.");
    window.location.href = "../pages/login.html";
    return;
  }

  if (confirm("Are you sure you want to delete this review?")) {
    try {
      let response = await fetch(`${BASE_URL}/api/v1/reviews/${reviewId}`, {
        method: "DELETE",
        headers: headers,
        body: JSON.stringify({ user_id: userId })
      });

      if (response.status === 401 && token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          response = await fetch(`${BASE_URL}/api/v1/reviews/${reviewId}`, {
            method: "DELETE",
            headers: headers,
            body: JSON.stringify({ user_id: userId })
          });
        } else {
          return;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.message) {
        alert("Review deleted successfully!");
        fetchReviews(bookId);
      } else {
        const errorMessage = Array.isArray(data.errors)
          ? data.errors.join(", ")
          : data.error || "Unknown error occurred";
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      alert("Failed to delete review: " + error.message);
    }
  }
}

async function checkWishlistStatus(bookId) {
  if (!token || !userId) {
    updateWishlistButton(false);
    return;
  }

  try {
    let response = await fetch(`${BASE_URL}/api/v1/wishlists`, {
      method: "GET",
      headers: headers,
    });

    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(`${BASE_URL}/api/v1/wishlists`, {
          method: "GET",
          headers: headers,
        });
      } else {
        return;
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && Array.isArray(data.message)) {
      const wishlistItem = data.message.find(
        (item) => item.book && item.book.id === parseInt(bookId) && !item.is_deleted
      );
      const isInWishlist = !!wishlistItem;
      updateWishlistButton(isInWishlist);
      if (isInWishlist) {
        wishlistBtn.dataset.wishlistId = wishlistItem.id;
      }
    } else {
      updateWishlistButton(false);
    }
  } catch (error) {
    updateWishlistButton(false);
  }
}

function updateWishlistButton(isInWishlist) {
  const wishlistIcon = wishlistBtn.querySelector(".wishlist-icon");
  if (isInWishlist) {
    wishlistIcon.classList.add("filled");
    wishlistBtn.dataset.inWishlist = "true";
    wishlistBtn.disabled = false;
  } else {
    wishlistIcon.classList.remove("filled");
    wishlistBtn.dataset.inWishlist = "false";
    wishlistBtn.disabled = false;
    delete wishlistBtn.dataset.wishlistId;
  }
}

async function toggleWishlist(bookId) {
  if (!userId || !token) {
    alert("Please log in to manage your wishlist.");
    window.location.href = "../pages/login.html";
    return;
  }

  const isInWishlist = wishlistBtn.dataset.inWishlist === "true";
  if (isInWishlist) {
    await removeFromWishlist(wishlistBtn.dataset.wishlistId);
  } else {
    await addToWishlist(bookId);
  }
}

async function addToWishlist(bookId) {
  const wishlistData = { wishlist: { book_id: parseInt(bookId) } };

  try {
    let response = await fetch(`${BASE_URL}/api/v1/wishlists`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(wishlistData),
    });

    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(`${BASE_URL}/api/v1/wishlists`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(wishlistData),
        });
      } else {
        return;
      }
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.message === "Book added to wishlist!") {
      alert("Book added to wishlist!");
      wishlistBtn.querySelector(".wishlist-icon").classList.add("filled");
      wishlistBtn.dataset.inWishlist = "true";
      const wishlistResponse = await fetch(`${BASE_URL}/api/v1/wishlists`, { method: "GET", headers });
      const wishlistData = await wishlistResponse.json();
      const wishlistItem = wishlistData.message.find(
        (item) => item.book && item.book.id === parseInt(bookId) && !item.is_deleted
      );
      if (wishlistItem) {
        wishlistBtn.dataset.wishlistId = wishlistItem.id;
      }
    } else {
      const errorMessage = Array.isArray(data.errors)
        ? data.errors.join(", ")
        : data.error || "Unknown error occurred";
      alert(`Error: ${errorMessage}`);
    }
  } catch (error) {
    alert("Failed to add book to wishlist: " + error.message);
  }
}

async function removeFromWishlist(wishlistId) {
  try {
    let response = await fetch(`${BASE_URL}/api/v1/wishlists/${wishlistId}`, {
      method: "PATCH",
      headers: headers,
    });

    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(`${BASE_URL}/api/v1/wishlists/${wishlistId}`, {
          method: "PATCH",
          headers: headers,
        });
      } else {
        return;
      }
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.message === "Book removed from wishlist!") {
      alert("Book removed from wishlist!");
      wishlistBtn.querySelector(".wishlist-icon").classList.remove("filled");
      wishlistBtn.dataset.inWishlist = "false";
      delete wishlistBtn.dataset.wishlistId;
    } else {
      alert("Error removing book from wishlist.");
    }
  } catch (error) {
    alert("Failed to remove book from wishlist: " + error.message);
  }
}

async function fetchCartCount() {
  if (!userId || !token) {
    updateCartCount(0);
    return;
  }

  try {
    let response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, {
      method: "GET",
      headers: headers,
    });

    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, {
          method: "GET",
          headers: headers,
        });
      } else {
        return;
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch cart items");
    }

    const cartItems = data.cart || [];
    updateCartCount(cartItems.length);
  } catch (error) {
    updateCartCount(0);
  }
}

function updateCartCount(count) {
  const cartIcon = document.getElementById("cartIcon");
  if (cartIcon) {
    cartIcon.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (${count})`;
  }
}

function setupCartIconListener() {
  const cartIcon = document.getElementById("cartIcon");
  if (cartIcon) {
    cartIcon.addEventListener("click", () => {
      window.location.href = "../pages/mycart.html";
    });
  }
}

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
    <div class="bookstore-dash__profile-item bookstore-dash__profile-profile"><i class="fas fa-user"></i> Profile</div>
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
      localStorage.clear();
      updateProfileUI();
      window.location.href = "../pages/login.html";
    });
  }
}

function setupEventListeners() {
  const addToBagBtn = document.getElementById("addToBagBtn");
  const quantitySelector = document.getElementById("quantitySelector");
  const quantityInput = document.getElementById("quantityInput");
  const increaseBtn = quantitySelector?.querySelector(".increase");
  const decreaseBtn = quantitySelector?.querySelector(".decrease");

  if (addToBagBtn) {
    addToBagBtn.addEventListener("click", async () => {
      if (!userId || !token) {
        alert("Please log in to add this book to your bag.");
        window.location.href = "../pages/login.html";
        return;
      }

      const cartData = { cart: { user_id: parseInt(userId), book_id: parseInt(bookId), quantity: parseInt(quantityInput.value) || 1 } };

      try {
        let response = await fetch(`${BASE_URL}/api/v1/carts`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(cartData)
        });

        if (response.status === 401 && token) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            response = await fetch(`${BASE_URL}/api/v1/carts`, {
              method: "POST",
              headers: headers,
              body: JSON.stringify(cartData)
            });
          } else {
            return;
          }
        }

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.message) {
          alert("Book added to cart successfully!");
          addToBagBtn.style.display = "none";
          quantitySelector.style.display = "flex";
          fetchCartCount();
        } else {
          const errorMessage = Array.isArray(data.errors) ? data.errors.join(", ") : data.error || "Unknown error occurred";
          alert(`Error: ${errorMessage}`);
        }
      } catch (error) {
        alert("Failed to add book to cart: " + error.message);
      }
    });
  }

  if (increaseBtn && decreaseBtn) {
    increaseBtn.addEventListener("click", () => updateQuantity(1));
    decreaseBtn.addEventListener("click", () => updateQuantity(-1));
  }

  async function updateQuantity(change) {
    if (!userId || !token) return;

    let currentQuantity = parseInt(quantityInput.value) || 1;
    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
      try {
        let response = await fetch(`${BASE_URL}/api/v1/carts/${bookId}`, {
          method: "DELETE",
          headers: headers
        });

        if (response.status === 401 && token) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            response = await fetch(`${BASE_URL}/api/v1/carts/${bookId}`, {
              method: "DELETE",
              headers: headers
            });
          } else {
            return;
          }
        }

        if (!response.ok && response.status !== 404) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        alert("Book removed from cart!");
        addToBagBtn.style.display = "block";
        quantitySelector.style.display = "none";
        quantityInput.value = "1";
        fetchCartCount();
      } catch (error) {
        alert("Failed to remove book from cart: " + error.message);
      }
      return;
    }

    const cartData = { cart: { book_id: parseInt(bookId), quantity: newQuantity } };
    try {
      let response = await fetch(`${BASE_URL}/api/v1/carts`, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify(cartData)
      });

      if (response.status === 401 && token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          response = await fetch(`${BASE_URL}/api/v1/carts`, {
            method: "PATCH",
            headers: headers,
            body: JSON.stringify(cartData)
          });
        } else {
          return;
        }
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        quantityInput.value = newQuantity;
        fetchCartCount();
      } else {
        const errorMessage = Array.isArray(data.errors) ? data.errors.join(", ") : data.error || "Unknown error occurred";
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      alert("Failed to update quantity: " + error.message);
    }
  }

  if (wishlistBtn) {
    wishlistBtn.addEventListener("click", () => {
      toggleWishlist(bookId);
    });
  }

  const submitReviewBtn = document.getElementById("submitReviewBtn");
  if (submitReviewBtn) {
    submitReviewBtn.addEventListener("click", async () => {
      const reviewText = document.getElementById("reviewInput").value.trim();
      if (!userId) {
        alert("Please log in to submit a review.");
        window.location.href = "../pages/login.html";
        return;
      }
      if (!selectedRating) {
        alert("Please select a rating.");
        return;
      }
      if (!reviewText) {
        alert("Please write a review before submitting.");
        return;
      }

      const reviewData = {
        review: { user_id: parseInt(userId), book_id: parseInt(bookId), rating: selectedRating, comment: reviewText },
      };

      try {
        let response = await fetch(`${BASE_URL}/api/v1/reviews`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(reviewData),
        });

        if (response.status === 401 && token) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            response = await fetch(`${BASE_URL}/api/v1/reviews`, {
              method: "POST",
              headers: headers,
              body: JSON.stringify(reviewData),
            });
          } else {
            return;
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.message && data.review) {
          const newReview = {
            user_name: data.review.user.name,
            rating: data.review.rating,
            comment: data.review.comment,
            user_id: data.review.user_id,
            id: data.review.id,
          };
          const currentReviews = Array.from(reviewsContainer.children).map((div) => ({
            user_name: div.querySelector(".reviewer-name").textContent,
            rating: Array.from(div.querySelectorAll(".review-stars .star.filled")).length,
            comment: div.querySelector(".review-text").textContent,
            user_id: parseInt(localStorage.getItem("user_id")),
            id: div.dataset.reviewId,
          }));
          renderReviews([newReview, ...currentReviews]);

          document.getElementById("reviewInput").value = "";
          selectedRating = 0;
          ratingInput.querySelectorAll(".star").forEach((s) => s.classList.remove("filled"));

          const newCount = parseInt(reviewCount.textContent.match(/\d+/)[0]) + 1;
          reviewCount.textContent = `(${newCount})`;

          alert("Review submitted successfully!");
          fetchReviews(bookId);
        } else {
          const errorMessage = Array.isArray(data.errors) ? data.errors.join(", ") : data.error || "Unknown error occurred";
          alert(`Error: ${errorMessage}`);
        }
      } catch (error) {
        alert("Failed to submit review: " + error.message);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateProfileUI();
  setupEventListeners();
  setupCartIconListener();
  fetchCartCount();

  if (bookId) {
    fetchBookDetails(bookId);
  } else {
    bookTitle.textContent = "No Book Selected";
    bookDetails.textContent = "Please select a book from the dashboard.";
    ratingValue.textContent = "N/A";
    reviewCount.textContent = "(0)";
    discountedPrice.textContent = "0.00";
    mrp.textContent = "0.00";
  }

  document.querySelector(".bookstore-dash__logo").addEventListener("click", () => {
    window.location.href = "../pages/bookStoreDashboard.html";
  });
});