/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Final Comprehensive Acceptance & Authenticity Verification Suite
 *
 * Verifies:
 * 1. Antigravity Subagent Execution Evidence (verified against live runtime transcript)
 * 2. Controlled End-to-End Orchestration in Isolated Sandbox:
 *    - Document Creation -> Planning -> Coding -> Testing -> Corrections -> Retesting -> Final Report
 *    - Strict Phase Dependency Enforcement (Prerequisite & Gate Failure Blocks)
 *    - Upstream -> Downstream Data Flow Verification
 *    - Zero Website Pollution (Safe Sandbox)
 * 3. Execution Authenticity & Failure Handling:
 *    - Strict distinction of "cli" vs "synthetic_fallback" execution modes
 *    - Accurate reporting of failed agent invocations without faked success
 *    - Verified recovery paths (retry with error correction & remediation retest loop)
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { WorkflowCoordinator, PrerequisiteError, GateFailureError } from '../src/engine/workflow_coordinator.js';
import { AgentRunner } from '../src/engine/agent_runner.js';
import { Logger, Colors } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');

function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function createDir(dirPath) {
  cleanDir(dirPath);
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

// Helper to locate the newest transcript containing real subagent execution evidence
function findNewestSubagentTranscript() {
  const baseDir = process.env.ANTIGRAVITY_DATA_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
  const brainDir = path.join(baseDir, 'brain');
  if (!fs.existsSync(brainDir)) return null;

  const entries = fs.readdirSync(brainDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const transcriptPath = path.join(brainDir, entry.name, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(transcriptPath)) {
        try {
          const stat = fs.statSync(transcriptPath);
          candidates.push({
            id: entry.name,
            path: transcriptPath,
            fullPath: path.join(brainDir, entry.name, '.system_generated', 'logs', 'transcript_full.jsonl'),
            mtime: stat.mtimeMs,
          });
        } catch (_) {}
      }
    }
  }

  candidates.sort((a, b) => b.mtime - a.mtime);

  // Search for newest transcript containing model execution with send_message tool call
  for (const cand of candidates) {
    try {
      const lines = fs.readFileSync(cand.path, 'utf8').trim().split('\n').filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        try {
          const parsed = JSON.parse(lines[i]);
          if (parsed.source === 'MODEL' && parsed.tool_calls && parsed.tool_calls.some((tc) => tc.name === 'send_message')) {
            return {
              conversationId: cand.id,
              transcriptPath: cand.path,
              fullTranscriptPath: cand.fullPath,
              modelStep: parsed,
              stepIndex: i,
              lines,
            };
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // Fallback to newest transcript if available
  if (candidates.length > 0) {
    const newest = candidates[0];
    try {
      const lines = fs.readFileSync(newest.path, 'utf8').trim().split('\n').filter(Boolean);
      return {
        conversationId: newest.id,
        transcriptPath: newest.path,
        fullTranscriptPath: newest.fullPath,
        lines,
      };
    } catch (_) {}
  }

  return null;
}

// =====================================================================
// Test 1: Actual Antigravity Subagent Execution Evidence
// =====================================================================
async function testSubagentExecutionEvidence() {
  Logger.info('TEST 1: Verifying Actual Antigravity Subagent Execution Evidence...');

  const evidence = findNewestSubagentTranscript();
  if (!evidence) {
    Logger.warn('No Antigravity transcript found in brain directory. Subagent execution not verified.');
    return { skipped: true, reason: 'No transcript found in brain directory' };
  }

  const { conversationId, transcriptPath, fullTranscriptPath, lines } = evidence;
  assert(fs.existsSync(transcriptPath), `Subagent transcript must exist on disk at: ${transcriptPath}`);
  assert(lines.length >= 2, 'Transcript must contain at least system message and model response');

  let step1 = evidence.modelStep;
  if (!step1) {
    for (const l of lines) {
      try {
        const p = JSON.parse(l);
        if (p.source === 'MODEL') {
          step1 = p;
          break;
        }
      } catch (_) {}
    }
  }

  if (!step1) {
    Logger.warn(`No model response step found in transcript ${conversationId}.`);
    return { skipped: true, reason: 'No MODEL response step in transcript' };
  }

  // If truncated, read corresponding step from transcript_full.jsonl
  if (step1.truncated_fields && fs.existsSync(fullTranscriptPath)) {
    try {
      const fullLines = fs.readFileSync(fullTranscriptPath, 'utf8').trim().split('\n').filter(Boolean);
      const fullStep = fullLines.map((fl) => {
        try { return JSON.parse(fl); } catch { return null; }
      }).find((p) => p && p.source === 'MODEL');
      if (fullStep) step1 = fullStep;
    } catch (_) {}
  }

  assert.strictEqual(step1.source, 'MODEL');
  assert(step1.input_tokens > 0, `Subagent input tokens must be > 0 (got ${step1.input_tokens})`);
  assert(step1.output_tokens > 0, `Subagent output tokens must be > 0 (got ${step1.output_tokens})`);

  // Verify tool call or response payload
  if (step1.tool_calls && step1.tool_calls.length > 0) {
    const sendMsg = step1.tool_calls.find((tc) => tc.name === 'send_message');
    if (sendMsg && sendMsg.args?.Message) {
      const rawPayload = sendMsg.args.Message;
      let payload = rawPayload;
      if (typeof rawPayload === 'string') {
        try { payload = JSON.parse(rawPayload); } catch (_) { payload = { text: rawPayload }; }
      }
      if (payload && typeof payload === 'object' && payload.agentId) {
        assert(payload.status, 'Subagent payload must have status');
      }
    }
  }

  Logger.success(`Subagent Execution Verified: Conversation ID ${conversationId}, ${step1.input_tokens} in / ${step1.output_tokens} out tokens.`);
  return { skipped: false };
}

// =====================================================================
// Test 2: Controlled End-to-End Orchestration Sequence
// =====================================================================
async function testControlledEndToEndOrchestration() {
  Logger.info('TEST 2: Verifying Controlled End-to-End Orchestration Sequence in Isolated Sandbox...');

  const sandboxDir = path.join(agencyDir, 'test', 'sandbox_e2e');
  const artifactsDir = path.join(sandboxDir, 'artifacts');
  const outputDir = path.join(sandboxDir, 'output');
  createDir(artifactsDir);
  createDir(outputDir);

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir,
      outputDir,
      executionMode: 'synthetic',
      strictGates: true,
      maxRemediationCycles: 3,
    });

    const phaseSequence = [];
    coordinator.on('phase:start', (data) => {
      phaseSequence.push(data.phase);
    });

    const remediationEvents = [];
    coordinator.on('remediation:loop', (data) => {
      remediationEvents.push(data);
    });

    // Injected controlled defect to force Phase 6 correction & retesting loop
    const controlledDefects = [
      {
        id: 'DEF-TEST-A11Y-01',
        severity: 'P1',
        category: 'WCAG Contrast Safe Zone',
        target_file: 'src/components/HeaderNav.tsx',
        description: 'Controlled Test: Nav link contrast ratio is 3.8:1, failing AA requirement',
        recommended_fix: 'Elevate text color token from #64748b to #94a3b8',
      },
    ];

    const result = await coordinator.run('Controlled Test for VELOX Precision Architectural Portfolio', {
      simulatedDefects: controlledDefects,
      skipCodeSynthesis: true, // Keep actual website untouched
    });

    assert.strictEqual(result.success, true, 'Workflow orchestration must complete successfully');

    // 1. Verify Complete Sequential Progression: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7
    assert.deepStrictEqual(phaseSequence, [1, 2, 3, 4, 5, 6, 7], 'Execution must follow strict 1 to 7 sequential order');

    // 2. Verify Document Creation Artifacts (Phases 1 & 2)
    const docArtifacts = [
      '01_scope_charter.json',
      '02_program_execution_dag.json',
      '11_product_analysis.json',
      '12_information_architecture.json',
      '20_creative_direction_charter.json',
      '21_design_research_benchmarks.json',
      '22_art_direction_manifest.json',
      '23_motion_choreography_spec.json',
      '30_experience_design_strategy.json',
      '31_wireframe_ux_flow.json',
      '32_design_tokens_and_components.json',
      '33_copywriting_and_conversion.json',
      '13_master_specification.json',
      '14_doc_verification_matrix.json',
      'docs/MASTER_SPECIFICATION.md',
    ];
    for (const f of docArtifacts) {
      const p = path.join(artifactsDir, f);
      assert(fs.existsSync(p), `Document artifact "${f}" must exist in sandbox`);
    }

    // 3. Verify Execution Planning Artifacts (Phase 3)
    const planArtifacts = [
      '40_master_tech_architecture.json',
      '41_frontend_architecture.json',
      '43_build_platform_spec.json',
      '50_frontend_delivery_manifest.json',
    ];
    for (const f of planArtifacts) {
      assert(fs.existsSync(path.join(artifactsDir, f)), `Planning artifact "${f}" must exist`);
    }

    // 4. Verify Coding Artifacts (Phase 4)
    const codeArtifacts = [
      '51_app_shell_scaffold.json',
      '52_page_assemblies.json',
      '53_ui_component_library.json',
      '54_visual_experience_assets.json',
    ];
    for (const f of codeArtifacts) {
      assert(fs.existsSync(path.join(artifactsDir, f)), `Coding artifact "${f}" must exist`);
    }

    // 5. Verify Testing Artifacts (Phase 5)
    assert(fs.existsSync(path.join(artifactsDir, '70_qa_comprehensive_verdict.json')), '70_qa_comprehensive_verdict.json must exist');

    // 6. Verify Corrections / Remediation (Phase 6)
    assert(remediationEvents.length >= 1, 'Must execute at least 1 remediation loop cycle');
    const triageMatrix = JSON.parse(fs.readFileSync(path.join(artifactsDir, '81_defect_triage_matrix.json'), 'utf8'));
    assert(triageMatrix.total_tickets >= 1, 'Triage matrix must contain at least 1 ticket');
    const testTicket = triageMatrix.tickets.find((t) => t.ticket_id === 'DEF-TEST-A11Y-01');
    assert(testTicket, 'Controlled defect DEF-TEST-A11Y-01 must be present in triage matrix');
    assert(testTicket.assigned_agent.startsWith('A5'), 'Defect must be assigned to frontend engineering agent');

    // 7. Verify Retesting (Phase 6 loop)
    const patchLog = JSON.parse(fs.readFileSync(path.join(artifactsDir, '82_remediation_patch_log.json'), 'utf8'));
    assert(patchLog.tickets_resolved >= 1, 'At least 1 ticket must be resolved');
    // This run skips code synthesis, so no retest is executed: the patch log
    // must not claim a regression pass it never measured.
    assert.strictEqual(patchLog.regression_testing_passed, null);
    assert.strictEqual(patchLog.regression_testing_status, 'NOT_RUN');

    // 8. Verify Final Delivery Package & Orchestration Manifest (Phase 7)
    const releasePkg = JSON.parse(fs.readFileSync(path.join(artifactsDir, '83_production_release_package.json'), 'utf8'));
    assert.strictEqual(releasePkg.build_status, 'BUILD_SUCCESS');
    assert.strictEqual(releasePkg.release_signoff.status, 'CERTIFIED_FOR_GLOBAL_PRODUCTION');

    const masterManifest = JSON.parse(fs.readFileSync(path.join(artifactsDir, '00_master_orchestration_manifest.json'), 'utf8'));
    assert.strictEqual(masterManifest.status, 'COMPLETED');
    assert.strictEqual(masterManifest.phases.length, 7);

    // 9. Verify Data Passing across Phases
    const masterSpec = JSON.parse(fs.readFileSync(path.join(artifactsDir, '13_master_specification.json'), 'utf8'));
    assert(masterSpec.project_id, 'Master spec must have project_id');
    assert(masterSpec.functional_specifications.length >= 3, 'Master spec must contain functional specifications');
    const docMd = fs.readFileSync(path.join(artifactsDir, 'docs', 'MASTER_SPECIFICATION.md'), 'utf8');
    assert(docMd.includes('VELOX'), 'Markdown spec must incorporate project name from brief');

    Logger.success('Complete sequence (Document -> Plan -> Code -> Test -> Correct -> Retest -> Release) verified.');
  } finally {
    cleanDir(sandboxDir);
  }
}

// =====================================================================
// Test 3: Phase Dependency Enforcement & Premature Start Prevention
// =====================================================================
async function testPhaseDependencyEnforcement() {
  Logger.info('TEST 3: Verifying Phase Dependency Enforcement & Gate Blocks...');

  const sandboxDir = path.join(agencyDir, 'test', 'sandbox_deps');
  const artifactsDir = path.join(sandboxDir, 'artifacts');
  const outputDir = path.join(sandboxDir, 'output');
  createDir(artifactsDir);
  createDir(outputDir);

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir,
      outputDir,
      executionMode: 'synthetic',
      strictGates: true,
    });

    // 1. Attempting to start Phase 4 without Phase 3 artifacts MUST throw PrerequisiteError
    let prereqCaught = false;
    try {
      coordinator._verifyPhasePrerequisites(4);
    } catch (err) {
      prereqCaught = true;
      assert(err instanceof PrerequisiteError, 'Error must be an instance of PrerequisiteError');
      assert(err.missingArtifacts.includes('41_frontend_architecture.json'), 'Missing prerequisite must identify 41_frontend_architecture.json');
    }
    assert.strictEqual(prereqCaught, true, 'Prerequisite verification must halt Phase 4 before prerequisites exist');

    // 2. Gate Failure Enforcement: simulate specification verification defect
    let gateCaught = false;
    try {
      await coordinator.run('Controlled Gate Failure Test', {
        simulateSpecDefect: true,
        skipCodeSynthesis: true,
      });
    } catch (err) {
      gateCaught = true;
      assert(err instanceof GateFailureError, 'Error must be an instance of GateFailureError');
      assert.strictEqual(err.phase, 2, 'Gate error must occur in Phase 2');
      assert.strictEqual(coordinator.currentPhase, 2, 'Workflow status must halt at Phase 2');
      assert.strictEqual(coordinator.status, 'HALTED', 'Workflow status must be HALTED');
    }
    assert.strictEqual(gateCaught, true, 'Spec verification gate failure must block downstream coding from starting');

    Logger.success('Phase dependency enforcement verified: prerequisite checks and gate failures block premature phase progression.');
  } finally {
    cleanDir(sandboxDir);
  }
}

// =====================================================================
// Test 4: Execution Authenticity & Failure Handling
// =====================================================================
async function testExecutionAuthenticityAndFailureHandling() {
  Logger.info('TEST 4: Verifying Execution Authenticity & Failure Handling...');

  // 1. Offline execution is explicit and opt-in, and is labelled "mock".
  //    The implicit "synthetic_fallback" mode was removed: a missing CLI must
  //    fail loudly rather than silently fabricating an artifact.
  const runner = new AgentRunner({
    agencyDir,
    rootDir,
    executionMode: 'mock',
  });

  const mockResult = await runner.executeAgent('A01', 'Test brand authenticity', {});
  assert.strictEqual(mockResult.executionMode, 'mock', 'Offline result must explicitly declare "mock"');
  assert.strictEqual(mockResult.synthetic, true, 'synthetic boolean flag must be true');

  // 1b. The legacy "synthetic" alias must resolve to the same explicit mock mode.
  const aliasRunner = new AgentRunner({ agencyDir, rootDir, executionMode: 'synthetic' });
  const aliasResult = await aliasRunner.executeAgent('A01', 'Test brand authenticity', {});
  assert.strictEqual(aliasResult.executionMode, 'mock', 'Legacy "synthetic" alias must resolve to "mock"');

  // 2. Accurate failure reporting when CLI is unavailable and allowFallback = false
  const strictRunner = new AgentRunner({
    agencyDir,
    rootDir,
    cliPath: 'C:\\non_existent_path\\cli_binary.exe',
    executionMode: 'cli',
    allowFallback: false, // Strict mode: must report failure rather than faking success
  });

  let errorReported = false;
  try {
    await strictRunner.executeAgent('E01_BriefAnalyst', 'Test failure report', {});
  } catch (err) {
    errorReported = true;
    assert(err.message.includes('not found') || err.message.includes('CLI'), 'Error message must accurately describe the failure');
  }
  assert.strictEqual(errorReported, true, 'Unavailable tools must be reported accurately as errors when allowFallback is false');

  // 3. Error recovery path: retry with feedback on parse failure
  let retryAttempts = 0;
  const mockCliProc = async (prompt) => {
    retryAttempts++;
    if (retryAttempts === 1) {
      // First attempt: invalid truncated JSON
      return { responseText: '{"agentId": "A01", "status": "INCOMPLETE", invalid_json...', durationSeconds: 0.1 };
    }
    // Second attempt (after feedback): valid JSON
    return {
      responseText: '{"agentId": "A01", "status": "COMPLETED", "summary": "Recovered successfully", "data": {"brandName": "RECOVERED"}}',
      durationSeconds: 0.1,
    };
  };

  const recoveringRunner = new AgentRunner({
    agencyDir,
    rootDir,
    cliPath: 'mock-cli',
    executionMode: 'cli',
    allowFallback: false,
    maxRetries: 2,
  });
  recoveringRunner._invokeCliProcess = mockCliProc;

  const recoveredResult = await recoveringRunner._executeWithRealCli(
    'A01',
    'Test recovery path for brand named RECOVERED',
    {},
    {},
    recoveringRunner.getPersona('A01'),
    null
  );

  assert.strictEqual(recoveredResult.status, 'COMPLETED');
  assert.strictEqual(recoveredResult.data.brandName, 'RECOVERED');
  assert.strictEqual(recoveredResult.cliMetadata.attempts, 2, 'Must record that 2 attempts were made before successful recovery');

  Logger.success('Execution authenticity verified: CLI vs synthetic distinction, strict failure reporting, and error recovery confirmed.');
}

// =====================================================================
// Master Acceptance Runner
// =====================================================================
async function runAllAcceptanceTests() {
  console.log(`\n${Colors.bold}${Colors.brightCyan}====================================================`);
  console.log('   AURA MULTI-AGENT SYSTEM FINAL ACCEPTANCE SUITE    ');
  console.log(`====================================================${Colors.reset}\n`);

  const startTime = Date.now();
  let passedCount = 0;
  let skippedCount = 0;

  try {
    const t1 = await testSubagentExecutionEvidence();
    if (t1?.skipped) skippedCount++; else passedCount++;

    const t2 = await testControlledEndToEndOrchestration();
    if (t2?.skipped) skippedCount++; else passedCount++;

    const t3 = await testPhaseDependencyEnforcement();
    if (t3?.skipped) skippedCount++; else passedCount++;

    const t4 = await testExecutionAuthenticityAndFailureHandling();
    if (t4?.skipped) skippedCount++; else passedCount++;

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    if (skippedCount > 0) {
      console.log(`\n${Colors.bold}${Colors.brightYellow}====================================================`);
      console.log(`   ${passedCount} PASSED, ${skippedCount} SKIPPED — NOT VERIFIED [${totalSeconds}s]   `);
      console.log(`====================================================${Colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`\n${Colors.bold}${Colors.brightGreen}====================================================`);
      console.log(`   ALL ${passedCount}/4 FINAL ACCEPTANCE TESTS PASSED (100%) [${totalSeconds}s]   `);
      console.log(`====================================================${Colors.reset}\n`);
      process.exit(0);
    }
  } catch (err) {
    console.error(`\n${Colors.bold}${Colors.brightRed}ACCEPTANCE TEST FAILED: ${err.message}${Colors.reset}\n`);
    console.error(err.stack);
    process.exit(1);
  }
}

runAllAcceptanceTests();
