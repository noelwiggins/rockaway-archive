"""
Pulls every Dept of Finance tax photograph tagged "Rockaway Beach Boulevard"
(Queens), resolves each to exact coordinates via NYC's PLUTO dataset (using
the Block/Lot already shown on the search results listing), classifies each
into a neighborhood by nearest-centroid, and keeps only the ones that fall
within the site's actual scope (Rockaway Beach, Rockaway Park, Hammels,
Arverne). Items whose block/lot doesn't resolve in PLUTO (renumbered or
demolished lots) are skipped rather than guessed.
"""
import re
import time
import json
import math
import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
}

BASE = "https://nycrecords.access.preservica.com/"

ITEM_RE = re.compile(
    r'title="([^"]*)">\s*<div class="archive_image[^"]*">.*?'
    r'<img class="thumbnail" src="([^"]+)"[^>]*/>\s*</div>\s*'
    r'<div class="archive_name[^"]*">\s*<h5><a href="([^"]+)"[^>]*>([^<]*)</a></h5>\s*</div>\s*'
    r'<div class="archive_description[^"]*">\s*<p>([^<]*)</p>',
    re.DOTALL
)

# Neighborhood centroids, in and out of scope (Nominatim/OSM, July 2026)
CENTROIDS = {
    "Rockaway Beach":  (40.5845085, -73.8167900),
    "Rockaway Park":   (40.5805104, -73.8361535),
    "Hammels":         (40.5888220, -73.8111511),
    "Arverne":         (40.5934173, -73.7895462),
    "Edgemere":        (40.5963650, -73.7679050),   # out of scope
    "Belle Harbor":    (40.5768201, -73.8477383),   # out of scope
    "Neponsit":        (40.5728732, -73.8601424),   # out of scope
}
IN_SCOPE = {"Rockaway Beach", "Rockaway Park", "Hammels", "Arverne"}


def fetch_listing_page(page):
    params = {
        "s": '"Rockaway Beach Boulevard"',
        "hh_cmis_filter": [
            "oai_dc.coverage_facet/Queens (New York, N.Y.)",
            "oai_dc.creator_facet/New York (N.Y.). Department of Finance",
        ],
    }
    if page > 1:
        params["pg"] = page
    r = requests.get(BASE, params=params, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.text


def parse_listing(html):
    items = []
    for title_attr, thumb, link, title_text, desc in ITEM_RE.findall(html):
        io_id_m = re.search(r"(IO|SO)_[0-9a-f-]+", link)
        if not io_id_m:
            continue
        block_lot_m = re.search(r"Block\s+(\d+)\s+Lot\s+([\w-]+)", desc)
        items.append({
            "title": title_text.strip(),
            "thumbnail_url": thumb,
            "detail_url": link,
            "io_id": io_id_m.group(0),
            "block": block_lot_m.group(1) if block_lot_m else None,
            "lot": block_lot_m.group(2) if block_lot_m else None,
        })
    return items


def pluto_lookup(block, lot):
    try:
        r = requests.get(
            "https://data.cityofnewyork.us/resource/64uk-42ks.json",
            params={"borough": "QN", "block": block, "lot": lot},
            timeout=15,
        )
        data = r.json()
        if data:
            d = data[0]
            return {
                "address": d.get("address"),
                "lat": float(d["latitude"]) if d.get("latitude") else None,
                "lon": float(d["longitude"]) if d.get("longitude") else None,
                "zipcode": d.get("zipcode"),
            }
    except Exception:
        pass
    return None


def nearest_neighborhood(lat, lon):
    best, best_dist = None, None
    for name, (clat, clon) in CENTROIDS.items():
        d = math.hypot(lat - clat, lon - clon)
        if best_dist is None or d < best_dist:
            best, best_dist = name, d
    return best


def main():
    # Step 1: paginate all listing pages
    all_items = {}
    page = 1
    while True:
        print(f"Fetching listing page {page}...")
        html = fetch_listing_page(page)
        items = parse_listing(html)
        if not items:
            print("  no items, stopping pagination")
            break
        for it in items:
            all_items[it["io_id"]] = it
        if "total results" in html:
            total_m = re.search(r"([\d,]+)\s*total results", html)
        if len(items) < 20:
            print(f"  got {len(items)} (partial page), stopping")
            break
        page += 1
        if page > 50:
            print("  safety cap reached (50 pages)")
            break
        time.sleep(1.0)

    print(f"\nTotal listing items collected: {len(all_items)}")
    with open("seed_data/rbb_listing_raw.json", "w") as f:
        json.dump(list(all_items.values()), f, indent=2)

    # Step 2: PLUTO lookup per unique block/lot
    pluto_cache = {}
    results = []
    skipped_no_blocklot = 0
    skipped_no_pluto = 0

    items_list = list(all_items.values())
    for i, item in enumerate(items_list):
        if not item["block"] or not item["lot"]:
            skipped_no_blocklot += 1
            continue
        key = (item["block"], item["lot"])
        if key not in pluto_cache:
            pluto_cache[key] = pluto_lookup(*key)
            time.sleep(0.15)
        pluto = pluto_cache[key]
        if not pluto or pluto["lat"] is None:
            skipped_no_pluto += 1
            continue

        hood = nearest_neighborhood(pluto["lat"], pluto["lon"])
        results.append({
            "title": item["title"],
            "thumbnail_url": item["thumbnail_url"],
            "detail_url": item["detail_url"],
            "io_id": item["io_id"],
            "block": item["block"],
            "lot": item["lot"],
            "pluto_address": pluto["address"],
            "latitude": pluto["lat"],
            "longitude": pluto["lon"],
            "neighborhood": hood,
        })
        if (i + 1) % 100 == 0:
            print(f"  processed {i+1}/{len(items_list)}")

    print(f"\nResolved {len(results)} via PLUTO")
    print(f"Skipped (no block/lot in listing): {skipped_no_blocklot}")
    print(f"Skipped (block/lot not in PLUTO): {skipped_no_pluto}")

    from collections import Counter
    print("By neighborhood:", Counter(r["neighborhood"] for r in results))

    in_scope = [r for r in results if r["neighborhood"] in IN_SCOPE]
    print(f"\nIn scope (Rockaway Beach/Park/Hammels/Arverne): {len(in_scope)}")

    with open("seed_data/tax_photos_full.json", "w") as f:
        json.dump(results, f, indent=2)

    with open("seed_data/tax_photos_in_scope.json", "w") as f:
        json.dump(in_scope, f, indent=2)


if __name__ == "__main__":
    main()
