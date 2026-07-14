"""
Curates the raw LOC search results down to items genuinely relevant to
Rockaway Beach / Rockaway Park / Hammels (plus adjacent Arverne, tagged
separately), and assigns each a neighborhood + lat/lng + a precision label
so the frontend can be honest about how approximate the pin is.

Precision levels:
  - exact_address        : geocoded from a specific street address in the record
  - street_approximate    : geocoded to a named street/landmark, not a specific address
  - neighborhood_approximate: no specific location info; placed at neighborhood centroid
                              with a small deterministic jitter so pins don't stack

Items with no usable place info, or that fall clearly outside the requested
area (Far Rockaway, Rockaway Point/Breezy Point/Fort Tilden, unrelated
subjects), are excluded entirely rather than geocoded.
"""
import json
import hashlib
import math

RAW_PATH = "seed_data/loc_raw.json"
OUT_PATH = "seed_data/photos_seed.json"

# Explicit exclusions by loc_id substring match on title (case-insensitive) —
# generic periodical volumes, unrelated collections, and out-of-scope locations.
EXCLUDE_TITLE_CONTAINS = [
    "frank leslie's illustrated newspaper",
    "harper's weekly",
    "illustrated london news",
    "the tribute book",
    "the new new york",
    "views of new york state",
    "early years, snapshots",
    "steamer mobjack, old dominion line",
    "news pictures for use in window displays",
    "joseph j. brenner collection",
    "west pond",
    "floyd bennett field",
    "fort tilden",
    "jacob riis park",
    "4 young ladies on a roof",  # actual photo location is Atlantic City
]

EXCLUDE_TITLE_STARTS_WITH = [
    "the beach, far rockaway",
    "far rockaway",
]

# Neighborhood centroids (geocoded via Nominatim/OpenStreetMap, verified July 2026)
NEIGHBORHOODS = {
    "Rockaway Beach":  (40.5845085, -73.8167900),
    "Rockaway Park":   (40.5805104, -73.8361535),
    "Hammels":         (40.5888220, -73.8111511),
    "Arverne":         (40.5934173, -73.7895462),
}

# Known landmark overrides: keyword -> (lat, lng, neighborhood, precision)
LANDMARKS = [
    ("arverne hotel",        40.5934173, -73.7895462, "Arverne", "street_approximate"),
    ("colonial hall",        40.5934173, -73.7895462, "Arverne", "street_approximate"),
    ("the boulevard, arverne", 40.5934173, -73.7895462, "Arverne", "street_approximate"),
    ("beach scene at arverne", 40.5934173, -73.7895462, "Arverne", "street_approximate"),
    ("the boardwalk, arverne", 40.5934173, -73.7895462, "Arverne", "street_approximate"),
    ("holland", 40.5888220, -73.8111511, "Hammels", "street_approximate"),  # Jamaica Bay Yacht Club at "Holland," historically part of the Hammels/Rockaway Beach bayside
    ("st. camillus", 40.5838143, -73.8206650, "Rockaway Park", "exact_address"),
    ("beach 39th st. and rockaway beach blvd", 40.5735326, -73.8540372, "Rockaway Park", "street_approximate"),
    ("39-20 rockaway beach blvd", 40.5735326, -73.8540372, "Rockaway Park", "street_approximate"),
    ("beach 40th st. at rockaway beach blvd", 40.5735326, -73.8540372, "Rockaway Park", "street_approximate"),
    ("peninsula branch library", 40.5888220, -73.8111511, "Hammels", "neighborhood_approximate"),
]


def jitter(seed_str, meters=120):
    """Deterministic small offset so overlapping neighborhood-centroid pins fan out."""
    h = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    angle = (h % 360) * (math.pi / 180)
    dist_frac = ((h // 360) % 100) / 100.0  # 0..1
    dist_deg = (dist_frac * meters) / 111_000  # rough meters->degrees
    dlat = dist_deg * math.cos(angle)
    dlng = dist_deg * math.sin(angle) / math.cos(math.radians(40.58))
    return dlat, dlng


def assign_neighborhood(item):
    text = f"{item['title']} {item['description']} {item['call_number']}".lower()

    for keyword, lat, lng, hood, precision in LANDMARKS:
        if keyword in text:
            return lat, lng, hood, precision

    if "hammels" in text:
        base = NEIGHBORHOODS["Hammels"]
        hood = "Hammels"
    elif "rockaway park" in text:
        base = NEIGHBORHOODS["Rockaway Park"]
        hood = "Rockaway Park"
    elif "arverne" in text:
        base = NEIGHBORHOODS["Arverne"]
        hood = "Arverne"
    elif "rockaway" in text:
        base = NEIGHBORHOODS["Rockaway Beach"]
        hood = "Rockaway Beach"
    else:
        return None  # shouldn't happen given query set, but just in case

    dlat, dlng = jitter(item["loc_id"])
    return base[0] + dlat, base[1] + dlng, hood, "neighborhood_approximate"


def should_exclude(item):
    title_lower = item["title"].lower()
    if any(s in title_lower for s in EXCLUDE_TITLE_CONTAINS):
        return True
    if any(title_lower.startswith(s) for s in EXCLUDE_TITLE_STARTS_WITH):
        return True
    return False


def main():
    raw = json.load(open(RAW_PATH))
    out = []
    excluded = 0

    for item in raw:
        if should_exclude(item):
            excluded += 1
            continue

        geo = assign_neighborhood(item)
        if geo is None:
            excluded += 1
            continue
        lat, lng, hood, precision = geo

        out.append({
            "title": item["title"].strip(),
            "description": item["description"].strip(),
            "display_date": item["date"] or "Undated",
            "neighborhood": hood,
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "location_precision": precision,
            "image_url": item["image_url"],
            "thumbnail_url": item["thumbnail_url"],
            "source": "Library of Congress",
            "source_url": item["source_url"],
            "call_number": item["call_number"],
        })

    print(f"Kept {len(out)} items, excluded {excluded}")
    by_hood = {}
    for item in out:
        by_hood[item["neighborhood"]] = by_hood.get(item["neighborhood"], 0) + 1
    print("By neighborhood:", by_hood)

    with open(OUT_PATH, "w") as f:
        json.dump(out, f, indent=2)


if __name__ == "__main__":
    main()
