-- Fix subscription tiers to match frontend configuration
-- Run this script to update the user_subscriptions table

USE masakali_mediacore;

-- Update the ENUM to include all subscription tiers
ALTER TABLE `user_subscriptions` 
MODIFY COLUMN `subscription_tier` ENUM('guest', 'free', 'premium', 'premium_plus', 'enterprise') DEFAULT 'free';

-- Update any empty subscription_tier values to 'free'
UPDATE `user_subscriptions` 
SET `subscription_tier` = 'free' 
WHERE `subscription_tier` = '' OR `subscription_tier` IS NULL;

-- Verify the change
SELECT COLUMN_NAME, COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'masakali_mediacore' 
  AND TABLE_NAME = 'user_subscriptions' 
  AND COLUMN_NAME = 'subscription_tier';

SELECT 'Subscription tiers updated successfully!' AS message;
