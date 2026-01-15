# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- **Install dependencies**: `bundle install`
- **Local development**: `bundle exec jekyll serve` (serves at http://localhost:4000)
- **Build site**: `bundle exec jekyll build` (outputs to `_site/`)
- **TypeScript build**: `npm run build` (compiles TS to `dist/`)

## Architecture

This is a Jekyll static site with TypeScript support for custom scripts.

### Jekyll Structure
- `_config.yml` - Jekyll configuration
- `_layouts/` - HTML layout templates
- `index.html` - Main page (uses front matter for layout/title)

### Deployment
- GitHub Actions workflow (`.github/workflows/jekyll.yml`) builds and deploys to GitHub Pages on push to `main`
- Uses Jekyll 4.x (latest) via custom workflow instead of GitHub Pages built-in Jekyll 3.8.5

### TypeScript
- Source in `src/`, compiled output in `dist/`
- Strict mode enabled, ES2016 target, CommonJS modules
- Jekyll excludes TypeScript files from site build
