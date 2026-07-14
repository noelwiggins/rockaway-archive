import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-change-in-production")

    _db_url = os.environ.get("DATABASE_URL", "sqlite:///rockaway.db")
    # Railway/Heroku-style URLs sometimes use postgres:// which SQLAlchemy 1.4+ rejects
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Simple PIN gate for add/edit/delete routes (not a real auth system —
    # this is a personal archive site, not a multi-tenant one)
    ADMIN_PIN = os.environ.get("ADMIN_PIN", "8116")

    SITE_NAME = "Rockaway & Hammels Archive"
