import os
import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

raw_db_url = os.environ.get('DATABASE_URL')
engine_options = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
    "pool_timeout": 20,
}

if raw_db_url:
    if raw_db_url.startswith('mysql://'):
        raw_db_url = raw_db_url.replace('mysql://', 'mysql+pymysql://', 1)
    
    # If Aiven or SSL query parameters are provided, strip non-standard query params and configure PyMySQL SSL
    if 'ssl-mode' in raw_db_url or 'ssl_mode' in raw_db_url or 'aivencloud.com' in raw_db_url:
        parsed = urlparse(raw_db_url)
        q_params = parse_qs(parsed.query)
        q_params.pop('ssl-mode', None)
        q_params.pop('ssl_mode', None)
        new_query = urlencode(q_params, doseq=True)
        raw_db_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
        
        engine_options["connect_args"] = {
            "ssl": {
                "check_hostname": False
            }
        }

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
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            'CORS_ORIGINS',
            'http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000'
        ).split(',')
        if origin.strip()
    ]

    # Upload limits
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_UPLOAD_MB', '10')) * 1024 * 1024
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

