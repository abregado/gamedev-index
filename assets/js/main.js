"use strict";
// Color palette for tags - visually distinct, accessible colors
const TAG_COLORS = [
    '#2563eb', // blue
    '#7c3aed', // violet
    '#db2777', // pink
    '#ea580c', // orange
    '#16a34a', // green
    '#0891b2', // cyan
    '#4f46e5', // indigo
    '#c026d3', // fuchsia
    '#65a30d', // lime
    '#0d9488', // teal
    '#e11d48', // rose
    '#9333ea', // purple
];
let cities = [];
let cityMap = new Map();
let listings = [];
let selectedCity = null;
let tagInfoMap = new Map();
let expandedFilters = false;
const MAX_VISIBLE_TAGS = 10;
document.addEventListener('DOMContentLoaded', () => {
    loadCities();
    initListings();
    initTagFilters();
    initCitySelector();
    initHeaderBehavior();
    handleUrlParams();
    updateDescriptions();
    applyTagColors();
    applyFilters();
    sortAlphabetically();
});
function loadCities() {
    const citiesData = document.getElementById('cities-data');
    if (citiesData) {
        cities = JSON.parse(citiesData.textContent || '[]');
        cities.forEach((city) => {
            cityMap.set(city.name, city);
        });
    }
}
function initListings() {
    const items = document.querySelectorAll('.listing');
    items.forEach((item) => {
        const citiesAttr = item.dataset.cities;
        const tagsAttr = item.dataset.tags;
        const contentAttr = item.dataset.content;
        const titleAttr = item.dataset.title;
        const eventUrl = item.dataset.eventUrl;
        listings.push({
            element: item,
            cities: citiesAttr ? JSON.parse(citiesAttr) : [],
            tags: tagsAttr ? JSON.parse(tagsAttr) : [],
            content: contentAttr || '',
            title: titleAttr || '',
        });
        // Make entire listing clickable - navigate to event page
        if (eventUrl) {
            item.addEventListener('click', () => {
                window.location.href = eventUrl;
            });
        }
    });
}
// Generate a consistent hash from a string
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}
// Get a consistent color for a tag name
function getTagColor(tagName) {
    const hash = hashString(tagName);
    return TAG_COLORS[hash % TAG_COLORS.length];
}
function initTagFilters() {
    // Collect all tags and count occurrences
    const tagCounts = new Map();
    listings.forEach((listing) => {
        listing.tags.forEach((tag) => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
    });
    // Sort by count descending
    const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
        name,
        count,
        state: 'allowed',
        color: getTagColor(name),
    }));
    // Store in map
    sortedTags.forEach((tag) => {
        tagInfoMap.set(tag.name, tag);
    });
    // Render filter buttons
    renderTagFilters(sortedTags);
}
function renderTagFilters(tags) {
    const mainContainer = document.getElementById('tag-filters-main');
    const expandedContainer = document.getElementById('tag-filters-expanded');
    const toggleButton = document.getElementById('tag-filters-toggle');
    if (!mainContainer || !expandedContainer || !toggleButton)
        return;
    const mainTags = tags.slice(0, MAX_VISIBLE_TAGS);
    const extraTags = tags.slice(MAX_VISIBLE_TAGS);
    // Render main tags
    mainContainer.innerHTML = mainTags
        .map((tag) => createTagButton(tag))
        .join('');
    // Render extra tags
    if (extraTags.length > 0) {
        expandedContainer.innerHTML = extraTags
            .map((tag) => createTagButton(tag))
            .join('');
        toggleButton.style.display = '';
    }
    else {
        toggleButton.style.display = 'none';
    }
    // Add click handlers
    document.querySelectorAll('.tag-filter').forEach((el) => {
        el.addEventListener('click', () => {
            const tagName = el.dataset.tag;
            if (tagName) {
                cycleTagState(tagName);
                updateTagButton(el, tagName);
                applyFilters();
            }
        });
    });
    // Toggle button handler
    toggleButton.addEventListener('click', () => {
        expandedFilters = !expandedFilters;
        expandedContainer.classList.toggle('active', expandedFilters);
        toggleButton.classList.toggle('expanded', expandedFilters);
    });
}
function createTagButton(tag) {
    const style = tag.state === 'allowed'
        ? `background-color: ${tag.color}; border-color: ${tag.color};`
        : '';
    return `<button class="tag-filter" data-tag="${tag.name}" data-state="${tag.state}" style="${style}">
    <span class="tag-icon"></span>
    <span class="tag-name">${tag.name}</span>
  </button>`;
}
function cycleTagState(tagName) {
    const tag = tagInfoMap.get(tagName);
    if (!tag)
        return;
    // Cycle: allowed → ignored → disallowed → allowed
    const nextState = {
        allowed: 'ignored',
        ignored: 'disallowed',
        disallowed: 'allowed',
    };
    tag.state = nextState[tag.state];
}
function updateTagButton(button, tagName) {
    const tag = tagInfoMap.get(tagName);
    if (!tag)
        return;
    button.dataset.state = tag.state;
    if (tag.state === 'allowed') {
        button.style.backgroundColor = tag.color;
        button.style.borderColor = tag.color;
    }
    else {
        button.style.backgroundColor = '';
        button.style.borderColor = '';
    }
}
function applyTagColors() {
    listings.forEach((listing) => {
        const tagElements = listing.element.querySelectorAll('.listing-tag');
        listing.tags.forEach((tagName, index) => {
            const tagEl = tagElements[index];
            if (tagEl) {
                const color = getTagColor(tagName);
                tagEl.style.backgroundColor = color;
            }
        });
    });
}
function initCitySelector() {
    // Get all city inputs and their suggestion containers
    const citySelectors = document.querySelectorAll('.city-selector');
    citySelectors.forEach((selector) => {
        const input = selector.querySelector('.city-input');
        const suggestions = selector.querySelector('.city-suggestions');
        if (!input || !suggestions)
            return;
        input.addEventListener('input', () => {
            const query = input.value.toLowerCase().trim();
            // Sync all inputs
            syncCityInputs(input.value);
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
                    syncCityInputs(cityName || '');
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
                    syncCityInputs(cityName || '');
                    suggestions.classList.remove('active');
                }
            }
        });
    });
}
function syncCityInputs(value) {
    document.querySelectorAll('.city-input').forEach((input) => {
        if (input.value !== value) {
            input.value = value;
        }
    });
}
function selectCity(cityName) {
    selectedCity = cityMap.get(cityName) || null;
    updateLocations();
    updateDistances();
    updateHeaderState();
    if (selectedCity) {
        sortByDistance();
    }
    else {
        sortAlphabetically();
    }
}
function initHeaderBehavior() {
    const heroHeader = document.getElementById('header-hero');
    const compactHeader = document.getElementById('header-compact');
    if (!heroHeader || !compactHeader)
        return;
    // Update on scroll
    window.addEventListener('scroll', () => {
        updateHeaderState();
    });
    // Initial state
    updateHeaderState();
}
function updateHeaderState() {
    const heroHeader = document.getElementById('header-hero');
    const compactHeader = document.getElementById('header-compact');
    const spacer = document.getElementById('header-spacer');
    if (!heroHeader || !compactHeader || !spacer)
        return;
    const isCompact = compactHeader.classList.contains('visible');
    const hasCitySelected = selectedCity !== null;
    // Hysteresis: require scrolling past 100px to show compact, but only 20px to show hero
    const compactThreshold = isCompact ? 20 : 100;
    const shouldShowCompact = window.scrollY > compactThreshold || hasCitySelected;
    if (shouldShowCompact) {
        heroHeader.classList.add('hidden');
        compactHeader.classList.add('visible');
        // Only show spacer when compact is due to scroll, not city selection
        // This prevents gap at top when city is selected at scroll position 0
        if (!hasCitySelected) {
            spacer.classList.add('visible');
        }
        else {
            spacer.classList.remove('visible');
        }
    }
    else {
        heroHeader.classList.remove('hidden');
        compactHeader.classList.remove('visible');
        spacer.classList.remove('visible');
    }
}
function applyFilters() {
    const allowedTags = new Set();
    const disallowedTags = new Set();
    tagInfoMap.forEach((tag) => {
        if (tag.state === 'allowed') {
            allowedTags.add(tag.name);
        }
        else if (tag.state === 'disallowed') {
            disallowedTags.add(tag.name);
        }
    });
    let visibleCount = 0;
    listings.forEach((listing) => {
        // Check if any tag is disallowed
        const hasDisallowed = listing.tags.some((tag) => disallowedTags.has(tag));
        // Check if any tag is allowed (only matters if there are allowed tags)
        const hasAllowed = allowedTags.size === 0 || listing.tags.some((tag) => allowedTags.has(tag));
        const visible = !hasDisallowed && hasAllowed;
        listing.element.style.display = visible ? '' : 'none';
        if (visible) {
            visibleCount++;
        }
    });
    // Show/hide empty message
    const emptyMessage = document.getElementById('empty-message');
    const listingsContainer = document.querySelector('.listings');
    if (emptyMessage && listingsContainer) {
        if (visibleCount === 0) {
            emptyMessage.style.display = '';
            listingsContainer.style.display = 'none';
        }
        else {
            emptyMessage.style.display = 'none';
            listingsContainer.style.display = '';
        }
    }
}
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get('city');
    if (cityParam) {
        syncCityInputs(cityParam);
        selectCity(cityParam);
    }
}
function updateDescriptions() {
    listings.forEach((listing) => {
        const descCell = listing.element.querySelector('.listing-description');
        if (!descCell)
            return;
        const firstSentence = extractFirstSentence(listing.content);
        descCell.textContent = firstSentence;
    });
}
function extractFirstSentence(content) {
    const trimmed = content.trim();
    const match = trimmed.match(/^[^.!?]*[.!?]/);
    if (match) {
        return match[0].trim();
    }
    if (trimmed.length > 100) {
        return trimmed.substring(0, 100) + '...';
    }
    return trimmed;
}
function updateLocations() {
    listings.forEach((listing) => {
        const locationCell = listing.element.querySelector('.listing-location');
        if (!locationCell)
            return;
        const nearestCity = findNearestCity(listing.cities);
        if (nearestCity) {
            locationCell.textContent = nearestCity;
        }
        else if (listing.cities.length > 0) {
            locationCell.textContent = listing.cities[0];
        }
    });
}
function findNearestCity(cityNames) {
    if (!selectedCity || cityNames.length === 0) {
        return cityNames[0] || null;
    }
    let nearestCity = cityNames[0];
    let minDistance = Infinity;
    cityNames.forEach((cityName) => {
        const city = cityMap.get(cityName);
        if (city) {
            const dist = haversineDistance(selectedCity.coordinates, city.coordinates);
            if (dist < minDistance) {
                minDistance = dist;
                nearestCity = cityName;
            }
        }
    });
    return nearestCity;
}
function getMinDistance(listing) {
    if (!selectedCity)
        return Infinity;
    let minDistance = Infinity;
    listing.cities.forEach((cityName) => {
        const city = cityMap.get(cityName);
        if (city) {
            const dist = haversineDistance(selectedCity.coordinates, city.coordinates);
            if (dist < minDistance) {
                minDistance = dist;
            }
        }
    });
    return minDistance;
}
function updateDistances() {
    listings.forEach((listing) => {
        const pill = listing.element.querySelector('.listing-distance-pill');
        const distanceEl = listing.element.querySelector('.distance');
        if (!pill || !distanceEl)
            return;
        if (!selectedCity) {
            pill.classList.remove('visible');
            return;
        }
        pill.classList.add('visible');
        const dist = getMinDistance(listing);
        distanceEl.textContent = formatDistance(dist);
    });
}
function sortAlphabetically() {
    const container = document.querySelector('.listings');
    if (!container)
        return;
    const sorted = [...listings].sort((a, b) => {
        return a.title.localeCompare(b.title);
    });
    sorted.forEach((listing) => {
        container.appendChild(listing.element);
    });
}
function sortByDistance() {
    if (!selectedCity)
        return;
    const container = document.querySelector('.listings');
    if (!container)
        return;
    const sorted = [...listings].sort((a, b) => {
        const distA = getMinDistance(a);
        const distB = getMinDistance(b);
        return distA - distB;
    });
    sorted.forEach((listing) => {
        container.appendChild(listing.element);
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
    if (km === Infinity)
        return '-';
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
