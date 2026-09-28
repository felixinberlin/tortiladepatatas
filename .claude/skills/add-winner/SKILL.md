---
name: add-winner
description: Add tortilla championship results (winners, places, categories) to docs/data/winners.json with their sources, following the project's data rules. Use when the user names a championship, a bar that won, or asks to harvest or update results.
---

# Add a championship result

1. **Find the result.** Search for the championship name, edition and year, plus "ganador". Prefer the organiser's page or a local newspaper. Note every place (1st, 2nd, shared 3rd) and category (tradicional, originalidad, premio del público…).
2. **Check for duplicates.** Search `winners.json` for the venue and year. The same venue can hold several awards, one record each.
3. **Try to open a source page.** If you can open it and it confirms venue, place, year and championship, set `verified: true`. If you only have search snippets (the cloud proxy blocks page fetches), set `verified: false`.
4. **Place it.** Use an address from a source if there is one. Without geocoding, set `lat`/`lng` to the neighbourhood (`barrio`) or town centre (`municipio`), and use `geocoded` only for a real address lookup. Stay inside Spain.
5. **Write the record** into `awards` using the schema below.
6. **Validate:** `python3 scripts/validate.py` must print 0 errors.
7. **Look at it:** `python3 -m http.server 8000 -d docs`, then check that the pin and card show up and the filters list the new championship.
8. **Track it:** if the result closes a gap listed in `notes/research-2026-09-28.md`, update that list.

## Schema (one object per award)
```json
{
  "id": "venue-slug-2026-xx",          // lowercase slug, unique; xx = short region code
  "venue": "Sagartoki",
  "city": "Vitoria-Gasteiz",
  "area": null,                          // neighbourhood or province, optional
  "region": "País Vasco",                // comunidad autónoma, Spanish name
  "address": "Calle Prado, 18, 01005 Vitoria-Gasteiz",   // or null
  "lat": 42.8455, "lng": -2.6745,
  "geo_precision": "barrio",             // municipio | barrio | geocoded
  "championship": "Campeonato de Euskadi de Tortilla de Patata",  // same string for every edition
  "edition": "III",                      // roman numeral / sponsor, or null
  "scope": "regional",                   // national | regional | local
  "year": 2026,
  "place": 1,
  "category": "tradicional",             // as the contest names it, in Spanish
  "style": null,                         // "con cebolla" | "sin cebolla" | null if unknown
  "chef": "Senén González",              // or null
  "notes": "Final held 10 March 2026.",   // English, short, or null
  "verified": false,
  "sources": ["https://…"]               // at least one, article or organiser page
}
```
If you add a new `category` value, add its English label to `I18N.en.categories` in `docs/app.js`.

## Don't
- Copy or link photos from articles.
- Guess a style, place or chef that the source doesn't state.
- Set `verified: true` from a snippet.
