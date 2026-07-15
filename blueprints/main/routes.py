from flask import (
    Blueprint, render_template, request, redirect, url_for, session, flash, current_app
)
from extensions import db
from models import Photo, NEIGHBORHOODS

main_bp = Blueprint("main", __name__)


def is_admin():
    return session.get("is_admin", False)


@main_bp.context_processor
def inject_globals():
    return {
        "site_name": current_app.config["SITE_NAME"],
        "is_admin": is_admin(),
        "neighborhoods": NEIGHBORHOODS,
        "asset_version": current_app.config["ASSET_VERSION"],
    }


@main_bp.route("/")
def map_view():
    neighborhood = request.args.get("neighborhood", "")
    query = Photo.query.filter(Photo.latitude.isnot(None), Photo.longitude.isnot(None))
    if neighborhood:
        query = query.filter_by(neighborhood=neighborhood)
    photos = query.all()

    total_geocoded = Photo.query.filter(Photo.latitude.isnot(None)).count()
    total_ungeocoded = Photo.query.filter(Photo.latitude.is_(None)).count()

    return render_template(
        "map.html",
        photos=[p.to_dict() for p in photos],
        selected_neighborhood=neighborhood,
        total_geocoded=total_geocoded,
        total_ungeocoded=total_ungeocoded,
    )


@main_bp.route("/photos")
def gallery():
    neighborhood = request.args.get("neighborhood", "")
    show = request.args.get("show", "all")  # all | geocoded | ungeocoded
    search = request.args.get("q", "").strip()

    query = Photo.query
    if neighborhood:
        query = query.filter_by(neighborhood=neighborhood)
    if show == "geocoded":
        query = query.filter(Photo.latitude.isnot(None))
    elif show == "ungeocoded":
        query = query.filter(Photo.latitude.is_(None))
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(Photo.title.ilike(like), Photo.description.ilike(like), Photo.tags.ilike(like))
        )

    photos = query.order_by(Photo.sort_year.asc().nullslast(), Photo.title.asc()).all()

    return render_template(
        "photos.html",
        photos=photos,
        selected_neighborhood=neighborhood,
        show=show,
        search=search,
    )


@main_bp.route("/photo/<int:photo_id>")
def photo_detail(photo_id):
    photo = Photo.query.get_or_404(photo_id)
    return render_template("photo_detail.html", photo=photo)


@main_bp.route("/add", methods=["GET", "POST"])
def add_photo():
    if not is_admin():
        return redirect(url_for("main.admin_login", next=url_for("main.add_photo")))

    if request.method == "POST":
        lat = request.form.get("latitude", "").strip()
        lng = request.form.get("longitude", "").strip()

        precision = None
        location_note = None
        if lat and lng:
            precision = request.form.get("location_precision") or "street_approximate"
            if precision == "neighborhood_approximate":
                location_note = "Approximate location — placed at neighborhood center; exact site not recorded."
            elif precision == "street_approximate":
                location_note = "Approximate location — based on a named street or landmark, not a precise address."
            elif precision == "exact_address":
                location_note = "Geocoded from a specific street address."

        sort_year = None
        digits = "".join(c for c in request.form.get("display_date", "")[:4] if c.isdigit())
        if len(digits) == 4:
            sort_year = int(digits)

        photo = Photo(
            title=request.form["title"].strip(),
            description=request.form.get("description", "").strip(),
            display_date=request.form.get("display_date", "").strip() or "Undated",
            sort_year=sort_year,
            neighborhood=request.form.get("neighborhood") or "Other",
            latitude=float(lat) if lat else None,
            longitude=float(lng) if lng else None,
            location_precision=precision,
            location_note=location_note,
            image_url=request.form.get("image_url", "").strip(),
            thumbnail_url=request.form.get("image_url", "").strip(),
            source=request.form.get("source", "Noel Wiggins Collection").strip(),
            source_url=request.form.get("source_url", "").strip(),
            tags=request.form.get("tags", "").strip(),
            added_by="Noel Wiggins",
        )
        db.session.add(photo)
        db.session.commit()
        flash("Photo added.", "success")
        return redirect(url_for("main.photo_detail", photo_id=photo.id))

    return render_template("add_edit.html", photo=None)


@main_bp.route("/photo/<int:photo_id>/edit", methods=["GET", "POST"])
def edit_photo(photo_id):
    if not is_admin():
        return redirect(url_for("main.admin_login", next=request.path))

    photo = Photo.query.get_or_404(photo_id)

    if request.method == "POST":
        lat = request.form.get("latitude", "").strip()
        lng = request.form.get("longitude", "").strip()

        photo.title = request.form["title"].strip()
        photo.description = request.form.get("description", "").strip()
        photo.display_date = request.form.get("display_date", "").strip() or "Undated"
        digits = "".join(c for c in photo.display_date[:4] if c.isdigit())
        photo.sort_year = int(digits) if len(digits) == 4 else None
        photo.neighborhood = request.form.get("neighborhood") or "Other"
        photo.latitude = float(lat) if lat else None
        photo.longitude = float(lng) if lng else None
        if lat and lng:
            photo.location_precision = request.form.get("location_precision") or "street_approximate"
        else:
            photo.location_precision = None
            photo.location_note = None
        photo.image_url = request.form.get("image_url", "").strip()
        photo.thumbnail_url = photo.image_url
        photo.source = request.form.get("source", "").strip()
        photo.source_url = request.form.get("source_url", "").strip()
        photo.tags = request.form.get("tags", "").strip()

        db.session.commit()
        flash("Photo updated.", "success")
        return redirect(url_for("main.photo_detail", photo_id=photo.id))

    return render_template("add_edit.html", photo=photo)


@main_bp.route("/photo/<int:photo_id>/delete", methods=["POST"])
def delete_photo(photo_id):
    if not is_admin():
        return redirect(url_for("main.admin_login"))
    photo = Photo.query.get_or_404(photo_id)
    db.session.delete(photo)
    db.session.commit()
    flash("Photo deleted.", "success")
    return redirect(url_for("main.gallery"))


_image_cache = {}
_IMAGE_CACHE_MAX = 500


@main_bp.route("/img/<path:io_id>")
def image_proxy(io_id):
    """Proxies images hosted on nycrecords.access.preservica.com through our
    own server. Direct browser hotlinking to Preservica intermittently fails
    (they run Cloudflare Bot Management, which can block/challenge external
    <img> requests even though single server-side fetches succeed) — fetching
    server-side and streaming the bytes through our own domain sidesteps that.
    Cached in memory since a gallery/sidebar can request many images at once
    and repeat views of the same photo shouldn't re-fetch from Preservica."""
    import requests
    from flask import Response

    kind = request.args.get("kind", "thumbnail")  # "thumbnail" or "file"
    cache_key = f"{io_id}:{kind}"

    cached = _image_cache.get(cache_key)
    if cached:
        content, content_type = cached
        return Response(content, mimetype=content_type, headers={"Cache-Control": "public, max-age=86400"})

    if kind == "file":
        upstream = f"https://nycrecords.access.preservica.com/download/file/{io_id}"
    else:
        upstream = f"https://nycrecords.access.preservica.com/download/thumbnail/{io_id}?fallback-thumbnail=1"

    try:
        r = requests.get(upstream, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        }, timeout=15)
        r.raise_for_status()
    except Exception:
        return "", 502

    content = r.content
    content_type = r.headers.get("Content-Type", "image/jpeg")

    # Browsers can't display TIFF inline — some archives (e.g. NYC tax photo
    # masters) serve TIFF for the full-size "file" download. Convert to JPEG.
    is_tiff = content_type in ("image/tiff", "image/tif") or content[:4] in (b"II*\x00", b"MM\x00*")
    if is_tiff:
        from PIL import Image
        import io as _io
        try:
            im = Image.open(_io.BytesIO(content))
            if im.mode != "RGB":
                im = im.convert("RGB")
            buf = _io.BytesIO()
            im.save(buf, format="JPEG", quality=88)
            content = buf.getvalue()
            content_type = "image/jpeg"
        except Exception as e:
            print(f"TIFF CONVERSION FAILED for {io_id}: {type(e).__name__}: {e}", flush=True)

    if len(_image_cache) >= _IMAGE_CACHE_MAX:
        _image_cache.pop(next(iter(_image_cache)))
    _image_cache[cache_key] = (content, content_type)

    return Response(
        content,
        mimetype=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@main_bp.route("/admin/fix-thumbnails", methods=["POST"])
def fix_thumbnails():
    if not is_admin():
        return {"error": "not authorized"}, 403

    photos = Photo.query.filter(Photo.thumbnail_url.contains("_150px")).all()
    fixed = 0
    for p in photos:
        p.thumbnail_url = p.image_url
        fixed += 1
    db.session.commit()
    return {"fixed": fixed}


@main_bp.route("/admin/dedupe", methods=["POST"])
def dedupe_photos():
    if not is_admin():
        return {"error": "not authorized"}, 403

    from collections import defaultdict

    all_photos = Photo.query.all()
    by_identity = defaultdict(list)
    for p in all_photos:
        key = (p.source, p.source_url or p.image_url)
        by_identity[key].append(p)

    removed = 0
    for key, group in by_identity.items():
        if len(group) <= 1:
            continue
        group.sort(key=lambda p: p.id)
        for dupe in group[1:]:
            db.session.delete(dupe)
            removed += 1

    db.session.commit()
    return {"removed": removed, "remaining": Photo.query.count()}


@main_bp.route("/admin/debug-template")
def debug_template():
    if not is_admin():
        return {"error": "not authorized"}, 403
    import os
    path = os.path.join(os.path.dirname(__file__), "..", "..", "templates", "map.html")
    with open(path) as f:
        content = f.read()
    return {
        "has_asset_version": "asset_version" in content,
        "map_js_line": [l for l in content.splitlines() if "map.js" in l],
        "config_asset_version": current_app.config.get("ASSET_VERSION"),
        "file_mtime": os.path.getmtime(path),
    }


@main_bp.route("/admin/fix-tax-addresses", methods=["POST"])
def fix_tax_addresses():
    if not is_admin():
        return {"error": "not authorized"}, 403

    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    from fix_tax_photo_addresses import classify_and_fix

    all_tax = Photo.query.filter(
        Photo.source == "NYC Municipal Archives",
        Photo.title.contains("Rockaway Beach Boulevard"),
    ).all()

    deleted, fixed, skipped = 0, 0, 0
    for p in all_tax:
        result = classify_and_fix(p)
        if result == "delete":
            db.session.delete(p)
            deleted += 1
        elif result is None:
            skipped += 1
        else:
            for k, v in result.items():
                setattr(p, k, v)
            fixed += 1
    db.session.commit()
    return {"deleted": deleted, "fixed": fixed, "skipped": skipped}


@main_bp.route("/admin/fix-geocoding", methods=["POST"])
def fix_geocoding():
    if not is_admin():
        return {"error": "not authorized"}, 403

    import re
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    from geocode_utils import neighborhood_for_beach_number, interpolate_beach_street, jitter

    def derive(title, call_number):
        m = re.match(r'^(\d+)(?:-\d+)?\s+Rockaway Beach Boulevard', title)
        if m:
            num = m.group(1)
            beach_num = int(num[:-2]) if len(num) > 2 else int(num)
            hood = neighborhood_for_beach_number(beach_num)
            lat, lng = interpolate_beach_street(beach_num)
            dlat, dlng = jitter(call_number or title, meters=40)
            note = ("Approximate location — the property record's block/lot didn't match this "
                    "address during import, so this pin is interpolated from the Rockaway Beach "
                    "Boulevard house number instead.")
            return round(lat + dlat, 6), round(lng + dlng, 6), hood, "street_approximate", note
        else:
            lat, lng = interpolate_beach_street(100)
            return lat, lng, "Rockaway Beach", "neighborhood_approximate", "Approximate — no house number on file."

    bad = Photo.query.filter(
        db.or_(Photo.latitude > 40.65, Photo.latitude < 40.5,
               Photo.longitude > -73.7, Photo.longitude < -73.9)
    ).all()
    fixed = 0
    for p in bad:
        lat, lng, hood, prec, note = derive(p.title, p.call_number)
        p.latitude, p.longitude = lat, lng
        p.neighborhood = hood
        p.location_precision = prec
        p.location_note = note
        fixed += 1
    db.session.commit()
    return {"fixed": fixed}


@main_bp.route("/login", methods=["GET", "POST"])
def admin_login():
    next_url = request.args.get("next") or url_for("main.gallery")
    if request.method == "POST":
        if request.form.get("pin") == current_app.config["ADMIN_PIN"]:
            session["is_admin"] = True
            return redirect(request.form.get("next") or next_url)
        flash("Incorrect PIN.", "error")
    return render_template("login.html", next=next_url)


@main_bp.route("/logout")
def logout():
    session.pop("is_admin", None)
    return redirect(url_for("main.map_view"))


@main_bp.route("/about")
def about():
    return render_template("about.html")
