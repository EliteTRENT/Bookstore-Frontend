// Simulate fetching book data
function fetchBookDetails(bookId) {
    // Mock data (replace with fetch request later)
    const mockBookData = {
        id: bookId,
        title: "The Iliad",
        author: "Homer",
        price: 12.99,
        rating: 4.8,
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
    document.querySelector('.book-rating span').textContent = `(${mockBookData.rating} / 5)`;
    document.querySelector('.book-price').textContent = `$${mockBookData.price.toFixed(2)}`;
    document.querySelector('.book-description').textContent = mockBookData.description;

    // Update the browser title
    document.title = `${mockBookData.title} - Bookstore`;

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

// Fetch book details when the page loads
const bookId = document.querySelector('.book-details').getAttribute('data-book-id');
fetchBookDetails(bookId);

// Simulate cart and wishlist actions
document.querySelector('.add-to-cart').addEventListener('click', () => {
    const bookTitle = document.querySelector('.book-title').textContent;
    console.log(`Added to cart: ${bookTitle}`);
    // Later, this will send a request to your backend, e.g.:
    // fetch('/api/cart/add', { method: 'POST', body: JSON.stringify({ bookId: '123' }) })
});

document.querySelector('.add-to-wishlist').addEventListener('click', () => {
    const bookTitle = document.querySelector('.book-title').textContent;
    console.log(`Added to wishlist: ${bookTitle}`);
    // Later, this will send a request to your backend, e.g.:
    // fetch('/api/wishlist/add', { method: 'POST', body: JSON.stringify({ bookId: '123' }) })
});

// Simulate feedback submission and display
const reviewsSection = document.querySelector('.reviews-section');
document.querySelector('.feedback-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const feedbackText = e.target.querySelector('textarea').value;
    if (feedbackText.trim()) {
        // Simulate adding a review
        const newReview = document.createElement('div');
        newReview.classList.add('review');
        newReview.innerHTML = `
            <p><strong>You</strong> - <span>4.5 / 5</span></p>
            <p>${feedbackText}</p>
        `;
        reviewsSection.appendChild(newReview);
        console.log('Feedback submitted:', feedbackText);
        // Later, this will send a request to your backend, e.g.:
        // fetch('/api/reviews/add', { method: 'POST', body: JSON.stringify({ bookId: '123', review: feedbackText }) })
        e.target.reset();
    }
});