"""
Database Models for Vosk STT
SQLAlchemy ORM models for media_files and subtitles tables
"""
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid

Base = declarative_base()


def generate_uuid():
    """Generate a UUID string"""
    return str(uuid.uuid4())


class MediaFile(Base):
    """
    Media files table - stores uploaded audio/video metadata
    Note: This may already exist in your Node.js backend schema
    """
    __tablename__ = 'media_files_stt'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    original_media_id = Column(String(36), nullable=True, index=True)  # ID from Node.js media table
    filename = Column(String(255), nullable=False)
    original_path = Column(Text, nullable=True)  # Original file path/URL
    processed_path = Column(Text, nullable=True)  # Converted WAV path
    file_type = Column(String(20), nullable=False)  # audio/video
    duration = Column(Integer, nullable=True)  # Duration in seconds
    language = Column(String(10), default='en')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    subtitles = relationship("Subtitle", back_populates="media_file", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'original_media_id': self.original_media_id,
            'filename': self.filename,
            'file_type': self.file_type,
            'duration': self.duration,
            'language': self.language,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Subtitle(Base):
    """
    Subtitles table - stores generated subtitles with timestamps
    """
    __tablename__ = 'subtitles'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    media_id = Column(String(36), ForeignKey('media_files_stt.id', ondelete='CASCADE'), nullable=False, index=True)
    original_media_id = Column(String(36), nullable=True, index=True)  # ID from Node.js media table
    subtitle_path = Column(Text, nullable=True)  # Path to .srt file
    vtt_path = Column(Text, nullable=True)  # Path to .vtt file
    format = Column(String(10), default='srt')
    text_json = Column(Text, nullable=True)  # JSON with timed lines
    word_timings = Column(Text, nullable=True)  # Word-level timestamps (optional)
    language = Column(String(10), default='en')
    status = Column(
        Enum('pending', 'processing', 'completed', 'failed', name='subtitle_status'),
        default='pending'
    )
    error_message = Column(Text, nullable=True)
    model_used = Column(String(100), nullable=True)  # Vosk model name
    processing_time = Column(Integer, nullable=True)  # Processing time in seconds
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    media_file = relationship("MediaFile", back_populates="subtitles")
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'media_id': self.media_id,
            'original_media_id': self.original_media_id,
            'subtitle_path': self.subtitle_path,
            'vtt_path': self.vtt_path,
            'format': self.format,
            'text_json': json.loads(self.text_json) if self.text_json else None,
            'language': self.language,
            'status': self.status,
            'error_message': self.error_message,
            'model_used': self.model_used,
            'processing_time': self.processing_time,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# SQL for creating tables (run manually or via migration)
CREATE_TABLES_SQL = """
-- Create media_files_stt table
CREATE TABLE IF NOT EXISTS media_files_stt (
    id VARCHAR(36) PRIMARY KEY,
    original_media_id VARCHAR(36),
    filename VARCHAR(255) NOT NULL,
    original_path TEXT,
    processed_path TEXT,
    file_type VARCHAR(20) NOT NULL,
    duration INT,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_original_media_id (original_media_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create subtitles table
CREATE TABLE IF NOT EXISTS subtitles (
    id VARCHAR(36) PRIMARY KEY,
    media_id VARCHAR(36) NOT NULL,
    original_media_id VARCHAR(36),
    subtitle_path TEXT,
    vtt_path TEXT,
    format VARCHAR(10) DEFAULT 'srt',
    text_json LONGTEXT,
    word_timings LONGTEXT,
    language VARCHAR(10) DEFAULT 'en',
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    model_used VARCHAR(100),
    processing_time INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media_files_stt(id) ON DELETE CASCADE,
    INDEX idx_media_id (media_id),
    INDEX idx_original_media_id (original_media_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add subtitle columns to existing media table (optional)
ALTER TABLE media 
ADD COLUMN IF NOT EXISTS has_subtitles TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtitle_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS subtitle_status VARCHAR(20) DEFAULT NULL;
"""
