-- Additional MySQL Tables for Complete Firebase Migration
-- Run this after setup-mysql-schema.sql

USE masakali_mediacore;

-- User statistics table (replaces users/{uid}/stats subcollection)
CREATE TABLE IF NOT EXISTS user_stats (
  uid VARCHAR(36) NOT NULL,
  total_plays INT DEFAULT 0,
  total_time_seconds BIGINT DEFAULT 0,
  unique_tracks INT DEFAULT 0,
  unique_artists INT DEFAULT 0,
  favorite_genre VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uid),
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
  INDEX idx_total_plays (total_plays),
  INDEX idx_total_time (total_time_seconds)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily activity tracking (replaces users/{uid}/dailyActivity subcollection)
CREATE TABLE IF NOT EXISTS user_daily_activity (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(36) NOT NULL,
  activity_date DATE NOT NULL,
  plays INT DEFAULT 0,
  time_seconds INT DEFAULT 0,
  tracks_played INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (uid, activity_date),
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
  INDEX idx_uid_date (uid, activity_date),
  INDEX idx_date (activity_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual play records (replaces users/{uid}/plays subcollection)
CREATE TABLE IF NOT EXISTS user_plays (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(36) NOT NULL,
  media_id VARCHAR(50) NOT NULL,
  media_title VARCHAR(255),
  media_type ENUM('audio', 'video') DEFAULT 'audio',
  artist_name VARCHAR(255),
  duration_seconds INT,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_percentage INT DEFAULT 0,
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
  INDEX idx_uid_played (uid, played_at),
  INDEX idx_media (media_id),
  INDEX idx_played_at (played_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User presence/online status (replaces userPresence collection)
CREATE TABLE IF NOT EXISTS user_presence (
  uid VARCHAR(36) PRIMARY KEY,
  is_online BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  device_type VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
  INDEX idx_online (is_online),
  INDEX idx_last_active (last_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Download logs (replaces download_logs collection)
CREATE TABLE IF NOT EXISTS download_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(36) NOT NULL,
  media_id VARCHAR(50) NOT NULL,
  media_title VARCHAR(255),
  media_type ENUM('audio', 'video') DEFAULT 'audio',
  file_size BIGINT,
  download_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  download_completed_at TIMESTAMP NULL,
  status ENUM('started', 'completed', 'failed') DEFAULT 'started',
  ip_address VARCHAR(45),
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
  INDEX idx_uid_downloads (uid, download_started_at),
  INDEX idx_media (media_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Application settings (replaces app_settings collection)
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default app settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('app_name', 'MediaCore', 'string', 'Application name', TRUE),
('app_version', '2.0.0', 'string', 'Application version', TRUE),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', FALSE),
('max_upload_size_mb', '500', 'number', 'Maximum upload size in MB', FALSE),
('default_language', 'en', 'string', 'Default application language', TRUE),
('enable_downloads', 'true', 'boolean', 'Enable media downloads', TRUE),
('max_daily_downloads', '50', 'number', 'Maximum downloads per day per user', FALSE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Top tracks/artists cache table (for performance)
CREATE TABLE IF NOT EXISTS top_content_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content_type ENUM('track', 'artist') NOT NULL,
  content_id VARCHAR(50) NOT NULL,
  content_title VARCHAR(255),
  play_count INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_content (content_type, content_id),
  INDEX idx_type_count (content_type, play_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON masakali_mediacore.* TO 'masakali_kiran'@'%';
-- FLUSH PRIVILEGES;

SELECT 'Additional tables created successfully!' AS message;
