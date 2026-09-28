#!/usr/bin/env python3
"""Check docs/data/winners.json against the data rules in CLAUDE.md.

Usage: python3 scripts/validate.py [path]   (exit code 1 on any error)
"""
import json
import re
import sys
from pathlib import Path

DEFAULT = Path(__file__).resolve().parent.parent / "docs" / "data" / "winners.json"

REQUIRED = {
    "id": str, "venue": str, "city": str, "region": str,
    "lat": (int, float), "lng": (int, float), "geo_precision": str,
    "championship": str, "scope": str, "year": int, "place": int,
    "category": str, "verified": bool, "sources": list,
}
OPTIONAL = {"area", "address", "edition", "style", "chef", "notes"}
GEO_PRECISION = {"geocoded", "barrio", "municipio"}
SCOPES = {"national", "regional", "local"}
STYLES = {None, "con cebolla", "sin cebolla"}
IMAGE_RE = re.compile(r"\.(jpe?g|png|gif|webp|avif)(\?|$)", re.I)


def validate(data):
    errors = []
    awards = data.get("awards")
    if not isinstance(awards, list) or not awards:
        return ["top level: 'awards' must be a non-empty list"]
    seen = set()
    for i, a in enumerate(awards):
        where = f"awards[{i}] ({a.get('id', '?')})"
        for key, typ in REQUIRED.items():
            if key not in a:
                errors.append(f"{where}: missing '{key}'")
            elif not isinstance(a[key], typ) or (typ is int and isinstance(a[key], bool)):
                errors.append(f"{where}: '{key}' has wrong type")
        for key in a:
            if key not in REQUIRED and key not in OPTIONAL:
                errors.append(f"{where}: unknown field '{key}'")
        if a.get("id") in seen:
            errors.append(f"{where}: duplicate id")
        seen.add(a.get("id"))
        if a.get("id") and not re.fullmatch(r"[a-z0-9-]+", a["id"]):
            errors.append(f"{where}: id must be lowercase slug")
        srcs = a.get("sources") or []
        if not srcs:
            errors.append(f"{where}: needs at least one source")
        for u in srcs:
            if not isinstance(u, str) or not re.match(r"https?://", u):
                errors.append(f"{where}: bad source URL {u!r}")
        for k, v in a.items():
            if isinstance(v, str) and IMAGE_RE.search(v):
                errors.append(f"{where}: '{k}' points to an image; don't copy news photos")
        if a.get("geo_precision") not in GEO_PRECISION:
            errors.append(f"{where}: geo_precision must be one of {sorted(GEO_PRECISION)}")
        if a.get("scope") not in SCOPES:
            errors.append(f"{where}: scope must be one of {sorted(SCOPES)}")
        if a.get("style") not in STYLES:
            errors.append(f"{where}: style must be null, 'con cebolla' or 'sin cebolla'")
        lat, lng = a.get("lat"), a.get("lng")
        # Spain incl. Canary Islands.
        if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
            if not (27.0 <= lat <= 44.5 and -18.5 <= lng <= 4.5):
                errors.append(f"{where}: coordinates outside Spain")
        if isinstance(a.get("place"), int) and a["place"] < 1:
            errors.append(f"{where}: place must be >= 1")
        if isinstance(a.get("year"), int) and not (1990 <= a["year"] <= 2100):
            errors.append(f"{where}: implausible year")
    return errors


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    data = json.loads(path.read_text(encoding="utf-8"))
    errors = validate(data)
    for e in errors:
        print("ERROR", e)
    awards = data.get("awards") or []
    unverified = sum(1 for a in awards if not a.get("verified"))
    print(f"{len(awards)} awards, {unverified} unverified, {len(errors)} errors")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
