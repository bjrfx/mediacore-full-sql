-- Ensure admin user exists with proper role
-- Run this script if admin user doesn't exist

-- First, check if admin@mediacore.com exists
-- If not, this will create it with password: admin123

-- Create admin user if doesn't exist
INSERT IGNORE INTO users (uid, email, password_hash, display_name, email_verified, disabled, created_at)
VALUES (
  'admin-user-uid-12345',
  'admin@mediacore.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CMQn1a', -- bcrypt hash of 'admin123'
  'Admin User',
  1,
  0,
  NOW()
);

-- Ensure admin user has admin role
INSERT IGNORE INTO user_roles (uid, role)
VALUES ('admin-user-uid-12345', 'admin');

-- Ensure admin user has a subscription
INSERT IGNORE INTO user_subscriptions (uid, subscription_tier, created_at)
VALUES ('admin-user-uid-12345', 'premium', NOW());

-- Ensure admin user is in presence
INSERT IGNORE INTO user_presence (userId, lastSeen, status)
VALUES ('admin-user-uid-12345', NOW(), 'offline')
ON DUPLICATE KEY UPDATE lastSeen = NOW();
