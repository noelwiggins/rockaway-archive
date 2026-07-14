import json, hashlib, math

data = json.load(open("seed_data/parks_dept_full.json"))

BEACH_REFERENCE_POINTS = sorted([
    (9, 40.6013, -73.7534),
    (19, 40.5988, -73.7658),
    (28, 40.5967, -73.7768),
    (53, 40.5934173, -73.7895462),
    (54, 40.5934173, -73.7895462),
    (60, 40.5916287, -73.8023433),
    (69, 40.5893, -73.8080),
    (70, 40.5891, -73.8086),
    (71, 40.5889, -73.8092),
])

def interpolate(n):
    pts = BEACH_REFERENCE_POINTS
    if n <= pts[0][0]:
        return pts[0][1], pts[0][2]
    if n >= pts[-1][0]:
        return pts[-1][1], pts[-1][2]
    for i in range(len(pts)-1):
        n0, lat0, lng0 = pts[i]
        n1, lat1, lng1 = pts[i+1]
        if n0 <= n <= n1:
            frac = (n - n0)/(n1 - n0) if n1 != n0 else 0
            return lat0 + (lat1-lat0)*frac, lng0 + (lng1-lng0)*frac
    return pts[0][1], pts[0][2]

def neighborhood_for(n):
    if n <= 32:
        return "Far Rockaway"
    if n <= 56:
        return "Edgemere"
    if n <= 77:
        return "Arverne"
    if n <= 91:
        return "Hammels"
    if n <= 107:
        return "Rockaway Beach"
    return "Rockaway Park"

import re
BEACH_NUM_RE = re.compile(r"B-?(\d{1,3})\b|(\d{1,3})(?:st|nd|rd|th)\s+Street", re.IGNORECASE)

def jitter(seed_str, meters=50):
    h = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    angle = (h % 360) * (math.pi/180)
    dist_frac = ((h//360) % 100)/100.0
    dist_deg = (dist_frac*meters)/111000
    dlat = dist_deg*math.cos(angle)
    dlng = dist_deg*math.sin(angle)/math.cos(math.radians(40.58))
    return dlat, dlng

out = []
excluded = []
for item in data:
    title = item["title"]
    if "jacob riis park" in title.lower():
        excluded.append(title)
        continue

    nums = []
    for m in BEACH_NUM_RE.finditer(title):
        n = m.group(1) or m.group(2)
        if n:
            nums.append(int(n))

    if not nums:
        # panoramic/no street number (Cross Bay Bridge, Rockaway Parkway, beach channel drive)
        out.append({
            "title": title,
            "description": "1941 NYC Parks Department survey photograph. " + (item.get("description") or ""),
            "display_date": item["date"][:4] if item["date"] else "1941",
            "neighborhood": "Other",
            "latitude": None,
            "longitude": None,
            "location_precision": None,
            "location_note": None,
            "image_url": item["image_url"],
            "thumbnail_url": item["thumbnail_url"],
            "source": "NYC Municipal Archives",
            "source_url": item["detail_url"],
            "call_number": item["identifier"],
        })
        continue

    n = nums[0]
    lat, lng = interpolate(n)
    hood = neighborhood_for(n)
    dlat, dlng = jitter(item["io_id"])

    out.append({
        "title": title,
        "description": "1941 NYC Parks Department 'existing conditions' survey photograph, part of a boardwalk/Shore Front Parkway documentation series.",
        "display_date": item["date"][:4] if item["date"] else "1941",
        "neighborhood": hood,
        "latitude": round(lat + dlat, 6),
        "longitude": round(lng + dlng, 6),
        "location_precision": "street_approximate",
        "location_note": f"Approximate location — interpolated along the Beach-street grid near Beach {n}th Street.",
        "image_url": item["image_url"],
        "thumbnail_url": item["thumbnail_url"],
        "source": "NYC Municipal Archives",
        "source_url": item["detail_url"],
        "call_number": item["identifier"],
    })

json.dump(out, open("seed_data/parks_dept_seed.json", "w"), indent=2)
print(f"{len(out)} parks dept entries ready, excluded: {excluded}")
from collections import Counter
print(Counter(o["neighborhood"] for o in out))
