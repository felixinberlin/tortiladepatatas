# El Mapa de la Tortilla

Bilingual (ES/EN) map and list of every award-winning tortilla de patatas in Spain, from national, regional and local championships. Planned for tortilladepatatas.org.

## Layout
- `docs/` is the whole site, static and with no build step. GitHub Pages can serve it from `/docs`.
  - `index.html`, `styles.css`, `app.js`: page, filters (region, year, championship, style, first places, search), "near me" sorting, ES/EN toggle.
  - `data/winners.json`: all data, one record per award.
  - `vendor/leaflet/`: Leaflet 1.9.4, vendored from npm (BSD-2, LICENSE included). Don't switch to a CDN.
- `scripts/validate.py`: checks `winners.json` against the rules below.
- `.claude/skills/add-winner/`: how to add a championship result.

## Data rules
- Every award needs at least one `sources` URL, and it should be the article or the organiser's page, not a search result.
- `verified` stays `false` until someone has opened a source page and confirmed the venue, place, year and championship. Search snippets don't count.
- Coordinates are approximate unless they were geocoded. `geo_precision` is `municipio` (town centre), `barrio` (neighbourhood) or `geocoded` (real address lookup).
- Don't copy photos from news articles, and don't link or hotlink them. Bar names and results are facts and can be used.
- Record the award as reported. Leave a field `null` rather than guess, for example `style` when the source doesn't say con/sin cebolla.
- Shared places (e.g. two 3rd places) are separate records with the same `place`.

## Environment limits (cloud sessions)
The egress proxy blocks page fetches, including tortilladepatatas.org and the news sites, `nominatim.openstreetmap.org` (geocoding), `cdnjs.cloudflare.com` and `tile.openstreetmap.org`. **WebSearch works**, and npm works. So:
- New entries found here come from snippets only and stay `verified: false`.
- In local browser tests the map tiles are blank. That's expected; markers, popups and the list still work.
- The environment's network settings can allow these hosts.

## Run and check
```sh
python3 scripts/validate.py            # data rules; exit 1 on errors
python3 -m http.server 8000 -d docs    # then open http://localhost:8000 (?lang=en for English)
```
For browser tests with Playwright, launch Chromium with `executablePath: '/opt/pw-browsers/chromium'`. Don't run `playwright install`.

## Background
Research notes, monetisation ideas and the championships still to collect are in `notes/research-2026-09-28.md`.
