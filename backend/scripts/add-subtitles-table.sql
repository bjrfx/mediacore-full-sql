-- ============================================================================
-- MediaCore MySQL Database Schema Update - Subtitles Table
-- Adds support for lyrics and subtitles for audio/video media
-- ============================================================================

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS `subtitles`;

-- Subtitles/Lyrics table
-- Supports SRT, VTT (for live sync) and TXT (plain text display)
CREATE TABLE `subtitles` (
  `id` VARCHAR(36) PRIMARY KEY,
  `media_id` VARCHAR(36) NOT NULL,
  `language` VARCHAR(10) DEFAULT 'en',
  `format` ENUM('srt', 'vtt', 'txt') NOT NULL COMMENT 'Subtitle file format',
  `label` VARCHAR(100) DEFAULT NULL COMMENT 'Display label e.g. "English", "English (CC)"',
  `file_path` TEXT NOT NULL COMMENT 'URL or path to subtitle file',
  `is_default` BOOLEAN DEFAULT FALSE COMMENT 'Whether this is the default subtitle track',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE CASCADE,
  INDEX `idx_media` (`media_id`),
  INDEX `idx_language` (`language`),
  INDEX `idx_format` (`format`),
  INDEX `idx_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SUBTITLES TABLE CREATED SUCCESSFULLY
-- ============================================================================
-- This table stores subtitle/lyrics files linked to media content.
-- Supported formats:
--   - SRT: SubRip format with timestamps for live sync
--   - VTT: WebVTT format with timestamps for live sync  
--   - TXT: Plain text for static lyrics display (no sync)
