# Rockaway & Hammels Archive

An archival photo site for the Rockaway Beach, Rockaway Park, and Hammels sections of the Rockaway peninsula, Queens, NY (plus adjacent Arverne, where the history overlaps). Photos with a known or reasonably inferable location are pinned on an interactive map; everything else lives in a searchable general Photos tab.

## Stack

Flask + SQLAlchemy + PostgreSQL, deployed on Railway. Leaflet + CARTO dark tiles for the map, with marker clustering.

## Structure

- `app.py` — application factory, CLI (`flask seed`), and auto-seed-on-first-boot logic. Routes live in `blueprints/`, not here.
- `blueprints/main/` — page routes (map, gallery, detail, add/edit, login)
- `blueprints/api/` — JSON endpoints (`/api/photos`, `/api/stats`)
- `models.py` — the `Photo` model
- `templates/`, `static/` — Jinja templates and CSS/JS
- `seed_data/photos_seed.json` — 49 Library of Congress items
- `seed_data/hammels_seed.json` — 18 NYC Municipal Archives items (Hammels Boulevard specifically)
- `seed_data/parks_dept_full.json` — 31 dated 1941 NYC Parks Dept survey photos, **not yet included in the live seed** — geographically these fall in Far Rockaway/Edgemere/Arverne, outside the three requested neighborhoods, pending a decision on whether to include them as adjacent history
- `scripts/` — the sourcing/geocoding pipeline (see below)

## Adding photos

1. **Through the site** — sign in with the admin PIN (`ADMIN_PIN` env var, currently `8116`) and use "+ Add". Paste a direct image URL; if you know coordinates, add them, otherwise leave blank and it goes to the general Photos tab.
2. **Bulk seed** — add entries to a JSON file shaped like `seed_data/photos_seed.json` and run `flask seed --file yourfile.json`. Duplicate detection is by title + source URL.

## How the initial 67 photos were sourced

- **Library of Congress** (`scripts/fetch_loc_photos.py`, `fetch_loc_photos_2.py`, `curate_and_geocode.py`) — the loc.gov JSON API, no key required. Mostly early-1900s photomechanical postcard prints. LOC rarely records a precise address for these, so most are placed at a neighborhood centroid with a small deterministic jitter (so pins don't stack), disclosed on each photo's detail page.
- **NYC Municipal Archives** (nycrecords.access.preservica.com) — searched directly; a targeted "Hammels" query surfaced 18 genuine Hammels Boulevard tax photographs and street views (1926–1940s) with real block/lot numbers, geocoded to the street.

Every photo's `location_precision` field (`exact_address` / `street_approximate` / `neighborhood_approximate`) is surfaced in the UI so it's clear how much to trust a given pin.

## Local development

```
pip install -r requirements.txt --break-system-packages
export FLASK_APP=app.py
flask seed --file seed_data/photos_seed.json
flask seed --file seed_data/hammels_seed.json
python3 app.py       # http://localhost:5000
```

## Deployment

Railway project `rockaway-archive`, services `web` (this app) and `Postgres`. `DATABASE_URL`, `SECRET_KEY`, and `ADMIN_PIN` are set as environment variables on `web`. The app auto-seeds from the bundled JSON files on first boot against an empty database — no manual seed step needed after deploy.

## © Noel Wiggins
