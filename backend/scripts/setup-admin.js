#!/usr/bin/env node
/**
 * Setup admin user script
 * Creates admin@mediacore.com user with secure password
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const setupAdmin = async () => {
  try {
    console.log('🔧 Setting up admin user...');
    
    // Use a proper password that meets requirements: 8+ chars, uppercase, lowercase, number, special char
    const adminPassword = 'Admin@MediaCore123!';
    const adminEmail = 'admin@mediacore.com';
    const adminUid = uuidv4();
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);
    
    // Check if user already exists
    const existingUser = await db.queryOne(
      'SELECT uid FROM users WHERE email = ?',
      [adminEmail]
    );
    
    if (existingUser) {
      console.log('✅ Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user
    await db.query(
      `INSERT INTO users (uid, email, password_hash, display_name, email_verified, disabled, created_at)
       VALUES (?, ?, ?, ?, 1, 0, NOW())`,
      [adminUid, adminEmail, passwordHash, 'Admin']
    );
    console.log(`✅ Created admin user with email: ${adminEmail}`);
    
    // Create admin role
    await db.query(
      'INSERT INTO user_roles (uid, role) VALUES (?, ?)',
      [adminUid, 'admin']
    );
    console.log('✅ Assigned admin role');
    
    // Create subscription
    await db.query(
      'INSERT INTO user_subscriptions (uid, subscription_tier, created_at) VALUES (?, ?, NOW())',
      [adminUid, 'premium']
    );
    console.log('✅ Created premium subscription');
    
    // Create user presence
    await db.query(
      'INSERT INTO user_presence (userId, lastSeen, status) VALUES (?, NOW(), ?)',
      [adminUid, 'offline']
    );
    console.log('✅ Created user presence');
    
    console.log('\n🎉 Admin user setup complete!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('\n⚠️  Keep this password secure. Change it after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    process.exit(1);
  }
};

setupAdmin();
