import os
from dotenv import load_dotenv

# Load .env file if available
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "romantic_super_secret_key_2026")

    # Flask Session Configuration
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour session timeout

    # Handle Render postgres:// to postgresql:// URI scheme fix for SQLAlchemy
    raw_db_url = os.getenv("DATABASE_URL", "sqlite:///romantic_app.db")
    if raw_db_url and raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_DATABASE_URI = raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Resend API Credentials
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
    TO_EMAIL = os.getenv("TO_EMAIL", "")

    # Admin Credentials (use environment variables in production)
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "romantic2026")
