import json
import time
import math
import requests
from collections import Counter

CENTROIDS = {
    "Rockaway Beach":  (40.5845085, -73.8167900),
    "Rockaway Park":   (40.5805104, -73.8361535),
    "Hammels":         (40.5888220, -73.8111511),
    "Arverne":         (40.5934173, -73.7895462),
    "Edgemere":        (40.5963650, -73.7679050),
    "Belle Harbor":    (40.5768201, -73.8477383),
    "Neponsit":        (40.5728732, -73.8601424),
}
IN_SCOPE = {"Rockaway Beach", "Rockaway Park", "Hammels", "Arverne"}


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
    all_items = json.load(open("seed_data/rbb_listing_raw.json"))
    print(f"Loaded {len(all_items)} items from listing")

    pluto_cache = {}
    results = []
    skipped_no_blocklot = 0
    skipped_no_pluto = 0

    for i, item in enumerate(all_items):
        if not item["block"] or not item["lot"]:
            skipped_no_blocklot += 1
            continue
        key = (item["block"], item["lot"])
        if key not in pluto_cache:
            pluto_cache[key] = pluto_lookup(*key)
            time.sleep(0.1)
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
            print(f"  processed {i+1}/{len(all_items)}, {len(results)} resolved so far")
            with open("seed_data/tax_photos_full.json", "w") as f:
                json.dump(results, f, indent=2)

    print(f"\nResolved {len(results)} via PLUTO")
    print(f"Skipped (no block/lot in listing): {skipped_no_blocklot}")
    print(f"Skipped (block/lot not in PLUTO): {skipped_no_pluto}")
    print("By neighborhood:", Counter(r["neighborhood"] for r in results))

    in_scope = [r for r in results if r["neighborhood"] in IN_SCOPE]
    print(f"\nIn scope (Rockaway Beach/Park/Hammels/Arverne): {len(in_scope)}")

    with open("seed_data/tax_photos_full.json", "w") as f:
        json.dump(results, f, indent=2)
    with open("seed_data/tax_photos_in_scope.json", "w") as f:
        json.dump(in_scope, f, indent=2)


if __name__ == "__main__":
    main()
