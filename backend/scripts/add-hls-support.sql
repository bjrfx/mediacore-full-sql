-- ============================================================================
-- Add HLS (HTTP Live Streaming) Support to Media Table
-- Run this migration to enable HLS video uploads
-- ============================================================================

-- Add is_hls column to indicate if media uses HLS format
ALTER TABLE `media` 
ADD COLUMN `is_hls` BOOLEAN DEFAULT FALSE AFTER `content_group_id`;

-- Add hls_playlist_url column to store the .m3u8 playlist URL
ALTER TABLE `media` 
ADD COLUMN `hls_playlist_url` TEXT DEFAULT NULL AFTER `is_hls`;

-- Add index for HLS filtering
CREATE INDEX `idx_is_hls` ON `media` (`is_hls`);

-- Update any existing HLS content (if file_path contains .m3u8)
UPDATE `media` 
SET `is_hls` = TRUE, 
    `hls_playlist_url` = `file_path`
WHERE `file_path` LIKE '%.m3u8';

-- Show the updated table structure
DESCRIBE `media`;
