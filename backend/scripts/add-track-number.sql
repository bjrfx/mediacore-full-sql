-- Add track_number column to media table for album track ordering
-- Run this script on your production database

ALTER TABLE media ADD COLUMN track_number INT DEFAULT NULL COMMENT 'Track order within album';

-- Add index for efficient ordering by track number
CREATE INDEX idx_track_number ON media(album_id, track_number);

-- Verify the column was added
DESCRIBE media;
