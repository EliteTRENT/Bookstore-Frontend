const BASE_URL = "http://127.0.0.1:3000"; // Ensure server is running at this address

// Get book ID from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get("bookId");

// DOM Elements
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

// Fetch Book Details
function fetchBookDetails(bookId) {
  fetch(`${BASE_URL}/api/v1/books/show/${bookId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Book API Response:", data);
      if (!data.book || !data.book.id) {
        throw new Error(data.errors || "Failed to retrieve book details");
      }
      renderBookDetails(data.book);
    })
    .catch((error) => {
      console.error("Error fetching book details:", error.message);
      bookTitle.textContent = "Error Loading Book";
      bookDetails.textContent = `Error: ${error.message}`;
      ratingValue.textContent = "N/A";
      reviewCount.textContent = "(0)";
      discountedPrice.textContent = "0.00";
      mrp.textContent = "0.00";
    });
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

// Fetch Reviews
function fetchReviews(bookId) {
  fetch(`${BASE_URL}/api/v1/reviews/${bookId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Reviews API Response:", data);
      if (data.data && data.data.reviews && Array.isArray(data.data.reviews)) {
        renderReviews(data.data.reviews);
        reviewCount.textContent = `(${data.data.total_reviews || 0})`;
        ratingValue.textContent = `${(data.data.average_rating || 0).toFixed(1)} ★`;
        updateRatingStars(data.data.average_rating || 0);
      } else {
        reviewsContainer.innerHTML = "<p>No reviews available.</p>";
      }
    })
    .catch((error) => {
      console.error("Error fetching reviews:", error.message);
      reviewsContainer.innerHTML = `<p>Error loading reviews: ${error.message}</p>`;
    });
}

// Update Rating Stars
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

// Render Reviews
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

  // Add delete event listeners
  document.querySelectorAll(".delete-review-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const reviewDiv = e.target.closest(".review");
      const reviewId = reviewDiv.dataset.reviewId;
      deleteReview(reviewId);
    });
  });
}

// Rating Selection Logic
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

// Delete Review
function deleteReview(reviewId) {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    alert("Please log in to delete a review.");
    window.location.href = "../pages/login.html";
    return;
  }

  if (confirm("Are you sure you want to delete this review?")) {
    fetch(`${BASE_URL}/api/v1/reviews/${reviewId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Delete Review Response:", data);
        if (data.message) {
          alert("Review deleted successfully!");
          fetchReviews(bookId); // Refresh reviews
        } else {
          const errorMessage = Array.isArray(data.errors)
            ? data.errors.join(", ")
            : data.error || "Unknown error occurred";
          alert(`Error: ${errorMessage}`);
        }
      })
      .catch((error) => {
        console.error("Error deleting review:", error.message);
        alert("Failed to delete review: " + error.message);
      });
  }
}

// Add to Wishlist
function addToWishlist(bookId) {
  const userId = localStorage.getItem("user_id");
  const token = localStorage.getItem("token");

  // Debug: Log the userId and token to verify they exist
  console.log("Attempting to add book to wishlist...");
  console.log("User ID:", userId);
  console.log("Token:", token);

  if (!userId || !token) {
    console.log("User not logged in. Redirecting to login page.");
    alert("Please log in to add this book to your wishlist.");
    window.location.href = "../pages/login.html";
    return;
  }

  const wishlistData = {
    wishlist: {
      book_id: parseInt(bookId)
    }
  };

  console.log("Sending wishlist request with data:", wishlistData);
  console.log("Authorization Header:", `Bearer ${token}`);

  fetch(`${BASE_URL}/api/v1/wishlists/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(wishlistData)
  })
    .then((response) => {
      console.log("Wishlist API Response Status:", response.status);
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || `HTTP error! Status: ${response.status}`);
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Add to Wishlist Response:", data);
      if (data.message) {
        alert("Book added to wishlist!");
        wishlistBtn.querySelector(".wishlist-icon").classList.add("filled");
        wishlistBtn.disabled = true; // Prevent multiple additions
      } else {
        const errorMessage = Array.isArray(data.errors)
          ? data.errors.join(", ")
          : data.error || "Unknown error occurred";
        alert(`Error: ${errorMessage}`);
      }
    })
    .catch((error) => {
      console.error("Error adding to wishlist:", error.message);
      if (error.message.includes("401")) {
        console.log("Unauthorized: Token might be invalid or expired.");
        alert("Session expired or invalid token. Please log in again.");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_name");
        localStorage.removeItem("token");
        window.location.href = "../pages/login.html";
      } else if (error.message.includes("422")) {
        console.log("Book is already in the wishlist.");
        alert("This book is already in your wishlist.");
        wishlistBtn.querySelector(".wishlist-icon").classList.add("filled");
        wishlistBtn.disabled = true;
      } else {
        alert("Failed to add book to wishlist: " + error.message);
      }
    });
}

// Fetch Cart Count
// Fetch Cart Count
async function fetchCartCount() {
  const userId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');

  console.log("Fetching cart count...");
  console.log("User ID:", userId);
  console.log("Token:", token);

  if (!userId || !token) {
    console.log("User not logged in. Setting cart count to 0.");
    updateCartCount(0);
    return;
  }

  try {
    console.log(`Making request to ${BASE_URL}/api/v1/carts/${userId}`);
    const response = await fetch(`${BASE_URL}/api/v1/carts/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("Response status:", response.status);
    if (!response.ok) {
      if (response.status === 401) {
        console.log("Unauthorized (401). Redirecting to login.");
        alert("Session expired. Please log in again.");
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_name');
        updateProfileUI();
        window.location.href = '../pages/login.html';
        return;
      }
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${errorData.error || 'Failed to fetch cart items'}`);
    }

    const data = await response.json();
    console.log("Cart API Response:", data);

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch cart items');
    }

    const cartItems = data.cart || [];
    console.log("Cart Items:", cartItems);
    console.log("Cart Count:", cartItems.length);
    updateCartCount(cartItems.length);
  } catch (error) {
    console.error('Error fetching cart count:', error.message);
    updateCartCount(0);
  }
}

// Update Cart Icon with Count
function updateCartCount(count) {
  const cartIcon = document.getElementById('cartIcon');
  if (cartIcon) {
    console.log(`Updating cart count to ${count}`);
    cartIcon.innerHTML = `<i class="fas fa-shopping-cart"></i> Cart (${count})`;
  } else {
    console.warn("Cart icon element not found in the DOM.");
  }
}

// Cart Icon Click Functionality
function setupCartIconListener() {
  const cartIcon = document.getElementById("cartIcon");
  if (cartIcon) {
    cartIcon.addEventListener("click", () => {
      window.location.href = "../pages/mycart.html"; // Navigate to the cart page
    });
  }
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
    return; // Exit the function if profileIcon is not found
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
      return; // Exit if header is not found
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

  // Add event listener for "My Wishlist"
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
      window.location.href = "../pages/login.html";
    });
  }
}

// Event Listeners for Buttons
function setupEventListeners() {
  const addToBagBtn = document.getElementById("addToBagBtn");
  if (addToBagBtn) {
    addToBagBtn.addEventListener("click", () => {
      const userId = localStorage.getItem("user_id");
      const token = localStorage.getItem("token");

      if (!userId || !token) {
        alert("Please log in to add this book to your bag.");
        window.location.href = "../pages/login.html";
        return;
      }

      // Prepare the data for adding to cart
      const cartData = {
        cart: {
          user_id: parseInt(userId),
          book_id: parseInt(bookId),
          quantity: 1 // Default quantity of 1
        }
      };

      fetch(`${BASE_URL}/api/v1/carts/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(cartData)
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
          console.log("Add to Cart Response:", data);
          if (data.message) {
            alert("Book added to cart successfully!");
            fetchCartCount(); // Update cart count after adding
          } else {
            const errorMessage = Array.isArray(data.errors)
              ? data.errors.join(", ")
              : data.error || "Unknown error occurred";
            alert(`Error: ${errorMessage}`);
          }
        })
        .catch((error) => {
          console.error("Error adding to cart:", error.message);
          if (error.message.includes("401")) {
            alert("Session expired. Please log in again.");
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");
            localStorage.removeItem("token");
            window.location.href = "../pages/login.html";
          } else {
            alert("Failed to add book to cart: " + error.message);
          }
        });
    });
  }

  if (wishlistBtn) {
    wishlistBtn.addEventListener("click", () => {
      addToWishlist(bookId);
    });
  }

  const submitReviewBtn = document.getElementById("submitReviewBtn");
  if (submitReviewBtn) {
    submitReviewBtn.addEventListener("click", () => {
      const reviewText = document.getElementById("reviewInput").value.trim();
      const userId = localStorage.getItem("user_id");

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
        review: {
          user_id: parseInt(userId),
          book_id: parseInt(bookId),
          rating: selectedRating,
          comment: reviewText,
        },
      };

      fetch(`${BASE_URL}/api/v1/reviews/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reviewData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Review Submission Response:", data);
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
            fetchReviews(bookId); // Ensure consistency
          } else {
            const errorMessage = Array.isArray(data.errors)
              ? data.errors.join(", ")
              : data.error || "Unknown error occurred";
            alert(`Error: ${errorMessage}`);
          }
        })
        .catch((error) => {
          console.error("Error submitting review:", error.message);
          alert("Failed to submit review: " + error.message);
        });
    });
  }
}

// Initial Setup
document.addEventListener("DOMContentLoaded", () => {
  // Initial profile UI update
  updateProfileUI();

  // Setup event listeners for buttons
  setupEventListeners();

  // Setup cart icon listener
  setupCartIconListener();

  // Fetch cart count to display number of items
  fetchCartCount();

  // Initial Fetch
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
});