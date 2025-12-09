"""
Subtitle Generator Service
Creates SRT, VTT, and JSON subtitle files from word timings
"""
import os
import json
import logging
import re
from datetime import timedelta

logger = logging.getLogger(__name__)


class SubtitleGenerator:
    """
    Generates subtitles in various formats from word-level timestamps.
    Creates Spotify-style line-by-line synchronized lyrics.
    """
    
    def __init__(
        self,
        words_per_line=8,
        min_line_duration=1.5,
        max_line_duration=7.0,
        pause_threshold=0.7
    ):
        """
        Initialize subtitle generator.
        
        Args:
            words_per_line: Maximum words per subtitle line
            min_line_duration: Minimum duration for a line (seconds)
            max_line_duration: Maximum duration for a line (seconds)
            pause_threshold: Pause duration to force line break (seconds)
        """
        self.words_per_line = words_per_line
        self.min_line_duration = min_line_duration
        self.max_line_duration = max_line_duration
        self.pause_threshold = pause_threshold
    
    def segment_into_lines(self, words):
        """
        Segment words into subtitle lines with proper timing.
        Uses natural breaks and timing constraints.
        
        Args:
            words: List of word dicts with {word, start, end}
            
        Returns:
            List of line dicts with {index, start, end, text}
        """
        if not words:
            return []
        
        lines = []
        current_line = []
        line_start = None
        
        for i, word_data in enumerate(words):
            word = word_data.get('word', '')
            start = word_data.get('start', 0)
            end = word_data.get('end', 0)
            
            # Skip empty words
            if not word.strip():
                continue
            
            # Start new line if empty
            if not current_line:
                line_start = start
                current_line.append(word)
                continue
            
            # Check for natural breaks
            should_break = False
            
            # 1. Check pause between words
            if i > 0:
                prev_end = words[i-1].get('end', 0)
                pause = start - prev_end
                if pause >= self.pause_threshold:
                    should_break = True
            
            # 2. Check word count limit
            if len(current_line) >= self.words_per_line:
                should_break = True
            
            # 3. Check max duration
            line_duration = end - line_start
            if line_duration >= self.max_line_duration:
                should_break = True
            
            # 4. Check for sentence-ending punctuation
            prev_word = current_line[-1] if current_line else ''
            if prev_word and prev_word[-1] in '.!?':
                should_break = True
            
            if should_break and current_line:
                # Save current line
                prev_end = words[i-1].get('end', line_start + 1)
                lines.append({
                    'index': len(lines) + 1,
                    'start': line_start,
                    'end': prev_end,
                    'text': ' '.join(current_line)
                })
                # Start new line
                current_line = [word]
                line_start = start
            else:
                current_line.append(word)
        
        # Add remaining words as last line
        if current_line:
            last_end = words[-1].get('end', line_start + 1) if words else line_start + 1
            lines.append({
                'index': len(lines) + 1,
                'start': line_start,
                'end': last_end,
                'text': ' '.join(current_line)
            })
        
        return lines
    
    def format_timestamp_srt(self, seconds):
        """Format seconds as SRT timestamp: HH:MM:SS,mmm"""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        millis = int((seconds - int(seconds)) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    def format_timestamp_vtt(self, seconds):
        """Format seconds as VTT timestamp: HH:MM:SS.mmm"""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        millis = int((seconds - int(seconds)) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"
    
    def generate_srt(self, lines, output_path):
        """
        Generate SRT subtitle file.
        
        Args:
            lines: List of line dicts
            output_path: Path to save .srt file
        """
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                for line in lines:
                    # Index
                    f.write(f"{line['index']}\n")
                    # Timestamps
                    start_ts = self.format_timestamp_srt(line['start'])
                    end_ts = self.format_timestamp_srt(line['end'])
                    f.write(f"{start_ts} --> {end_ts}\n")
                    # Text
                    f.write(f"{line['text']}\n")
                    # Blank line
                    f.write("\n")
            
            logger.info(f"SRT saved: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error generating SRT: {e}")
            return False
    
    def generate_vtt(self, lines, output_path):
        """
        Generate WebVTT subtitle file.
        
        Args:
            lines: List of line dicts
            output_path: Path to save .vtt file
        """
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                # VTT header
                f.write("WEBVTT\n\n")
                
                for line in lines:
                    # Optional cue identifier
                    f.write(f"cue-{line['index']}\n")
                    # Timestamps
                    start_ts = self.format_timestamp_vtt(line['start'])
                    end_ts = self.format_timestamp_vtt(line['end'])
                    f.write(f"{start_ts} --> {end_ts}\n")
                    # Text
                    f.write(f"{line['text']}\n")
                    # Blank line
                    f.write("\n")
            
            logger.info(f"VTT saved: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error generating VTT: {e}")
            return False
    
    def generate_json(self, lines, words, metadata=None):
        """
        Generate JSON structure for frontend (Spotify-style lyrics).
        
        Args:
            lines: List of line dicts
            words: Original word timings
            metadata: Optional metadata dict
            
        Returns:
            JSON-serializable dict
        """
        # Calculate total duration
        total_duration = 0
        if lines:
            total_duration = lines[-1]['end']
        elif words:
            total_duration = words[-1].get('end', 0)
        
        result = {
            'lines': lines,
            'metadata': {
                'total_lines': len(lines),
                'total_words': len(words),
                'duration': total_duration,
                **(metadata or {})
            }
        }
        
        return result
    
    def generate_all(self, words, output_dir, filename_base, metadata=None):
        """
        Generate all subtitle formats.
        
        Args:
            words: List of word dicts from Vosk
            output_dir: Directory to save files
            filename_base: Base filename (without extension)
            metadata: Optional metadata
            
        Returns:
            dict with paths and JSON data
        """
        try:
            # Segment into lines
            lines = self.segment_into_lines(words)
            
            if not lines:
                return {
                    'success': False,
                    'error': 'No lines generated from transcription'
                }
            
            # Generate files
            srt_path = os.path.join(output_dir, f"{filename_base}.srt")
            vtt_path = os.path.join(output_dir, f"{filename_base}.vtt")
            
            self.generate_srt(lines, srt_path)
            self.generate_vtt(lines, vtt_path)
            
            # Generate JSON
            json_data = self.generate_json(lines, words, metadata)
            
            # Save JSON file too
            json_path = os.path.join(output_dir, f"{filename_base}.json")
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Generated {len(lines)} subtitle lines")
            
            return {
                'success': True,
                'srt_path': srt_path,
                'vtt_path': vtt_path,
                'json_path': json_path,
                'text_json': json_data,
                'line_count': len(lines)
            }
            
        except Exception as e:
            logger.error(f"Error generating subtitles: {e}")
            return {
                'success': False,
                'error': str(e)
            }
