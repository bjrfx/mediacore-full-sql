"""
Configuration settings for Vosk STT Backend
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent.absolute()

# Flask settings
class Config:
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # MySQL Database
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'masakali_mediacore')
    
    # SQLAlchemy
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@"
        f"{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = DEBUG
    
    # Paths
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    PROCESSED_FOLDER = os.path.join(BASE_DIR, 'processed')
    SUBTITLES_FOLDER = os.path.join(BASE_DIR, 'subtitles')
    VOSK_MODELS_PATH = os.path.join(BASE_DIR, 'vosk_models')
    LOGS_FOLDER = os.path.join(BASE_DIR, 'logs')
    
    # FFmpeg path (use static binary on shared hosting)
    FFMPEG_PATH = os.getenv('FFMPEG_PATH', 'ffmpeg')  # System ffmpeg or ./bin/ffmpeg
    
    # Vosk model (default to small English model)
    VOSK_MODEL_NAME = os.getenv('VOSK_MODEL_NAME', 'en-us')
    VOSK_MODEL_PATH = os.path.join(VOSK_MODELS_PATH, VOSK_MODEL_NAME)
    
    # Audio settings for Vosk
    AUDIO_SAMPLE_RATE = 16000  # 16kHz required by Vosk
    AUDIO_CHANNELS = 1        # Mono
    
    # Processing settings
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB max upload
    ALLOWED_EXTENSIONS = {'mp3', 'm4a', 'wav', 'mp4', 'webm', 'mkv', 'ogg', 'flac'}
    
    # Subtitle generation settings
    WORDS_PER_LINE = 8        # Max words per subtitle line
    MIN_LINE_DURATION = 1.5   # Minimum seconds per line
    MAX_LINE_DURATION = 7.0   # Maximum seconds per line
    PAUSE_THRESHOLD = 0.7     # Seconds of silence to force line break
    
    # Node.js backend URL (for callbacks)
    NODEJS_BACKEND_URL = os.getenv('NODEJS_BACKEND_URL', 'http://localhost:5001')
    
    # API settings
    API_KEY = os.getenv('STT_API_KEY', '')  # Optional API key for security


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_ECHO = False


# Get config based on environment
def get_config():
    env = os.getenv('FLASK_ENV', 'development')
    if env == 'production':
        return ProductionConfig()
    return DevelopmentConfig()
