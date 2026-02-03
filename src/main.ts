interface City {
  name: string;
  state: string;
  country: string;
  coordinates: [number, number];
}

interface Listing {
  element: HTMLElement;
  cities: string[];
  tags: string[];
  content: string;
  title: string;
}

type TagState = 'allowed' | 'ignored' | 'disallowed';

interface TagInfo {
  name: string;
  count: number;
  state: TagState;
  color: string;
}

// SVG Icons
const ICONS = {
  check: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6l3 3 5-6"/></svg>',
  circle: '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="6" r="2"/></svg>',
  x: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>',
  house: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l6-5 6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z"/><path d="M6 14V9h4v5"/></svg>',
};

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

const GEONAMES_USERNAME = 'Rules_As_Intended';
const API_TIMEOUT = 5000; // 5 seconds timeout for API call
const SEARCH_DEBOUNCE = 500; // 500ms debounce before API call

let cities: City[] = [];
let cityMap: Map<string, City> = new Map();
let listings: Listing[] = [];
let selectedCity: City | null = null;
let tagInfoMap: Map<string, TagInfo> = new Map();
let expandedFilters = false;
let cityRetrievalTimer: ReturnType<typeof setTimeout> | null = null;
let localFallbackTimer: ReturnType<typeof setTimeout> | null = null;

document.addEventListener('DOMContentLoaded', () => {
  loadCities();
  initListings();
  initTagFilters();
  initCitySelector();
  initHeaderBehavior();
  handleUrlParams();
  updateDescriptions();
  applyTagColors();
  applyEventTagColors();
  applyFilters();   
  sortAlphabetically();
});

function loadCities(): void {
  const citiesData = document.getElementById('cities-data');
  if (citiesData) {
    cities = JSON.parse(citiesData.textContent || '[]');
    cities.forEach((city) => {
      cityMap.set(city.name, city);
    });
  }
}

function initListings(): void {
  const items = document.querySelectorAll<HTMLElement>('.listing');
  items.forEach((item) => {
    const citiesAttr = item.dataset.cities;
    const tagsAttr = item.dataset.tags;
    const contentAttr = item.dataset.content;
    const titleAttr = item.dataset.title;

    listings.push({
      element: item,
      cities: citiesAttr ? JSON.parse(citiesAttr) : [],
      tags: tagsAttr ? JSON.parse(tagsAttr) : [],
      content: contentAttr || '',
      title: titleAttr || '',
    });
  });
}

// Generate a consistent hash from a string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get a consistent color for a tag name
function getTagColor(tagName: string): string {
  const hash = hashString(tagName);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

function initTagFilters(): void {
  // Collect all tags and count occurrences
  const tagCounts = new Map<string, number>();
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
      state: 'ignored' as TagState,
      color: getTagColor(name),
    }));

  // Store in map
  sortedTags.forEach((tag) => {
    tagInfoMap.set(tag.name, tag);
  });

  // Render filter buttons
  renderTagFilters(sortedTags);
}

function renderTagFilters(tags: TagInfo[]): void {
  const mainContainer = document.getElementById('tag-filters-main');
  const toggleButton = document.getElementById('tag-filters-toggle');

  if (!mainContainer || !toggleButton) return;


  // Render main tags
  mainContainer.innerHTML = tags
    .map((tag) => createTagButton(tag))
    .join('');

  // Add click handlers
  document.querySelectorAll('.tag-filter').forEach((el) => {
    el.addEventListener('click', () => {
      const tagName = (el as HTMLElement).dataset.tag;
      if (tagName) {
        cycleTagState(tagName);
        updateTagButton(el as HTMLElement, tagName);
        applyFilters();
      }
    });
  });

  // Toggle button style
  toggleButton.style.display = '';

  // Toggle button handler
  toggleButton.addEventListener('click', () => {
    expandedFilters = !expandedFilters;
    mainContainer.classList.toggle('expanded', expandedFilters);
  });
}

function getTagIcon(state: TagState): string {
  switch (state) {
    case 'allowed':
      return ICONS.check;
    case 'disallowed':
      return ICONS.x;
    default:
      return ICONS.circle;
  }
}

function createTagButton(tag: TagInfo): string {
  const style = getTagButtonStyle(tag.state, tag.color);
  const icon = getTagIcon(tag.state);
  return `<button class="tag-filter" data-tag="${tag.name}" data-state="${tag.state}" data-color="${tag.color}" style="${style}">
    <span class="tag-icon">${icon}</span>
    <span class="tag-name">${tag.name}</span>
  </button>`;
}

function getTagButtonStyle(state: TagState, color: string): string {
  if (state === 'allowed') {
    return `background-color: ${color}; border-color: ${color};`;
  } else if (state === 'ignored') {
    return `border-color: ${color}; color: ${color}; opacity: 0.5;`;
  }
  return '';
}

function cycleTagState(tagName: string): void {
  const tag = tagInfoMap.get(tagName);
  if (!tag) return;

  // Cycle: ignored → allowed → disallowed → ignored
  const nextState: Record<TagState, TagState> = {
    ignored: 'allowed',
    allowed: 'disallowed',
    disallowed: 'ignored',
  };

  tag.state = nextState[tag.state];
}

function updateTagButton(button: HTMLElement, tagName: string): void {
  const tag = tagInfoMap.get(tagName);
  if (!tag) return;

  button.dataset.state = tag.state;

  // Update icon
  const iconEl = button.querySelector('.tag-icon');
  if (iconEl) {
    iconEl.innerHTML = getTagIcon(tag.state);
  }

  if (tag.state === 'allowed') {
    button.style.backgroundColor = tag.color;
    button.style.borderColor = tag.color;
    button.style.color = '';
    button.style.opacity = '';
  } else if (tag.state === 'ignored') {
    button.style.backgroundColor = '';
    button.style.borderColor = tag.color;
    button.style.color = tag.color;
    button.style.opacity = '0.5';
  } else {
    button.style.backgroundColor = '';
    button.style.borderColor = '';
    button.style.color = '';
    button.style.opacity = '';
  }
}

function applyTagColors(): void {
  listings.forEach((listing) => {
    const tagElements = listing.element.querySelectorAll('.listing-tag');
    listing.tags.forEach((tagName, index) => {
      const tagEl = tagElements[index] as HTMLElement;
      if (tagEl) {
        const color = getTagColor(tagName);
        tagEl.style.color = color;
      }
    });
  });
}

function applyEventTagColors(): void {
  document.querySelectorAll<HTMLElement>('.event-tag').forEach((el) => {
    const name = el.textContent?.trim() || '';
    if (name) {
      el.style.color = getTagColor(name);
    }
  });
}

async function fetchGeoNamesCities(query: string, suggestions: HTMLElement): Promise<boolean> {
  try {
    // GeoNames search API with parameters:
    // - name_startsWith: city name prefix
    // - maxRows: limit results
    // - featureClass: P (cities, towns)
    // - username: your GeoNames username
    const url = `https://secure.geonames.org/searchJSON?name_startsWith=${encodeURIComponent(query)}&maxRows=10&featureClass=P&username=${GEONAMES_USERNAME}&orderby=population`;
    
    const response = await fetch(url);
    if (!response.ok) return false;

    const data = await response.json();
    
    // Check for GeoNames API errors
    if (data.status) {
      console.error('GeoNames API error:', data.status.message);
      return false;
    }
    
    if (!data.geonames || data.geonames.length === 0) {
      return false;
    }

    const geonamesCities: City[] = data.geonames.map((result: any) => ({
      name: result.name,
      state: result.adminName1 || '', // State/region name
      country: result.countryName || 'Germany',
      coordinates: [parseFloat(result.lat), parseFloat(result.lng)] as [number, number],
    }));

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = geonamesCities.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });

    renderCitySuggestions(unique, suggestions);
    return true;
  } catch (error) {
    console.error('GeoNames fetch error:', error);
    return false;
  }
}

function renderCitySuggestions(citiesList: City[], suggestions: HTMLElement): void {
  suggestions.innerHTML = citiesList
    .map(
      (city) =>
        `<div class="city-suggestion" data-city="${city.name}">${city.name}${city.state ? ', ' + city.state : ''}</div>`
    )
    .join('');
  suggestions.classList.add('active');

  suggestions.querySelectorAll('.city-suggestion').forEach((el) => {
    el.addEventListener('click', () => {
      const cityName = (el as HTMLElement).dataset.city;
      if (cityName) {
        const city = citiesList.find((c) => c.name === cityName);
        if (city) {
          cityMap.set(city.name, city);
        }
        selectCity(cityName);
        syncCityInputs(cityName);
        suggestions.classList.remove('active');
      }
    });
  });
}

function showLocalCities(query: string, suggestions: HTMLElement): void {
  const matches = cities.filter(
    (city) =>
      city.name.toLowerCase().startsWith(query) ||
      city.state.toLowerCase().startsWith(query)
  );

  if (matches.length > 0) {
    renderCitySuggestions(matches.slice(0, 10), suggestions);
  } else {
    suggestions.classList.remove('active');
  }
}

function initCitySelector(): void {
  // Get all city inputs and their suggestion containers
  const citySelectors = document.querySelectorAll('.city-selector');

  citySelectors.forEach((selector) => {
    const input = selector.querySelector('.city-input') as HTMLInputElement;
    const suggestions = selector.querySelector(
      '.city-suggestions'
    ) as HTMLElement;

    if (!input || !suggestions) return;

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase().trim();

      // Sync all inputs
      syncCityInputs(input.value);

      if (query.length < 1) {
        suggestions.classList.remove('active');
        return;
      }

      // Clear any existing timers
      if (cityRetrievalTimer) clearTimeout(cityRetrievalTimer);
      if (localFallbackTimer) clearTimeout(localFallbackTimer);

      if (query.length >= 3) {
        // Show loading indicator immediately
        suggestions.innerHTML = '<div class="city-suggestion-loading"><span class="spinner"></span> Searching...</div>';
        suggestions.classList.add('active');

        let apiResolved = false;

        // Wait 500ms before making API call (debounce)
        cityRetrievalTimer = setTimeout(() => {
          // Start API call after debounce delay
          fetchGeoNamesCities(query, suggestions).then((success) => {
            apiResolved = true;
            // If API failed or returned no results, try local fallback
            if (!success) {
              showLocalCities(query, suggestions);
            }
          });

          // Set timeout to show local results after 5 seconds if API hasn't resolved
          localFallbackTimer = setTimeout(() => {
            if (!apiResolved) {
              showLocalCities(query, suggestions);
            }
          }, API_TIMEOUT);
        }, SEARCH_DEBOUNCE);
      } else {
        suggestions.classList.remove('active');
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => suggestions.classList.remove('active'), 200);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstSuggestion = suggestions.querySelector(
          '.city-suggestion'
        ) as HTMLElement;
        if (firstSuggestion) {
          firstSuggestion.click();
        }
      }
    });
  });
}

function syncCityInputs(value: string): void {
  document.querySelectorAll<HTMLInputElement>('.city-input').forEach((input) => {
    if (input.value !== value) {
      input.value = value;
    }
  });
}

function selectCity(cityName: string): void {
  selectedCity = cityMap.get(cityName) || null;
  updateLocations();
  updateDistances();
  if (selectedCity) {
    sortByDistance();
  } else {
    sortAlphabetically();
  }
}

function initHeaderBehavior(): void {
  const heroHeader = document.getElementById('header-hero');
  const compactHeader = document.getElementById('header-compact');

  if (!heroHeader || !compactHeader) return;

  // Update on scroll
  window.addEventListener('scroll', () => {
    updateHeaderState();
  });

  // Initial state
  updateHeaderState();
}

function updateHeaderState(): void {
  const heroHeader = document.getElementById('header-hero');
  const compactHeader = document.getElementById('header-compact');

  if (!heroHeader || !compactHeader) return;

  // Show compact header when hero is scrolled out of view
  const heroRect = heroHeader.getBoundingClientRect();
  const shouldShowCompact = heroRect.bottom <= 0;

  if (shouldShowCompact) {
    compactHeader.classList.add('visible');
  } else {
    compactHeader.classList.remove('visible');
  }
}

function applyFilters(): void {
  const allowedTags = new Set<string>();
  const disallowedTags = new Set<string>();

  tagInfoMap.forEach((tag) => {
    if (tag.state === 'allowed') {
      allowedTags.add(tag.name);
    } else if (tag.state === 'disallowed') {
      disallowedTags.add(tag.name);
    }
  });

  let visibleCount = 0;

  listings.forEach((listing) => {
    // Check if any tag is disallowed
    const hasDisallowed = listing.tags.some((tag) => disallowedTags.has(tag));

    // Check if any tag is allowed (only matters if there are allowed tags)
    const hasAllowed =
      allowedTags.size === 0 || listing.tags.some((tag) => allowedTags.has(tag));

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
      (listingsContainer as HTMLElement).style.display = 'none';
    } else {
      emptyMessage.style.display = 'none';
      (listingsContainer as HTMLElement).style.display = '';
    }
  }
}

function handleUrlParams(): void {
  const params = new URLSearchParams(window.location.search);
  const cityParam = params.get('city');

  if (cityParam) {
    syncCityInputs(cityParam);
    selectCity(cityParam);
  }
}

function updateDescriptions(): void {
  listings.forEach((listing) => {
    const descCell = listing.element.querySelector('.listing-description');
    if (!descCell) return;

    const firstSentence = extractFirstSentence(listing.content);
    descCell.textContent = firstSentence;
  });
}

function extractFirstSentence(content: string): string {
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

function updateLocations(): void {
  listings.forEach((listing) => {
    const locationCell = listing.element.querySelector('.listing-location');
    if (!locationCell) return;

    const nearestCity = findNearestCity(listing.cities);
    if (nearestCity) {
      locationCell.textContent = nearestCity;
    } else if (listing.cities.length > 0) {
      locationCell.textContent = listing.cities[0];
    }
  });
}

function findNearestCity(cityNames: string[]): string | null {
  if (!selectedCity || cityNames.length === 0) {
    return cityNames[0] || null;
  }

  let nearestCity = cityNames[0];
  let minDistance = Infinity;

  cityNames.forEach((cityName) => {
    const city = cityMap.get(cityName);
    if (city) {
      const dist = haversineDistance(
        selectedCity!.coordinates,
        city.coordinates
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestCity = cityName;
      }
    }
  });

  return nearestCity;
}

function getMinDistance(listing: Listing): number {
  if (!selectedCity) return Infinity;

  let minDistance = Infinity;
  listing.cities.forEach((cityName) => {
    const city = cityMap.get(cityName);
    if (city) {
      const dist = haversineDistance(
        selectedCity!.coordinates,
        city.coordinates
      );
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  });

  return minDistance;
}


// Get a color that changes the higher the distance gets, up to a maximum
function getDistanceColor(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    km = 0;
  }
  const maxKm = 250;
  const clamped = Math.min(km, maxKm);
  const t = clamped / maxKm; // 0 (near) -> 1 (far)
  
  // Easing curve for the color transition
  const eased = Math.sqrt(t);

  const start = { r: 0x5f, g: 0xae, b: 0x94 };
  const end = { r: 0xf4, g: 0xa4, b: 0x60 };

  const r = Math.round(start.r + (end.r - start.r) * eased);
  const g = Math.round(start.g + (end.g - start.g) * eased);
  const b = Math.round(start.b + (end.b - start.b) * eased);

  return `rgb(${r}, ${g}, ${b})`;
}

function updateDistances(): void {
  listings.forEach((listing) => {
    const pill = listing.element.querySelector('.listing-distance-pill') as HTMLElement;
    const distanceEl = listing.element.querySelector('.distance');
    if (!pill || !distanceEl) return;

    if (!selectedCity) {
      pill.classList.remove('visible');
      // Reset styles when no city is selected
      pill.style.background = '';
      pill.style.borderColor = '';
      return;
    }

    pill.classList.add('visible');
    const distance = getMinDistance(listing);

    // Set label text/icon with city name for mobile (only if different)
    distanceEl.innerHTML = formatDistance(distance);

    if (distance === Infinity) {
      pill.style.background = '';
      pill.style.borderColor = '';
    } else {
      const color = getDistanceColor(distance);
      pill.style.background = color;
      pill.style.borderColor = color;
    }
  });
}

function sortAlphabetically(): void {
  const container = document.querySelector('.listings');
  if (!container) return;

  const sorted = [...listings].sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

  sorted.forEach((listing) => {
    container.appendChild(listing.element);
  });
}

function sortByDistance(): void {
  if (!selectedCity) return;

  const container = document.querySelector('.listings');
  if (!container) return;

  const sorted = [...listings].sort((a, b) => {
    const distA = getMinDistance(a);
    const distB = getMinDistance(b);
    return distA - distB;
  });

  sorted.forEach((listing) => {
    container.appendChild(listing.element);
  });
}

function haversineDistance(
  coords1: [number, number],
  coords2: [number, number]
): number {
  const R = 6371;
  const lat1 = toRad(coords1[0]);
  const lat2 = toRad(coords2[0]);
  const dLat = toRad(coords2[0] - coords1[0]);
  const dLon = toRad(coords2[1] - coords1[1]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatDistance(km: number): string {
  if (km === Infinity) return '-';
  
  if (km < 1) {
    return ICONS.house;
  } else if (km < 100) {
    return `${Math.round(km)}&nbsp;km`;
  } else {
    return `${Math.round(km / 10) * 10}&nbsp;km`;
  }
}
