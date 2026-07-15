"""
Fixes the tax-photo title/geocoding bug: many records were titled with a
generic "<number> Rockaway Beach Boulevard" placeholder that doesn't match
the real address on file, and were geocoded from that fake title rather
than the real address. This script:

  1. Deletes records whose real address is genuinely outside the Rockaway
     peninsula (the original block/lot scraping bug pulled in unrelated
     Astoria/LIC tax photos).
  2. Rebuilds title + coordinates from the real "Address on file" for
     everything else, using the correct source of truth per category.
"""
import re
import sys

sys.path.insert(0, "scripts")
from geocode_utils import interpolate_beach_street, neighborhood_for_beach_number, jitter

ROCKAWAY_KEYWORDS = ['EDGEMERE', 'BEACH CHANNEL', 'CROSS BAY', 'SHORE FRONT', 'SEAGIRT',
                     'HOLLAND AVE', 'ROCKAWAY POINT', 'NEPONSIT']

NAMED_STREET_GEOCODES = {
    'SHORE FRONT PARKWAY': (40.5810192, -73.8255065, 'Rockaway Park'),
    'CROSS BAY PARKWAY':   (40.5839049, -73.8160405, 'Rockaway Beach'),
    'BEACH CHANNEL DRIVE': (40.5761132, -73.8623711, 'Belle Harbor / Neponsit'),
    'EDGEMERE AVENUE':     (40.5926875, -73.7771059, 'Edgemere'),
    'HOLLAND AVENUE':      (40.5888220, -73.8111511, 'Hammels'),  # historic Holland Station area; no modern OSM match
}

# block -> beach-street-number regression, fit from 13 confirmed pairs
BLOCK_SLOPE, BLOCK_INTERCEPT = 0.19931307165669349, -3113.5664064165067


def classify_and_fix(photo):
    """Returns 'delete', or a dict of fields to update, or None if no address found."""
    desc = photo.description or ""
    m = re.search(r'Address on file: (.+?)\.?$', desc)
    addr = m.group(1).strip() if m else None

    block_m = re.search(r'Block (\d+) Lot (\d+)', desc)
    block = int(block_m.group(1)) if block_m else None
    lot = int(block_m.group(2)) if block_m else None

    if not addr:
        return None

    addr_u = addr.upper()

    # Case 1: explicit "Beach NNN Street"
    beach_m = re.search(r'BEACH\s+(\d+)\s*(?:STREET|ST)\b', addr_u)
    if beach_m:
        n = int(beach_m.group(1))
        return _beach_result(photo, n, addr, block, lot, precision="street_approximate")

    # Case 2: Rockaway Beach Blvd/Drive with a house number
    if 'ROCKAWAY BEACH' in addr_u:
        num_m = re.search(r'(\d{2,3})[\-\s]?\d{0,2}', addr)
        if num_m:
            n = int(num_m.group(1))
            return _beach_result(photo, n, addr, block, lot, precision="street_approximate")
        elif block:
            # no house number at all — estimate from block via regression
            n = round(BLOCK_SLOPE * block + BLOCK_INTERCEPT)
            n = max(1, min(149, n))
            return _beach_result(photo, n, addr, block, lot, precision="neighborhood_approximate",
                                  note_extra=" (no house number on file; position estimated from tax block number)")
        return None

    # Case 3: known named Rockaway-area street
    if any(k in addr_u for k in ROCKAWAY_KEYWORDS):
        for key, (lat, lng, hood) in NAMED_STREET_GEOCODES.items():
            if key in addr_u:
                dlat, dlng = jitter(f"{photo.id}-{addr}", meters=50)
                return {
                    "title": addr.title(),
                    "neighborhood": hood,
                    "latitude": round(lat + dlat, 6),
                    "longitude": round(lng + dlng, 6),
                    "location_precision": "street_approximate" if key != "HOLLAND AVE" else "neighborhood_approximate",
                    "location_note": f"Approximate — geocoded from the street name ({addr.title()}), not a specific address."
                                      + (" Modern street name/location uncertain; placed at the historic Hammels/Holland Station area." if key == "HOLLAND AVE" else ""),
                }
        return None

    # Not a recognized Rockaway-area street — out of scope
    return "delete"


def _beach_result(photo, beach_num, real_addr, block, lot, precision, note_extra=""):
    hood = neighborhood_for_beach_number(beach_num)
    lat, lng = interpolate_beach_street(beach_num)
    dlat, dlng = jitter(f"{photo.id}-{block}-{lot}", meters=30)
    return {
        "title": real_addr.title(),
        "neighborhood": hood,
        "latitude": round(lat + dlat, 6),
        "longitude": round(lng + dlng, 6),
        "location_precision": precision,
        "location_note": (f"Approximate location — interpolated along the Beach-street grid "
                           f"from the real address on file ({real_addr.title()})." + note_extra),
    }
