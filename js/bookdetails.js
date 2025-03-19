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

// Event Listeners
document.getElementById("addToBagBtn").addEventListener("click", () => {
  alert("Add to Bag functionality not implemented yet.");
});

document.getElementById("wishlistBtn").addEventListener("click", () => {
  alert("Wishlist functionality not implemented yet.");
});

document.getElementById("submitReviewBtn").addEventListener("click", () => {
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
          user_id: data.review.user_id, // Include for delete button visibility
          id: data.review.id, // Include for delete functionality
        };
        const currentReviews = Array.from(reviewsContainer.children).map((div) => ({
          user_name: div.querySelector(".reviewer-name").textContent,
          rating: Array.from(div.querySelectorAll(".review-stars .star.filled")).length,
          comment: div.querySelector(".review-text").textContent,
          user_id: parseInt(localStorage.getItem("user_id")), // Approximate, replaced by fetch
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

// Profile Dropdown Functionality
const profileIcon = document.getElementById("profileDropdownTrigger");
function updateProfileUI() {
  const userName = localStorage.getItem("user_name") || "User";
  const firstName = userName.split(" ")[0]; // Extract first name

  // Update profile trigger text
  if (profileIcon) {
    profileIcon.innerHTML = `<i class="fas fa-user"></i> ${firstName}`; // Updated class removed since bookstore-dash__icon styles it
  }

  // Setup or update profile dropdown
  let profileDropdown = document.querySelector(".bookstore-dash__profile-dropdown");
  if (!profileDropdown && profileIcon) {
    profileDropdown = document.createElement("div");
    profileDropdown.className = "bookstore-dash__profile-dropdown";
    document.querySelector(".bookstore-dash__header").appendChild(profileDropdown); // Updated selector from .header
  }

  if (profileDropdown) {
    profileDropdown.innerHTML = `
      <div class="bookstore-dash__profile-item">Hello, ${userName}</div>
      <div class="bookstore-dash__profile-item"><i class="fas fa-user"></i> Profile</div>
      <div class="bookstore-dash__profile-item"><i class="fas fa-shopping-bag"></i> My Orders</div>
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

    // Logout functionality
    profileDropdown.querySelector(".bookstore-dash__profile-logout").addEventListener("click", () => {
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_name");
      localStorage.removeItem("token");
      updateProfileUI(); // Reset to "User"
      window.location.href = "../pages/login.html";
    });
  }
}

// Initial profile UI update
updateProfileUI();

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