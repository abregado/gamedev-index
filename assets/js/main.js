"use strict";
let cities = [];
let listings = [];
let selectedCity = null;
let activeFilters = new Set();
let activeStateFilters = new Set();
document.addEventListener('DOMContentLoaded', () => {
    loadCities();
    initListings();
    initCitySelector();
    initTagFilters();
    handleUrlParams();
});
function loadCities() {
    const citiesData = document.getElementById('cities-data');
    if (citiesData) {
        cities = JSON.parse(citiesData.textContent || '[]');
    }
}
function initListings() {
    const rows = document.querySelectorAll('.listing-row');
    rows.forEach((row) => {
        const coordsAttr = row.dataset.coordinates;
        const tagsAttr = row.dataset.tags;
        const typeAttr = row.dataset.type;
        const stateAttr = row.dataset.state;
        listings.push({
            element: row,
            coordinates: coordsAttr ? JSON.parse(coordsAttr) : [0, 0],
            tags: tagsAttr ? JSON.parse(tagsAttr) : [],
            type: typeAttr || '',
            state: stateAttr || '',
        });
    });
}
function initCitySelector() {
    const input = document.getElementById('city-input');
    const suggestions = document.getElementById('city-suggestions');
    if (!input || !suggestions)
        return;
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        if (query.length < 1) {
            suggestions.classList.remove('active');
            return;
        }
        const matches = cities.filter((city) => city.name.toLowerCase().includes(query) ||
            city.state.toLowerCase().includes(query));
        if (matches.length === 0) {
            suggestions.classList.remove('active');
            return;
        }
        suggestions.innerHTML = matches
            .slice(0, 10)
            .map((city) => `<div class="city-suggestion" data-city="${city.name}">${city.name}, ${city.state}</div>`)
            .join('');
        suggestions.classList.add('active');
        suggestions.querySelectorAll('.city-suggestion').forEach((el) => {
            el.addEventListener('click', () => {
                const cityName = el.dataset.city;
                selectCity(cityName || '');
                input.value = cityName || '';
                suggestions.classList.remove('active');
            });
        });
    });
    input.addEventListener('blur', () => {
        setTimeout(() => suggestions.classList.remove('active'), 200);
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstSuggestion = suggestions.querySelector('.city-suggestion');
            if (firstSuggestion) {
                const cityName = firstSuggestion.dataset.city;
                selectCity(cityName || '');
                input.value = cityName || '';
                suggestions.classList.remove('active');
            }
        }
    });
}
function selectCity(cityName) {
    selectedCity = cities.find((c) => c.name === cityName) || null;
    updateDistances();
    sortByDistance();
}
function initTagFilters() {
    const filters = document.querySelectorAll('.tag-filter');
    filters.forEach((filter) => {
        filter.addEventListener('click', () => {
            const tag = filter.dataset.tag;
            const filterType = filter.dataset.filterType;
            if (!tag)
                return;
            if (filterType === 'state') {
                if (activeStateFilters.has(tag)) {
                    activeStateFilters.delete(tag);
                    filter.classList.remove('active');
                }
                else {
                    activeStateFilters.add(tag);
                    filter.classList.add('active');
                }
            }
            else {
                if (activeFilters.has(tag)) {
                    activeFilters.delete(tag);
                    filter.classList.remove('active');
                }
                else {
                    activeFilters.add(tag);
                    filter.classList.add('active');
                }
            }
            applyFilters();
        });
    });
}
function applyFilters() {
    listings.forEach((listing) => {
        let showByState = true;
        let showByTagOrType = true;
        // State filter (must match if any state filters are active)
        if (activeStateFilters.size > 0) {
            showByState = activeStateFilters.has(listing.state);
        }
        // Tag/type filter (must match if any tag filters are active)
        if (activeFilters.size > 0) {
            const hasMatchingTag = listing.tags.some((tag) => activeFilters.has(tag));
            const hasMatchingType = activeFilters.has(listing.type);
            showByTagOrType = hasMatchingTag || hasMatchingType;
        }
        listing.element.style.display = showByState && showByTagOrType ? '' : 'none';
    });
}
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get('city');
    if (cityParam) {
        const input = document.getElementById('city-input');
        if (input) {
            input.value = cityParam;
            selectCity(cityParam);
        }
    }
}
function updateDistances() {
    listings.forEach((listing) => {
        const distanceEl = listing.element.querySelector('.distance');
        if (!distanceEl)
            return;
        if (!selectedCity) {
            distanceEl.textContent = '-';
            distanceEl.classList.add('no-city');
            return;
        }
        distanceEl.classList.remove('no-city');
        const dist = haversineDistance(selectedCity.coordinates, listing.coordinates);
        distanceEl.textContent = formatDistance(dist);
    });
}
function sortByDistance() {
    if (!selectedCity)
        return;
    const tbody = document.querySelector('.listings-table tbody');
    if (!tbody)
        return;
    const sorted = [...listings].sort((a, b) => {
        const distA = haversineDistance(selectedCity.coordinates, a.coordinates);
        const distB = haversineDistance(selectedCity.coordinates, b.coordinates);
        return distA - distB;
    });
    sorted.forEach((listing) => {
        tbody.appendChild(listing.element);
    });
}
function haversineDistance(coords1, coords2) {
    const R = 6371;
    const lat1 = toRad(coords1[0]);
    const lat2 = toRad(coords2[0]);
    const dLat = toRad(coords2[0] - coords1[0]);
    const dLon = toRad(coords2[1] - coords1[1]);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function toRad(deg) {
    return deg * (Math.PI / 180);
}
function formatDistance(km) {
    if (km < 1) {
        return '< 1 km';
    }
    else if (km < 100) {
        return `${Math.round(km)} km`;
    }
    else {
        return `${Math.round(km / 10) * 10} km`;
    }
}
