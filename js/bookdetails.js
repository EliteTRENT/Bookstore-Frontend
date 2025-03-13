document.querySelector('.add-to-cart').addEventListener('click', () => {
    alert('Book added to cart!');
});

document.querySelector('.add-to-wishlist').addEventListener('click', () => {
    alert('Book added to wishlist!');
});

document.querySelector('.feedback-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Feedback submitted!');
    e.target.reset();
});