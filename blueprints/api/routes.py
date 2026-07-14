from flask import Blueprint, jsonify, request
from models import Photo

api_bp = Blueprint("api", __name__)


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
