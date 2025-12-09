"""
Vosk Transcriber Service
Speech-to-text using Vosk offline ASR
"""
import os
import json
import wave
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Vosk import with fallback
try:
    from vosk import Model, KaldiRecognizer, SetLogLevel
    VOSK_AVAILABLE = True
except ImportError:
    VOSK_AVAILABLE = False
    logger.warning("Vosk not installed. Install with: pip install vosk")


class VoskTranscriber:
    """
    Transcribes audio files using Vosk ASR engine.
    Produces word-level timestamps for Spotify-style lyrics sync.
    """
    
    def __init__(self, model_path, sample_rate=16000):
        self.model_path = model_path
        self.sample_rate = sample_rate
        self.model = None
        
        if VOSK_AVAILABLE:
            # Reduce Vosk logging
            SetLogLevel(-1)
    
    def load_model(self):
        """Load Vosk model (lazy loading for memory efficiency)"""
        if not VOSK_AVAILABLE:
            raise RuntimeError("Vosk is not installed")
            
        if self.model is None:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Vosk model not found at: {self.model_path}")
            
            logger.info(f"Loading Vosk model from: {self.model_path}")
            self.model = Model(self.model_path)
            logger.info("Vosk model loaded successfully")
        
        return self.model
    
    def transcribe(self, wav_path, progress_callback=None):
        """
        Transcribe a WAV file and return word-level timestamps.
        
        Args:
            wav_path: Path to WAV file (16kHz, mono, 16-bit)
            progress_callback: Optional callback(percent) for progress updates
            
        Returns:
            dict with transcription results including word timings
        """
        try:
            # Load model
            model = self.load_model()
            
            # Open WAV file
            wf = wave.open(wav_path, 'rb')
            
            # Validate format
            if wf.getnchannels() != 1:
                raise ValueError("Audio must be mono")
            if wf.getsampwidth() != 2:
                raise ValueError("Audio must be 16-bit")
            if wf.getframerate() != self.sample_rate:
                logger.warning(f"Sample rate mismatch: {wf.getframerate()} vs {self.sample_rate}")
            
            # Create recognizer with word timestamps
            rec = KaldiRecognizer(model, wf.getframerate())
            rec.SetWords(True)  # Enable word-level timestamps
            
            # Process audio
            results = []
            all_words = []
            total_frames = wf.getnframes()
            frames_read = 0
            chunk_size = 4000  # Process in chunks
            
            logger.info(f"Transcribing: {wav_path}")
            logger.info(f"Total frames: {total_frames}, Duration: {total_frames/wf.getframerate():.1f}s")
            
            while True:
                data = wf.readframes(chunk_size)
                if len(data) == 0:
                    break
                
                frames_read += chunk_size
                
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    if 'result' in result:
                        results.append(result)
                        all_words.extend(result['result'])
                
                # Progress callback
                if progress_callback:
                    percent = min(100, int((frames_read / total_frames) * 100))
                    progress_callback(percent)
            
            # Get final result
            final_result = json.loads(rec.FinalResult())
            if 'result' in final_result:
                results.append(final_result)
                all_words.extend(final_result['result'])
            
            wf.close()
            
            # Combine all text
            full_text = ' '.join([r.get('text', '') for r in results]).strip()
            
            logger.info(f"Transcription complete. Words: {len(all_words)}")
            
            return {
                'success': True,
                'text': full_text,
                'words': all_words,  # Word-level timestamps
                'results': results,  # Chunk results
                'word_count': len(all_words),
                'model': os.path.basename(self.model_path)
            }
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_word_timings(self, words):
        """
        Extract clean word timings from Vosk results.
        
        Args:
            words: List of word objects from Vosk
            
        Returns:
            List of {word, start, end, confidence} dicts
        """
        timings = []
        for word in words:
            timings.append({
                'word': word.get('word', ''),
                'start': word.get('start', 0),
                'end': word.get('end', 0),
                'confidence': word.get('conf', 1.0)
            })
        return timings


def is_vosk_available():
    """Check if Vosk is available"""
    return VOSK_AVAILABLE
