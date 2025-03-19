const BASE_URL = 'http://127.0.0.1:3000'; // Ensure server is running at this address

// Get book ID from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get('bookId');

// DOM Elements
const bookImage = document.getElementById('bookImage');
const bookTitle = document.getElementById('bookTitle');
const bookAuthor = document.getElementById('bookAuthor');
const ratingValue = document.getElementById('ratingValue');
const reviewCount = document.getElementById('reviewCount');
const discountedPrice = document.getElementById('discountedPrice');
const mrp = document.getElementById('mrp');
const bookDetails = document.getElementById('bookDetails');
const bookNameBreadcrumb = document.getElementById('bookNameBreadcrumb');
const reviewsContainer = document.getElementById('reviewsContainer');
const ratingStars = document.getElementById('ratingStars');

// Fetch Book Details
function fetchBookDetails(bookId) {
    fetch(`${BASE_URL}/api/v1/books/show/${bookId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('API Response:', data); // Debug: Log the full response
        if (!data.book || !data.book.id) {
            throw new Error(data.errors || 'Failed to retrieve book details');
        }
        renderBookDetails(data.book);
    })
    .catch(error => {
        console.error('Error fetching book details:', error.message);
        bookTitle.textContent = 'Error Loading Book';
        bookDetails.textContent = `Error: ${error.message}`;
        ratingValue.textContent = 'N/A';
        reviewCount.textContent = '(0)';
        discountedPrice.textContent = '0.00';
        mrp.textContent = '0.00';
    });
}

// Render Book Details
function renderBookDetails(book) {
    bookImage.src = book.book_image || 'https://via.placeholder.com/300x400/a52a2a/ffffff?text=' + encodeURIComponent(book.name || 'No Image');
    bookImage.alt = book.name || 'Book Cover';
    bookTitle.textContent = book.name || 'Unknown Title';
    bookAuthor.textContent = `by ${book.author || 'Unknown Author'}`;
    
    // Handle rating (number)
    const avgRating = typeof book.average_rating === 'number' ? book.average_rating : 0;
    ratingValue.textContent = `${avgRating.toFixed(1)} ★`;
    reviewCount.textContent = `(${book.total_reviews || 0})`;
    
    // Handle prices (strings to numbers)
    const discountPrice = book.discounted_price ? parseFloat(book.discounted_price) : 0;
    const originalPrice = book.mrp ? parseFloat(book.mrp) : 0;
    discountedPrice.textContent = discountPrice.toFixed(2);
    mrp.textContent = originalPrice.toFixed(2);
    
    bookDetails.textContent = book.book_details || 'No details available.';
    bookNameBreadcrumb.textContent = book.name || 'Book';

    // Update rating stars
    const rating = Math.round(avgRating);
    ratingStars.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        star.textContent = i <= rating ? '★' : '☆';
        if (i <= rating) star.classList.add('filled');
        ratingStars.appendChild(star);
    }

    // Fetch and render reviews
    fetchReviews(book.id);
}

// Fetch Reviews
function fetchReviews(bookId) {
    fetch(`${BASE_URL}/api/v1/reviews/${bookId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.reviews && Array.isArray(data.reviews)) {
            renderReviews(data.reviews);
        } else {
            reviewsContainer.innerHTML = '<p>No reviews available.</p>';
        }
    })
    .catch(error => {
        console.error('Error fetching reviews:', error.message);
        reviewsContainer.innerHTML = `<p>Error loading reviews: ${error.message}</p>`;
    });
}

// Render Reviews
function renderReviews(reviews) {
    reviewsContainer.innerHTML = '';
    reviews.forEach(review => {
        const reviewDiv = document.createElement('div');
        reviewDiv.className = 'review';
        reviewDiv.innerHTML = `
            <div class="reviewer">
                <span class="reviewer-badge">${review.user_name ? review.user_name.slice(0, 2).toUpperCase() : 'AN'}</span>
                <span class="reviewer-name">${review.user_name || 'Anonymous'}</span>
            </div>
            <div class="review-stars">
                ${Array(5).fill(0).map((_, i) => `<span class="star${i < (review.rating || 0) ? ' filled' : ''}">★</span>`).join('')}
            </div>
            <div class="review-text">${review.comment || 'No comment provided.'}</div>
        `;
        reviewsContainer.appendChild(reviewDiv);
    });
}

// Event Listeners
document.getElementById('addToBagBtn').addEventListener('click', () => {
    alert('Add to Bag functionality not implemented yet.');
});

document.getElementById('wishlistBtn').addEventListener('click', () => {
    alert('Wishlist functionality not implemented yet.');
});

document.getElementById('submitReviewBtn').addEventListener('click', () => {
    const reviewText = document.getElementById('reviewInput').value.trim();
    if (reviewText) {
        alert('Review submission not implemented yet.');
    } else {
        alert('Please write a review before submitting.');
    }
});

// Profile Dropdown
const profileIcon = document.getElementById('profileDropdownTrigger');
const profileDropdown = document.createElement('div');
profileDropdown.className = 'bookstore-dash__profile-dropdown';
profileDropdown.innerHTML = `
    <div class="bookstore-dash__profile-item">Hello User,</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-user"></i> Profile</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-shopping-bag"></i> My Orders</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-heart"></i> My Wishlist</div>
    <div class="bookstore-dash__profile-item bookstore-dash__profile-logout">Logout</div>
`;
document.querySelector('.header').appendChild(profileDropdown);

profileIcon.addEventListener('click', (e) => {
    e.preventDefault();
    profileDropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('active');
    }
});

// Initial Fetch
if (bookId) {
    fetchBookDetails(bookId);
} else {
    bookTitle.textContent = 'No Book Selected';
    bookDetails.textContent = 'Please select a book from the dashboard.';
    ratingValue.textContent = 'N/A';
    reviewCount.textContent = '(0)';
    discountedPrice.textContent = '0.00';
    mrp.textContent = '0.00';
}