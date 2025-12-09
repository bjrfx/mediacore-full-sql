-- Add subtitle support columns to media table
-- Run this migration to enable subtitle/lyrics functionality
-- Compatible with MySQL 5.7+ and shared hosting environments

-- Add columns for subtitle tracking (run each separately if needed)
ALTER TABLE media 
ADD COLUMN has_subtitles TINYINT(1) DEFAULT 0,
ADD COLUMN subtitle_id VARCHAR(36) DEFAULT NULL,
ADD COLUMN subtitle_status VARCHAR(20) DEFAULT NULL;

-- Create subtitles_cache table for local storage
CREATE TABLE IF NOT EXISTS subtitles_cache (
    id VARCHAR(36) PRIMARY KEY,
    media_id VARCHAR(36) NOT NULL,
    text_json LONGTEXT,
    srt_path VARCHAR(512) DEFAULT NULL,
    vtt_path VARCHAR(512) DEFAULT NULL,
    language VARCHAR(10) DEFAULT 'en',
    line_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subtitles_media_id (media_id),
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
