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
