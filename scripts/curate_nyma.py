"""
Curates NYC Municipal Archives (Preservica) results down to real Rockaway
Beach / Rockaway Park / Hammels / Arverne material, and geocodes items that
reference a specific Beach-numbered street by interpolating along the known
street grid (the Rockaway peninsula's numbered streets run in a fairly
straight, regular line, so linear interpolation between geocoded reference
points is a reasonable, honest approximation for street-level placement).

Items with no locatable street/landmark reference are left ungeocoded and
routed to the general Photos tab rather than guessing.
"""
import json
import re
import hashlib
import math

RAW_PATH = "seed_data/nyma_raw.json"
OUT_PATH = "seed_data/nyma_seed.json"

try:
    RBB_CACHE = json.load(open("seed_data/rbb_geocode_cache.json"))
except FileNotFoundError:
    RBB_CACHE = {}

FALLBACK_SENTINELS = {(40.5735326, -73.8540372), (40.5870128, -73.8118622)}

HAMMELS_CENTROID = (40.5888220, -73.8111511)


def jitter(seed_str, meters=90):
    h = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    angle = (h % 360) * (math.pi / 180)
    dist_frac = ((h // 360) % 100) / 100.0
    dist_deg = (dist_frac * meters) / 111_000
    dlat = dist_deg * math.cos(angle)
    dlng = dist_deg * math.sin(angle) / math.cos(math.radians(40.58))
    return dlat, dlng


RBB_ADDR_RE = re.compile(r"^(\d{2,6})(?:\s*[A-Za-z]?)\s+Rockaway Beach Boulevard", re.IGNORECASE)
HAMMELS_BLVD_RE = re.compile(r"^(\d{1,4})\s+Hammels Boulevard", re.IGNORECASE)

WRONG_PLACE = [
    "broad channel", "far rockaway", "floyd bennett", "fort tilden",
    "jacob riis", "breezy point", "neponsit", "howard beach",
]
NON_PHOTO = ["map of property", "assessment map", "survey map"]

# Reference points geocoded via Nominatim/OpenStreetMap, July 2026.
# (beach_street_number, lat, lng)
BEACH_REFERENCE_POINTS = sorted([
    (74, 40.5916287, -73.8023433),
    (80, 40.5889781, -73.8064259),
    (88, 40.5874732, -73.8129314),
    (92, 40.5878997, -73.8164860),
    (100, 40.5854939, -73.8221370),
    (108, 40.5823225, -73.8299508),
    (116, 40.5816059, -73.8383111),
    (126, 40.5794025, -73.8469088),
])


def interpolate_beach_street(n):
    """Linearly interpolate lat/lng for a given Beach-street number using
    the nearest bracketing reference points (or nearest single point if
    n falls outside the reference range)."""
    pts = BEACH_REFERENCE_POINTS
    if n <= pts[0][0]:
        return pts[0][1], pts[0][2]
    if n >= pts[-1][0]:
        return pts[-1][1], pts[-1][2]
    for i in range(len(pts) - 1):
        n0, lat0, lng0 = pts[i]
        n1, lat1, lng1 = pts[i + 1]
        if n0 <= n <= n1:
            frac = (n - n0) / (n1 - n0)
            return lat0 + (lat1 - lat0) * frac, lng0 + (lng1 - lng0) * frac
    return pts[0][1], pts[0][2]


def neighborhood_for_beach_number(n):
    if n <= 73:
        return "Arverne"
    if n <= 91:
        return "Hammels"
    if n <= 107:
        return "Rockaway Beach"
    if n <= 125:
        return "Rockaway Park"
    return "Other"  # Belle Harbor / Neponsit — outside requested scope


BEACH_NUM_RE = re.compile(r"beach\s+(\d{1,3})(?:st|nd|rd|th)\b", re.IGNORECASE)


def should_exclude(item):
    text = f"{item['title']} {item.get('description','')}".lower()
    if any(w in text for w in WRONG_PLACE):
        return True
    if any(w in text for w in NON_PHOTO):
        return True
    return False


def process(item):
    text = item["title"]

    rbb_match = RBB_ADDR_RE.match(text.strip())
    if rbb_match:
        raw_num = rbb_match.group(1)
        if len(raw_num) <= 2:
            hyphenated = raw_num
            block_num = int(raw_num)
        else:
            hyphenated = raw_num[:-2] + "-" + raw_num[-2:]
            block_num = int(raw_num[:-2])
        cached = RBB_CACHE.get(hyphenated)
        if cached and (round(cached["lat"], 7), round(cached["lon"], 7)) not in FALLBACK_SENTINELS:
            dn = cached["display_name"]
            if "Belle Harbor" in dn or "Neponsit" in dn:
                return None
            hood = neighborhood_for_beach_number(block_num)
            if hood == "Other":
                return None
            return cached["lat"], cached["lon"], hood, "exact_address"
        else:
            hood = neighborhood_for_beach_number(block_num)
            if hood == "Other":
                return None
            lat, lng = interpolate_beach_street(block_num)
            return lat, lng, hood, "street_approximate"

    hammels_match = HAMMELS_BLVD_RE.match(text.strip())
    if hammels_match:
        dlat, dlng = jitter(item.get("identifier", text))
        return HAMMELS_CENTROID[0] + dlat, HAMMELS_CENTROID[1] + dlng, "Hammels", "street_approximate"

    match = BEACH_NUM_RE.search(text)

    if match:
        n = int(match.group(1))
        lat, lng = interpolate_beach_street(n)
        hood = neighborhood_for_beach_number(n)
        if hood == "Other":
            return None  # outside Rockaway Beach/Park/Hammels/Arverne scope
        precision = "exact_address" if "feet" in text.lower() else "street_approximate"
        return lat, lng, hood, precision

    # No street number — fall back to a soft neighborhood match, but only
    # for the more specific searches (hammels / arverne), since the broad
    # "rockaway beach" / "rockaway park queens" queries are too wide to
    # trust without a concrete reference.
    query = item.get("matched_query", "")
    if query in ("hammels", "arverne"):
        return None, None, query.title(), None  # neighborhood known, but no coords — still tag it

    return None, None, None, None


def main():
    raw = json.load(open(RAW_PATH))
    out = []
    excluded = 0
    geocoded = 0
    tagged_only = 0
    ungeocoded = 0

    for item in raw:
        if should_exclude(item):
            excluded += 1
            continue

        result = process(item)
        if result is None:
            excluded += 1
            continue
        lat, lng, hood, precision = result

        if lat is not None:
            geocoded += 1
        elif hood is not None:
            tagged_only += 1
        else:
            ungeocoded += 1

        location_note = None
        if precision == "street_approximate":
            location_note = "Approximate location — interpolated from the named Beach street along the boardwalk grid."
        elif precision == "exact_address":
            location_note = "Located from a specific surveyed measurement in the original record."

        out.append({
            "title": item["title"].strip(),
            "description": item.get("description", "").strip(),
            "display_date": "Undated",  # NYMA listing pages don't expose date without an item-page fetch
            "neighborhood": hood or "Other",
            "latitude": round(lat, 6) if lat is not None else None,
            "longitude": round(lng, 6) if lng is not None else None,
            "location_precision": precision,
            "location_note": location_note,
            "image_url": item["thumbnail_url"].split("?")[0].replace("/download/thumbnail/", "/download/file/") if item["thumbnail_url"] else None,
            "thumbnail_url": item["thumbnail_url"],
            "source": "NYC Municipal Archives",
            "source_url": item["item_url"],
            "call_number": item["identifier"],
        })

    print(f"Kept {len(out)}, excluded {excluded}")
    print(f"  geocoded (lat/lng): {geocoded}")
    print(f"  neighborhood-tagged only (no coords): {tagged_only}")
    print(f"  fully ungeocoded: {ungeocoded}")

    with open(OUT_PATH, "w") as f:
        json.dump(out, f, indent=2)


if __name__ == "__main__":
    main()
