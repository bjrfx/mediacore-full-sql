/**
 * Migration Script: Add Language Fields to Existing Media
 * 
 * This script adds default language ('en') and contentGroupId to existing
 * media documents that don't have these fields.
 * 
 * Run this script once after deploying the multi-language API updates.
 * 
 * Usage:
 *   node scripts/migrate-language-fields.js
 * 
 * Options:
 *   --dry-run    Preview changes without actually updating documents
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

// Firebase Service Account Credentials
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID || "eckhart-tolle-7a33f",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@eckhart-tolle-7a33f.iam.gserviceaccount.com",
  "client_id": process.env.FIREBASE_CLIENT_ID || "107429782563275261448",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@eckhart-tolle-7a33f.iam.gserviceaccount.com")}`,
  "universe_domain": "googleapis.com"
};

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const db = admin.firestore();

/**
 * Migrate media documents to include language fields
 */
async function migrateMediaLanguage() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🔄 Media Language Migration Script');
  console.log('═══════════════════════════════════════════════════════');
  
  if (isDryRun) {
    console.log('  ⚠️  DRY RUN MODE - No changes will be made');
  }
  console.log('');

  try {
    // Get all media documents
    const snapshot = await db.collection('media_content').get();
    
    console.log(`📊 Found ${snapshot.size} total media documents`);
    console.log('');

    // Track documents to update
    const documentsToUpdate = [];
    const documentsAlreadyMigrated = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check if document needs migration
      const needsLanguage = !data.language;
      const needsContentGroupId = !data.contentGroupId;
      
      if (needsLanguage || needsContentGroupId) {
        documentsToUpdate.push({
          id: doc.id,
          ref: doc.ref,
          currentData: {
            title: data.title,
            language: data.language,
            contentGroupId: data.contentGroupId
          },
          updates: {
            language: needsLanguage ? 'en' : data.language,
            contentGroupId: needsContentGroupId ? `cg_${doc.id}` : data.contentGroupId
          }
        });
      } else {
        documentsAlreadyMigrated.push({
          id: doc.id,
          language: data.language,
          contentGroupId: data.contentGroupId
        });
      }
    });

    console.log(`✅ ${documentsAlreadyMigrated.length} documents already have language fields`);
    console.log(`📝 ${documentsToUpdate.length} documents need migration`);
    console.log('');

    if (documentsToUpdate.length === 0) {
      console.log('✨ All documents are already migrated. Nothing to do!');
      return;
    }

    // Preview changes
    console.log('📋 Documents to be updated:');
    console.log('───────────────────────────────────────────────────────');
    documentsToUpdate.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.id}`);
      console.log(`     Title: "${doc.currentData.title || 'N/A'}"`);
      console.log(`     Language: ${doc.currentData.language || '(none)'} → ${doc.updates.language}`);
      console.log(`     ContentGroupId: ${doc.currentData.contentGroupId || '(none)'} → ${doc.updates.contentGroupId}`);
    });
    console.log('───────────────────────────────────────────────────────');
    console.log('');

    if (isDryRun) {
      console.log('⚠️  DRY RUN - No changes were made.');
      console.log('   Run without --dry-run to apply these changes.');
      return;
    }

    // Perform the migration in batches
    console.log('🚀 Starting migration...');
    
    const BATCH_SIZE = 500; // Firestore batch limit
    let batchCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < documentsToUpdate.length; i += BATCH_SIZE) {
      const batchDocs = documentsToUpdate.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      batchDocs.forEach(doc => {
        batch.update(doc.ref, {
          language: doc.updates.language,
          contentGroupId: doc.updates.contentGroupId,
          updatedAt: new Date().toISOString(),
          migratedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      batchCount++;
      updatedCount += batchDocs.length;

      console.log(`   ✅ Batch ${batchCount}: Updated ${batchDocs.length} documents (Total: ${updatedCount}/${documentsToUpdate.length})`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  ✅ Migration Complete!`);
    console.log(`     Updated: ${updatedCount} documents`);
    console.log(`     Batches: ${batchCount}`);
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateMediaLanguage()
  .then(() => {
    console.log('');
    console.log('🎉 Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
