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

let cities: City[] = [];
let cityMap: Map<string, City> = new Map();
let listings: Listing[] = [];
let selectedCity: City | null = null;
let activeFilters: Set<string> = new Set();
let activeStateFilters: Set<string> = new Set();

document.addEventListener('DOMContentLoaded', () => {
  loadCities();
  initListings();
  initCitySelector();
  initTagFilters();
  handleUrlParams();
  updateDescriptions();
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

function initCitySelector(): void {
  const input = document.getElementById('city-input') as HTMLInputElement;
  const suggestions = document.getElementById('city-suggestions');

  if (!input || !suggestions) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    if (query.length < 1) {
      suggestions.classList.remove('active');
      return;
    }

    const matches = cities.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.state.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      suggestions.classList.remove('active');
      return;
    }

    suggestions.innerHTML = matches
      .slice(0, 10)
      .map(
        (city) =>
          `<div class="city-suggestion" data-city="${city.name}">${city.name}, ${city.state}</div>`
      )
      .join('');
    suggestions.classList.add('active');

    suggestions.querySelectorAll('.city-suggestion').forEach((el) => {
      el.addEventListener('click', () => {
        const cityName = (el as HTMLElement).dataset.city;
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
      const firstSuggestion = suggestions.querySelector('.city-suggestion') as HTMLElement;
      if (firstSuggestion) {
        const cityName = firstSuggestion.dataset.city;
        selectCity(cityName || '');
        input.value = cityName || '';
        suggestions.classList.remove('active');
      }
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

function initTagFilters(): void {
  const filters = document.querySelectorAll<HTMLButtonElement>('.tag-filter');
  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      const tag = filter.dataset.tag;
      const filterType = filter.dataset.filterType;
      if (!tag) return;

      if (filterType === 'state') {
        if (activeStateFilters.has(tag)) {
          activeStateFilters.delete(tag);
          filter.classList.remove('active');
        } else {
          activeStateFilters.add(tag);
          filter.classList.add('active');
        }
      } else {
        if (activeFilters.has(tag)) {
          activeFilters.delete(tag);
          filter.classList.remove('active');
        } else {
          activeFilters.add(tag);
          filter.classList.add('active');
        }
      }

      applyFilters();
    });
  });
}

function applyFilters(): void {
  listings.forEach((listing) => {
    let showByState = true;
    let showByTag = true;

    // State filter - check if any of the listing's cities are in the selected states
    if (activeStateFilters.size > 0) {
      showByState = listing.cities.some((cityName) => {
        const city = cityMap.get(cityName);
        return city && activeStateFilters.has(city.state);
      });
    }

    // Tag filter
    if (activeFilters.size > 0) {
      showByTag = listing.tags.some((tag) => activeFilters.has(tag));
    }

    listing.element.style.display = showByState && showByTag ? '' : 'none';
  });
}

function handleUrlParams(): void {
  const params = new URLSearchParams(window.location.search);
  const cityParam = params.get('city');

  if (cityParam) {
    const input = document.getElementById('city-input') as HTMLInputElement;
    if (input) {
      input.value = cityParam;
      selectCity(cityParam);
    }
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
  // Fallback: first 100 chars
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
      const dist = haversineDistance(selectedCity!.coordinates, city.coordinates);
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
      const dist = haversineDistance(selectedCity!.coordinates, city.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  });

  return minDistance;
}

function updateDistances(): void {
  listings.forEach((listing) => {
    const pill = listing.element.querySelector('.listing-distance-pill');
    const distanceEl = listing.element.querySelector('.distance');
    if (!pill || !distanceEl) return;

    if (!selectedCity) {
      pill.classList.remove('visible');
      return;
    }

    pill.classList.add('visible');
    const dist = getMinDistance(listing);
    distanceEl.textContent = formatDistance(dist);
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
    return '< 1 km';
  } else if (km < 100) {
    return `${Math.round(km)} km`;
  } else {
    return `${Math.round(km / 10) * 10} km`;
  }
}
