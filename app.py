import os
import json
import click
from flask import Flask

from config import Config
from extensions import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    from blueprints.main.routes import main_bp
    from blueprints.api.routes import api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    with app.app_context():
        db.create_all()

    register_cli(app)

    return app


def register_cli(app):
    @app.cli.command("seed")
    @click.option("--file", default="seed_data/photos_seed.json", help="Path to seed JSON file")
    @click.option("--added-by", default="Library of Congress import", help="Value for added_by field")
    def seed(file, added_by):
        """Load photos from a seed JSON file into the database (skips duplicates by title+source_url)."""
        from models import Photo

        with open(file) as f:
            items = json.load(f)

        added, skipped = 0, 0
        for item in items:
            exists = Photo.query.filter_by(
                title=item["title"], source_url=item.get("source_url")
            ).first()
            if exists:
                skipped += 1
                continue

            sort_year = None
            date_str = item.get("display_date", "")
            digits = "".join(c for c in date_str[:4] if c.isdigit())
            if len(digits) == 4:
                sort_year = int(digits)

            location_note = None
            precision = item.get("location_precision")
            if precision == "neighborhood_approximate":
                location_note = "Approximate location — placed at neighborhood center; exact site not recorded."
            elif precision == "street_approximate":
                location_note = "Approximate location — based on a named street or landmark, not a precise address."
            elif precision == "exact_address":
                location_note = "Geocoded from a specific street address."

            photo = Photo(
                title=item["title"],
                description=item.get("description", ""),
                display_date=item.get("display_date", "Undated"),
                sort_year=sort_year,
                neighborhood=item.get("neighborhood", "Other"),
                latitude=item.get("latitude"),
                longitude=item.get("longitude"),
                location_precision=precision,
                location_note=location_note,
                image_url=item.get("image_url"),
                thumbnail_url=item.get("thumbnail_url"),
                source=item.get("source", "Unknown"),
                source_url=item.get("source_url"),
                call_number=item.get("call_number", ""),
                added_by=added_by,
            )
            db.session.add(photo)
            added += 1

        db.session.commit()
        click.echo(f"Seed complete: {added} added, {skipped} skipped (already present).")


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
