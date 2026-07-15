from datetime import datetime
from extensions import db

NEIGHBORHOODS = ["Rockaway Beach", "Rockaway Park", "Hammels", "Arverne", "Edgemere", "Belle Harbor", "Neponsit", "Far Rockaway", "Other"]
PRECISION_LEVELS = ["exact_address", "street_approximate", "neighborhood_approximate"]


class Photo(db.Model):
    __tablename__ = "photos"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    display_date = db.Column(db.String(100))  # human-readable, e.g. "circa 1905"
    sort_year = db.Column(db.Integer, nullable=True, index=True)  # numeric, for sorting/filtering

    neighborhood = db.Column(db.String(50), index=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    location_precision = db.Column(db.String(30), nullable=True)
    location_note = db.Column(db.String(300), nullable=True)  # e.g. "Approximate — no address given"

    image_url = db.Column(db.String(1000))
    thumbnail_url = db.Column(db.String(1000))

    source = db.Column(db.String(200))       # "Library of Congress", "Noel Wiggins Collection", etc.
    source_url = db.Column(db.String(1000))
    call_number = db.Column(db.String(300))

    tags = db.Column(db.String(500))  # comma-separated
    added_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def is_geocoded(self):
        return self.latitude is not None and self.longitude is not None

    @property
    def tag_list(self):
        return [t.strip() for t in (self.tags or "").split(",") if t.strip()]

    @staticmethod
    def _proxied(url, kind):
        """Rewrites nycrecords.access.preservica.com URLs to go through our
        own /img/ proxy — direct hotlinking to Preservica intermittently
        fails in browsers (see blueprints/main/routes.py: image_proxy)."""
        if not url:
            return url
        if "nycrecords.access.preservica.com/download/" in url:
            import re
            m = re.search(r"/download/(?:thumbnail|file)/([^?]+)", url)
            if m:
                io_id = m.group(1)
                return f"/img/{io_id}?kind={kind}"
        return url

    @property
    def display_image_url(self):
        return self._proxied(self.image_url, "file")

    @property
    def display_thumbnail_url(self):
        return self._proxied(self.thumbnail_url or self.image_url, "thumbnail")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "display_date": self.display_date,
            "neighborhood": self.neighborhood,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "location_precision": self.location_precision,
            "location_note": self.location_note,
            "image_url": self.display_image_url,
            "thumbnail_url": self.display_thumbnail_url,
            "source": self.source,
            "source_url": self.source_url,
            "is_geocoded": self.is_geocoded,
            "tags": self.tag_list,
        }
