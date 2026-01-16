# Development Documentation

## Project Overview

This is a Jekyll static site for indexing local gamedev events in Germany (NRW and Hessen regions). Events are displayed in a flexbox list with city-based distance sorting and three-state tag filtering.

## Current State

- 40 event listings across NRW and Hessen cities
- Multi-city support per event (e.g., regional meetups covering multiple cities)
- Distance sorting based on nearest city to user's selected location
- Three-state tag filtering (Allowed/Ignored/Disallowed)
- Dynamic tag discovery with color-coded display
- First sentence of event description shown in listings
- Adaptive sticky header with hero/compact states

## Site Header

The site uses a dual-header architecture for smooth transitions between hero and compact states.

### Architecture
Two separate header elements exist in the DOM:
- **Hero Header** (`#header-hero`): Full-size centered layout
- **Compact Header** (`#header-compact`): Sticky horizontal bar

Both headers contain their own city selector input. The inputs are synced via JavaScript so changes in one update the other.

### Hero Header
- Large centered title "Event Index" with subtitle
- Prominent city search input as call-to-action
- Visible by default, fades out on scroll
- Uses `opacity` transition for smooth fade

### Compact Header
- Horizontal bar layout: city input (left), title (right)
- Smaller, more compact styling
- White card background with shadow
- `position: sticky` with `top: 0` and `z-index: 50`
- Hidden by default (`opacity: 0`), fades in on scroll

### State Transitions
- **Show compact when**: user scrolls down >100px OR city is selected
- **Show hero when**: user scrolls back up <20px AND no city selected
- Hysteresis (20px vs 100px thresholds) prevents flickering near the transition point
- Only `opacity` animates (0.25s ease) - no layout/font-size transitions
- `pointer-events` toggled with visibility to prevent interaction with hidden header
- Hero header uses `position: absolute` when hidden to collapse out of document flow

### Header Spacer
A spacer element (`#header-spacer`) sits at the top of the page:
- **Height**: 100px (matches scroll threshold)
- **Visible when**: compact header is shown due to scrolling (not city selection)
- **Purpose**: Allows users to scroll up to access filter controls without triggering the hero header to reappear
- When a city is selected, the spacer is hidden to avoid a gap at the top

## Data Flow

1. **Cities data** (`_data/cities.yml`) contains city names, states, and coordinates
2. **Listings** (`_listings/*.md`) reference cities by name (no coordinates in listings)
3. **Jekyll** builds the HTML with listings data embedded in data attributes
4. **TypeScript** (`src/main.ts`) handles:
   - City autocomplete from cities data
   - Distance calculation using haversine formula
   - Finding nearest city for multi-city events
   - Dynamic tag collection and three-state filtering
   - Tag color assignment via hash-based palette
   - Extracting first sentence for description

## Key Files

### Templates
- `_layouts/default.html` - Base layout, includes CSS and JS, embeds cities data as JSON
- `_layouts/event.html` - Individual event page layout
- `_includes/listing-table.html` - Flexbox listing template with data attributes for JS

## Event Pages

Each listing generates its own page at `/event/{listing-name}/`.

### Navigation
- Clicking a listing on the index navigates to its event page (not the external URL)
- Event page has a back link to return to the index
- Browser back button also works

### Event Page Content
- Full event title and description
- All cities and tags
- Last updated date
- Prominent "Visit Event Website" button linking to `external_url`
- Disclaimer about external links

### Data Attributes on Listings
```html
<div class="listing"
     data-cities='["Cologne", "Frankfurt"]'
     data-tags='["meetup", "networking"]'
     data-content="Full description text here"
     data-title="event name lowercase">
```

### Listing Format
```yaml
---
title: Event Name
tags: [jam, meetup, conference, workshop, networking]
cities: [CityName]  # or multiple: [City1, City2, City3]
last_updated: 2026-01-15
external_url: https://example.com
---
Description content. First sentence shown in listing, full text on event page.
```

### Cities Format
```yaml
- name: Cologne
  state: NRW
  country: Germany
  coordinates: [50.9375, 6.9603]  # lat, long
```

## Tag Filtering

Tags are automatically discovered from all events and displayed in the filter UI.

### Three States
- **Allowed** (default): Colored background with checkmark. Events with this tag can be shown.
- **Ignored**: Gray outline with dot. Tag has no effect on filtering.
- **Disallowed**: Red outline with X, strikethrough. Events with this tag are hidden.

### Filter Logic
1. If an event has ANY disallowed tag → hidden
2. If no tags are set to Allowed → all events pass the tag filter
3. If some tags are Allowed → event must have at least one Allowed tag

### Tag Colors
Colors are assigned from a 12-color palette based on a hash of the tag name. This ensures:
- Consistent colors across page loads
- No manual color configuration needed
- New tags automatically get colors

### UI Behavior
- Top 10 most common tags shown by default
- "Show more" expands to reveal additional tags
- Click a tag to cycle: Allowed → Ignored → Disallowed → Allowed

## Distance Sorting

- When no city selected: events sorted alphabetically, distance pill hidden
- When city selected: events sorted by distance, pill shows distance to nearest city
- For multi-city events, distance is calculated to the nearest listed city

## URL Parameters

- `?city=CityName` preselects a city on page load

## Build Process

1. `npm run build` - Compiles TypeScript to `assets/js/main.js`
2. `bundle exec jekyll build` - Builds site to `_site/`
3. GitHub Actions runs both in sequence on push to main

**Note for Claude Code:** Jekyll serve runs in a separate terminal with live reload. No need to start or restart it - just make changes and refresh the browser.

## Adding New Events

1. Create `_listings/[city]-[type].md` with the listing format above
2. Ensure all cities referenced exist in `_data/cities.yml`
3. Tags are auto-discovered - just use any tag in the listing front matter

## Adding New Cities

Add to `_data/cities.yml`:
```yaml
- name: NewCity
  state: StateCode  # NRW or Hessen
  country: Germany
  coordinates: [lat, long]
```

## Known Considerations

- City names in listings must exactly match names in cities.yml
- The TypeScript must be rebuilt after changes to `src/main.ts`
- Service-type listings were removed; this is events-only now
- Tag colors are deterministic but may change if the palette or hash algorithm changes
