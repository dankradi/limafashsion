# =====================================================
#  LIMA FASHION — Database Configuration
#  Edit these values to match your Supabase (PostgreSQL) setup
# =====================================================
import os

DATABASE_URL = os.environ.get("DATABASE_URL")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT", "5432"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "dbname": os.getenv("DB_NAME", "postgres"),
}

# Flask server config
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5000
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "False") == "True"

# CORS — which origins can call the API
# During development, allow all. Restrict in production.
CORS_ORIGINS = "*"

# ─────────────────────────────────────────────────────
#  Super Admin Credentials
#  Change these values to set your super admin login.
#  Password is compared as SHA-256 hex hash.
# ─────────────────────────────────────────────────────
SUPER_ADMIN_USERNAME = os.environ.get("SUPER_ADMIN_USERNAME", "superadmin")
SUPER_ADMIN_PASSWORD = os.environ.get("SUPER_ADMIN_PASSWORD", "")   # Set via environment variable on Render
