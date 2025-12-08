-- ============================================================================
-- MediaCore MySQL Database Schema
-- Complete migration from Firebase Firestore to MySQL
-- ============================================================================

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS `refresh_tokens`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `email_verification_tokens`;
DROP TABLE IF EXISTS `playlist_items`;
DROP TABLE IF EXISTS `playlists`;
DROP TABLE IF EXISTS `user_favorites`;
DROP TABLE IF EXISTS `user_history`;
DROP TABLE IF EXISTS `request_logs`;
DROP TABLE IF EXISTS `analytics_data`;
DROP TABLE IF EXISTS `api_keys`;
DROP TABLE IF EXISTS `media`;
DROP TABLE IF EXISTS `albums`;
DROP TABLE IF EXISTS `artists`;
DROP TABLE IF EXISTS `user_subscriptions`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `users`;

-- ============================================================================
-- USERS AND AUTHENTICATION TABLES
-- ============================================================================

-- Users table (replaces Firebase Authentication)
CREATE TABLE `users` (
  `uid` VARCHAR(36) PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(255) DEFAULT NULL,
  `photo_url` TEXT DEFAULT NULL,
  `phone_number` VARCHAR(20) DEFAULT NULL,
  `email_verified` BOOLEAN DEFAULT FALSE,
  `disabled` BOOLEAN DEFAULT FALSE,
  `google_id` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_sign_in_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_google_id` (`google_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User roles table (replaces Firestore user_roles collection)
CREATE TABLE `user_roles` (
  `uid` VARCHAR(36) PRIMARY KEY,
  `role` ENUM('admin', 'moderator', 'user') DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(36) DEFAULT NULL,
  FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User subscriptions table (replaces Firestore user_subscriptions collection)
CREATE TABLE `user_subscriptions` (
  `uid` VARCHAR(36) PRIMARY KEY,
  `subscription_tier` ENUM('guest', 'free', 'premium', 'premium_plus', 'enterprise') DEFAULT 'free',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email verification tokens
CREATE TABLE `email_verification_tokens` (
  `token` VARCHAR(64) PRIMARY KEY,
  `uid` VARCHAR(36) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE,
  INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens
CREATE TABLE `password_reset_tokens` (
  `token` VARCHAR(64) PRIMARY KEY,
  `uid` VARCHAR(36) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `used` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE,
  INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens for JWT
CREATE TABLE `refresh_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `token` VARCHAR(255) UNIQUE NOT NULL,
  `uid` VARCHAR(36) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE,
  INDEX `idx_token` (`token`),
  INDEX `idx_user` (`uid`),
  INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MEDIA CONTENT TABLES
-- ============================================================================

-- Artists table (replaces Firestore artists collection)
CREATE TABLE `artists` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `total_media` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Albums table (replaces Firestore albums collection)
CREATE TABLE `albums` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `artist_id` VARCHAR(36) DEFAULT NULL,
  `artist_name` VARCHAR(255) DEFAULT NULL,
  `cover_image_url` TEXT DEFAULT NULL,
  `year` INT DEFAULT NULL,
  `genre` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON DELETE SET NULL,
  INDEX `idx_artist` (`artist_id`),
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Media table (replaces Firestore media_content collection)
CREATE TABLE `media` (
  `id` VARCHAR(36) PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL,
  `artist` VARCHAR(255) DEFAULT NULL,
  `artist_id` VARCHAR(36) DEFAULT NULL,
  `album` VARCHAR(255) DEFAULT NULL,
  `album_id` VARCHAR(36) DEFAULT NULL,
  `genre` VARCHAR(100) DEFAULT NULL,
  `year` INT DEFAULT NULL,
  `language` VARCHAR(10) DEFAULT 'en',
  `type` ENUM('video', 'audio') NOT NULL,
  `file_path` TEXT NOT NULL,
  `thumbnail_path` TEXT DEFAULT NULL,
  `duration` INT DEFAULT NULL COMMENT 'Duration in seconds',
  `file_size` BIGINT DEFAULT NULL COMMENT 'File size in bytes',
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `views` INT DEFAULT 0,
  `content_group_id` VARCHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON DELETE SET NULL,
  INDEX `idx_type` (`type`),
  INDEX `idx_artist` (`artist`),
  INDEX `idx_artist_id` (`artist_id`),
  INDEX `idx_album_id` (`album_id`),
  INDEX `idx_language` (`language`),
  INDEX `idx_uploaded` (`uploaded_at`),
  INDEX `idx_genre` (`genre`),
  FULLTEXT INDEX `ft_search` (`title`, `artist`, `album`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- API AND SECURITY TABLES
-- ============================================================================

-- API Keys table (replaces Firestore api_keys collection)
CREATE TABLE `api_keys` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `api_key` VARCHAR(64) UNIQUE NOT NULL,
  `access_type` ENUM('PUBLIC', 'INTERNAL', 'SERVICE', 'ADMIN') DEFAULT 'PUBLIC',
  `permissions` JSON DEFAULT NULL COMMENT 'Custom permissions object',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_by_email` VARCHAR(255) DEFAULT NULL,
  `last_used_at` TIMESTAMP NULL DEFAULT NULL,
  `usage_count` INT DEFAULT 0,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_key` (`api_key`),
  INDEX `idx_active` (`is_active`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ANALYTICS AND LOGGING TABLES
-- ============================================================================

-- Analytics data (replaces Firestore analytics_requests collection)
CREATE TABLE `analytics_data` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `endpoint` VARCHAR(255) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `status_code` INT DEFAULT NULL,
  `response_time` INT DEFAULT NULL COMMENT 'Response time in milliseconds',
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `api_key_id` VARCHAR(36) DEFAULT NULL,
  `api_key_name` VARCHAR(255) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `ip_hash` VARCHAR(64) DEFAULT NULL COMMENT 'Hashed IP for privacy',
  `success` BOOLEAN DEFAULT TRUE,
  INDEX `idx_endpoint` (`endpoint`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_api_key` (`api_key_id`),
  INDEX `idx_status` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Request logs (replaces Firestore requestLogs collection)
CREATE TABLE `request_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `method` VARCHAR(10) DEFAULT NULL,
  `endpoint` VARCHAR(255) DEFAULT NULL,
  `path` VARCHAR(255) DEFAULT NULL,
  `status_code` INT DEFAULT NULL,
  `response_time` INT DEFAULT NULL COMMENT 'Response time in milliseconds',
  `api_key_id` VARCHAR(36) DEFAULT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_endpoint` (`endpoint`),
  INDEX `idx_api_key` (`api_key_id`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- USER INTERACTION TABLES
-- ============================================================================

-- User history (replaces Firestore history collection)
CREATE TABLE `user_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uid` VARCHAR(36) NOT NULL,
  `media_id` VARCHAR(36) NOT NULL,
  `watched_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `progress` INT DEFAULT 0 COMMENT 'Playback progress in seconds',
  `completed` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE,
  FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE CASCADE,
  INDEX `idx_user` (`uid`),
  INDEX `idx_media` (`media_id`),
  INDEX `idx_watched` (`watched_at`),
  UNIQUE INDEX `idx_user_media` (`uid`, `media_id`, `watched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User favorites/liked songs
CREATE TABLE `user_favorites` (
  `uid` VARCHAR(36) NOT NULL,
  `media_id` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uid`, `media_id`),
  FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE,
  FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE CASCADE,
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User playlists
CREATE TABLE `playlists` (
  `id` VARCHAR(36) PRIMARY KEY,
  `uid` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `cover_url` TEXT DEFAULT NULL,
  `is_public` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE,
  INDEX `idx_user` (`uid`),
  INDEX `idx_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `playlist_items` (
  `playlist_id` VARCHAR(36) NOT NULL,
  `media_id` VARCHAR(36) NOT NULL,
  `position` INT NOT NULL,
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`playlist_id`, `media_id`),
  FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE CASCADE,
  INDEX `idx_position` (`playlist_id`, `position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default admin user (password: admin123)
-- Note: This is a bcrypt hash of "admin123" - CHANGE THIS IN PRODUCTION!
INSERT INTO `users` (`uid`, `email`, `password_hash`, `display_name`, `email_verified`) 
VALUES (
  'admin-uid-123',
  'admin@mediacore.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5FQAZ0tFCl/Uy',
  'Admin User',
  TRUE
);

INSERT INTO `user_roles` (`uid`, `role`) 
VALUES ('admin-uid-123', 'admin');

INSERT INTO `user_subscriptions` (`uid`, `subscription_tier`) 
VALUES ('admin-uid-123', 'enterprise');

-- ============================================================================
-- SCHEMA CREATED SUCCESSFULLY
-- ============================================================================
-- MediaCore MySQL Schema has been created with all tables and default admin user
-- Default Admin: admin@mediacore.com / admin123 (CHANGE PASSWORD IN PRODUCTION!)
