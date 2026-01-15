# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- **Install dependencies**: `npm install` and `bundle install`
- **Build TypeScript**: `npm run build` (compiles to `assets/js/`)
- **Local development**: `bundle exec jekyll serve` (serves at http://localhost:4000)
- **Build site**: `bundle exec jekyll build` (outputs to `_site/`)

Build TypeScript before Jekyll for local development.

## Architecture

Jekyll static site displaying local gamedev events and services, with TypeScript for interactive features.

### Data Structure
- `_listings/` - Jekyll collection of events/services (markdown with front matter)
- `_data/cities.yml` - City coordinates for autocomplete and distance calculation

### Listing Front Matter
```yaml
title: "Event Name"
type: event | service
tags: [jam, meetup, networking, coworking, etc.]
city: Melbourne
country: Australia
coordinates: [-37.8136, 144.9631]  # lat, long
date: 2026-03-15                    # optional for services
end_date: 2026-03-17                # optional
url: https://example.com
```

### TypeScript (`src/main.ts`)
- City autocomplete filtering `_data/cities.yml`
- Distance calculation (haversine formula)
- Tag/type filtering
- URL parameter handling (`?city=Melbourne`)

Output goes to `assets/js/main.js` for browser use.

### Deployment
- GitHub Actions workflow builds TypeScript then Jekyll
- Deploys to GitHub Pages on push to `main`
