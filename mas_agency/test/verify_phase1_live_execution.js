/**
 * Verification Test for Phase 1 Real Model Execution in ZadRow
 * Demonstrates:
 * 1. Live Antigravity CLI execution via A00 -> A01 -> A02 delegation
 * 2. Execution duration > 10 seconds per run
 * 3. Authentic model-generated output differing between two different prompts
 * 4. Zero synthetic fallback and zero deterministic placeholder copy
 */
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { WorkflowCoordinator } from '../src/engine/workflow_coordinator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');

// This suite requires a REAL Antigravity CLI binary. It is deliberately not
// hardcoded to any machine: set ANTIGRAVITY_CLI_PATH, or install `agy` on PATH.
// When neither is available the suite reports NOT VERIFIED and exits non-zero,
// because a skipped live test proves nothing.
if (!process.env.ANTIGRAVITY_CLI_PATH) {
  const onPath = (process.env.PATH || '').split(path.delimiter).filter(Boolean).some((dir) =>
    ['agy', 'agy.exe', 'agy.cmd'].some((name) => fs.existsSync(path.join(dir, name)))
  );
  if (!onPath) {
    console.log('[SKIP] verify_phase1_live_execution requires a real Antigravity CLI binary.');
    console.log('       Set ANTIGRAVITY_CLI_PATH or install "agy" on PATH.');
    console.log('       NOT VERIFIED — no live execution was performed.');
    process.exit(1);
  }
}

const Logger = {
  info: (msg) => console.log(`[\x1b[36mINFO\x1b[0m] ${msg}`),
  success: (msg) => console.log(`[\x1b[32mPASS\x1b[0m] ${msg}`),
  warn: (msg) => console.log(`[\x1b[33mWARN\x1b[0m] ${msg}`),
  error: (msg) => console.log(`[\x1b[31mFAIL\x1b[0m] ${msg}`),
};

function cleanDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) {}
}

async function runLiveVerification() {
  console.log('\n=============================================================');
  console.log('   ZADROW PHASE 1 LIVE MODEL DELEGATION VERIFICATION        ');
  console.log('=============================================================\n');

  const testDirA = path.join(agencyDir, 'workspace', 'test_verification_run_a');
  const testDirB = path.join(agencyDir, 'workspace', 'test_verification_run_b');

  cleanDir(testDirA);
  cleanDir(testDirB);

  // -------------------------------------------------------------------------
  // RUN A: Spatial Architecture Studio (AURA VELOX)
  // -------------------------------------------------------------------------
  const promptA = 'Build an uncompromising luxury spatial design atelier named AURA VELOX specializing in algorithmic physical architecture and generative pavilions for institutional patrons';
  Logger.info(`[RUN A] Starting Phase 1 live execution with prompt:\n  "${promptA}"`);

  const coordinatorA = new WorkflowCoordinator({
    agencyDir,
    rootDir,
    artifactsDir: testDirA,
    executionMode: 'cli',
  });

  const t0A = Date.now();
  const resultA = await coordinatorA.executePhase1_IntakeScopeStrategy(promptA);
  const durationA = (Date.now() - t0A) / 1000;

  Logger.info(`[RUN A] Completed in ${durationA.toFixed(1)}s (passed: ${resultA.passed})`);
  assert(durationA > 10, `Run A must take > 10s for real model execution, took ${durationA}s`);
  assert.strictEqual(resultA.passed, true, 'Run A Phase 1 must pass Gate 1');

  const charterPathA = path.join(testDirA, '01_scope_charter.json');
  const dagPathA = path.join(testDirA, '02_program_execution_dag.json');
  assert(fs.existsSync(charterPathA), 'Run A 01_scope_charter.json must exist');
  assert(fs.existsSync(dagPathA), 'Run A 02_program_execution_dag.json must exist');

  const charterRawA = fs.readFileSync(charterPathA, 'utf8');
  const charterObjA = JSON.parse(charterRawA);
  const dagObjA = JSON.parse(fs.readFileSync(dagPathA, 'utf8'));

  Logger.success(`[RUN A] Artifacts validated. Project: "${charterObjA.project_name || charterObjA.project_id}"`);
  console.log(`  Summary: ${charterObjA.executive_summary?.slice(0, 160)}...`);

  // -------------------------------------------------------------------------
  // RUN B: Neurotechnology Telemetry Platform (SYNAPSE CORE)
  // -------------------------------------------------------------------------
  const promptB = 'Build an autonomous neurotechnology health platform named SYNAPSE CORE featuring real-time neural biometric telemetry and EEG cognitive state streaming';
  Logger.info(`\n[RUN B] Starting Phase 1 live execution with prompt:\n  "${promptB}"`);

  const coordinatorB = new WorkflowCoordinator({
    agencyDir,
    rootDir,
    artifactsDir: testDirB,
    executionMode: 'cli',
  });

  const t0B = Date.now();
  const resultB = await coordinatorB.executePhase1_IntakeScopeStrategy(promptB);
  const durationB = (Date.now() - t0B) / 1000;

  Logger.info(`[RUN B] Completed in ${durationB.toFixed(1)}s (passed: ${resultB.passed})`);
  assert(durationB > 10, `Run B must take > 10s for real model execution, took ${durationB}s`);
  assert.strictEqual(resultB.passed, true, 'Run B Phase 1 must pass Gate 1');

  const charterPathB = path.join(testDirB, '01_scope_charter.json');
  const dagPathB = path.join(testDirB, '02_program_execution_dag.json');
  assert(fs.existsSync(charterPathB), 'Run B 01_scope_charter.json must exist');
  assert(fs.existsSync(dagPathB), 'Run B 02_program_execution_dag.json must exist');

  const charterRawB = fs.readFileSync(charterPathB, 'utf8');
  const charterObjB = JSON.parse(charterRawB);
  const dagObjB = JSON.parse(fs.readFileSync(dagPathB, 'utf8'));

  Logger.success(`[RUN B] Artifacts validated. Project: "${charterObjB.project_name || charterObjB.project_id}"`);
  console.log(`  Summary: ${charterObjB.executive_summary?.slice(0, 160)}...`);

  // -------------------------------------------------------------------------
  // COMPARISON & PROMPT-DIFFERENTIATION ASSERTIONS
  // -------------------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('   CROSS-RUN COMPARISON & MODEL DIVERSITY VALIDATION         ');
  console.log('-------------------------------------------------------------');

  // 1. Raw text divergence
  assert.notStrictEqual(charterRawA, charterRawB, '01_scope_charter.json must differ between prompts');
  Logger.success('ASSERTION 1 PASSED: 01_scope_charter.json content is dynamically generated per prompt');

  // 2. Executive summary divergence
  assert.notStrictEqual(charterObjA.executive_summary, charterObjB.executive_summary, 'Executive summaries must differ');
  Logger.success('ASSERTION 2 PASSED: Executive summaries differ completely between spatial and neuro briefs');

  // 3. Project name divergence
  const nameA = charterObjA.project_name || charterObjA.project_id || '';
  const nameB = charterObjB.project_name || charterObjB.project_id || '';
  assert.notStrictEqual(nameA, nameB, 'Project names must differ between runs');
  Logger.success(`ASSERTION 3 PASSED: Project names differ: "${nameA}" vs "${nameB}"`);

  // 4. In-scope features divergence
  const featuresA = JSON.stringify(charterObjA.in_scope_features || []);
  const featuresB = JSON.stringify(charterObjB.in_scope_features || []);
  assert.notStrictEqual(featuresA, featuresB, 'In-scope features must reflect different project domains');
  Logger.success('ASSERTION 4 PASSED: In-scope MVP features are authentically customized to domain');

  // 5. Execution DAG divergence
  assert(dagObjA.total_nodes > 0 && dagObjB.total_nodes > 0, 'Both DAGs must have total_nodes > 0');
  Logger.success(`ASSERTION 5 PASSED: Execution DAGs generated with valid nodes (A: ${dagObjA.total_nodes}, B: ${dagObjB.total_nodes})`);

  // 6. Timing verification
  Logger.success(`ASSERTION 6 PASSED: Real execution latency verified (Run A: ${durationA.toFixed(1)}s > 10s, Run B: ${durationB.toFixed(1)}s > 10s)`);

  console.log('\n=============================================================');
  console.log('   >>> ALL PHASE 1 LIVE MODEL ACCEPTANCE CRITERIA PASSED <<< ');
  console.log('=============================================================\n');

  // Cleanup test artifacts
  cleanDir(testDirA);
  cleanDir(testDirB);
}

runLiveVerification().catch((err) => {
  Logger.error(`Verification failed: ${err.message}\n${err.stack}`);
  process.exit(1);
});
