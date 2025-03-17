// Track all user-submitted ratings for averaging
let userRatings = [5.0, 4.5]; // Initial ratings from Helen and Troy

// Simulate fetching book data
function fetchBookDetails(bookId) {
    const mockBookData = {
        id: bookId,
        title: "The Iliad",
        author: "Homer",
        price: 587,
        rating: calculateAverageRating(userRatings),
        description: "An epic poem set during the Trojan War, The Iliad tells the story of the Greek hero Achilles and his conflict with King Agamemnon.",
        image: "https://m.media-amazon.com/images/I/5168DSbCuuL._SL500_.jpg",
        reviews: [
            { user: "Helen", rating: 5.0, comment: "A timeless classic! The epic battles are thrilling." },
            { user: "Troy", rating: 4.5, comment: "Loved the heroism, but it’s a bit dense at times." }
        ]
    };

    document.querySelector('.book-image img').src = mockBookData.image;
    document.querySelector('.book-title').textContent = mockBookData.title;
    document.querySelector('.book-author').textContent = `by ${mockBookData.author}`;
    document.querySelector('.book-rating span').textContent = `(${mockBookData.rating.toFixed(1)} / 5)`;
    document.querySelector('.book-price').textContent = `₹${mockBookData.price.toFixed(2)}`;
    document.querySelector('.book-description').textContent = mockBookData.description;
    document.title = `${mockBookData.title} - Bookstore`;

    renderBookStars(mockBookData.rating);

    const reviewsSection = document.querySelector('.reviews-section');
    reviewsSection.innerHTML = '<h2>Customer Reviews</h2>';
    mockBookData.reviews.forEach(review => {
        const reviewDiv = document.createElement('div');
        reviewDiv.classList.add('review');
        reviewDiv.innerHTML = `
            <p><strong>${review.user}</strong> - <span>${review.rating} / 5</span></p>
            <p>${review.comment}</p>
        `;
        reviewsSection.appendChild(reviewDiv);
    });
}

// Calculate average rating
function calculateAverageRating(ratings) {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return sum / ratings.length;
}

// Render stars for average rating
function renderBookStars(rating) {
    const starsContainer = document.querySelector('.stars');
    if (!starsContainer) return;
    starsContainer.innerHTML = '';

    const fullStars = Math.floor(rating);
    const decimal = rating - fullStars;
    const totalStars = 5;

    for (let i = 0; i < totalStars; i++) {
        const star = document.createElement('i');
        if (i < fullStars) {
            star.classList.add('fas', 'fa-star');
        } else if (i === fullStars && decimal >= 0.3 && decimal <= 0.7) {
            star.classList.add('fas', 'fa-star-half-alt');
        } else {
            star.classList.add('far', 'fa-star');
        }
        starsContainer.appendChild(star);
    }
}

// Render interactive feedback stars
function renderFeedbackStars(rating) {
    const starsContainer = document.querySelector('.feedback-stars');
    if (!starsContainer) return;
    starsContainer.innerHTML = '';

    const totalStars = 5;

    for (let i = 0; i < totalStars; i++) {
        const star = document.createElement('i');
        if (i < rating) {
            star.classList.add('fas', 'fa-star');
        } else {
            star.classList.add('far', 'fa-star');
        }

        star.addEventListener('click', () => {
            const newRating = i + 1;
            document.querySelector('.feedback-rating-value').textContent = `(${newRating} / 5)`;
            renderFeedbackStars(newRating);
        });

        starsContainer.appendChild(star);
    }
}

// Fetch book details on load
const bookId = document.querySelector('.book-details').getAttribute('data-book-id');
fetchBookDetails(bookId);

// Initialize feedback stars
renderFeedbackStars(0);

// Cart and wishlist actions
document.querySelector('.add-to-cart').addEventListener('click', () => {
    const bookTitle = document.querySelector('.book-title').textContent;
    console.log(`Added to cart: ${bookTitle}`);
});

document.querySelector('.add-to-wishlist').addEventListener('click', () => {
    const bookTitle = document.querySelector('.book-title').textContent;
    console.log(`Added to wishlist: ${bookTitle}`);
});

// Feedback submission
const reviewsSection = document.querySelector('.reviews-section');
const feedbackForm = document.querySelector('.feedback-form');
if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const feedbackText = e.target.querySelector('textarea').value;
        if (feedbackText.trim()) {
            const ratingSpan = document.querySelector('.feedback-rating-value');
            const userRating = ratingSpan ? parseFloat(ratingSpan.textContent.match(/\d+(\.\d+)?/)?.[0] || 0) : 0;

            const newReview = document.createElement('div');
            newReview.classList.add('review');
            newReview.innerHTML = `
                <p><strong>You</strong> - <span>${userRating} / 5</span></p>
                <p>${feedbackText}</p>
            `;
            reviewsSection.appendChild(newReview);

            userRatings.push(userRating);
            const averageRating = calculateAverageRating(userRatings);
            document.querySelector('.book-rating span').textContent = `(${averageRating.toFixed(1)} / 5)`;
            renderBookStars(averageRating);

            e.target.reset();
            renderFeedbackStars(0);
            document.querySelector('.feedback-rating-value').textContent = `(0 / 5)`;
        }
    });
}

// Profile Dropdown Functionality
const profileIcon = document.querySelector('#profileDropdownTrigger');
const profileDropdown = document.createElement('div');
profileDropdown.className = 'bookstore-dash__profile-dropdown';
profileDropdown.innerHTML = `
    <div class="bookstore-dash__profile-item">Hello User,</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-user"></i> Profile</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-shopping-bag"></i> My Orders</div>
    <div class="bookstore-dash__profile-item"><i class="fas fa-heart"></i> My Wishlist</div>
    <div class="bookstore-dash__profile-item bookstore-dash__profile-logout">Logout</div>
`;

document.querySelector('.bookstore-dash__header').appendChild(profileDropdown);

profileIcon.addEventListener('click', (e) => {
    e.preventDefault();
    profileDropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('active');
    }
});