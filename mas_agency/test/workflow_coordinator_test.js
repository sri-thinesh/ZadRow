/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: WorkflowCoordinator 7-Phase Execution Pipeline
 *
 * Verifies:
 * 1. Full 7-Phase Execution Lifecycle (Phase 1 to Phase 7 in sequence)
 * 2. Phase 2 Gate Enforcement (Simulated spec defect stops workflow before coding)
 * 3. Conditional Backend Activation (Clean skip for static briefs vs active squad for backend briefs)
 * 4. Remediation Loop (Defect triage, ticket routing to engineering owners, patch application, and retesting)
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  WorkflowCoordinator,
  WorkflowError,
  GateFailureError,
  PrerequisiteError,
  PHASE_DEFINITIONS,
} from '../src/engine/workflow_coordinator.js';
import { CodeSynthesizer } from '../src/engine/code_synthesizer.js';
import { Logger, Colors } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');

// Helper to create isolated test directories
function createTestDir(name) {
  const testDir = path.join(agencyDir, 'workspace', `test_${name}_${Date.now()}`);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  return testDir;
}

// Clean up helper
function cleanTestDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (_) {}
}

// =====================================================================
// Test 1: Full 7-Phase Execution Lifecycle
// =====================================================================
async function testFull7PhaseLifecycle() {
  Logger.info('Testing full 7-phase execution lifecycle in sequential order...');
  const testDir = createTestDir('lifecycle');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
    });

    const phaseStartEvents = [];
    const phaseCompleteEvents = [];
    const gateEvents = [];
    let workflowCompleteEvent = null;

    coordinator.on('phase:start', (data) => phaseStartEvents.push(data));
    coordinator.on('phase:complete', (data) => phaseCompleteEvents.push(data));
    coordinator.on('gate:evaluate', (data) => gateEvents.push(data));
    coordinator.on('workflow:complete', (data) => {
      workflowCompleteEvent = data;
    });

    const brief = 'Build an Awwwards-caliber digital studio experience named KINETIX featuring real-time canvas';
    const result = await coordinator.run(brief, { skipCodeSynthesis: true });

    // 1. Assert workflow finished successfully
    assert.strictEqual(result.success, true, 'Workflow result should declare success');
    assert.strictEqual(result.phasesCompleted, 7, 'All 7 sequential phases must be completed');
    assert.strictEqual(coordinator.status, 'COMPLETED', 'Coordinator status should be COMPLETED');

    // 2. Assert telemetry event sequence
    assert.strictEqual(phaseStartEvents.length, 7, 'Must receive 7 phase:start events');
    assert.strictEqual(phaseCompleteEvents.length, 7, 'Must receive 7 phase:complete events');
    assert(gateEvents.length >= 6, 'Must receive gate:evaluate events across critical gates');
    assert(workflowCompleteEvent, 'Must receive workflow:complete event');

    for (let i = 0; i < 7; i++) {
      assert.strictEqual(phaseStartEvents[i].phase, i + 1, `Phase start event ${i} should be Phase ${i + 1}`);
      assert.strictEqual(phaseCompleteEvents[i].phase, i + 1, `Phase complete event ${i} should be Phase ${i + 1}`);
    }

    // 3. Assert mandatory Phase 1 & 2 artifacts exist on disk
    const expectedArtifacts = [
      '01_scope_charter.json',
      '02_program_execution_dag.json',
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
      '40_master_tech_architecture.json',
      '41_frontend_architecture.json',
      '43_build_platform_spec.json',
      '50_frontend_delivery_manifest.json',
      '51_app_shell_scaffold.json',
      '52_page_assemblies.json',
      '53_ui_component_library.json',
      '54_visual_experience_assets.json',
      '70_qa_comprehensive_verdict.json',
      '80_remediation_release_manifest.json',
      '81_defect_triage_matrix.json',
      '82_remediation_patch_log.json',
      '83_production_release_package.json',
      '00_master_orchestration_manifest.json',
    ];

    for (const file of expectedArtifacts) {
      const p = path.join(testDir, file);
      assert(fs.existsSync(p), `Expected artifact "${file}" must exist on disk at: ${p}`);
      const content = JSON.parse(fs.readFileSync(p, 'utf8'));
      assert(content && typeof content === 'object', `Artifact "${file}" must be valid parsed JSON`);
    }

    // 4. Check companion docs/MASTER_SPECIFICATION.md
    const docPath = path.join(testDir, 'docs', 'MASTER_SPECIFICATION.md');
    assert(fs.existsSync(docPath), 'docs/MASTER_SPECIFICATION.md must exist in artifacts');
    const docContent = fs.readFileSync(docPath, 'utf8');
    assert(docContent.includes('MASTER TECHNICAL SPECIFICATION'), 'Markdown spec must contain title header');

    // 5. Inspect 00_master_orchestration_manifest.json
    const manifest = JSON.parse(fs.readFileSync(path.join(testDir, '00_master_orchestration_manifest.json'), 'utf8'));
    assert.strictEqual(manifest.status, 'COMPLETED');
    assert.strictEqual(manifest.phases.length, 7, 'Manifest must summarize all 7 phases');
    for (const ph of manifest.phases) {
      assert.strictEqual(ph.gate_status, 'APPROVED', `Phase ${ph.phase_id} must be APPROVED`);
    }

    Logger.success('Full 7-phase execution lifecycle verified with 100% artifact delivery.');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 2: Phase 2 Gate Enforcement (Simulated Defect Stops Execution)
// =====================================================================
async function testPhase2GateEnforcement() {
  Logger.info('Testing Phase 2 Gate enforcement (simulating spec defect halts workflow before coding)...');
  const testDir = createTestDir('gate_enforcement');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
      strictGates: true,
    });

    let gateFailedEvent = null;
    coordinator.on('gate:evaluate', (data) => {
      if (data.phase === 2 && !data.passed) {
        gateFailedEvent = data;
      }
    });

    let threwExpectedError = false;
    try {
      await coordinator.run('Build project brief', {
        simulateSpecDefect: true,
        skipCodeSynthesis: true,
      });
    } catch (err) {
      threwExpectedError = true;
      assert(err instanceof GateFailureError, `Error should be GateFailureError, got: ${err.name}`);
      assert.strictEqual(err.phase, 2, 'Gate error must originate from Phase 2');
      assert.strictEqual(err.gateName, 'spec_verification_gate');
      assert(err.message.includes('blocking contradiction') || err.message.includes('rejected'), 'Error message should describe contradiction');
    }

    assert(threwExpectedError, 'Workflow coordinator MUST throw GateFailureError on Phase 2 defect');
    assert.strictEqual(coordinator.status, 'HALTED', 'Coordinator status must be HALTED');
    assert.strictEqual(coordinator.currentPhase, 2, 'Coordinator must halt at Phase 2');
    assert(gateFailedEvent, 'Must emit gate:evaluate with passed: false');
    assert(gateFailedEvent.blockingIssues.length > 0, 'Must record blocking issues in gate telemetry');

    // Verify 14_doc_verification_matrix.json recorded the FAILED verdict
    const matrix = JSON.parse(fs.readFileSync(path.join(testDir, '14_doc_verification_matrix.json'), 'utf8'));
    assert.strictEqual(matrix.verification_verdict, 'FAILED');
    assert(matrix.contradictions_found.length > 0, 'Contradictions must be logged in verification matrix');

    // CRITICAL: Ensure NO code or Phase 3/4 artifacts were synthesized!
    const phase3Artifact = path.join(testDir, '41_frontend_architecture.json');
    const phase4Artifact = path.join(testDir, '51_app_shell_scaffold.json');
    const phase7Artifact = path.join(testDir, '83_production_release_package.json');

    assert(!fs.existsSync(phase3Artifact), 'Phase 3 architecture must NOT be authored when Phase 2 gate rejects');
    assert(!fs.existsSync(phase4Artifact), 'Phase 4 implementation must NOT be authored when Phase 2 gate rejects');
    assert(!fs.existsSync(phase7Artifact), 'Phase 7 release package must NOT exist');

    Logger.success('Phase 2 Gate enforcement verified: contradictory specification successfully blocked downstream coding.');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 2B: Creative & Design Gate Enforcement (Gate A & Gate B)
// =====================================================================
async function testCreativeAndDesignGates() {
  Logger.info('Testing Gate A (Creative Direction) & Gate B (Design Completeness) gate enforcement...');

  // Test Gate A failure stops pipeline before Phase 2
  const gateATestDir = createTestDir('gate_a_failure');
  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: gateATestDir,
      executionMode: 'synthetic',
      strictGates: true,
    });

    let threwGateAError = false;
    try {
      await coordinator.run('Build generic website', {
        simulateCreativeGateFailure: true,
        skipCodeSynthesis: true,
      });
    } catch (err) {
      threwGateAError = true;
      assert(err instanceof GateFailureError, `Error should be GateFailureError, got: ${err.name}`);
      assert.strictEqual(err.gateName, 'creative_direction_approval_gate');
      assert.strictEqual(err.phase, 1);
    }
    assert(threwGateAError, 'Coordinator must throw GateFailureError when Gate A fails');
    assert.strictEqual(coordinator.status, 'HALTED');
    assert(!fs.existsSync(path.join(gateATestDir, '13_master_specification.json')), 'Spec must not exist after Gate A rejection');
    Logger.info('  -> Gate A enforcement verified: unapproved creative direction halts workflow.');
  } finally {
    cleanTestDir(gateATestDir);
  }

  // Test Gate B failure stops pipeline before Phase 2
  const gateBTestDir = createTestDir('gate_b_failure');
  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: gateBTestDir,
      executionMode: 'synthetic',
      strictGates: true,
    });

    let threwGateBError = false;
    try {
      await coordinator.run('Build generic template', {
        simulateDesignGateFailure: true,
        skipCodeSynthesis: true,
      });
    } catch (err) {
      threwGateBError = true;
      assert(err instanceof GateFailureError, `Error should be GateFailureError, got: ${err.name}`);
      assert.strictEqual(err.gateName, 'design_completeness_gate');
      assert.strictEqual(err.phase, 1);
    }
    assert(threwGateBError, 'Coordinator must throw GateFailureError when Gate B fails');
    assert.strictEqual(coordinator.status, 'HALTED');
    assert(!fs.existsSync(path.join(gateBTestDir, '13_master_specification.json')), 'Spec must not exist after Gate B rejection');
    Logger.info('  -> Gate B enforcement verified: generic/unapproved design integration halts workflow.');
  } finally {
    cleanTestDir(gateBTestDir);
  }

  Logger.success('Gate A & Gate B enforcement verified with 100% halt compliance.');
}

// =====================================================================
// Test 3: Conditional Backend Activation
// =====================================================================
async function testConditionalBackendActivation() {
  Logger.info('Testing conditional backend evaluation (static brief vs SaaS backend brief)...');

  // -------------------------------------------------------------------
  // Part A: Static Brief (Portfolio / Creative Showcase)
  // -------------------------------------------------------------------
  const staticTestDir = createTestDir('static_brief');
  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: staticTestDir,
      executionMode: 'synthetic',
    });

    const staticBrief = 'Minimalist brutalist portfolio showcasing architectural photography and spatial typography';
    const result = await coordinator.run(staticBrief, { skipCodeSynthesis: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(coordinator.backendRequired, false, 'Static brief must certify backendRequired = false');

    const backendArch = JSON.parse(fs.readFileSync(path.join(staticTestDir, '42_backend_architecture.json'), 'utf8'));
    assert.strictEqual(backendArch.status, 'STANDBY_STATIC_ONLY');
    assert(backendArch.certification.includes('0-backend') || backendArch.certification.includes('zero backend'), '0-backend certification must be recorded');
    assert.strictEqual(backendArch.api_endpoints.length, 0, 'Static architecture must declare 0 api endpoints');

    const backendDelivery = JSON.parse(fs.readFileSync(path.join(staticTestDir, '60_backend_delivery_manifest.json'), 'utf8'));
    assert.strictEqual(backendDelivery.status, 'STANDBY_STATIC_COMPLETE');
    assert.strictEqual(backendDelivery.endpoints_count, 0);
    assert.strictEqual(backendDelivery.database_connected, false);

    // Clean skip: A61-A63 server endpoints are NOT created
    assert(!fs.existsSync(path.join(staticTestDir, '61_server_endpoints.json')), 'A61 server endpoints must be cleanly skipped');
    assert(!fs.existsSync(path.join(staticTestDir, '62_data_persistence_spec.json')), 'A62 data persistence must be cleanly skipped');

    // Frontend was delivered normally
    assert(fs.existsSync(path.join(staticTestDir, '51_app_shell_scaffold.json')), 'A51 app shell scaffold delivered');
    assert(fs.existsSync(path.join(staticTestDir, '53_ui_component_library.json')), 'A53 component library delivered');

    Logger.info('  -> Part A verified: Static brief cleanly skipped backend squad with 0 errors.');
  } finally {
    cleanTestDir(staticTestDir);
  }

  // -------------------------------------------------------------------
  // Part B: Backend Brief (SaaS with Waitlist API & Database)
  // -------------------------------------------------------------------
  const backendTestDir = createTestDir('backend_brief');
  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: backendTestDir,
      executionMode: 'synthetic',
    });

    const saasBrief = 'High-frequency AI SaaS analytics platform with user authentication, waitlist database API, and Stripe billing';
    const result = await coordinator.run(saasBrief, { skipCodeSynthesis: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(coordinator.backendRequired, true, 'SaaS brief must activate backend squad (backendRequired = true)');

    const backendArch = JSON.parse(fs.readFileSync(path.join(backendTestDir, '42_backend_architecture.json'), 'utf8'));
    assert.strictEqual(backendArch.status, 'ENABLED', 'Backend architecture must be ENABLED');
    assert(backendArch.api_endpoints.length >= 2, 'Must specify API endpoints for waitlist / inquiry');
    assert(backendArch.data_models.length >= 1, 'Must define database persistence models');

    const backendDelivery = JSON.parse(fs.readFileSync(path.join(backendTestDir, '60_backend_delivery_manifest.json'), 'utf8'));
    assert.strictEqual(backendDelivery.status, 'ACTIVE_DELIVERED');
    assert.strictEqual(backendDelivery.database_connected, true);
    assert(backendDelivery.endpoints_count >= 2);

    // A61-A63 backend squad artifacts exist
    assert(fs.existsSync(path.join(backendTestDir, '61_server_endpoints.json')), 'A61 server endpoints must be authored');
    assert(fs.existsSync(path.join(backendTestDir, '62_data_persistence_spec.json')), 'A62 data persistence spec must be authored');
    assert(fs.existsSync(path.join(backendTestDir, '63_integration_services.json')), 'A63 integration services must be authored');

    Logger.info('  -> Part B verified: Backend squad activated and synthesized complete server specifications.');
  } finally {
    cleanTestDir(backendTestDir);
  }

  Logger.success('Conditional backend evaluation fully verified across static and SaaS briefs.');
}

// =====================================================================
// Test 4: Remediation Loop Routing Defects to Engineering Agents & Retesting
// =====================================================================
async function testRemediationLoop() {
  Logger.info('Testing Phase 6 remediation loop: defect triage, ticket routing, and retesting...');
  const testDir = createTestDir('remediation');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
      maxRemediationCycles: 3,
    });

    const remediationEvents = [];
    coordinator.on('remediation:loop', (data) => remediationEvents.push(data));

    // Simulated QA defects of P0, P1, and P2 severity
    const defects = [
      {
        id: 'DEF-WCAG-01',
        severity: 'P0',
        category: 'WCAG Contrast Violation',
        target_file: 'src/components/Navigation.tsx',
        description: 'Muted navigation links render at 3.4:1 contrast ratio against elevated background, failing AA (4.5:1)',
        recommended_fix: 'Elevate text token from #64748b to #94a3b8',
      },
      {
        id: 'DEF-TOUCH-02',
        severity: 'P1',
        category: 'Responsive Touch Safe Zone',
        target_file: 'src/components/FooterConversion.tsx',
        description: 'VIP consultation submit button has 38px tap height on viewport <= 640px, failing minimum 44px threshold',
        recommended_fix: 'Add py-3.5 and min-h-[44px] responsive utility',
      },
      {
        id: 'DEF-PERF-03',
        severity: 'P2',
        category: 'Canvas Frame Rate Jitter',
        target_file: 'src/components/HeroStage.tsx',
        description: 'Particle count 500 triggers garbage collection stutter on low-power devices',
        recommended_fix: 'Dynamically scale particle density to 180 on mobile devices',
      },
    ];

    const result = await coordinator.run('Digital luxury studio named VELOX', {
      simulatedDefects: defects,
      skipCodeSynthesis: true,
    });

    assert.strictEqual(result.success, true);
    assert(remediationEvents.length >= 1, 'Must emit at least 1 remediation:loop telemetry event');
    assert.strictEqual(remediationEvents[0].defectsCount, 3, 'First remediation cycle must process all 3 defects');

    // 1. Inspect 81_defect_triage_matrix.json (A81 Defect Triage Specialist)
    const triage = JSON.parse(fs.readFileSync(path.join(testDir, '81_defect_triage_matrix.json'), 'utf8'));
    assert.strictEqual(triage.total_tickets, 3);
    assert.strictEqual(triage.p0_count, 1);
    assert.strictEqual(triage.p1_count, 1);
    assert.strictEqual(triage.p2_count, 1);

    // Verify tickets were routed to appropriate implementation owners
    const navTicket = triage.tickets.find((t) => t.ticket_id === 'DEF-WCAG-01');
    const footerTicket = triage.tickets.find((t) => t.ticket_id === 'DEF-TOUCH-02');
    const heroTicket = triage.tickets.find((t) => t.ticket_id === 'DEF-PERF-03');

    assert(navTicket && (navTicket.assigned_agent === 'A51' || navTicket.assigned_agent === 'A53'), 'Nav ticket routed to frontend owner');
    assert(footerTicket && navTicket.assigned_agent.startsWith('A5'), 'Footer ticket routed to frontend engineering');
    assert(heroTicket && heroTicket.assigned_agent === 'A54', 'Hero canvas ticket routed to A54 Visual Experience Engineer');

    // 2. Inspect 82_remediation_patch_log.json (A82 Remediation Coordinator)
    const patchLog = JSON.parse(fs.readFileSync(path.join(testDir, '82_remediation_patch_log.json'), 'utf8'));
    assert.strictEqual(patchLog.tickets_dispatched, 3);
    assert.strictEqual(patchLog.tickets_resolved, 3);
    assert.strictEqual(patchLog.regression_testing_passed, true);
    assert.strictEqual(patchLog.patches.length, 3);

    for (const patch of patchLog.patches) {
      assert.strictEqual(patch.verified_status, 'VERIFIED_FIXED', 'All patches must be verified fixed');
    }

    // 3. Inspect 80_remediation_release_manifest.json (A80 Release & Remediation Director)
    const remediationManifest = JSON.parse(fs.readFileSync(path.join(testDir, '80_remediation_release_manifest.json'), 'utf8'));
    assert.strictEqual(remediationManifest.resolved_defects_count, 3);
    assert.strictEqual(remediationManifest.open_defects_count, 0, 'Open defects count must be 0');
    assert.strictEqual(remediationManifest.release_approval_status, 'APPROVED_FOR_PRODUCTION');

    // 4. Inspect final 83_production_release_package.json
    const releasePackage = JSON.parse(fs.readFileSync(path.join(testDir, '83_production_release_package.json'), 'utf8'));
    assert.strictEqual(releasePackage.build_status, 'BUILD_SUCCESS');
    assert.strictEqual(releasePackage.release_signoff.status, 'CERTIFIED_FOR_GLOBAL_PRODUCTION');

    Logger.success('Remediation loop verified: P0/P1/P2 defects successfully triaged, routed, patched, and verified.');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 6: Detachable Execution Modes (Selective Phase / Department Scoping)
// =====================================================================
async function testDetachableExecutionModes() {
  Logger.info('Testing detachable execution modes (modular scoping & clean skipping)...');
  const testDir = createTestDir('detachable');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
    });

    const skippedEvents = [];
    const startedPhases = [];
    coordinator.on('phase:skip', (d) => skippedEvents.push(d));
    coordinator.on('phase:start', (d) => startedPhases.push(d.phase));

    // Case 1: Scope design_only
    const resultDesign = await coordinator.run('Build design for Studio Synthetix', {
      scope: 'design_only',
      skipCodeSynthesis: true,
    });

    assert.strictEqual(coordinator.isDetachedMode, true, 'Must be in detached mode');
    assert.deepStrictEqual(Array.from(coordinator.activePhases), [1], 'Active phases must be [1]');
    assert.strictEqual(startedPhases.length, 1, 'Only Phase 1 should start');
    assert.strictEqual(startedPhases[0], 1, 'Started phase should be Phase 1');
    assert.strictEqual(skippedEvents.length, 6, 'Phases 2-7 must be cleanly skipped');

    // Verify master manifest records detached mode
    const manifest = coordinator.getArtifact('00_master_orchestration_manifest.json');
    assert(manifest, 'Master manifest must be generated in detached mode');
    assert.strictEqual(manifest.detached_execution.is_detached, true);
    assert.deepStrictEqual(manifest.detached_execution.active_phases, [1]);
    assert.strictEqual(manifest.lifecycle_phases[1].status, 'CLEANLY_SKIPPED_DETACHED');

    // Case 2: Direct phases selection: phases [1, 2]
    const testDir2 = createTestDir('phases12');
    const coord2 = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir2,
      executionMode: 'synthetic',
    });
    const result2 = await coord2.run('Test multi-phase detached execution', {
      phases: [1, 2],
      skipCodeSynthesis: true,
    });
    assert.strictEqual(coord2.isDetachedMode, true);
    assert.deepStrictEqual(Array.from(coord2.activePhases), [1, 2]);
    assert(coord2.getArtifact('01_scope_charter.json'));
    assert(coord2.getArtifact('13_master_specification.json'));

    // Case 3: Prompt-based detached execution detection: "design only"
    const testDir3 = createTestDir('nlp_detached');
    const coord3 = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir3,
      executionMode: 'synthetic',
    });
    const result3 = await coord3.run('Create design only for Studio Quantum with kinetic typography', {
      skipCodeSynthesis: true,
    });
    assert.strictEqual(coord3.isDetachedMode, true);
    assert.deepStrictEqual(Array.from(coord3.activePhases), [1]);

    // Case 4: Verify prompt with "build the entire website independently" strictly preserves full 7-phase execution
    const testDir4 = createTestDir('nlp_anti_bypass');
    const coord4 = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir4,
      executionMode: 'synthetic',
    });
    const result4 = await coord4.run('Build the entire website independently with neural shaders', {
      skipCodeSynthesis: true,
    });
    assert.strictEqual(coord4.isDetachedMode, false);
    assert.deepStrictEqual(Array.from(coord4.activePhases), [1, 2, 3, 4, 5, 6, 7]);

    Logger.success('Detachable execution modes verified: modular scopes, custom phases, and prompt NLP work cleanly.');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 7: Media Placeholder & Spatial Animation Generation
// =====================================================================
async function testMediaPlaceholderGeneration() {
  Logger.info('Testing MediaPlaceholder and spatial animation generation...');
  const testDir = createTestDir('media_placeholder');

  try {
    const synthesizer = new CodeSynthesizer({
      agencyDir,
      outputDir: testDir,
    });

    const briefData = {
      brandName: 'STUDIO SYNTHETIX',
      project_name: 'Studio Synthetix',
      prompt: 'Portfolio website with project galleries and video showcases',
    };

    const synthResult = await synthesizer.synthesize(briefData, {});

    // 1. Verify MediaPlaceholder component was synthesized
    const placeholderPath = path.join(testDir, 'src', 'components', 'MediaPlaceholder.tsx');
    assert(fs.existsSync(placeholderPath), 'src/components/MediaPlaceholder.tsx must be generated');

    const placeholderCode = fs.readFileSync(placeholderPath, 'utf8');

    // 2. Verify supports photo, video, gallery, space modes and animations
    assert(placeholderCode.includes("type === 'video'"), 'Must support video placeholder');
    assert(placeholderCode.includes("type === 'gallery'"), 'Must support gallery placeholder');
    assert(placeholderCode.includes("type === 'photo'"), 'Must support photo placeholder');
    assert(placeholderCode.includes("aspect-video"), 'Must support aspect-video');
    assert(placeholderCode.includes("aspect-[4/3]"), 'Must support aspect-4/3');
    assert(placeholderCode.includes("aspect-square"), 'Must support aspect-square');
    assert(placeholderCode.includes("animate-shimmer") || placeholderCode.includes("animate-ping") || placeholderCode.includes("animate-spin"), 'Must include motion/animation styling');

    // 3. Verify types include MediaPlaceholderProps
    const typesPath = path.join(testDir, 'src', 'types', 'index.ts');
    assert(fs.existsSync(typesPath));
    const typesCode = fs.readFileSync(typesPath, 'utf8');
    assert(typesCode.includes('MediaPlaceholderProps'), 'Types must declare MediaPlaceholderProps');

    // 4. Verify InteractiveShowcase uses MediaPlaceholder for galleries
    const showcasePath = path.join(testDir, 'src', 'components', 'InteractiveShowcase.tsx');
    assert(fs.existsSync(showcasePath));
    const showcaseCode = fs.readFileSync(showcasePath, 'utf8');
    assert(showcaseCode.includes('MediaPlaceholder'), 'InteractiveShowcase must integrate MediaPlaceholder');

    Logger.success('Media Placeholder & Spatial Animation verified: generated component, responsive aspect ratios, and animations.');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test Runner
// =====================================================================
async function runAllTests() {
  console.log('\n====================================================');
  console.log('   MAS 2.0 WORKFLOW COORDINATOR AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  const tests = [
    { name: 'Full 7-Phase Execution Lifecycle', fn: testFull7PhaseLifecycle },
    { name: 'Phase 2 Gate Enforcement (Spec Defect Halts Execution)', fn: testPhase2GateEnforcement },
    { name: 'Creative & Design Gate Enforcement (Gate A & Gate B)', fn: testCreativeAndDesignGates },
    { name: 'Conditional Backend Activation (Static vs SaaS)', fn: testConditionalBackendActivation },
    { name: 'Remediation Loop (Defect Triage, Routing & Retesting)', fn: testRemediationLoop },
    { name: 'Detachable Execution Modes (Selective Phase / Scope Execution)', fn: testDetachableExecutionModes },
    { name: 'Media Placeholder & Spatial Animation Generation', fn: testMediaPlaceholderGeneration },
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
  console.log(`   ALL ${passedCount}/${tests.length} WORKFLOW COORDINATOR TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
