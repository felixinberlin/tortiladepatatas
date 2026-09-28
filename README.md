# El Mapa de la Tortilla

Every award-winning tortilla de patatas in Spain on one map, in Spanish and English: winners of the national, regional and local championships, with filters for region, year, championship and style, plus "near me".

**Status: prototype.** 14 awards from 6 regions, all taken from news snippets and **not yet verified**. Pins are placed approximately, at town or neighbourhood level.

## Run
```sh
python3 scripts/validate.py
python3 -m http.server 8000 -d docs
```
Open http://localhost:8000. Add `?lang=en` for English.

It's a static site with no build step: `docs/` can be served by GitHub Pages as it is. The data lives in [`docs/data/winners.json`](docs/data/winners.json). See [CLAUDE.md](CLAUDE.md) for the data rules and [`.claude/skills/add-winner`](.claude/skills/add-winner/SKILL.md) for how to add results.

Map: [Leaflet](https://leafletjs.com) (vendored) with © OpenStreetMap contributors.
