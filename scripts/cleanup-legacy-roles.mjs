#!/usr/bin/env node

/**
 * Cleanup Script: Delete users with legacy nurse/admin roles
 * 
 * Usage:
 *   node scripts/cleanup-legacy-roles.mjs --dry-run    # Preview only
 *   node scripts/cleanup-legacy-roles.mjs --apply      # Apply deletions
 * 
 * Requirements:
 *   - Set FIREBASE_SERVICE_ACCOUNT_JSON env variable to path of service account JSON
 *   - npm install firebase-admin
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const LEGACY_ROLES = ['nurse', 'admin'];
const isDryRun = !process.argv.includes('--apply');

// Initialize Firebase Admin SDK
function initializeFirebase() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountPath) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set');
    console.error('   Set it to the path of your service account JSON file');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    process.exit(1);
  }
}

// Main cleanup function
async function cleanupLegacyRoles() {
  console.log(`🔍 Scanning for users with legacy roles: ${LEGACY_ROLES.join(', ')}`);
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'APPLY (will delete)'}\n`);

  const db = admin.firestore();
  const auth = admin.auth();
  
  try {
    // Query all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    const legacyUsers = [];

    // Filter users with legacy roles
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (LEGACY_ROLES.includes(data.role)) {
        legacyUsers.push({
          uid: doc.id,
          email: data.email,
          role: data.role,
          displayName: data.displayName || 'N/A'
        });
      }
    });

    if (legacyUsers.length === 0) {
      console.log('✅ No users with legacy roles found. Database is clean!');
      return;
    }

    // Display users to be deleted
    console.log(`📊 Found ${legacyUsers.length} user(s) with legacy roles:\n`);
    legacyUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName} (${user.email})`);
      console.log(`   Role: ${user.role}, UID: ${user.uid}\n`);
    });

    if (isDryRun) {
      console.log('🔒 DRY RUN MODE: No deletions performed');
      console.log('   Run with --apply flag to delete these users');
      return;
    }

    // Apply deletions
    console.log('🗑️  Deleting users...\n');
    let deletedCount = 0;
    let failedCount = 0;

    for (const user of legacyUsers) {
      try {
        // Delete from Firestore
        await db.collection('users').doc(user.uid).delete();
        
        // Delete from Firebase Auth
        await auth.deleteUser(user.uid);
        
        console.log(`✅ Deleted: ${user.email} (${user.role})`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete ${user.email}:`, error.message);
        failedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Deleted: ${deletedCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log(`   Total: ${legacyUsers.length}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run the script
initializeFirebase();
cleanupLegacyRoles()
  .then(() => {
    console.log('\n✅ Cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
