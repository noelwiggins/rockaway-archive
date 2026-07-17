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


def _rockaway_block_filter(field="block"):
    return f"borough='4' AND {field} between '15800' and '16400'"


@api_bp.route("/permits")
def permits():
    """DOB building permits for the Rockaway peninsula (free NYC Open Data)."""
    import requests
    cache_key = "dob_permits"
    cached = _sales_cache.get(cache_key)
    if cached and (time.time() - cached["time"]) < 21600:
        return jsonify(cached["data"])
    try:
        resp = requests.get(
            "https://data.cityofnewyork.us/resource/ipu4-2q9a.json",
            params={
                "$where": "borough='QUEENS' AND block between '15800' and '16400' AND gis_latitude IS NOT NULL",
                "$select": "job__,job_type,work_type,permit_status,filing_date,issuance_date,house__,street_name,gis_latitude,gis_longitude",
                "$limit": 3000,
                "$order": "issuance_date DESC",
            },
            timeout=20,
        )
        data = resp.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 502
    out = [
        {
            "job": d.get("job__"), "type": d.get("job_type"), "work_type": d.get("work_type"),
            "status": d.get("permit_status"), "date": (d.get("issuance_date") or d.get("filing_date") or "")[:10],
            "address": f"{d.get('house__','')} {d.get('street_name','')}".strip(),
            "latitude": float(d["gis_latitude"]), "longitude": float(d["gis_longitude"]),
        }
        for d in data if d.get("gis_latitude") and d.get("gis_longitude")
    ]
    _sales_cache[cache_key] = {"time": time.time(), "data": out}
    return jsonify(out)


@api_bp.route("/violations")
def violations():
    """DOB building code violations for the Rockaway peninsula."""
    import requests
    cache_key = "dob_violations"
    cached = _sales_cache.get(cache_key)
    if cached and (time.time() - cached["time"]) < 21600:
        return jsonify(cached["data"])
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    from geocode_utils import interpolate_beach_street, neighborhood_for_beach_number, jitter
    import re
    try:
        resp = requests.get(
            "https://data.cityofnewyork.us/resource/3h2n-5cm9.json",
            params={
                "$where": "boro='4' AND block between '15800' and '16400' AND violation_category like 'V-DOB VIOLATION%'",
                "$select": "violation_number,violation_type,house_number,street,issue_date,disposition_comments",
                "$limit": 3000,
                "$order": "issue_date DESC",
            },
            timeout=20,
        )
        data = resp.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 502
    out = []
    for d in data:
        street = d.get("street", "")
        bm = re.search(r'BEACH\s+(\d+)', street.upper())
        if not bm:
            continue
        beach_num = int(bm.group(1))
        lat, lng = interpolate_beach_street(beach_num)
        dlat, dlng = jitter(d.get("violation_number", "") + street, meters=20)
        out.append({
            "number": d.get("violation_number"), "type": d.get("violation_type", "")[:60],
            "date": (d.get("issue_date") or "")[:10],
            "address": f"{d.get('house_number','')} {street}".strip(),
            "latitude": round(lat + dlat, 6), "longitude": round(lng + dlng, 6),
        })
    _sales_cache[cache_key] = {"time": time.time(), "data": out}
    return jsonify(out)


@api_bp.route("/mortgages")
def mortgages():
    """Recent mortgage recordings (ACRIS doc_type=MTGE) for Rockaway — reuses
    the same Legals/Master join pattern as /api/sales."""
    import requests, sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    from geocode_utils import interpolate_beach_street, neighborhood_for_beach_number, jitter
    import re

    cache_key = "acris_mortgages"
    cached = _sales_cache.get(cache_key)
    if cached and (time.time() - cached["time"]) < 21600:
        return jsonify(cached["data"])

    try:
        legals_resp = requests.get(
            "https://data.cityofnewyork.us/resource/8h5j-fqxa.json",
            params={
                "$where": "borough='4' AND block between '15800' and '16400' AND good_through_date > '2023-01-01'",
                "$select": "document_id,street_number,street_name",
                "$limit": 5000,
            },
            timeout=20,
        )
        legals = legals_resp.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    legals_by_id = {item["document_id"]: item for item in legals}
    doc_ids = list(legals_by_id.keys())
    out = []
    batch_size = 200
    for i in range(0, len(doc_ids), batch_size):
        batch = doc_ids[i:i + batch_size]
        quoted = ",".join(f"'{d}'" for d in batch)
        try:
            master_resp = requests.get(
                "https://data.cityofnewyork.us/resource/bnx9-e6tj.json",
                params={
                    "$where": f"document_id in({quoted}) AND doc_type='MTGE'",
                    "$select": "document_id,document_date,document_amt",
                    "$limit": batch_size,
                },
                timeout=20,
            )
            recs = master_resp.json()
        except Exception:
            continue
        for rec in recs:
            amt = float(rec.get("document_amt", 0) or 0)
            if amt < 10000:
                continue
            legal = legals_by_id.get(rec["document_id"])
            if not legal:
                continue
            street_name = legal.get("street_name", "")
            bm = re.search(r'BEACH\s+(\d+)', street_name.upper())
            if not bm:
                continue
            beach_num = int(bm.group(1))
            lat, lng = interpolate_beach_street(beach_num)
            dlat, dlng = jitter(rec["document_id"], meters=25)
            out.append({
                "address": f"{legal.get('street_number', '')} {street_name.title()}".strip(),
                "date": rec.get("document_date", "")[:10],
                "amount": int(amt),
                "neighborhood": neighborhood_for_beach_number(beach_num),
                "latitude": round(lat + dlat, 6), "longitude": round(lng + dlng, 6),
            })
    _sales_cache[cache_key] = {"time": time.time(), "data": out}
    return jsonify(out)


@api_bp.route("/pluto")
def pluto():
    """PLUTO tax-lot lookup for a clicked location — returns the nearest
    lot's characteristics (building class, year built, zoning, lot area,
    assessed value, etc.). Caches the whole Rockaway PLUTO extract once
    (a few thousand lots) and finds the nearest lot in Python, since PLUTO's
    own lat/lon field is the lot's centroid, not something worth a spatial
    DB query for this scale of data."""
    import requests
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400

    cache_key = "pluto_rockaway"
    cached = _sales_cache.get(cache_key)
    if cached and (time.time() - cached["time"]) < 86400:
        lots = cached["data"]
    else:
        try:
            resp = requests.get(
                "https://data.cityofnewyork.us/resource/64uk-42ks.json",
                params={
                    "$where": "borough='QN' AND block between '15800' and '16400' AND latitude IS NOT NULL",
                    "$select": "address,bldgclass,landuse,yearbuilt,numfloors,unitsres,unitstotal,"
                               "lotarea,bldgarea,assessland,assesstot,zonedist1,ownername,latitude,longitude",
                    "$limit": 10000,
                },
                timeout=25,
            )
            lots = resp.json()
        except Exception as e:
            return jsonify({"error": str(e)}), 502
        _sales_cache[cache_key] = {"time": time.time(), "data": lots}

    best, best_dist = None, None
    for lot in lots:
        try:
            llat, llng = float(lot["latitude"]), float(lot["longitude"])
        except (KeyError, ValueError, TypeError):
            continue
        dist = (llat - lat) ** 2 + (llng - lng) ** 2
        if best_dist is None or dist < best_dist:
            best, best_dist = lot, dist

    if best is None or best_dist > 0.0002 ** 2:  # ~roughly 20m squared-degrees threshold
        return jsonify({"error": "no lot found near that location"}), 404

    return jsonify({
        "address": best.get("address"),
        "building_class": best.get("bldgclass"),
        "land_use": best.get("landuse"),
        "year_built": best.get("yearbuilt"),
        "floors": best.get("numfloors"),
        "residential_units": best.get("unitsres"),
        "total_units": best.get("unitstotal"),
        "lot_area_sqft": best.get("lotarea"),
        "building_area_sqft": best.get("bldgarea"),
        "assessed_land": best.get("assessland"),
        "assessed_total": best.get("assesstot"),
        "zoning": best.get("zonedist1"),
        "owner": best.get("ownername"),
    })


@api_bp.route("/rolling-sales")
def rolling_sales():
    """NYC DOF's Citywide Rolling Calendar Sales — a curated property sales
    file (building class, sq ft, units, year built) distinct from the raw
    ACRIS deed records used in /api/sales."""
    import requests
    cache_key = "rolling_sales"
    cached = _sales_cache.get(cache_key)
    if cached and (time.time() - cached["time"]) < 21600:
        return jsonify(cached["data"])
    try:
        resp = requests.get(
            "https://data.cityofnewyork.us/resource/usep-8jbt.json",
            params={
                "$where": "borough='4' AND block between '15800' and '16400' AND sale_price > '10000'",
                "$select": "neighborhood,building_class_category,address,zip_code,residential_units,"
                           "total_units,land_square_feet,gross_square_feet,year_built,sale_price,sale_date",
                "$limit": 2000,
                "$order": "sale_date DESC",
            },
            timeout=20,
        )
        data = resp.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    import sys, os, re
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    from geocode_utils import interpolate_beach_street, jitter

    out = []
    for d in data:
        addr = d.get("address", "")
        bm = re.search(r'BEACH\s+(\d+)', addr.upper())
        if not bm:
            continue
        beach_num = int(bm.group(1))
        lat, lng = interpolate_beach_street(beach_num)
        dlat, dlng = jitter(addr + d.get("sale_date", ""), meters=25)
        out.append({
            "address": addr.title(),
            "neighborhood": d.get("neighborhood", "").title(),
            "building_class": d.get("building_class_category", "").strip(),
            "units": d.get("total_units"),
            "year_built": d.get("year_built"),
            "sale_price": int(float(d.get("sale_price", 0) or 0)),
            "sale_date": (d.get("sale_date") or "")[:10],
            "latitude": round(lat + dlat, 6), "longitude": round(lng + dlng, 6),
        })
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
