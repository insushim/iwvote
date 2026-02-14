/**
 * Multi-tenant migration script
 *
 * Adds schoolId to existing documents that don't have it:
 * - users: schoolId = user.uid (legacy convention)
 * - votes, voterCodes, hashChain, auditLogs: schoolId from election.schoolId
 * - schools: joinCode (8-char random)
 *
 * Usage:
 *   npx ts-node scripts/migrate-multi-tenant.ts
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account key
 *   - Or run from a machine with Firebase Admin SDK default credentials
 */

import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const JOIN_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateJoinCode(): string {
  const crypto = require('crypto');
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += JOIN_CODE_CHARSET[bytes[i] % JOIN_CODE_CHARSET.length];
  }
  return code;
}

async function migrateUsers() {
  console.log('=== Migrating users ===');
  const usersSnap = await db.collection('users').get();
  let updated = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (!data.schoolId) {
      // Legacy: schoolId was user.uid
      await doc.ref.update({ schoolId: doc.id });
      updated++;
    }
  }

  console.log(`  Updated ${updated}/${usersSnap.size} users`);
}

async function migrateSchools() {
  console.log('=== Migrating schools ===');
  const schoolsSnap = await db.collection('schools').get();
  let updated = 0;

  // Collect existing joinCodes to avoid duplicates
  const existingCodes = new Set<string>();
  for (const doc of schoolsSnap.docs) {
    const data = doc.data();
    if (data.joinCode) {
      existingCodes.add(data.joinCode);
    }
  }

  for (const doc of schoolsSnap.docs) {
    const data = doc.data();
    if (!data.joinCode) {
      let code: string;
      do {
        code = generateJoinCode();
      } while (existingCodes.has(code));
      existingCodes.add(code);

      await doc.ref.update({
        joinCode: code,
        joinCodeExpiresAt: null,
      });
      updated++;
    }
  }

  console.log(`  Updated ${updated}/${schoolsSnap.size} schools`);
}

async function migrateElectionDependents() {
  console.log('=== Building election → schoolId map ===');
  const electionsSnap = await db.collection('elections').get();
  const electionSchoolMap = new Map<string, string>();

  for (const doc of electionsSnap.docs) {
    const data = doc.data();
    const schoolId = data.schoolId || '';
    electionSchoolMap.set(doc.id, schoolId);
  }

  console.log(`  Found ${electionsSnap.size} elections`);

  // Migrate votes
  console.log('=== Migrating votes ===');
  const votesSnap = await db.collection('votes').get();
  let votesUpdated = 0;
  const votesBatch: admin.firestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let batchCount = 0;

  for (const doc of votesSnap.docs) {
    const data = doc.data();
    if (!data.schoolId) {
      const schoolId = electionSchoolMap.get(data.electionId) || '';
      currentBatch.update(doc.ref, { schoolId });
      votesUpdated++;
      batchCount++;

      if (batchCount >= 499) {
        votesBatch.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) votesBatch.push(currentBatch);

  for (const batch of votesBatch) {
    await batch.commit();
  }
  console.log(`  Updated ${votesUpdated}/${votesSnap.size} votes`);

  // Migrate voterCodes
  console.log('=== Migrating voterCodes ===');
  const codesSnap = await db.collection('voterCodes').get();
  let codesUpdated = 0;
  const codesBatches: admin.firestore.WriteBatch[] = [];
  currentBatch = db.batch();
  batchCount = 0;

  for (const doc of codesSnap.docs) {
    const data = doc.data();
    if (!data.schoolId) {
      const schoolId = electionSchoolMap.get(data.electionId) || '';
      currentBatch.update(doc.ref, { schoolId });
      codesUpdated++;
      batchCount++;

      if (batchCount >= 499) {
        codesBatches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) codesBatches.push(currentBatch);

  for (const batch of codesBatches) {
    await batch.commit();
  }
  console.log(`  Updated ${codesUpdated}/${codesSnap.size} voterCodes`);

  // Migrate hashChain
  console.log('=== Migrating hashChain ===');
  const chainSnap = await db.collection('hashChain').get();
  let chainUpdated = 0;
  const chainBatches: admin.firestore.WriteBatch[] = [];
  currentBatch = db.batch();
  batchCount = 0;

  for (const doc of chainSnap.docs) {
    const data = doc.data();
    if (!data.schoolId) {
      const schoolId = electionSchoolMap.get(data.electionId) || '';
      currentBatch.update(doc.ref, { schoolId });
      chainUpdated++;
      batchCount++;

      if (batchCount >= 499) {
        chainBatches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) chainBatches.push(currentBatch);

  for (const batch of chainBatches) {
    await batch.commit();
  }
  console.log(`  Updated ${chainUpdated}/${chainSnap.size} hashChain blocks`);

  // Migrate auditLogs
  console.log('=== Migrating auditLogs ===');
  const logsSnap = await db.collection('auditLogs').get();
  let logsUpdated = 0;
  const logsBatches: admin.firestore.WriteBatch[] = [];
  currentBatch = db.batch();
  batchCount = 0;

  for (const doc of logsSnap.docs) {
    const data = doc.data();
    if (!data.schoolId) {
      const schoolId = electionSchoolMap.get(data.electionId) || '';
      currentBatch.update(doc.ref, { schoolId });
      logsUpdated++;
      batchCount++;

      if (batchCount >= 499) {
        logsBatches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) logsBatches.push(currentBatch);

  for (const batch of logsBatches) {
    await batch.commit();
  }
  console.log(`  Updated ${logsUpdated}/${logsSnap.size} auditLogs`);
}

async function main() {
  console.log('Starting multi-tenant migration...\n');

  await migrateUsers();
  await migrateSchools();
  await migrateElectionDependents();

  console.log('\nMigration complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
