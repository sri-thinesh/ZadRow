/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: Product Identity Guard
 *
 * Root cause this suite guards against: the author's own project was entangled
 * with the product. `code_synthesizer.js` carried a second, hidden deliverable —
 * the author's personal portfolio — behind a `ZADROW_AUTHOR_DEMO` env flag, and
 * the shipped persistence library defaulted to a hardcoded, publicly-known
 * administrative credential.
 *
 * Verifies:
 * 1. No source file carries the author's identity or the retired default credential
 * 2. A generated site never contains the author's identity
 * 3. A generated site never ships a hardcoded default admin credential
 * 4. The author-demo escape hatch no longer exists
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CodeSynthesizer } from '../src/engine/code_synthesizer.js';
import { Logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const srcDir = path.join(agencyDir, 'src');

// The author's personal identity must never be able to reach a client deliverable.
const AUTHOR_TOKENS = ['Sri Thinesh', 'SRI THINESH', 'sri-thinesh', 'Salem, Tamil Nadu'];
// Credentials that were previously shipped as defaults.
const RETIRED_CREDENTIALS = ['zadrow-admin-secure-key-2026', 'aura-admin-secure-key-2026'];
// The env flag that used to swap in the author's personal portfolio.
const AUTHOR_FLAG = 'ZADROW_AUTHOR_DEMO';

function collectFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'workspace', 'output', '.next'].includes(entry.name)) continue;
      collectFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function createTestDir(name) {
  const dir = path.join(agencyDir, 'workspace', `test_identity_${name}_${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanTestDir(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

// =====================================================================
// Test 1: No author identity or retired credential in source
// =====================================================================
async function testSourceHasNoAuthorIdentity() {
  Logger.info('Scanning src/ for author identity and retired credentials...');

  const violations = [];
  for (const file of collectFiles(srcDir)) {
    // The negative-assertion strings live in tests, not in src/, so any hit here
    // is a real leak.
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(agencyDir, file);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const token of [...AUTHOR_TOKENS, ...RETIRED_CREDENTIALS, AUTHOR_FLAG]) {
        if (line.includes(token)) {
          violations.push(`${rel}:${idx + 1} contains "${token}" -> ${line.trim()}`);
        }
      }
    });
  }

  assert.deepStrictEqual(
    violations,
    [],
    `The author's project must not live inside the product:\n${violations.join('\n')}`
  );
}

// =====================================================================
// Test 2 & 3: A generated site carries neither identity nor credential
// =====================================================================
async function testGeneratedSiteIsClean() {
  Logger.info('Generating a site and scanning it for author identity and shipped credentials...');
  const testDir = createTestDir('generate');
  const siteDir = path.join(testDir, 'website');

  try {
    const synthesizer = new CodeSynthesizer({
      agencyDir,
      artifactsDir: testDir,
      outputDir: siteDir,
    });

    await synthesizer.synthesize({
      brandName: 'NORTHWIND ATOLL',
      clientVision: 'A coastal research institute publishing open oceanographic data.',
      project_name: 'Northwind Atoll',
      backendRequired: true,
    });

    const generated = collectFiles(siteDir);
    assert(generated.length > 0, 'Synthesis must produce files');

    for (const file of generated) {
      const content = fs.readFileSync(file, 'utf8');
      const rel = path.relative(siteDir, file);
      for (const token of [...AUTHOR_TOKENS, ...RETIRED_CREDENTIALS, AUTHOR_FLAG]) {
        assert(
          !content.includes(token),
          `Generated file ${rel} leaked "${token}" into the client deliverable`
        );
      }
    }
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 4: The author-demo escape hatch is gone
// =====================================================================
async function testAuthorDemoFlagIsInert() {
  Logger.info('Verifying the author-demo env flag no longer changes the output...');
  const testDir = createTestDir('flag');
  const cleanSite = path.join(testDir, 'clean');
  const flaggedSite = path.join(testDir, 'flagged');

  try {
    const brief = {
      brandName: 'MERIDIAN FOUNDRY',
      clientVision: 'Precision metalwork studio.',
      project_name: 'Meridian Foundry',
    };

    const cleanSynth = new CodeSynthesizer({
      agencyDir,
      artifactsDir: path.join(testDir, 'artifacts_clean'),
      outputDir: cleanSite,
    });
    await cleanSynth.synthesize({ ...brief });

    process.env.ZADROW_AUTHOR_DEMO = '1';
    try {
      const flaggedSynth = new CodeSynthesizer({
        agencyDir,
        artifactsDir: path.join(testDir, 'artifacts_flagged'),
        outputDir: flaggedSite,
      });
      await flaggedSynth.synthesize({ ...brief });
    } finally {
      delete process.env.ZADROW_AUTHOR_DEMO;
    }

    // The flag must be inert: setting it may not change the deliverable at all.
    const cleanFiles = collectFiles(cleanSite).map((f) => path.relative(cleanSite, f)).sort();
    const flaggedFiles = collectFiles(flaggedSite).map((f) => path.relative(flaggedSite, f)).sort();
    assert.deepStrictEqual(
      flaggedFiles,
      cleanFiles,
      'Setting ZADROW_AUTHOR_DEMO must not change which files are generated'
    );

    for (const rel of cleanFiles) {
      const a = fs.readFileSync(path.join(cleanSite, rel), 'utf8');
      const b = fs.readFileSync(path.join(flaggedSite, rel), 'utf8');
      assert.strictEqual(
        b,
        a,
        `Setting ZADROW_AUTHOR_DEMO changed the contents of ${rel} — the author-demo branch still exists`
      );
    }
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test Runner
// =====================================================================
async function runAllTests() {
  console.log('\n====================================================');
  console.log('   MAS 2.0 PRODUCT IDENTITY GUARD TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  const tests = [
    { name: 'Source Carries No Author Identity Or Retired Credential', fn: testSourceHasNoAuthorIdentity },
    { name: 'Generated Site Leaks Neither Identity Nor Credential', fn: testGeneratedSiteIsClean },
    { name: 'Author-Demo Env Flag Is Inert', fn: testAuthorDemoFlagIsInert },
  ];

  for (const t of tests) {
    try {
      await t.fn();
      passedCount++;
    } catch (err) {
      console.error(`\nTEST FAILURE in "${t.name}":`, err);
      process.exit(1);
    }
  }

  console.log('\n====================================================');
  console.log(`   ALL ${passedCount}/${tests.length} PRODUCT IDENTITY TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
