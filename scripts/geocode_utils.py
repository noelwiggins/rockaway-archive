"""
Shared geocoding helpers for NYC Municipal Archives material.

interpolate_beach_street() places a Beach-numbered street address by linear
interpolation between real Nominatim-geocoded reference points (see
seed_data/beach_street_reference_points.json) — the Rockaway peninsula's
numbered streets run in a fairly regular line, so this is an honest,
disclosed approximation for street-level placement, not a guess.

neighborhood_for_beach_number() uses the boundary definitions from the
Rockaway, Queens neighborhood breakdown (Far Rockaway to Beach 32, Edgemere
32-56, Arverne 56-77, Hammels ~74-91, Rockaway Beach ~91-108, Rockaway Park
108-126, Belle Harbor/Neponsit beyond that).
"""
import json
import hashlib
import math

with open("seed_data/beach_street_reference_points.json") as f:
    _raw_points = json.load(f)

BEACH_REFERENCE_POINTS = sorted(
    (int(k), v[0], v[1]) for k, v in _raw_points.items()
)


def interpolate_beach_street(n):
    pts = BEACH_REFERENCE_POINTS
    if n <= pts[0][0]:
        # Extrapolate using the slope of the first two reference points,
        # rather than clamping — clamping collapses every out-of-range
        # sheet onto the exact same coordinate.
        n0, lat0, lng0 = pts[0]
        n1, lat1, lng1 = pts[1]
        frac = (n - n0) / (n1 - n0)
        return lat0 + (lat1 - lat0) * frac, lng0 + (lng1 - lng0) * frac
    if n >= pts[-1][0]:
        n0, lat0, lng0 = pts[-2]
        n1, lat1, lng1 = pts[-1]
        frac = (n - n0) / (n1 - n0)
        return lat0 + (lat1 - lat0) * frac, lng0 + (lng1 - lng0) * frac
    for i in range(len(pts) - 1):
        n0, lat0, lng0 = pts[i]
        n1, lat1, lng1 = pts[i + 1]
        if n0 <= n <= n1:
            frac = (n - n0) / (n1 - n0)
            return lat0 + (lat1 - lat0) * frac, lng0 + (lng1 - lng0) * frac
    return pts[0][1], pts[0][2]


def neighborhood_for_beach_number(n):
    if n < 32:
        return "Far Rockaway"
    if n < 56:
        return "Edgemere"
    if n < 74:
        return "Arverne"
    if n <= 91:
        return "Hammels"
    if n <= 107:
        return "Rockaway Beach"
    if n <= 125:
        return "Rockaway Park"
    return "Belle Harbor / Neponsit"


def jitter(seed_str, meters=70):
    h = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    angle = (h % 360) * (math.pi / 180)
    dist_frac = ((h // 360) % 100) / 100.0
    dist_deg = (dist_frac * meters) / 111_000
    dlat = dist_deg * math.cos(angle)
    dlng = dist_deg * math.sin(angle) / math.cos(math.radians(40.58))
    return dlat, dlng
