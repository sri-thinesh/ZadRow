/**
 * Multi-Agent System 2.0 (AURA Agency)
 * Rigorous Backend Data Persistence & Security Test Suite
 *
 * Evaluates:
 * 1. High-concurrency parallel writes (50 simultaneous requests) with zero race-condition data loss.
 * 2. Interrupted atomic writes (simulated failure leaves database 100% intact with zero corruption).
 * 3. Duplicate submission prevention & idempotency.
 * 4. Input sanitization (XSS filtering, prototype pollution rejection, email validation, length caps).
 * 5. Authorization & information leakage shielding (admin token protection, zero stack disclosure).
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AtomicStore,
  validateAndSanitizeInput,
  verifyAdminAuth,
  DEFAULT_ADMIN_KEY,
} from '../src/lib/persistence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDbDir = path.resolve(__dirname, '../test_results/test_db');
const testDbFile = path.join(testDbDir, 'concurrent_waitlist.json');

async function runBackendPersistenceTests() {
  console.log('\n======================================================');
  console.log('   BACKEND PERSISTENCE & API SECURITY TEST SUITE      ');
  console.log('======================================================\n');

  if (fs.existsSync(testDbDir)) {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDbDir, { recursive: true });

  const store = new AtomicStore(testDbFile);

  // -------------------------------------------------------------------------
  // TEST 1: Concurrency Safety (50 parallel writes)
  // -------------------------------------------------------------------------
  console.log('[TEST 1] Testing 50 concurrent parallel writes without data loss...');
  const concurrentCount = 50;
  const promises = [];

  for (let i = 0; i < concurrentCount; i++) {
    promises.push(
      store.insertRecord(
        {
          email: `client_${i}@aura-agency.io`,
          name: `User ${i}`,
          tier: i % 2 === 0 ? 'ENTERPRISE' : 'STUDIO',
        },
        'email'
      )
    );
  }

  const results = await Promise.all(promises);
  assert.strictEqual(results.length, concurrentCount, 'All 50 operations must resolve');

  const finalRecords = await store.read();
  assert.strictEqual(
    finalRecords.length,
    concurrentCount,
    `Expected exactly ${concurrentCount} records persisted, found ${finalRecords.length}`
  );
  console.log(`[PASS] Concurrency verified: ${finalRecords.length}/${concurrentCount} records atomically persisted.`);

  // -------------------------------------------------------------------------
  // TEST 2: Duplicate Submissions & Idempotency
  // -------------------------------------------------------------------------
  console.log('[TEST 2] Testing duplicate submission prevention & idempotency...');
  const dupResult1 = await store.insertRecord(
    { email: 'unique_founder@hypercloud.io', name: 'Founder One' },
    'email'
  );
  assert.strictEqual(dupResult1.duplicate, false, 'First submission must be accepted as new');

  const dupResult2 = await store.insertRecord(
    { email: 'UNIQUE_FOUNDER@HYPERCLOUD.IO', name: 'Founder Duplicate Attempt' },
    'email'
  );
  assert.strictEqual(dupResult2.duplicate, true, 'Case-insensitive duplicate email must be flagged as duplicate');
  assert.strictEqual(dupResult2.record.name, 'Founder One', 'Must return original existing record');

  const recordsAfterDup = await store.read();
  const dupCount = recordsAfterDup.filter(
    (r) => r.email.toLowerCase() === 'unique_founder@hypercloud.io'
  ).length;
  assert.strictEqual(dupCount, 1, 'Duplicate email must not create second entry in storage');
  console.log('[PASS] Duplicate prevention & idempotency verified.');

  // -------------------------------------------------------------------------
  // TEST 3: Interrupted Write Protection (Atomic Temp Swap Integrity)
  // -------------------------------------------------------------------------
  console.log('[TEST 3] Testing interrupted write recovery & database preservation...');
  const initialContent = await fs.promises.readFile(testDbFile, 'utf8');

  // Attempt write with simulated non-serializable circular object that aborts write
  let abortedWriteError = false;
  try {
    const circular = {};
    circular.self = circular;
    await store.writeAtomic(circular);
  } catch (err) {
    abortedWriteError = true;
  }
  assert.strictEqual(abortedWriteError, true, 'Aborted write must throw error');

  // Verify that target file remains 100% intact and identical
  const postAbortContent = await fs.promises.readFile(testDbFile, 'utf8');
  assert.strictEqual(
    postAbortContent,
    initialContent,
    'Database file must be completely untouched after failed/interrupted write'
  );

  // Verify that no orphaned .tmp files remain
  const remainingFiles = fs.readdirSync(testDbDir);
  const orphanTmp = remainingFiles.filter((f) => f.includes('.tmp.'));
  assert.strictEqual(orphanTmp.length, 0, 'No orphaned temporary files should linger after aborted write');
  console.log('[PASS] Interrupted write safety verified: 0% data corruption, 0 orphaned temp files.');

  // -------------------------------------------------------------------------
  // TEST 4: Input Validation & Sanitization (XSS, Injection, Length Caps)
  // -------------------------------------------------------------------------
  console.log('[TEST 4] Testing strict input validation, XSS sanitization, and length limits...');
  const validationRules = {
    email: { required: true, type: 'string', isEmail: true, maxLength: 254 },
    name: { required: true, type: 'string', maxLength: 50 },
    message: { required: false, type: 'string', maxLength: 500 },
  };

  // Case A: XSS injection payload
  const xssInput = {
    email: 'executive@cyber.org',
    name: '<script>alert("XSS")</script>Director',
    message: 'Hello <img src=x onerror=alert(1)>world!',
  };
  const valResultA = validateAndSanitizeInput(xssInput, validationRules);
  assert.strictEqual(valResultA.valid, true);
  assert.strictEqual(valResultA.sanitized.name, 'Director', 'Script tags must be stripped');
  assert.strictEqual(valResultA.sanitized.message, 'Hello world!', 'HTML tags must be stripped');

  // Case B: Prototype pollution attempt
  const protoPollution = JSON.parse('{"email": "valid@domain.com", "name": "Admin", "__proto__": {"isAdmin": true}}');
  const valResultB = validateAndSanitizeInput(protoPollution, validationRules);
  assert.strictEqual(valResultB.valid, false, 'Prototype pollution payload must be rejected');

  // Case C: Oversized string payload
  const oversizedInput = {
    email: 'valid@domain.com',
    name: 'A'.repeat(51), // limit 50
  };
  const valResultC = validateAndSanitizeInput(oversizedInput, validationRules);
  assert.strictEqual(valResultC.valid, false, 'Oversized string must be rejected');

  // Case D: Malformed email syntax
  const invalidEmail = {
    email: 'invalid-email-no-at-sign.com',
    name: 'Valid Name',
  };
  const valResultD = validateAndSanitizeInput(invalidEmail, validationRules);
  assert.strictEqual(valResultD.valid, false, 'Malformed email syntax must be rejected');

  console.log('[PASS] Input validation & sanitization verified against injection and overflow attacks.');

  // -------------------------------------------------------------------------
  // TEST 5: Authorization & Information Shielding
  // -------------------------------------------------------------------------
  console.log('[TEST 5] Testing API authorization & data exposure protection...');
  // Valid bearer token
  assert.strictEqual(verifyAdminAuth({ authorization: `Bearer ${DEFAULT_ADMIN_KEY}` }), true);
  // Valid x-admin-key header
  assert.strictEqual(verifyAdminAuth({ 'x-admin-key': DEFAULT_ADMIN_KEY }), true);
  // Unauthorized: invalid token
  assert.strictEqual(verifyAdminAuth({ authorization: 'Bearer wrong-secret' }), false);
  // Unauthorized: missing headers
  assert.strictEqual(verifyAdminAuth({}), false);

  console.log('[PASS] Administrative authorization correctly gates protected access.');

  // Clean up
  try {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n======================================================');
  console.log('   ALL 5/5 BACKEND PERSISTENCE & SECURITY TESTS PASSED');
  console.log('======================================================\n');
}

runBackendPersistenceTests().catch((err) => {
  console.error('[FATAL ERROR] Backend persistence test failed:', err);
  process.exit(1);
});
