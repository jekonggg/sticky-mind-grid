import os
import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

try:
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv(usecwd=True))
except ImportError:
    for env_candidate in [os.path.join(os.path.dirname(__file__), '..', '.env'), os.path.join(os.path.dirname(__file__), '.env')]:
        if os.path.isfile(env_candidate):
            with open(env_candidate, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        k, v = k.strip(), v.strip().strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v

raw_db_url = os.environ.get('DATABASE_URL')
connect_args = {
    "connect_timeout": 30,
    "read_timeout": 30,
    "write_timeout": 30,
}

engine_options = {
    "pool_pre_ping": True,
    "pool_recycle": 120,
    "pool_timeout": 30,
    "pool_size": 10,
    "max_overflow": 15,
}

if raw_db_url:
    if raw_db_url.startswith('mysql://'):
        raw_db_url = raw_db_url.replace('mysql://', 'mysql+pymysql://', 1)
    elif raw_db_url.startswith('postgres://'):
        raw_db_url = raw_db_url.replace('postgres://', 'postgresql+psycopg2://', 1)
    elif raw_db_url.startswith('postgresql://') and not raw_db_url.startswith('postgresql+'):
        raw_db_url = raw_db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    
    # If Aiven or SSL query parameters are provided, strip non-standard query params and configure PyMySQL SSL
    if 'ssl-mode' in raw_db_url or 'ssl_mode' in raw_db_url or 'aivencloud.com' in raw_db_url:
        parsed = urlparse(raw_db_url)
        q_params = parse_qs(parsed.query)
        q_params.pop('ssl-mode', None)
        q_params.pop('ssl_mode', None)
        new_query = urlencode(q_params, doseq=True)
        raw_db_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
        
        connect_args["ssl"] = {
            "check_hostname": False
        }

if raw_db_url and 'mysql' in raw_db_url:
    engine_options["connect_args"] = connect_args
elif raw_db_url and 'postgres' in raw_db_url:
    engine_options["connect_args"] = {"connect_timeout": 30}
    engine_options["pool_size"] = 5
    engine_options["max_overflow"] = 10
    engine_options["pool_recycle"] = 300


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    SQLALCHEMY_DATABASE_URI = raw_db_url or \
        'mysql+pymysql://root@localhost/sticky_mind_grid'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = engine_options
    
    # JWT Settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'super-secret-jwt-key-for-development-32-chars-long'
    from datetime import timedelta
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24) # Dev friendly expiry

    # CORS Origins
    default_cors = (
        'http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,'
        'capacitor://localhost,https://localhost,http://localhost,'
        'https://sticky-mind-grid.vercel.app'
    )
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get('CORS_ORIGINS', default_cors).split(',')
        if origin.strip()
    ]

    # Upload limits (25MB default per file, 100MB per board, 500MB per owner)
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_UPLOAD_MB', '25')) * 1024 * 1024
    MAX_BOARD_STORAGE_BYTES = int(os.environ.get('MAX_BOARD_STORAGE_MB', '100')) * 1024 * 1024
    MAX_OWNER_STORAGE_BYTES = int(os.environ.get('MAX_OWNER_STORAGE_MB', '500')) * 1024 * 1024
    # Activity retention policy: 0 means retain forever by default
    ACTIVITY_RETENTION_DAYS = int(os.environ.get('ACTIVITY_RETENTION_DAYS', '0'))
    ALLOWED_UPLOAD_EXTENSIONS = [
        ext.strip().lower()
        for ext in os.environ.get(
            'ALLOWED_UPLOAD_EXTENSIONS',
            # images
            'png,jpg,jpeg,gif,webp,svg,bmp,ico,'
            # documents
            'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,csv,json,rtf,odt,ods,odp,'
            # archives
            'zip,rar,7z,tar,gz,'
            # media
            'mp4,mov,avi,mkv,webm,mp3,wav,ogg,flac'
        ).split(',')
        if ext.strip()
    ]

    # Outbound Email Configuration
    EMAIL_PROVIDER = os.environ.get('EMAIL_PROVIDER', 'console')
    SMTP_HOST = os.environ.get('SMTP_HOST', 'localhost')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_USER = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SMTP_USE_TLS = os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true'
    EMAIL_FROM = os.environ.get('EMAIL_FROM', 'noreply@stickymindgrid.com')
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8080').rstrip('/')

    # EmailJS Configuration (HTTPS Port 443 - Cloud & Render Free Tier Compatible)
    EMAILJS_SERVICE_ID = os.environ.get('EMAILJS_SERVICE_ID', '')
    EMAILJS_TEMPLATE_ID = os.environ.get('EMAILJS_TEMPLATE_ID', '')
    EMAILJS_PUBLIC_KEY = os.environ.get('EMAILJS_PUBLIC_KEY', '')
    EMAILJS_PRIVATE_KEY = os.environ.get('EMAILJS_PRIVATE_KEY', '')
    # Web Push / VAPID Configuration
    VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
    VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
    VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'admin@stickymindgrid.com')

    # HTTP Rate Limiting
    RATELIMIT_ENABLED = os.environ.get('RATELIMIT_ENABLED', 'true').lower() in ('true', '1')
    RATELIMIT_STORAGE_URI = os.environ.get('RATELIMIT_STORAGE_URI', 'memory://')
    RATELIMIT_DEFAULT = os.environ.get('RATELIMIT_DEFAULT', '200 per minute')

    # Background Maintenance Scheduler
    SCHEDULER_ENABLED = os.environ.get('SCHEDULER_ENABLED', 'true').lower() in ('true', '1')
    INTERNAL_JOB_SECRET = os.environ.get('INTERNAL_JOB_SECRET', '')

    # Supabase Storage Configuration
    SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    SUPABASE_STORAGE_AVATARS_BUCKET = os.environ.get('SUPABASE_STORAGE_AVATARS_BUCKET', 'avatars')
    SUPABASE_STORAGE_ATTACHMENTS_BUCKET = os.environ.get('SUPABASE_STORAGE_ATTACHMENTS_BUCKET', 'attachments')

    # OAuth Provider Configuration (Google, GitHub, Microsoft)
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '').strip()

    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '').strip()
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '').strip()

    MICROSOFT_CLIENT_ID = os.environ.get('MICROSOFT_CLIENT_ID', '').strip()
    MICROSOFT_CLIENT_SECRET = os.environ.get('MICROSOFT_CLIENT_SECRET', '').strip()
    MICROSOFT_TENANT_ID = os.environ.get('MICROSOFT_TENANT_ID', 'common').strip() or 'common'

    OAUTH_REDIRECT_URI = os.environ.get('OAUTH_REDIRECT_URI', '').strip()
