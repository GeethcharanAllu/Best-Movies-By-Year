// TMDB API configuration
const API_KEY = 'e71b703e292e007c3635d96797e05b92';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// DOM Elements
const yearSelect = document.getElementById('year');
const moviesContainer = document.getElementById('movies-container');
const modal = document.getElementById('movie-modal');
const closeBtn = document.querySelector('.close');
const modalContent = document.querySelector('.movie-details');

// Show loading state
function showLoading(element) {
    element.innerHTML = '<div class="loading">Loading movies...</div>';
}

// Show error message
function showError(element, message) {
    element.innerHTML = `<div class="error-message">
        <h2>Oops! Something went wrong</h2>
        <p>${message}</p>
        <p>Please try again later</p>
    </div>`;
}

// Initialize the year dropdown
function initializeYearDropdown() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1990; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

// Fetch best movies for a specific year
async function fetchMoviesByYear(year) {
    try {
        showLoading(moviesContainer);
        
        const response = await fetch(
            `${BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_year=${year}&sort_by=vote_average.desc&language=en-US&include_adult=false&vote_count.gte=100&with_original_language=en`
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.status_message || `Failed to fetch movies. Status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            throw new Error('No movies found for this year');
        }

        return data.results
            .filter(movie => movie.vote_average > 0)
            .sort((a, b) => b.vote_average - a.vote_average)
            .slice(0, 20);
    } catch (error) {
        console.error('Error fetching movies:', error);
        showError(moviesContainer, error.message);
        return [];
    }
}

// Fetch movie details including reviews
async function fetchMovieDetails(movieId) {
    try {
        const [movieDetails, reviewsData, credits] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US`),
            fetch(`${BASE_URL}/movie/${movieId}/reviews?api_key=${API_KEY}&language=en-US`),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=en-US`)
        ]);

        if (!movieDetails.ok) throw new Error('Failed to fetch movie details');
        if (!reviewsData.ok) throw new Error('Failed to fetch reviews');
        if (!credits.ok) throw new Error('Failed to fetch credits');

        const [details, reviews, cast] = await Promise.all([
            movieDetails.json(),
            reviewsData.json(),
            credits.json()
        ]);

        return {
            ...details,
            reviews: reviews.results,
            credits: cast
        };
    } catch (error) {
        console.error('Error fetching movie details:', error);
        throw error;
    }
}

// Create movie card element
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/300x450.png?text=No+Poster';
    
    card.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/300x450.png?text=No+Poster'">
        <div class="movie-card-info">
            <h3>${movie.title}</h3>
            <p>Rating: ${movie.vote_average.toFixed(1)}/10</p>
            <p class="release-date">${new Date(movie.release_date).getFullYear()}</p>
        </div>
    `;
    
    card.addEventListener('click', () => showMovieDetails(movie.id));
    return card;
}

// Display movie details in modal
async function showMovieDetails(movieId) {
    try {
        modal.style.display = 'block';
        modalContent.innerHTML = '<div class="loading">Loading movie details...</div>';

        const movieDetails = await fetchMovieDetails(movieId);
        
        if (!movieDetails) {
            throw new Error('Failed to load movie details');
        }

        const releaseDate = new Date(movieDetails.release_date);
        const runtime = movieDetails.runtime ? `${movieDetails.runtime} min` : 'N/A';
        const genres = movieDetails.genres.map(g => g.name).join(', ');
        
        modalContent.innerHTML = `
            <div class="movie-header">
                <img id="modal-poster" src="${movieDetails.poster_path ? `${IMAGE_BASE_URL}${movieDetails.poster_path}` : 'https://via.placeholder.com/300x450.png?text=No+Poster'}" 
                    alt="${movieDetails.title}" 
                    onerror="this.src='https://via.placeholder.com/300x450.png?text=No+Poster'">
                <div class="movie-info">
                    <h2 id="modal-title">${movieDetails.title}</h2>
                    <p id="modal-year" class="movie-meta">${releaseDate.getFullYear()} | ${runtime} | ${genres}</p>
                    <div class="rating">
                        <span class="star">★</span>
                        <span id="modal-rating">${movieDetails.vote_average.toFixed(1)}</span>/10
                    </div>
                </div>
            </div>
            <div class="movie-description">
                <h3>Overview</h3>
                <p id="modal-overview">
                    <strong>Cast:</strong> ${movieDetails.credits.cast.slice(0, 5).map(actor => actor.name).join(', ') || 'No cast information available'}<br><br>
                    ${movieDetails.overview || 'No overview available.'}
                </p>
            </div>
            <div class="movie-reviews">
                <h3>Reviews</h3>
                <div id="modal-reviews">
                    ${movieDetails.reviews && movieDetails.reviews.length > 0 
                        ? movieDetails.reviews.slice(0, 3).map(review => `
                            <div class="review">
                                <div class="review-author">${review.author}</div>
                                <div class="review-content">${review.content.slice(0, 300)}${review.content.length > 300 ? '...' : ''}</div>
                                ${review.author_details?.rating ? `<div class="review-rating">Rating: ${review.author_details.rating}/10</div>` : ''}
                            </div>
                        `).join('')
                        : '<p>No reviews available.</p>'
                    }
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error showing movie details:', error);
        modalContent.innerHTML = `
            <div class="error-message">
                <h2>Error Loading Movie Details</h2>
                <p>${error.message}</p>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Update movies display when year changes
async function updateMovies() {
    const selectedYear = yearSelect.value;
    const movies = await fetchMoviesByYear(selectedYear);
    
    if (movies.length > 0) {
        moviesContainer.innerHTML = '';
        movies.forEach(movie => {
            moviesContainer.appendChild(createMovieCard(movie));
        });
    }
}

// Event Listeners
yearSelect.addEventListener('change', updateMovies);
closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initializeYearDropdown();
    updateMovies();
}); 