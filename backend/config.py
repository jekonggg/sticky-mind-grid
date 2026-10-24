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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SUPABASE_CA = os.path.join(BASE_DIR, 'certs', 'supabase-prod-ca-2021.crt')
POSTGRES_SSL_MODES = {'disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'}


def _resolve_postgres_ssl(host, query):
    """Resolve libpq TLS options for a PostgreSQL connection.

    Explicit ``DB_SSL_MODE`` takes precedence over ``sslmode`` in DATABASE_URL.
    When neither is supplied, Supabase hosts default to ``verify-full`` using the
    bundled Supabase root CA; other PostgreSQL hosts default to ``require``.
    """
    query_params = parse_qs(query)
    explicit_mode = (query_params.get('sslmode') or [None])[0]
    explicit_ca = (query_params.get('sslrootcert') or [None])[0]

    mode = (os.environ.get('DB_SSL_MODE') or explicit_mode or '').strip().lower()
    if not mode:
        is_supabase = host.endswith('.supabase.co') or host.endswith('.supabase.com')
        mode = 'verify-full' if is_supabase and os.path.isfile(DEFAULT_SUPABASE_CA) else 'require'

    if mode not in POSTGRES_SSL_MODES:
        raise ValueError(
            f"Invalid DB_SSL_MODE '{mode}'. Expected one of: {', '.join(sorted(POSTGRES_SSL_MODES))}"
        )

    ssl_options = {'sslmode': mode}
    if mode in ('verify-ca', 'verify-full'):
        ca_path = os.environ.get('DB_SSL_CA', '').strip() or explicit_ca
        if not ca_path and os.path.isfile(DEFAULT_SUPABASE_CA):
            ca_path = DEFAULT_SUPABASE_CA
        if not ca_path:
            raise ValueError(f"DB_SSL_MODE={mode} requires DB_SSL_CA to point to a trusted CA bundle")
        if not os.path.isfile(ca_path):
            raise ValueError(f"DB_SSL_CA file not found: {ca_path}")
        ssl_options['sslrootcert'] = ca_path

    return ssl_options


raw_db_url = os.environ.get('DATABASE_URL')
parsed_db_url = None
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

    parsed_db_url = urlparse(raw_db_url)

    # If Aiven or SSL query parameters are provided, strip non-standard query params and configure PyMySQL SSL
    if 'ssl-mode' in raw_db_url or 'ssl_mode' in raw_db_url or 'aivencloud.com' in raw_db_url:
        q_params = parse_qs(parsed_db_url.query)
        q_params.pop('ssl-mode', None)
        q_params.pop('ssl_mode', None)
        new_query = urlencode(q_params, doseq=True)
        raw_db_url = urlunparse((
            parsed_db_url.scheme,
            parsed_db_url.netloc,
            parsed_db_url.path,
            parsed_db_url.params,
            new_query,
            parsed_db_url.fragment,
        ))
        parsed_db_url = urlparse(raw_db_url)

        connect_args["ssl"] = {
            "check_hostname": True
        }
        mysql_ca = os.environ.get('DB_SSL_CA', '').strip()
        if mysql_ca:
            if not os.path.isfile(mysql_ca):
                raise ValueError(f"DB_SSL_CA file not found: {mysql_ca}")
            connect_args["ssl"]["ca"] = mysql_ca

if parsed_db_url and parsed_db_url.scheme.startswith('mysql'):
    engine_options["connect_args"] = connect_args
elif parsed_db_url and parsed_db_url.scheme.startswith('postgres'):
    engine_options["connect_args"] = {
        "connect_timeout": 30,
        **_resolve_postgres_ssl(parsed_db_url.hostname or '', parsed_db_url.query),
    }
    engine_options["pool_size"] = 5
    engine_options["max_overflow"] = 10
    engine_options["pool_recycle"] = 300


class Config:
    APP_ENV = (os.environ.get('APP_ENV') or os.environ.get('FLASK_ENV') or 'local').strip().lower()
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
    EMAIL_SUBJECT_PREFIX = os.environ.get('EMAIL_SUBJECT_PREFIX', '').strip()
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8080').rstrip('/')

    # EmailJS Configuration (HTTPS Port 443 - Cloud & Render Free Tier Compatible)
    EMAILJS_SERVICE_ID = os.environ.get('EMAILJS_SERVICE_ID', '')
    EMAILJS_TEMPLATE_ID = os.environ.get('EMAILJS_TEMPLATE_ID', '')
    EMAILJS_PUBLIC_KEY = os.environ.get('EMAILJS_PUBLIC_KEY', '')
    EMAILJS_PRIVATE_KEY = os.environ.get('EMAILJS_PRIVATE_KEY', '')

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
    OAUTH_ENABLED = os.environ.get('OAUTH_ENABLED', 'true').strip().lower() in ('true', '1', 'yes')
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '').strip()

    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '').strip()
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '').strip()

    MICROSOFT_CLIENT_ID = os.environ.get('MICROSOFT_CLIENT_ID', '').strip()
    MICROSOFT_CLIENT_SECRET = os.environ.get('MICROSOFT_CLIENT_SECRET', '').strip()
    MICROSOFT_TENANT_ID = os.environ.get('MICROSOFT_TENANT_ID', 'common').strip() or 'common'

    OAUTH_REDIRECT_URI = os.environ.get('OAUTH_REDIRECT_URI', '').strip()
