import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'mysql+pymysql://root@localhost/sticky_mind_grid'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_timeout": 20,
    }
    
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

