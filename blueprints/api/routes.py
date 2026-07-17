import time
from flask import Blueprint, jsonify, request
from models import Photo

api_bp = Blueprint("api", __name__)
_sales_cache = {}


@api_bp.route("/conditions")
def conditions():
    """Combined current-conditions snapshot for the Rockaway area — air
    quality (EPA AirNow), weather (NOAA/NWS), and wave height (NOAA NDBC
    buoy 44065, NY Harbor Entrance, the nearest offshore buoy). All three
    are single regional readings rather than something that varies across
    the peninsula, so they're bundled as one snapshot rather than three
    separate map layers."""
    import requests

    cache_key = "current_conditions"
    cached = _sales_cache.get(cache_key)
    if cached and (time.time() - cached["time"]) < 1800:  # 30 min cache
        return jsonify(cached["data"])

    out = {"air_quality": None, "weather": None, "wave_height": None}

    # Air quality
    try:
        aq_resp = requests.get(
            "https://www.airnowapi.org/aq/observation/latLong/current/",
            params={
                "format": "application/json",
                "latitude": 40.5845,
                "longitude": -73.8168,
                "distance": 25,
                "API_KEY": "8CA5CA4F-75DD-4056-8AEF-30028688E74D",
            },
            timeout=15,
        )
        aq_data = aq_resp.json()
        out["air_quality"] = [
            {"parameter": p["ParameterName"], "aqi": p["AQI"], "category": p["Category"]["Name"]}
            for p in aq_data
        ]
    except Exception:
        pass

    # Weather
    try:
        headers = {"User-Agent": "RockawayArchive research@harmonyball.com"}
        forecast_resp = requests.get(
            "https://api.weather.gov/gridpoints/OKX/41,37/forecast", headers=headers, timeout=15
        )
        period = forecast_resp.json()["properties"]["periods"][0]
        out["weather"] = {
            "temperature": period["temperature"],
            "unit": period["temperatureUnit"],
            "short_forecast": period["shortForecast"],
            "wind": period["windSpeed"] + " " + period["windDirection"],
        }
    except Exception:
        pass

    # Wave height (NDBC buoy 44065)
    try:
        buoy_resp = requests.get("https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt", timeout=15)
        lines = buoy_resp.text.splitlines()
        header = lines[0].lstrip("#").split()
        wvht_idx = header.index("WVHT")
        for line in lines[2:]:
            if line.startswith("44065"):
                fields = line.split()
                wvht = fields[wvht_idx] if len(fields) > wvht_idx else "MM"
                out["wave_height"] = {
                    "feet": None if wvht == "MM" else round(float(wvht) * 3.28084, 1),
                    "station": "NY Harbor Entrance buoy (44065)",
                }
                break
    except Exception:
        pass

    _sales_cache[cache_key] = {"time": time.time(), "data": out}
    return jsonify(out)


@api_bp.route("/noise")
def noise():
    """Recent noise complaints from NYC's 311 system for the Rockaway zip
    codes — a real, free proxy for neighborhood noise patterns (not literal
    decibel readings, but genuine complaint locations/types/dates)."""
    import requests

    cache_key = "noise_complaints"
    cached = _sales_cache.get(cache_key)
    if cached and (time.time() - cached["time"]) < 21600:
        return jsonify(cached["data"])

    try:
        resp = requests.get(
            "https://data.cityofnewyork.us/resource/erm2-nwe9.json",
            params={
                "$where": (
                    "incident_zip in('11693','11694','11691','11692') "
                    "AND complaint_type in('Noise - Residential','Noise - Street/Sidewalk',"
                    "'Noise - Vehicle','Noise - Commercial','Noise') "
                    "AND created_date > '2025-01-01' AND latitude IS NOT NULL"
                ),
                "$select": "complaint_type,latitude,longitude,created_date",
                "$limit": 5000,
            },
            timeout=20,
        )
        complaints = resp.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    out = [
        {
            "type": c["complaint_type"],
            "date": c["created_date"][:10],
            "latitude": float(c["latitude"]),
            "longitude": float(c["longitude"]),
        }
        for c in complaints
    ]
    _sales_cache[cache_key] = {"time": time.time(), "data": out}
    return jsonify(out)


@api_bp.route("/sales")
def sales():
    """Recent Rockaway-area property sales from NYC's ACRIS system (free,
    public, no key required — same Socrata platform as PLUTO). Joins the
    Legals table (address/BBL) against the Master table (doc_type=DEED,
    sale price, date) for the Rockaway peninsula's block range, then
    geocodes each by parsing the Beach-street number from the address
    where present."""
    import requests
    import re
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    from geocode_utils import interpolate_beach_street, neighborhood_for_beach_number, jitter

    cache_key = "acris_sales"
    cached = _sales_cache.get(cache_key)
    if cached and (time.time() - cached["time"]) < 21600:  # 6 hour cache
        return jsonify(cached["data"])

    try:
        legals_resp = requests.get(
            "https://data.cityofnewyork.us/resource/8h5j-fqxa.json",
            params={
                "$where": "borough='4' AND block between '15800' and '16400' AND good_through_date > '2022-01-01'",
                "$select": "document_id,block,lot,street_number,street_name",
                "$limit": 5000,
            },
            timeout=20,
        )
        legals = legals_resp.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    doc_ids = [item["document_id"] for item in legals]
    legals_by_id = {item["document_id"]: item for item in legals}

    sales_out = []
    batch_size = 200
    for i in range(0, len(doc_ids), batch_size):
        batch = doc_ids[i:i + batch_size]
        quoted = ",".join(f"'{d}'" for d in batch)
        try:
            master_resp = requests.get(
                "https://data.cityofnewyork.us/resource/bnx9-e6tj.json",
                params={
                    "$where": f"document_id in({quoted}) AND doc_type='DEED'",
                    "$select": "document_id,document_date,document_amt",
                    "$limit": batch_size,
                },
                timeout=20,
            )
            deeds = master_resp.json()
        except Exception:
            continue

        for deed in deeds:
            amt = float(deed.get("document_amt", 0) or 0)
            if amt < 10000:
                continue  # skip $0/$1 non-arms-length transfers
            legal = legals_by_id.get(deed["document_id"])
            if not legal:
                continue
            street_name = legal.get("street_name", "")
            bm = re.search(r'BEACH\s+(\d+)', street_name.upper())
            if not bm:
                continue
            beach_num = int(bm.group(1))
            lat, lng = interpolate_beach_street(beach_num)
            dlat, dlng = jitter(deed["document_id"], meters=25)
            sales_out.append({
                "address": f"{legal.get('street_number', '')} {street_name.title()}".strip(),
                "sale_date": deed.get("document_date", "")[:10],
                "sale_price": int(amt),
                "neighborhood": neighborhood_for_beach_number(beach_num),
                "latitude": round(lat + dlat, 6),
                "longitude": round(lng + dlng, 6),
            })

    _sales_cache[cache_key] = {"time": time.time(), "data": sales_out}
    return jsonify(sales_out)


@api_bp.route("/photos")
def photos():
    neighborhood = request.args.get("neighborhood", "")
    query = Photo.query.filter(Photo.latitude.isnot(None), Photo.longitude.isnot(None))
    if neighborhood:
        query = query.filter_by(neighborhood=neighborhood)
    return jsonify([p.to_dict() for p in query.all()])


@api_bp.route("/photos/grouped")
def photos_grouped():
    """Groups nearby photos into a single map location, OldNYC-style, so one
    dot can represent several photos. Grouping precision depends on how
    precise each photo's own geocoding is: exact addresses cluster tightly
    (~11m grid), approximate ones cluster more loosely (~110m grid) so
    photos placed along the same street segment share a dot."""
    neighborhood = request.args.get("neighborhood", "")
    query = Photo.query.filter(Photo.latitude.isnot(None), Photo.longitude.isnot(None))
    if neighborhood:
        query = query.filter_by(neighborhood=neighborhood)

    groups = {}
    for p in query.all():
        decimals = 4 if p.location_precision == "exact_address" else 3
        key = (round(p.latitude, decimals), round(p.longitude, decimals))
        if key not in groups:
            groups[key] = {
                "lat": p.latitude,
                "lng": p.longitude,
                "neighborhood": p.neighborhood,
                "photos": [],
            }
        groups[key]["photos"].append(p.to_dict())

    result = []
    for (lat, lng), g in groups.items():
        # use the first photo's exact coordinates as the dot's position
        result.append({
            "lat": g["photos"][0]["latitude"],
            "lng": g["photos"][0]["longitude"],
            "neighborhood": g["neighborhood"],
            "count": len(g["photos"]),
            "photos": g["photos"],
        })

    return jsonify(result)


@api_bp.route("/stats")
def stats():
    total = Photo.query.count()
    geocoded = Photo.query.filter(Photo.latitude.isnot(None)).count()
    by_hood = {}
    for p in Photo.query.all():
        by_hood[p.neighborhood] = by_hood.get(p.neighborhood, 0) + 1
    return jsonify({
        "total": total,
        "geocoded": geocoded,
        "ungeocoded": total - geocoded,
        "by_neighborhood": by_hood,
    })
