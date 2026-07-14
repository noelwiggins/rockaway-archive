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
