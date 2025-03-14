// Track all user-submitted ratings for averaging
let userRatings = [5.0, 4.5]; // Initial ratings from Helen and Troy (from mock data)

// Simulate fetching book data
function fetchBookDetails(bookId) {
    // Mock data (replace with fetch request later)
    const mockBookData = {
        id: bookId,
        title: "The Iliad",
        author: "Homer",
        price: 5.87, // Price in INR
        rating: calculateAverageRating(userRatings), // Initial average rating
        description: "An epic poem set during the Trojan War, The Iliad tells the story of the Greek hero Achilles and his conflict with King Agamemnon.",
        image: "https://m.media-amazon.com/images/I/5168DSbCuuL._SL500_.jpg",
        reviews: [
            { user: "Helen", rating: 5.0, comment: "A timeless classic! The epic battles are thrilling." },
            { user: "Troy", rating: 4.5, comment: "Loved the heroism, but it’s a bit dense at times." }
        ]
    };

    // Update the page with book data
    document.querySelector('.book-image img').src = mockBookData.image;
    document.querySelector('.book-title').textContent = mockBookData.title;
    document.querySelector('.book-author').textContent = `by ${mockBookData.author}`;
    document.querySelector('.book-rating span').textContent = `(${mockBookData.rating.toFixed(1)} / 5)`;
    document.querySelector('.book-price').textContent = `₹${mockBookData.price.toFixed(2)}`;
    document.querySelector('.book-description').textContent = mockBookData.description;

    // Update the browser title
    document.title = `${mockBookData.title} - Bookstore`;

    // Render star ratings dynamically (non-interactive for average rating)
    renderBookStars(mockBookData.rating);

    // Update reviews
    const reviewsSection = document.querySelector('.reviews-section');
    reviewsSection.innerHTML = '<h2>Customer Reviews</h2>'; // Reset reviews
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

// Calculate average rating from user-submitted ratings
function calculateAverageRating(ratings) {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return sum / ratings.length;
}

// Render stars for the book’s average rating (non-interactive)
function renderBookStars(rating) {
    const starsContainer = document.querySelector('.stars');
    if (!starsContainer) {
        console.error('Stars container not found!');
        return;
    }
    starsContainer.innerHTML = ''; // Clear existing stars

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

// Render stars for the feedback form (interactive)
function renderFeedbackStars(rating) {
    const starsContainer = document.querySelector('.feedback-stars');
    if (!starsContainer) {
        console.error('Feedback stars container not found!');
        return;
    }
    starsContainer.innerHTML = ''; // Clear existing stars

    const totalStars = 5;

    for (let i = 0; i < totalStars; i++) {
        const star = document.createElement('i');
        if (i < rating) {
            star.classList.add('fas', 'fa-star');
        } else {
            star.classList.add('far', 'fa-star');
        }

        // Add click event to set rating
        star.addEventListener('click', () => {
            console.log(`Feedback star ${i + 1} clicked`);
            const newRating = i + 1; // Rating is 1-based
            document.querySelector('.feedback-rating-value').textContent = `(${newRating} / 5)`;
            renderFeedbackStars(newRating);
        });

        starsContainer.appendChild(star);
    }
}

// Fetch book details when the page loads
const bookId = document.querySelector('.book-details').getAttribute('data-book-id');
fetchBookDetails(bookId);

// Initialize feedback stars
renderFeedbackStars(0); // Start with 0 rating

// Simulate cart and wishlist actions
document.querySelector('.add-to-cart').addEventListener('click', () => {
    const bookTitle = document.querySelector('.book-title').textContent;
    console.log(`Added to cart: ${bookTitle}`);
});

document.querySelector('.add-to-wishlist').addEventListener('click', () => {
    const bookTitle = document.querySelector('.book-title').textContent;
    console.log(`Added to wishlist: ${bookTitle}`);
});

// Simulate feedback submission and display
const reviewsSection = document.querySelector('.reviews-section');
const feedbackForm = document.querySelector('.feedback-form');
if (!feedbackForm) {
    console.error('Feedback form not found!');
} else {
    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const feedbackText = e.target.querySelector('textarea').value;
        if (feedbackText.trim()) {
            // Get the user-selected rating from the feedback form
            const ratingSpan = document.querySelector('.feedback-rating-value');
            const userRating = ratingSpan ? parseFloat(ratingSpan.textContent.match(/\d+(\.\d+)?/)?.[0] || 0) : 0;
            console.log(`Submitting review with rating: ${userRating}`);

            // Add the review to the DOM
            const newReview = document.createElement('div');
            newReview.classList.add('review');
            newReview.innerHTML = `
                <p><strong>You</strong> - <span>${userRating} / 5</span></p>
                <p>${feedbackText}</p>
            `;
            reviewsSection.appendChild(newReview);

            // Add the rating to userRatings and update the average
            userRatings.push(userRating);
            const averageRating = calculateAverageRating(userRatings);
            document.querySelector('.book-rating span').textContent = `(${averageRating.toFixed(1)} / 5)`;
            renderBookStars(averageRating);

            console.log('Feedback submitted:', { rating: userRating, comment: feedbackText });

            // Reset the feedback form
            e.target.reset();
            renderFeedbackStars(0);
            document.querySelector('.feedback-rating-value').textContent = `(0 / 5)`;
        }
    });
}