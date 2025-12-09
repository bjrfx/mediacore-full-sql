"""
Audio Processor Service
Handles audio extraction and conversion using FFmpeg
"""
import os
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class AudioProcessor:
    """
    Converts audio/video files to WAV format suitable for Vosk ASR
    Requirements: 16kHz, mono, 16-bit PCM
    """
    
    def __init__(self, ffmpeg_path='ffmpeg', sample_rate=16000, channels=1):
        self.ffmpeg_path = ffmpeg_path
        self.sample_rate = sample_rate
        self.channels = channels
        
    def check_ffmpeg(self):
        """Check if FFmpeg is available"""
        try:
            result = subprocess.run(
                [self.ffmpeg_path, '-version'],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception as e:
            logger.error(f"FFmpeg not available: {e}")
            return False
    
    def get_duration(self, input_path):
        """Get audio/video duration in seconds"""
        try:
            result = subprocess.run([
                self.ffmpeg_path, '-i', input_path,
                '-hide_banner'
            ], capture_output=True, text=True, timeout=30)
            
            # Parse duration from stderr (FFmpeg outputs info to stderr)
            output = result.stderr
            for line in output.split('\n'):
                if 'Duration:' in line:
                    # Format: Duration: 00:03:45.67
                    time_str = line.split('Duration:')[1].split(',')[0].strip()
                    parts = time_str.split(':')
                    hours = int(parts[0])
                    minutes = int(parts[1])
                    seconds = float(parts[2])
                    return int(hours * 3600 + minutes * 60 + seconds)
            return None
        except Exception as e:
            logger.error(f"Error getting duration: {e}")
            return None
    
    def convert_to_wav(self, input_path, output_path):
        """
        Convert audio/video file to WAV format for Vosk
        
        Args:
            input_path: Path to input audio/video file
            output_path: Path for output WAV file
            
        Returns:
            dict with success status and duration
        """
        try:
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # FFmpeg command for Vosk-compatible WAV
            # -y: Overwrite output
            # -i: Input file
            # -ar: Sample rate (16000 Hz)
            # -ac: Audio channels (1 = mono)
            # -acodec: Audio codec (pcm_s16le = 16-bit PCM)
            # -vn: No video
            cmd = [
                self.ffmpeg_path,
                '-y',                    # Overwrite
                '-i', input_path,        # Input
                '-ar', str(self.sample_rate),  # 16kHz
                '-ac', str(self.channels),     # Mono
                '-acodec', 'pcm_s16le',  # 16-bit PCM
                '-vn',                   # No video
                output_path
            ]
            
            logger.info(f"Converting: {input_path} -> {output_path}")
            logger.debug(f"FFmpeg command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout for large files
            )
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                return {
                    'success': False,
                    'error': result.stderr
                }
            
            # Verify output file exists
            if not os.path.exists(output_path):
                return {
                    'success': False,
                    'error': 'Output file was not created'
                }
            
            # Get duration
            duration = self.get_duration(output_path)
            
            logger.info(f"Conversion successful. Duration: {duration}s")
            
            return {
                'success': True,
                'output_path': output_path,
                'duration': duration,
                'sample_rate': self.sample_rate,
                'channels': self.channels
            }
            
        except subprocess.TimeoutExpired:
            logger.error("FFmpeg timed out")
            return {
                'success': False,
                'error': 'Conversion timed out'
            }
        except Exception as e:
            logger.error(f"Conversion error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def extract_audio_segment(self, input_path, output_path, start_time, duration):
        """
        Extract a segment of audio (useful for chunked processing)
        
        Args:
            input_path: Path to input file
            output_path: Path for output segment
            start_time: Start time in seconds
            duration: Duration in seconds
        """
        try:
            cmd = [
                self.ffmpeg_path,
                '-y',
                '-i', input_path,
                '-ss', str(start_time),
                '-t', str(duration),
                '-ar', str(self.sample_rate),
                '-ac', str(self.channels),
                '-acodec', 'pcm_s16le',
                '-vn',
                output_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            return result.returncode == 0
            
        except Exception as e:
            logger.error(f"Segment extraction error: {e}")
            return False
    
    def cleanup(self, *paths):
        """Remove temporary files"""
        for path in paths:
            try:
                if path and os.path.exists(path):
                    os.remove(path)
                    logger.debug(f"Removed: {path}")
            except Exception as e:
                logger.warning(f"Failed to remove {path}: {e}")
