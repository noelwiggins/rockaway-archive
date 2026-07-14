import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-change-in-production")

    _db_url = os.environ.get("DATABASE_URL", "sqlite:///rockaway.db")
    # Railway/Heroku-style URLs use postgres:// or postgresql://; force the
    # psycopg3 dialect, which is more portable than psycopg2 on Railway's
    # Nixpacks build image (psycopg2-binary fails to find libpq.so.5 there).
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif _db_url.startswith("postgresql://"):
        _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Simple PIN gate for add/edit/delete routes (not a real auth system —
    # this is a personal archive site, not a multi-tenant one)
    ADMIN_PIN = os.environ.get("ADMIN_PIN", "8116")

    SITE_NAME = "Rockaway & Hammels Archive"
