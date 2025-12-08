/**
 * Firebase Admin SDK Configuration
 * 
 * Uses environment variables for sensitive credentials
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Validate and prepare private key
const preparePrivateKey = () => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!privateKey) {
    console.warn('⚠️ FIREBASE_PRIVATE_KEY environment variable is not set');
    return undefined;
  }

  // Handle various escaping formats
  let key = privateKey;
  
  // Replace escaped newlines
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  
  // Ensure it starts with BEGIN PRIVATE KEY
  if (!key.includes('BEGIN PRIVATE KEY') && !key.includes('BEGIN RSA PRIVATE KEY')) {
    console.warn('⚠️ Private key format may be invalid');
  }
  
  return key;
};

// Firebase Service Account Credentials from environment variables
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID || "eckhart-tolle-7a33f",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": preparePrivateKey(),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@eckhart-tolle-7a33f.iam.gserviceaccount.com",
  "client_id": process.env.FIREBASE_CLIENT_ID || "107429782563275261448",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@eckhart-tolle-7a33f.iam.gserviceaccount.com")}`,
  "universe_domain": "googleapis.com"
};

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin;
  }

  // Validate required credentials
  if (!serviceAccount.private_key) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable must be set');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('   Project:', serviceAccount.project_id);
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    throw error;
  }

  return admin;
};

// Initialize on module load
initializeFirebase();

// Export the admin instance and Firestore reference
module.exports = {
  admin,
  db: admin.firestore(),
  auth: admin.auth()
};
