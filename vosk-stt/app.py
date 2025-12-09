"""
Vosk STT Flask Application
Speech-to-Text API for MediaCore
"""
import os
import sys
import json
import time
import uuid
import logging
import requests
from pathlib import Path
from functools import wraps

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import configuration
from config import get_config, Config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(Config.LOGS_FOLDER, 'app.log'))
    ]
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
config = get_config()

# Apply configuration
app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH
app.config['SQLALCHEMY_DATABASE_URI'] = config.SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = config.SQLALCHEMY_TRACK_MODIFICATIONS

# Enable CORS
CORS(app, origins='*', expose_headers=['Content-Range', 'Accept-Ranges'])

# Ensure directories exist
for folder in [config.UPLOAD_FOLDER, config.PROCESSED_FOLDER, 
               config.SUBTITLES_FOLDER, config.LOGS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Database setup
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models.database import Base, MediaFile, Subtitle

engine = create_engine(
    config.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    pool_recycle=3600
)
Session = scoped_session(sessionmaker(bind=engine))

# Create tables
try:
    Base.metadata.create_all(engine)
    logger.info("Database tables created/verified")
except Exception as e:
    logger.error(f"Database initialization error: {e}")

# Import services
from services.audio_processor import AudioProcessor
from services.vosk_transcriber import VoskTranscriber, is_vosk_available
from services.subtitle_generator import SubtitleGenerator

# Initialize services
audio_processor = AudioProcessor(ffmpeg_path=config.FFMPEG_PATH)
subtitle_generator = SubtitleGenerator(
    words_per_line=config.WORDS_PER_LINE,
    min_line_duration=config.MIN_LINE_DURATION,
    max_line_duration=config.MAX_LINE_DURATION,
    pause_threshold=config.PAUSE_THRESHOLD
)

# Lazy load transcriber (heavy model)
_transcriber = None

def get_transcriber():
    """Get or initialize Vosk transcriber"""
    global _transcriber
    if _transcriber is None:
        _transcriber = VoskTranscriber(
            model_path=config.VOSK_MODEL_PATH,
            sample_rate=config.AUDIO_SAMPLE_RATE
        )
    return _transcriber


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


def generate_id():
    """Generate unique ID"""
    return str(uuid.uuid4())


def api_key_required(f):
    """Decorator to require API key (optional security)"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if config.API_KEY:
            api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
            if api_key != config.API_KEY:
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized',
                    'message': 'Invalid API key'
                }), 401
        return f(*args, **kwargs)
    return decorated


# =============================================================================
# ROUTES
# =============================================================================

@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'success': True,
        'service': 'Vosk STT API',
        'version': '1.0.0',
        'vosk_available': is_vosk_available(),
        'ffmpeg_available': audio_processor.check_ffmpeg()
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    })


@app.route('/api/status')
def api_status():
    """Detailed status check"""
    return jsonify({
        'success': True,
        'vosk': {
            'available': is_vosk_available(),
            'model_path': config.VOSK_MODEL_PATH,
            'model_exists': os.path.exists(config.VOSK_MODEL_PATH)
        },
        'ffmpeg': {
            'available': audio_processor.check_ffmpeg(),
            'path': config.FFMPEG_PATH
        },
        'database': {
            'connected': True  # If we got here, DB is working
        },
        'directories': {
            'uploads': os.path.exists(config.UPLOAD_FOLDER),
            'processed': os.path.exists(config.PROCESSED_FOLDER),
            'subtitles': os.path.exists(config.SUBTITLES_FOLDER)
        }
    })


@app.route('/api/transcribe', methods=['POST'])
@api_key_required
def transcribe_upload():
    """
    Transcribe uploaded audio/video file.
    
    Form Data:
        file: Audio/video file
        media_id: Optional - ID from Node.js backend
        language: Optional - Language code (default: en)
    """
    session = Session()
    start_time = time.time()
    
    try:
        # Check for file
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided',
                'message': 'Please upload an audio or video file'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': 'Invalid file type',
                'message': f'Allowed types: {", ".join(config.ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Get parameters
        media_id = request.form.get('media_id')
        language = request.form.get('language', 'en')
        
        # Generate IDs
        file_id = generate_id()
        subtitle_id = generate_id()
        
        # Secure filename
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        
        # Determine file type
        file_type = 'video' if file_ext in {'mp4', 'webm', 'mkv', 'avi', 'mov'} else 'audio'
        
        # Save uploaded file
        upload_path = os.path.join(config.UPLOAD_FOLDER, f"{file_id}.{file_ext}")
        file.save(upload_path)
        logger.info(f"File saved: {upload_path}")
        
        # Create media file record
        media_file = MediaFile(
            id=file_id,
            original_media_id=media_id,
            filename=original_filename,
            original_path=upload_path,
            file_type=file_type,
            language=language
        )
        session.add(media_file)
        
        # Create subtitle record (pending)
        subtitle = Subtitle(
            id=subtitle_id,
            media_id=file_id,
            original_media_id=media_id,
            language=language,
            status='processing'
        )
        session.add(subtitle)
        session.commit()
        
        # Convert to WAV
        wav_path = os.path.join(config.PROCESSED_FOLDER, f"{file_id}.wav")
        convert_result = audio_processor.convert_to_wav(upload_path, wav_path)
        
        if not convert_result['success']:
            subtitle.status = 'failed'
            subtitle.error_message = convert_result.get('error', 'Conversion failed')
            session.commit()
            return jsonify({
                'success': False,
                'error': 'Conversion failed',
                'message': convert_result.get('error')
            }), 500
        
        # Update duration
        media_file.duration = convert_result.get('duration')
        media_file.processed_path = wav_path
        
        # Transcribe
        transcriber = get_transcriber()
        transcribe_result = transcriber.transcribe(wav_path)
        
        if not transcribe_result['success']:
            subtitle.status = 'failed'
            subtitle.error_message = transcribe_result.get('error', 'Transcription failed')
            session.commit()
            return jsonify({
                'success': False,
                'error': 'Transcription failed',
                'message': transcribe_result.get('error')
            }), 500
        
        # Generate subtitles
        subtitle_result = subtitle_generator.generate_all(
            words=transcribe_result['words'],
            output_dir=config.SUBTITLES_FOLDER,
            filename_base=subtitle_id,
            metadata={
                'language': language,
                'model': transcribe_result.get('model', 'vosk'),
                'file_id': file_id,
                'media_id': media_id
            }
        )
        
        if not subtitle_result['success']:
            subtitle.status = 'failed'
            subtitle.error_message = subtitle_result.get('error', 'Subtitle generation failed')
            session.commit()
            return jsonify({
                'success': False,
                'error': 'Subtitle generation failed',
                'message': subtitle_result.get('error')
            }), 500
        
        # Update subtitle record
        processing_time = int(time.time() - start_time)
        subtitle.status = 'completed'
        subtitle.subtitle_path = subtitle_result['srt_path']
        subtitle.vtt_path = subtitle_result['vtt_path']
        subtitle.text_json = json.dumps(subtitle_result['text_json'])
        subtitle.model_used = transcribe_result.get('model')
        subtitle.processing_time = processing_time
        session.commit()
        
        # Cleanup temporary files
        audio_processor.cleanup(upload_path, wav_path)
        
        logger.info(f"Transcription complete in {processing_time}s. Subtitle ID: {subtitle_id}")
        
        return jsonify({
            'success': True,
            'message': 'Transcription completed',
            'data': {
                'subtitle_id': subtitle_id,
                'media_id': media_id,
                'file_id': file_id,
                'status': 'completed',
                'subtitle_path': f"/subtitles/{subtitle_id}.srt",
                'vtt_path': f"/subtitles/{subtitle_id}.vtt",
                'text_json': subtitle_result['text_json'],
                'duration': media_file.duration,
                'processing_time': processing_time,
                'line_count': subtitle_result['line_count']
            }
        })
        
    except Exception as e:
        session.rollback()
        logger.error(f"Transcription error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': str(e)
        }), 500
    
    finally:
        Session.remove()


@app.route('/api/transcribe-url', methods=['POST'])
@api_key_required
def transcribe_from_url():
    """
    Transcribe audio/video from URL.
    Used for integration with Node.js backend.
    
    JSON Body:
        file_url: URL to audio/video file
        media_id: ID from Node.js backend
        language: Optional - Language code (default: en)
    """
    session = Session()
    start_time = time.time()
    
    try:
        data = request.get_json()
        
        if not data or 'file_url' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing file_url'
            }), 400
        
        file_url = data['file_url']
        media_id = data.get('media_id')
        language = data.get('language', 'en')
        
        # Generate IDs
        file_id = generate_id()
        subtitle_id = generate_id()
        
        # Download file
        logger.info(f"Downloading from: {file_url}")
        
        response = requests.get(file_url, stream=True, timeout=300)
        response.raise_for_status()
        
        # Determine extension from URL or content-type
        url_path = file_url.split('?')[0]
        file_ext = url_path.rsplit('.', 1)[-1].lower() if '.' in url_path else 'mp3'
        
        if file_ext not in config.ALLOWED_EXTENSIONS:
            file_ext = 'mp3'  # Default
        
        # Save downloaded file
        upload_path = os.path.join(config.UPLOAD_FOLDER, f"{file_id}.{file_ext}")
        with open(upload_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logger.info(f"Downloaded to: {upload_path}")
        
        # Determine file type
        file_type = 'video' if file_ext in {'mp4', 'webm', 'mkv', 'avi', 'mov'} else 'audio'
        
        # Create database records
        media_file = MediaFile(
            id=file_id,
            original_media_id=media_id,
            filename=os.path.basename(url_path),
            original_path=file_url,
            file_type=file_type,
            language=language
        )
        session.add(media_file)
        
        subtitle = Subtitle(
            id=subtitle_id,
            media_id=file_id,
            original_media_id=media_id,
            language=language,
            status='processing'
        )
        session.add(subtitle)
        session.commit()
        
        # Convert to WAV
        wav_path = os.path.join(config.PROCESSED_FOLDER, f"{file_id}.wav")
        convert_result = audio_processor.convert_to_wav(upload_path, wav_path)
        
        if not convert_result['success']:
            subtitle.status = 'failed'
            subtitle.error_message = convert_result.get('error', 'Conversion failed')
            session.commit()
            audio_processor.cleanup(upload_path)
            return jsonify({
                'success': False,
                'error': 'Conversion failed',
                'message': convert_result.get('error')
            }), 500
        
        media_file.duration = convert_result.get('duration')
        media_file.processed_path = wav_path
        
        # Transcribe
        transcriber = get_transcriber()
        transcribe_result = transcriber.transcribe(wav_path)
        
        if not transcribe_result['success']:
            subtitle.status = 'failed'
            subtitle.error_message = transcribe_result.get('error', 'Transcription failed')
            session.commit()
            audio_processor.cleanup(upload_path, wav_path)
            return jsonify({
                'success': False,
                'error': 'Transcription failed',
                'message': transcribe_result.get('error')
            }), 500
        
        # Generate subtitles
        subtitle_result = subtitle_generator.generate_all(
            words=transcribe_result['words'],
            output_dir=config.SUBTITLES_FOLDER,
            filename_base=subtitle_id,
            metadata={
                'language': language,
                'model': transcribe_result.get('model', 'vosk'),
                'file_id': file_id,
                'media_id': media_id,
                'source_url': file_url
            }
        )
        
        if not subtitle_result['success']:
            subtitle.status = 'failed'
            subtitle.error_message = subtitle_result.get('error')
            session.commit()
            audio_processor.cleanup(upload_path, wav_path)
            return jsonify({
                'success': False,
                'error': 'Subtitle generation failed',
                'message': subtitle_result.get('error')
            }), 500
        
        # Update subtitle record
        processing_time = int(time.time() - start_time)
        subtitle.status = 'completed'
        subtitle.subtitle_path = subtitle_result['srt_path']
        subtitle.vtt_path = subtitle_result['vtt_path']
        subtitle.text_json = json.dumps(subtitle_result['text_json'])
        subtitle.model_used = transcribe_result.get('model')
        subtitle.processing_time = processing_time
        session.commit()
        
        # Cleanup
        audio_processor.cleanup(upload_path, wav_path)
        
        logger.info(f"URL transcription complete in {processing_time}s")
        
        return jsonify({
            'success': True,
            'message': 'Transcription completed',
            'data': {
                'subtitle_id': subtitle_id,
                'media_id': media_id,
                'file_id': file_id,
                'status': 'completed',
                'subtitle_path': f"/subtitles/{subtitle_id}.srt",
                'vtt_path': f"/subtitles/{subtitle_id}.vtt",
                'text_json': subtitle_result['text_json'],
                'duration': media_file.duration,
                'processing_time': processing_time,
                'line_count': subtitle_result['line_count']
            }
        })
        
    except requests.RequestException as e:
        session.rollback()
        logger.error(f"Download error: {e}")
        return jsonify({
            'success': False,
            'error': 'Download failed',
            'message': str(e)
        }), 500
        
    except Exception as e:
        session.rollback()
        logger.error(f"Transcription error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': str(e)
        }), 500
    
    finally:
        Session.remove()


@app.route('/api/subtitles/<media_id>')
@api_key_required
def get_subtitles(media_id):
    """
    Get subtitles for a media file.
    
    Args:
        media_id: Original media ID from Node.js backend
    """
    session = Session()
    
    try:
        # Find subtitle by original_media_id or media_id
        subtitle = session.query(Subtitle).filter(
            (Subtitle.original_media_id == media_id) | (Subtitle.media_id == media_id)
        ).order_by(Subtitle.created_at.desc()).first()
        
        if not subtitle:
            return jsonify({
                'success': False,
                'error': 'Not Found',
                'message': 'No subtitles found for this media'
            }), 404
        
        return jsonify({
            'success': True,
            'data': subtitle.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error fetching subtitles: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': str(e)
        }), 500
    
    finally:
        Session.remove()


@app.route('/api/subtitles/<media_id>/file')
def get_subtitle_file(media_id):
    """
    Download subtitle file.
    
    Query params:
        format: srt (default) or vtt
    """
    session = Session()
    
    try:
        subtitle = session.query(Subtitle).filter(
            (Subtitle.original_media_id == media_id) | (Subtitle.media_id == media_id)
        ).first()
        
        if not subtitle:
            return jsonify({
                'success': False,
                'error': 'Not Found'
            }), 404
        
        format_type = request.args.get('format', 'srt').lower()
        
        if format_type == 'vtt' and subtitle.vtt_path:
            return send_file(subtitle.vtt_path, mimetype='text/vtt')
        elif subtitle.subtitle_path:
            return send_file(subtitle.subtitle_path, mimetype='text/plain')
        else:
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
            
    except Exception as e:
        logger.error(f"Error serving subtitle file: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    
    finally:
        Session.remove()


@app.route('/subtitles/<filename>')
def serve_subtitle(filename):
    """Serve subtitle files from subtitles directory"""
    return send_from_directory(config.SUBTITLES_FOLDER, filename)


@app.route('/api/jobs/<job_id>')
@api_key_required
def get_job_status(job_id):
    """Get transcription job status"""
    session = Session()
    
    try:
        subtitle = session.query(Subtitle).filter_by(id=job_id).first()
        
        if not subtitle:
            return jsonify({
                'success': False,
                'error': 'Not Found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'id': subtitle.id,
                'status': subtitle.status,
                'error_message': subtitle.error_message,
                'processing_time': subtitle.processing_time,
                'created_at': subtitle.created_at.isoformat() if subtitle.created_at else None
            }
        })
        
    finally:
        Session.remove()


# Error handlers
@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'success': False,
        'error': 'File too large',
        'message': f'Maximum file size is {config.MAX_CONTENT_LENGTH // (1024*1024)} MB'
    }), 413


@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'success': False,
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred'
    }), 500


# Cleanup on shutdown
@app.teardown_appcontext
def shutdown_session(exception=None):
    Session.remove()


# Main entry point for local development
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info(f"Starting Vosk STT API on port {port}")
    logger.info(f"Vosk available: {is_vosk_available()}")
    logger.info(f"FFmpeg available: {audio_processor.check_ffmpeg()}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
