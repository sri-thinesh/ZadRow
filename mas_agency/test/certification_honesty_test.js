/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: Certification Honesty Guard
 *
 * Root cause this suite guards against: the system reported quality results it
 * never measured — a hardcoded `overall_score: 98.5`, `wcag_passed: true`,
 * `zero_placeholders: true`, synthetic audit builders that always returned
 * `status: 'PASSED'`, and a patch log that claimed `regression_testing_passed:
 * true` without running a regression suite.
 *
 * Verifies:
 * 1. No source file asserts a certification value without a measurement
 * 2. Quality certification reports NOT_VERIFIED when no QA verdict exists
 * 3. Quality certification is derived from the real QA verdict when one exists
 * 4. Offline/synthetic audit builders never report a pass
 * 5. The remediation patch log never claims a regression pass it did not run
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WorkflowCoordinator } from '../src/engine/workflow_coordinator.js';
import { Logger, Colors } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');
const srcDir = path.join(agencyDir, 'src');

function createTestDir(name) {
  const testDir = path.join(agencyDir, 'workspace', `test_cert_${name}_${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

function cleanTestDir(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

function collectSourceFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'workspace') continue;
      collectSourceFiles(full, acc);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      acc.push(full);
    }
  }
  return acc;
}

// =====================================================================
// Test 1: No fabricated certification literals in source
// =====================================================================
async function testNoFabricatedCertificationLiterals() {
  Logger.info('Scanning src/ for certification values asserted without measurement...');

  const banned = [
    { pattern: /overall_score:\s*9[0-9](\.[0-9]+)?\s*[,}]/, label: 'hardcoded overall_score' },
    { pattern: /wcag_passed:\s*true/, label: 'hardcoded wcag_passed' },
    { pattern: /zero_placeholders:\s*true/, label: 'hardcoded zero_placeholders' },
    { pattern: /lighthouse_score:\s*\d+/, label: 'hardcoded lighthouse_score' },
    { pattern: /touch_targets_passed:\s*true/, label: 'hardcoded touch_targets_passed' },
    { pattern: /aria_roles_verified:\s*true/, label: 'hardcoded aria_roles_verified' },
    { pattern: /regression_testing_passed:\s*true/, label: 'hardcoded regression_testing_passed' },
    { pattern: /verified_status:\s*'VERIFIED_FIXED'/, label: 'unconditional VERIFIED_FIXED' },
    { pattern: /tests_passed:\s*\d+/, label: 'hardcoded tests_passed' },
    { pattern: /vulnerabilities_found:\s*0/, label: 'hardcoded vulnerabilities_found' },
  ];

  const violations = [];
  for (const file of collectSourceFiles(srcDir)) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(agencyDir, file);
    content.split('\n').forEach((line, idx) => {
      // Comments may legitimately describe the old behaviour.
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      for (const rule of banned) {
        if (rule.pattern.test(line)) {
          violations.push(`${rel}:${idx + 1} ${rule.label} -> ${trimmed}`);
        }
      }
    });
  }

  assert.deepStrictEqual(
    violations,
    [],
    `Certification values must be derived from a measurement, never hardcoded:\n${violations.join('\n')}`
  );
}

// =====================================================================
// Test 2: Certification is NOT_VERIFIED when no audit ran
// =====================================================================
async function testCertificationNotVerifiedWithoutAudit() {
  Logger.info('Verifying quality certification reports NOT_VERIFIED without a QA verdict...');
  const testDir = createTestDir('no_verdict');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
    });

    const cert = coordinator._deriveQualityCertification(null, { package_version: '2.0.0' });

    assert.strictEqual(cert.verification_status, 'NOT_VERIFIED', 'No QA verdict means no verification');
    assert.strictEqual(cert.overall_score, null, 'Score must be null, not a fabricated number');
    assert.strictEqual(cert.wcag_passed, null, 'wcag_passed must be null, not asserted true');
    assert.strictEqual(cert.zero_placeholders, null, 'zero_placeholders must be null, not asserted true');
    assert(cert.reason, 'A NOT_VERIFIED certification must explain why');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 3: Certification is derived from a real QA verdict
// =====================================================================
async function testCertificationDerivedFromRealVerdict() {
  Logger.info('Verifying quality certification derives from the real QA verdict...');
  const testDir = createTestDir('with_verdict');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
    });

    // 3a. A verdict where every audit passed -> MEASURED, score 100
    coordinator.saveArtifact('70_qa_comprehensive_verdict.json', {
      agentId: 'A70_QA_ComprehensiveDirector',
      total_defects_found: 0,
      audits: {
        wcagContrast: { passed: true },
        responsiveTouch: { passed: true },
        accessibilitySemantics: { passed: true },
        zeroPlaceholder: { passed: true, scannedFilesCount: 42 },
        syntaxAndBuild: { passed: true },
      },
    });

    const passing = coordinator._deriveQualityCertification(null, {});
    assert.strictEqual(passing.verification_status, 'MEASURED');
    assert.strictEqual(passing.overall_score, 100, 'Score must reflect the measured audits');
    assert.strictEqual(passing.wcag_passed, true);
    assert.strictEqual(passing.zero_placeholders, true);
    assert.strictEqual(passing.zero_placeholder_scanned_files, 42, 'Scanned file count must be reported');

    // 3b. A verdict where audits failed -> the score must drop, not stay fixed
    coordinator.saveArtifact('70_qa_comprehensive_verdict.json', {
      agentId: 'A70_QA_ComprehensiveDirector',
      total_defects_found: 3,
      audits: {
        wcagContrast: { passed: false },
        responsiveTouch: { passed: false },
        accessibilitySemantics: { passed: true },
        zeroPlaceholder: { passed: true, scannedFilesCount: 42 },
        syntaxAndBuild: { passed: true },
      },
    });

    const failing = coordinator._deriveQualityCertification(null, {});
    assert.strictEqual(failing.verification_status, 'MEASURED');
    assert.strictEqual(failing.overall_score, 60, 'Score must reflect the failing audits, not a fixed 98.5');
    assert.strictEqual(failing.wcag_passed, false, 'A failed contrast audit must not report wcag_passed: true');
    assert.strictEqual(failing.zero_placeholders, true);

    // 3c. A verdict with only partial audit results -> PARTIALLY_MEASURED
    coordinator.saveArtifact('70_qa_comprehensive_verdict.json', {
      audits: { wcagContrast: { passed: true } },
    });

    const partial = coordinator._deriveQualityCertification(null, {});
    assert.strictEqual(partial.verification_status, 'PARTIALLY_MEASURED');
    assert(Array.isArray(partial.unmeasured_checks) && partial.unmeasured_checks.length > 0,
      'Unmeasured checks must be named so the gap is visible');
    assert(partial.unmeasured_checks.includes('zero_placeholders'),
      'The unscanned placeholder audit must be reported as unmeasured');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 4: Synthetic audit builders never report a pass
// =====================================================================
async function testSyntheticBuildersNeverPass() {
  Logger.info('Verifying offline audit builders cannot report a pass...');
  const testDir = createTestDir('synthetic');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
    });

    const brief = { project_id: 'TEST-CERT' };
    const builders = {
      visual: coordinator._buildVisualResponsiveAudit(brief),
      accessibility: coordinator._buildAccessibilityAudit(brief),
      performance: coordinator._buildPerformanceAudit(brief),
      functional: coordinator._buildFunctionalTestReport(brief),
      security: coordinator._buildSecurityAudit(brief),
      seo: coordinator._buildSeoAudit(brief),
    };

    for (const [name, audit] of Object.entries(builders)) {
      assert.strictEqual(audit.status, 'NOT_VERIFIED',
        `Synthetic ${name} audit must not report status PASSED (got ${audit.status})`);
      assert.strictEqual(audit.synthetic, true, `Synthetic ${name} audit must be marked synthetic`);
      assert.strictEqual(audit.measurement_source, 'offline_builder',
        `Synthetic ${name} audit must name its measurement source`);
    }

    // No fabricated measurements may survive in these builders.
    assert.strictEqual(builders.visual.touch_targets_passed, null);
    assert.strictEqual(builders.visual.horizontal_overflow, null);
    assert.strictEqual(builders.accessibility.min_contrast_ratio, null);
    assert.strictEqual(builders.accessibility.aria_roles_verified, null);
    assert.strictEqual(builders.performance.lighthouse_score, null);
    assert.strictEqual(builders.performance.metrics.lcp, null);
    assert.strictEqual(builders.functional.tests_passed, null);
    assert.strictEqual(builders.security.vulnerabilities_found, null);
    assert.strictEqual(builders.seo.meta_tags_present, null);
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 5: Patch log never claims a regression pass it did not run
// =====================================================================
async function testPatchLogHonesty() {
  Logger.info('Verifying the remediation patch log reports only measured outcomes...');
  const testDir = createTestDir('patchlog');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
    });

    const triageMatrix = {
      project_id: 'TEST-CERT',
      total_tickets: 1,
      tickets: [
        {
          ticket_id: 'DEF-TEST-01',
          priority: 'P1',
          assigned_agent: 'A53',
          target_file: 'src/app/globals.css',
          recommended_fix: 'Raise contrast ratio',
        },
      ],
    };

    // 5a. No retest performed -> must not claim a pass
    const unverified = coordinator._buildRemediationPatchLog(triageMatrix, 1);
    assert.strictEqual(unverified.regression_testing_passed, null,
      'Without a retest the patch log must not claim regression_testing_passed: true');
    assert.strictEqual(unverified.regression_testing_status, 'NOT_RUN');
    assert.strictEqual(unverified.patches[0].verified_status, 'DISPATCHED_UNVERIFIED',
      'Dispatch alone is not verification');

    // 5b. Retest ran and failed -> must report the failure
    const failed = coordinator._buildRemediationPatchLog(triageMatrix, 1, { passed: false });
    assert.strictEqual(failed.regression_testing_passed, false);
    assert.strictEqual(failed.regression_testing_status, 'FAILED');
    assert.strictEqual(failed.patches[0].verified_status, 'DISPATCHED_UNVERIFIED');

    // 5c. Retest ran and passed -> only then may a fix be called verified
    const passed = coordinator._buildRemediationPatchLog(triageMatrix, 1, { passed: true });
    assert.strictEqual(passed.regression_testing_passed, true);
    assert.strictEqual(passed.regression_testing_status, 'PASSED');
    assert.strictEqual(passed.patches[0].verified_status, 'VERIFIED_FIXED');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 6: A skipped phase does not report a pass
// =====================================================================
async function testSkippedPhaseDoesNotReportPass() {
  Logger.info('Verifying a skipped/detached phase does not report a pass...');
  const testDir = createTestDir('skip');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
    });

    const result = coordinator._skipPhase(6, 'Detached from execution scope');
    assert.strictEqual(result.passed, null,
      'A phase that never ran its gate must not report passed: true');
    assert.strictEqual(result.skipped, true);
    assert.strictEqual(result.detached, true);
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test Runner
// =====================================================================
async function runAllTests() {
  console.log('\n====================================================');
  console.log('   MAS 2.0 CERTIFICATION HONESTY GUARD TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  const tests = [
    { name: 'No Fabricated Certification Literals In Source', fn: testNoFabricatedCertificationLiterals },
    { name: 'Certification Is NOT_VERIFIED Without An Audit', fn: testCertificationNotVerifiedWithoutAudit },
    { name: 'Certification Is Derived From The Real QA Verdict', fn: testCertificationDerivedFromRealVerdict },
    { name: 'Synthetic Audit Builders Never Report A Pass', fn: testSyntheticBuildersNeverPass },
    { name: 'Remediation Patch Log Reports Only Measured Outcomes', fn: testPatchLogHonesty },
    { name: 'Skipped Phase Does Not Report A Pass', fn: testSkippedPhaseDoesNotReportPass },
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
  console.log(`   ALL ${passedCount}/${tests.length} CERTIFICATION HONESTY TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
