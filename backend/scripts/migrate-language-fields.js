/**
 * Migration Script: Add Language Fields to Existing Media
 * 
 * This script adds default language ('en') to existing
 * media records that don't have this field, and ensures contentGroupId is set.
 * 
 * Run this script once after deploying the multi-language API updates.
 * 
 * Usage:
 *   node scripts/migrate-language-fields.js
 * 
 * Options:
 *   --dry-run    Preview changes without actually updating records
 */

const { query } = require('../config/db');
require('dotenv').config();

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

/**
 * Migrate media records to include language fields
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
    // Get all media records without language set
    const [mediaWithoutLanguage] = await query(
      `SELECT id, title, language, contentGroupId FROM media 
       WHERE language IS NULL OR language = '' OR contentGroupId IS NULL OR contentGroupId = ''`
    );
    
    console.log(`📊 Found ${mediaWithoutLanguage.length} total media records`);
    console.log('');

    // Track records to update
    const recordsToUpdate = [];
    const recordsAlreadyMigrated = [];

    for (const record of mediaWithoutLanguage) {
      const needsLanguage = !record.language;
      const needsContentGroupId = !record.contentGroupId;
      
      if (needsLanguage || needsContentGroupId) {
        recordsToUpdate.push({
          id: record.id,
          currentData: {
            title: record.title,
            language: record.language,
            contentGroupId: record.contentGroupId
          },
          updates: {
            language: 'en',
            contentGroupId: `cg_${record.id}`
          }
        });
      } else {
        recordsAlreadyMigrated.push({
          id: record.id,
          language: record.language,
          contentGroupId: record.contentGroupId
        });
      }
    }

    if (recordsAlreadyMigrated.length > 0) {
      console.log(`✅ Already migrated: ${recordsAlreadyMigrated.length}`);
      console.log('');
    }

    if (recordsToUpdate.length === 0) {
      console.log('✨ All media records are already fully migrated!');
      return;
    }

    console.log(`📝 Records to update: ${recordsToUpdate.length}`);
    console.log('');

    // Show preview
    console.log('─── Preview of Changes ─────────────────────────────');
    recordsToUpdate.slice(0, 5).forEach((record, idx) => {
      console.log(`\n${idx + 1}. "${record.currentData.title}" (ID: ${record.id})`);
      console.log(`   Current: language=${record.currentData.language || 'NULL'}, contentGroupId=${record.currentData.contentGroupId || 'NULL'}`);
      console.log(`   Will be: language=${record.updates.language}, contentGroupId=${record.updates.contentGroupId}`);
    });

    if (recordsToUpdate.length > 5) {
      console.log(`\n   ... and ${recordsToUpdate.length - 5} more records`);
    }

    console.log('\n─────────────────────────────────────────────────');

    if (isDryRun) {
      console.log('\n✅ Dry run complete - no changes made');
      console.log(`\n📊 Summary:`);
      console.log(`   • Would update: ${recordsToUpdate.length} records`);
      console.log(`   • Already migrated: ${recordsAlreadyMigrated.length} records`);
      console.log(`   • Total media: ${mediaWithoutLanguage.length + recordsAlreadyMigrated.length}`);
      return;
    }

    // Perform actual migration
    console.log('\n� Starting migration...\n');

    let successCount = 0;
    let failCount = 0;

    for (const record of recordsToUpdate) {
      try {
        await query(
          `UPDATE media SET language = ?, contentGroupId = ? WHERE id = ?`,
          [record.updates.language, record.updates.contentGroupId, record.id]
        );
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`✅ Updated ${successCount}/${recordsToUpdate.length} records...`);
        }
      } catch (err) {
        failCount++;
        console.error(`❌ Failed to update record ${record.id}:`, err.message);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ Migration Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully updated: ${successCount} records`);
    if (failCount > 0) {
      console.log(`   ❌ Failed: ${failCount} records`);
    }
    console.log(`   📝 Already migrated: ${recordsAlreadyMigrated.length} records`);
    console.log('');
    console.log('🎉 All media records now have language and contentGroupId fields!');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateMediaLanguage().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { migrateMediaLanguage };
