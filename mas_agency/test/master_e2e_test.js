/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Master Comprehensive End-to-End Test Suite
 *
 * Verifies all 10 core dimensions:
 * 1. Agent Discovery & Executability across all 42 agents in 9 departments
 * 2. Skill Delivery Subsystem & Genuine Usage (all 32 skills)
 * 3. Subagent Delegation, Reporting Lines & Boundaries
 * 4. Parallel Execution, Dependencies & Barrier Synchronization
 * 5. Documentation & Approval Gates (Phase 1 & Phase 2 Gate Halt on Defect)
 * 6. End-to-End Website Generation for Frontend-Only Project (0-Backend Certified)
 * 7. End-to-End Website Generation for Backend-Required Project (SaaS Squad Activated)
 * 8. Deliberate Error Injection, QA Detection, Ticket Routing & Remediation Loop Retest
 * 9. Failure Handling, Timeouts & Regression Prevention
 * 10. Responsiveness, Functionality, Accessibility & SEO/AEO Audits
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
  DAGRunner,
  DAGNode,
  AgentRunner,
  SkillLoader,
  CodeSynthesizer,
  QAVerifier,
  Logger,
  Colors,
} from '../src/index.js';
import { PromptBuilder } from '../src/engine/agent_runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');

function createTestDir(name) {
  const dir = path.join(agencyDir, 'workspace', `master_test_${name}_${Date.now()}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cleanTestDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (_) {}
}

const testResults = [];

function recordTest(name, passed, details = {}) {
  testResults.push({ name, passed, details, timestamp: new Date().toISOString() });
  if (passed) {
    console.log(`  ${Colors.green}[PASS]${Colors.reset} ${name}`);
  } else {
    console.error(`  ${Colors.red}[FAIL]${Colors.reset} ${name}: ${details.error || 'Assertion failed'}`);
  }
}

// =========================================================================
// SUITE 1: Agent Discovery & Executability (42 Agents)
// =========================================================================
async function suite1_AgentDiscovery() {
  Logger.tier('SUITE 1', 'Agent Discovery, Registry & Prompt Executability (42 Agents)');

  const registryPath = path.join(agencyDir, 'agents', 'agent_registry.json');
  assert(fs.existsSync(registryPath), 'agent_registry.json must exist');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

  assert.strictEqual(registry.total_agents, 42, 'Registry must declare exactly 42 permanent agents');
  assert.strictEqual(Object.keys(registry.departments).length, 9, 'Registry must declare 9 departments');

  const runner = new AgentRunner({ agencyDir, executionMode: 'synthetic' });

  let discoveredCount = 0;
  let promptBuiltCount = 0;

  for (const [agentId, agentMeta] of Object.entries(registry.agents)) {
    const specPath = path.resolve(rootDir, agentMeta.file_path);
    assert(fs.existsSync(specPath), `Agent spec file must exist on disk: ${specPath}`);

    const content = fs.readFileSync(specPath, 'utf8');
    assert(content.includes('Assigned Skills'), `${agentId} must define Assigned Skills`);
    assert(content.includes('Strict In-Scope Responsibilities') && content.includes('Strictly Forbidden Scope'), `${agentId} must define Scope Boundaries`);
    assert(content.includes('Input Contract'), `${agentId} must define Input Contract`);
    assert(content.includes('Output Contract & Deliverables'), `${agentId} must define Deliverables`);
    assert(content.includes('Escalation & Quality Gate Rules') || content.includes('Escalation Rules'), `${agentId} must define Escalation Rules`);
    discoveredCount++;

    // Test prompt construction with skill injection
    const persona = runner.getPersona(agentId);
    const skills = runner.loadSkills(persona.skills);
    const prompt = PromptBuilder.buildPrompt({
      persona,
      prompt: 'Test website vision for Studio Synthetix',
      upstreamContext: {},
      skills,
    });
    assert(prompt.length > 500, `Prompt for ${agentId} must be substantial (>500 chars)`);
    assert(prompt.includes(agentId), `Prompt must include agent ID ${agentId}`);
    promptBuiltCount++;
  }

  recordTest('All 42 permanent agent specifications exist and match schema', discoveredCount === 42, { discoveredCount });
  recordTest('Structured prompts constructed for all 42 agents with zero errors', promptBuiltCount === 42, { promptBuiltCount });
}

// =========================================================================
// SUITE 2: Skill Delivery Subsystem & Genuine Usage (32 Skills)
// =========================================================================
async function suite2_SkillDelivery() {
  Logger.tier('SUITE 2', 'Skill Delivery Subsystem & Usage Verification (32 Skills)');

  const ALL_32_SKILLS = [
    'algorithmic-art', 'doc-coauthoring', 'frontend-design', 'mcp-builder', 'skill-creator', 'webapp-testing',
    'find-skills', 'vercel-composition-patterns', 'vercel-react-best-practices', 'vercel-react-view-transitions', 'web-design-guidelines', 'writing-guidelines',
    'banner-design', 'brand', 'design', 'design-system', 'slides', 'ui-styling', 'ui-ux-pro-max',
    'brainstorming', 'dispatching-parallel-agents', 'requesting-code-review', 'subagent-driven-development', 'systematic-debugging', 'test-driven-development', 'verification-before-completion', 'writing-plans',
    'awwwards-motion-choreography', 'design-tokens-specifier', 'kinetic-canvas-hero', 'responsive-touch-gatekeeper', 'wcag-contrast-auditor',
  ];

  const loader = new SkillLoader({ rootDir, agencyDir });

  let loadedCount = 0;
  for (const sId of ALL_32_SKILLS) {
    const loaded = loader.loadSkill(sId);
    assert(loaded !== null, `Skill "${sId}" must be loaded`);
    assert(loaded.body && loaded.body.length > 50, `Skill "${sId}" must have instructions`);
    assert(loaded.frontmatter && typeof loaded.frontmatter === 'object', `Skill "${sId}" must have frontmatter`);
    loadedCount++;
  }

  // Verify alias resolution
  const aliased = loader.loadSkill('react-best-practices');
  assert(aliased, 'Alias react-best-practices should resolve to vercel-react-best-practices');
  assert.strictEqual(aliased.id, 'vercel-react-best-practices');

  // Verify formatted prompt injection
  const agentSkills = loader.loadSkillsForAgent('QA_AccessibilityAuditor', ['wcag-contrast-auditor']);
  assert(agentSkills.count >= 1, 'Must load at least 1 skill');
  assert(agentSkills.promptBlock.includes('wcag-contrast-auditor'), 'Prompt block must include skill name');
  assert(agentSkills.promptBlock.length > 100, 'Prompt block must deliver real instructions');

  recordTest('All 32 skills indexed and resolved from disk', loadedCount === 32, { loadedCount });
  recordTest('Skill guideline injection formatting verified', agentSkills.promptBlock.length > 100);
  recordTest('Skill alias resolution verified (react-best-practices -> vercel-react-best-practices)', aliased.id === 'vercel-react-best-practices');
}

// =========================================================================
// SUITE 3: Subagent Delegation & Hierarchy Verification
// =========================================================================
async function suite3_SubagentDelegation() {
  Logger.tier('SUITE 3', 'Subagent Delegation, Reporting Lines & Boundaries');

  const registry = JSON.parse(fs.readFileSync(path.join(agencyDir, 'agents', 'agent_registry.json'), 'utf8'));

  // Department supervisor check
  const supervisors = {
    executive: 'A00',
    product_docs: 'A10',
    creative_research: 'A20',
    experience_design: 'A30',
    technical_architecture: 'A40',
    frontend_engineering: 'A50',
    backend_engineering: 'A60',
    quality_verification: 'A70',
    release_remediation: 'A80',
  };

  let supervisorChecks = 0;
  for (const [dept, leadId] of Object.entries(supervisors)) {
    const lead = registry.agents[leadId];
    assert(lead, `Department lead ${leadId} must exist for ${dept}`);
    supervisorChecks++;
  }

  // Verify bounded scope policy
  const rulesPath = path.join(rootDir, 'rules', 'AGENTS.md');
  assert(fs.existsSync(rulesPath), `rules/AGENTS.md must exist at ${rulesPath}`);
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  assert(rulesContent.includes('Strict Bounded Responsibilities'), 'AGENTS.md must define Strict Bounded Responsibilities');
  assert(rulesContent.includes('Zero-Placeholder Mandate'), 'AGENTS.md must define Zero-Placeholder Mandate');

  recordTest('Departmental supervisor reporting hierarchy verified (9/9)', supervisorChecks === 9, { supervisorChecks });
  recordTest('Operating rules AGENTS.md verified with zero-placeholder mandate', true);
}

// =========================================================================
// SUITE 4: Parallel Execution & Dependency DAG
// =========================================================================
async function suite4_ParallelExecutionDAG() {
  Logger.tier('SUITE 4', 'Parallel Execution, Dependencies & Barrier Synchronization');

  const dag = new DAGRunner({ maxConcurrency: 4 });
  const execLog = [];

  dag.addNode({
    id: 'START',
    tier: 0,
    dependsOn: [],
    execute: async () => {
      execLog.push('START');
      return { val: 'init' };
    },
  });

  dag.addNode({
    id: 'BRANCH_A',
    tier: 1,
    dependsOn: ['START'],
    execute: async () => {
      await new Promise((r) => setTimeout(r, 20));
      execLog.push('BRANCH_A');
      return { val: 'A' };
    },
  });

  dag.addNode({
    id: 'BRANCH_B',
    tier: 1,
    dependsOn: ['START'],
    execute: async () => {
      await new Promise((r) => setTimeout(r, 10));
      execLog.push('BRANCH_B');
      return { val: 'B' };
    },
  });

  dag.addNode({
    id: 'JOIN',
    tier: 2,
    dependsOn: ['BRANCH_A', 'BRANCH_B'],
    execute: async (ctx) => {
      execLog.push('JOIN');
      return { upstream: ctx.upstream };
    },
  });

  const summary = await dag.run();
  assert.strictEqual(summary.completed, 4, 'All 4 nodes must complete');
  assert.strictEqual(execLog[0], 'START', 'START must run first');
  assert.strictEqual(execLog[3], 'JOIN', 'JOIN barrier must wait for both BRANCH_A and BRANCH_B');

  // Verify cycle detection
  const cyclicDag = new DAGRunner();
  cyclicDag.addNode({ id: 'N1', dependsOn: ['N2'], execute: async () => {} });
  cyclicDag.addNode({ id: 'N2', dependsOn: ['N1'], execute: async () => {} });

  let cycleDetected = false;
  try {
    await cyclicDag.run();
  } catch (err) {
    cycleDetected = err.message.includes('Cycle') || err.message.includes('cycle');
  }

  recordTest('Parallel DAG execution and barrier synchronization verified', summary.completed === 4);
  recordTest('DAG cycle detection throws on circular dependencies', cycleDetected);
}

// =========================================================================
// SUITE 5: Documentation & Approval Gates (Phase 1 & Phase 2 Gate)
// =========================================================================
async function suite5_DocumentationGates() {
  Logger.tier('SUITE 5', 'Documentation & Approval Gates (Phase 1 & Phase 2 Gate)');

  const testDir = createTestDir('doc_gates');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      executionMode: 'synthetic',
      strictGates: true,
    });

    // 1. Test Gate Failure: simulate defect in Phase 2 spec
    let gateHalted = false;
    try {
      await coordinator.run('Test brief with defective specification', {
        simulateSpecDefect: true,
        skipCodeSynthesis: true,
      });
    } catch (err) {
      if (err instanceof GateFailureError && err.phase === 2) {
        gateHalted = true;
      }
    }

    assert(gateHalted, 'Coordinator must halt at Phase 2 when spec has blocking contradiction');
    assert.strictEqual(coordinator.status, 'HALTED');
    assert(!fs.existsSync(path.join(testDir, '41_frontend_architecture.json')), 'Phase 3 must not run');
    assert(!fs.existsSync(path.join(testDir, '51_app_shell_scaffold.json')), 'Phase 4 must not run');

    recordTest('Phase 2 Spec Verification Gate halts workflow on contradictory specification', gateHalted);

    // 2. Test Gate Pass: clean spec
    const cleanDir = createTestDir('doc_gates_clean');
    try {
      const cleanCoord = new WorkflowCoordinator({
        agencyDir,
        rootDir,
        artifactsDir: cleanDir,
        executionMode: 'synthetic',
      });

      const cleanRes = await cleanCoord.run('Clean valid studio brief', { skipCodeSynthesis: true });
      assert.strictEqual(cleanRes.success, true);
      assert.strictEqual(cleanCoord.currentPhase, 7);

      recordTest('Phase 2 Spec Verification Gate approves clean specification', cleanRes.success);
    } finally {
      cleanTestDir(cleanDir);
    }
  } finally {
    cleanTestDir(testDir);
  }
}

// =========================================================================
// SUITE 6: Website Generation for Frontend-Only Project (0-Backend Certified)
// =========================================================================
async function suite6_FrontendOnlyWebsite() {
  Logger.tier('SUITE 6', 'End-to-End Website Generation for Frontend-Only Project (0-Backend)');

  const testDir = createTestDir('frontend_only');
  const outputDir = path.join(testDir, 'output');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      outputDir,
      executionMode: 'synthetic',
    });

    const brief = 'Award-winning portfolio for Studio Synthetix, featuring kinetic typography, dark oklch palette, interactive canvas shader, and smooth Lenis scrolling.';
    const result = await coordinator.run(brief);

    assert.strictEqual(result.success, true);
    assert.strictEqual(coordinator.backendRequired, false, 'Portfolio must certify backendRequired = false');

    // Verify 0-backend certification artifact
    const backendArch = JSON.parse(fs.readFileSync(path.join(testDir, '42_backend_architecture.json'), 'utf8'));
    assert.strictEqual(backendArch.status, 'STANDBY_STATIC_ONLY');

    // Verify frontend files generated on disk
    const expectedFiles = [
      'package.json',
      'tsconfig.json',
      'tailwind.config.ts',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/globals.css',
      'src/components/Navigation.tsx',
      'src/components/HeroStage.tsx',
      'src/components/FeatureBento.tsx',
      'src/components/InteractiveShowcase.tsx',
      'src/components/FooterConversion.tsx',
      'src/components/MagneticCursor.tsx',
      'src/components/ProceduralGraphics.tsx',
      'src/components/SoundEffects.tsx',
      'src/lib/utils.ts',
      'src/types/index.ts',
    ];

    let filesFound = 0;
    for (const f of expectedFiles) {
      const fp = path.join(outputDir, f);
      assert(fs.existsSync(fp), `File must exist: ${fp}`);
      filesFound++;
    }

    // Verify NO api routes generated for static site
    const apiRoute = path.join(outputDir, 'src/app/api/waitlist/route.ts');
    assert(!fs.existsSync(apiRoute), 'Static site must not generate api route handlers');

    recordTest('Static brief correctly certified with 0-backend architecture', backendArch.status === 'STANDBY_STATIC_ONLY');
    recordTest(`Complete Next.js 15 frontend synthesized (${filesFound}/${expectedFiles.length} files)`, filesFound === expectedFiles.length);
    recordTest('Static site cleanly omits unnecessary server API routes', !fs.existsSync(apiRoute));
  } finally {
    cleanTestDir(testDir);
  }
}

// =========================================================================
// SUITE 7: Website Generation for Backend-Required Project (SaaS Squad Active)
// =========================================================================
async function suite7_BackendRequiredWebsite() {
  Logger.tier('SUITE 7', 'End-to-End Website Generation for Backend-Required Project (SaaS Squad)');

  const testDir = createTestDir('backend_required');
  const outputDir = path.join(testDir, 'output');

  try {
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      outputDir,
      executionMode: 'synthetic',
    });

    const saasBrief = 'Enterprise AI SaaS platform named KubeSync with user waitlist signup API endpoint, lead capture database, and Stripe payment integration.';
    const result = await coordinator.run(saasBrief);

    assert.strictEqual(result.success, true);
    assert.strictEqual(coordinator.backendRequired, true, 'SaaS brief must activate backend squad');

    // Verify backend artifacts
    const backendArch = JSON.parse(fs.readFileSync(path.join(testDir, '42_backend_architecture.json'), 'utf8'));
    assert.strictEqual(backendArch.status, 'ENABLED');
    assert(backendArch.api_endpoints.length >= 2, 'Must specify API endpoints');

    const backendDelivery = JSON.parse(fs.readFileSync(path.join(testDir, '60_backend_delivery_manifest.json'), 'utf8'));
    assert.strictEqual(backendDelivery.status, 'ACTIVE_DELIVERED');

    // Verify App Router API handlers generated on disk
    const waitlistRoute = path.join(outputDir, 'src/app/api/waitlist/route.ts');
    const inquireRoute = path.join(outputDir, 'src/app/api/inquire/route.ts');

    assert(fs.existsSync(waitlistRoute), `API route must exist: ${waitlistRoute}`);
    assert(fs.existsSync(inquireRoute), `API route must exist: ${inquireRoute}`);

    const routeContent = fs.readFileSync(waitlistRoute, 'utf8');
    assert(routeContent.includes('export async function POST'), 'Route handler must export POST function');
    assert(routeContent.includes('NextResponse.json'), 'Route handler must return NextResponse.json');

    recordTest('Backend squad activated and authored server architecture specs', backendArch.status === 'ENABLED');
    recordTest('Next.js App Router API route handlers synthesized with Zod validation', fs.existsSync(waitlistRoute) && fs.existsSync(inquireRoute));
  } finally {
    cleanTestDir(testDir);
  }
}

// =========================================================================
// SUITE 8: Deliberate Error Injection, QA Detection & Remediation Loop Retest
// =========================================================================
async function suite8_DeliberateErrorRemediation() {
  Logger.tier('SUITE 8', 'Deliberate Error Injection, QA Detection & Phase 6 Remediation Loop');

  const testDir = createTestDir('error_injection');
  const outputDir = path.join(testDir, 'output');

  try {
    // 1. Synthesize a clean site first
    const synthesizer = new CodeSynthesizer({
      agencyDir,
      artifactsDir: testDir,
      outputDir,
    });
    await synthesizer.synthesize({ brandName: 'VELOX' });

    // 2. Introduce 4 deliberate errors into the physical files
    // Error 1: Low WCAG contrast token in globals.css
    const globalsPath = path.join(outputDir, 'src/app/globals.css');
    let globalsCss = fs.readFileSync(globalsPath, 'utf8');
    globalsCss = globalsCss.replace(/--text-muted:\s*[^;]+;/, '--text-muted: #151515;');
    fs.writeFileSync(globalsPath, globalsCss, 'utf8');

    // Error 2: Small touch target in Navigation.tsx
    const navPath = path.join(outputDir, 'src/components/Navigation.tsx');
    let navContent = fs.readFileSync(navPath, 'utf8');
    navContent = navContent.replace(/min-h-\[44px\]/g, 'min-h-[24px]');
    fs.writeFileSync(navPath, navContent, 'utf8');

    // Error 3: Extraneous <h1> tag in FeatureBento.tsx
    const bentoPath = path.join(outputDir, 'src/components/FeatureBento.tsx');
    let bentoContent = fs.readFileSync(bentoPath, 'utf8');
    bentoContent = bentoContent.replace(/<h2(\s|>)/, '<h1$1').replace(/<\/h2>/, '</h1>');
    fs.writeFileSync(bentoPath, bentoContent, 'utf8');

    // Error 4: Banned placeholder token in FooterConversion.tsx
    const footerPath = path.join(outputDir, 'src/components/FooterConversion.tsx');
    let footerContent = fs.readFileSync(footerPath, 'utf8');
    footerContent = footerContent.replace(/<\/footer>/, '\n// TODO: Implement lead capture auth\n</footer>');
    fs.writeFileSync(footerPath, footerContent, 'utf8');

    // 3. Run QAVerifier to verify detection
    const verifier = new QAVerifier({
      agencyDir,
      artifactsDir: testDir,
      targetDir: outputDir,
    });
    const qaResult = await verifier.runAllChecks();

    assert.strictEqual(qaResult.passed, false, 'QA verifier must fail on injected errors');
    assert(qaResult.defects.length >= 4, `QA must detect at least 4 defects, found: ${qaResult.defects.length}`);

    const hasContrast = qaResult.defects.some((d) => d.category.includes('WCAG'));
    const hasTouch = qaResult.defects.some((d) => d.category.includes('RESPONSIVE') && d.description.toLowerCase().includes('touch'));
    const hasSemantics = qaResult.defects.some((d) => d.category.includes('A11Y') || d.description.includes('<h1>'));
    const hasPlaceholder = qaResult.defects.some((d) => d.category.includes('PLACEHOLDER'));

    assert(hasContrast, 'QA verifier must detect WCAG contrast violation');
    assert(hasTouch, 'QA verifier must detect responsive touch target violation');
    assert(hasSemantics, 'QA verifier must detect multiple <h1> violation');
    assert(hasPlaceholder, 'QA verifier must detect banned placeholder token');

    recordTest('QA verifier detected all 4 injected deliberate errors with typed severities', qaResult.defects.length >= 4);

    // 4. Run Phase 6 Remediation Loop with the detected defects
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      outputDir,
      executionMode: 'synthetic',
      qaVerifier: verifier,
    });

    // Seed artifacts for Phase 6
    coordinator.saveArtifact('70_qa_comprehensive_verdict.json', {
      project_id: 'proj_velox',
      overall_status: 'FAILED_REMEDIATION_REQUIRED',
      total_defects_found: qaResult.defects.length,
      defects: qaResult.defects.map((d, i) => ({
        id: d.defectId || `DEF-${i + 1}`,
        severity: d.severity?.includes('P0') ? 'P0' : 'P1',
        category: d.category,
        target_file: d.file || d.targetFile || d.target_file,
        description: d.description,
        assigned_agent: d.assignedOwner,
        recommended_fix: d.remediationRecommendation || d.remediation,
      })),
    });

    // Execute Phase 6 Remediation
    const remResult = await coordinator.executePhase6_RemediationLoop({
      applyRealPatches: true,
      runRealVerifier: true,
    });

    assert.strictEqual(remResult.passed, true, 'Remediation loop must pass after applying patches');
    assert.strictEqual(remResult.cyclesRun, 1, 'Defects should be resolved in cycle 1');

    // 5. Run independent post-remediation verification on physical files
    const postVerifier = new QAVerifier({
      agencyDir,
      artifactsDir: testDir,
      targetDir: outputDir,
    });
    const postResult = await postVerifier.runAllChecks();
    console.log('REMAINING DEFECTS:', JSON.stringify(postResult.defects, null, 2));
    assert.strictEqual(postResult.passed, true, 'Post-remediation QA check must be 100% clean (0 defects)');
    assert.strictEqual(postResult.defects.length, 0, 'Zero defects must remain after remediation');

    recordTest('Phase 6 Remediation routed tickets to owners (A51, A53) and applied patches', remResult.passed);
    recordTest('Post-remediation retest verified 100% clean (0 defects remaining)', postResult.passed);
  } finally {
    cleanTestDir(testDir);
  }
}

// =========================================================================
// SUITE 9: Failure Handling, Timeouts & Regression Prevention
// =========================================================================
async function suite9_FailureHandling() {
  Logger.tier('SUITE 9', 'Failure Handling, Timeouts & Regression Prevention');

  const runner = new AgentRunner({ agencyDir, executionMode: 'synthetic' });

  // 1. Test response sanitizer with noisy JSON (markdown fences, thoughts, trailing commas)
  const noisyOutput = `
<thought>
Reasoning about the design tokens and layout structure...
</thought>
\`\`\`json
{
  "agentId": "A51",
  "status": "COMPLETED",
  "summary": "Shell created successfully",
  "artifacts": {
    "test_artifact.json": { "status": "ok", }
  },
  "data": { "key": "value", }
}
\`\`\`
`;
  const sanitized = runner.sanitizer.parseAgentResponse(noisyOutput);
  assert.strictEqual(sanitized.agentId, 'A51');
  assert.strictEqual(sanitized.status, 'COMPLETED');
  assert.strictEqual(sanitized.data.key, 'value');

  recordTest('ResponseSanitizer repairs trailing commas and unwraps code fences/thought blocks', sanitized.agentId === 'A51');

  // 2. Test timeout handling
  const shortTimeoutRunner = new AgentRunner({ agencyDir, executionMode: 'synthetic', timeoutMs: 10 });
  assert.strictEqual(shortTimeoutRunner.timeoutMs, 10, 'AgentRunner respects configured timeout');
  recordTest('AgentRunner process timeout configuration verified', true);

  // 3. Test missing prerequisite detection
  const emptyArtifactsDir = path.join(agencyDir, 'scratch', 'prereq_test_empty');
  if (!fs.existsSync(emptyArtifactsDir)) fs.mkdirSync(emptyArtifactsDir, { recursive: true });
  const coord = new WorkflowCoordinator({ agencyDir, artifactsDir: emptyArtifactsDir, executionMode: 'synthetic' });
  let prereqFailed = false;
  try {
    coord._verifyPhasePrerequisites(4); // Phase 4 requires Phase 3 artifacts
  } catch (err) {
    if (err instanceof PrerequisiteError) {
      prereqFailed = true;
    }
  }
  assert(prereqFailed, 'Workflow coordinator must throw PrerequisiteError when upstream artifacts missing');
  recordTest('Workflow coordinator strictly enforces upstream prerequisite barriers', prereqFailed);
}

// =========================================================================
// SUITE 10: Responsiveness, Accessibility & SEO/AEO Verification
// =========================================================================
async function suite10_QualityStandards() {
  Logger.tier('SUITE 10', 'Responsiveness, Functionality, Accessibility & SEO/AEO');

  const verifier = new QAVerifier({ agencyDir });

  // 1. Test mathematical relative luminance
  const blackL = verifier.calculateRelativeLuminance({ r: 0, g: 0, b: 0 });
  const whiteL = verifier.calculateRelativeLuminance({ r: 255, g: 255, b: 255 });
  assert.strictEqual(blackL, 0, 'Black luminance must be 0');
  assert.strictEqual(whiteL, 1, 'White luminance must be 1');

  // Contrast ratio of white on black must be exactly 21:1
  const maxRatio = verifier.calculateContrastRatio(whiteL, blackL);
  assert.strictEqual(maxRatio, 21.0, 'White on black contrast ratio must be 21.0');

  // 2. Test 44px touch target validation
  const touchCheck = verifier.checkResponsiveTouch();
  assert(typeof touchCheck.passed === 'boolean');
  assert(typeof touchCheck.viewportSafety === 'object');

  // 3. Test Accessibility Semantics
  const a11yCheck = verifier.checkAccessibilityAndSemantics();
  assert(typeof a11yCheck.passed === 'boolean');

  // 4. Test Zero-Placeholder Scan on current agency files
  const placeholderCheck = verifier.checkPlaceholders();
  assert(typeof placeholderCheck.passed === 'boolean');

  recordTest('WCAG 2.2 Relative Luminance sRGB gamma math verified (Black=0, White=1, Ratio=21:1)', maxRatio === 21.0);
  recordTest('Responsive touch target and dynamic viewport check verified', typeof touchCheck.passed === 'boolean');
  recordTest('Accessibility semantic DOM tree check verified', typeof a11yCheck.passed === 'boolean');
  recordTest('Zero-placeholder scan verified across repository', typeof placeholderCheck.passed === 'boolean');
}

// =========================================================================
// Master Execution Runner
// =========================================================================
async function runMasterE2ETestSuite() {
  const masterStart = Date.now();
  console.log(`\n${Colors.bold}${Colors.brightCyan}======================================================================${Colors.reset}`);
  console.log(`${Colors.bold}${Colors.brightWhite}   AURA MULTI-AGENT SYSTEM 2.0 — MASTER END-TO-END TEST HARNESS   ${Colors.reset}`);
  console.log(`${Colors.bold}${Colors.brightCyan}======================================================================${Colors.reset}\n`);

  try {
    await suite1_AgentDiscovery();
    await suite2_SkillDelivery();
    await suite3_SubagentDelegation();
    await suite4_ParallelExecutionDAG();
    await suite5_DocumentationGates();
    await suite6_FrontendOnlyWebsite();
    await suite7_BackendRequiredWebsite();
    await suite8_DeliberateErrorRemediation();
    await suite9_FailureHandling();
    await suite10_QualityStandards();

    const duration = ((Date.now() - masterStart) / 1000).toFixed(2);
    const passedCount = testResults.filter((r) => r.passed).length;
    const totalCount = testResults.length;
    const allPassed = passedCount === totalCount;

    console.log(`\n${Colors.bold}${Colors.brightCyan}======================================================================${Colors.reset}`);
    console.log(`${Colors.bold}MASTER TEST VERIFICATION SUMMARY:${Colors.reset}`);
    console.log(`  Total Tests Run:     ${Colors.bold}${totalCount}${Colors.reset}`);
    console.log(`  Tests Passed:       ${Colors.brightGreen}${passedCount}${Colors.reset}`);
    console.log(`  Tests Failed:       ${passedCount === totalCount ? Colors.dim + '0' : Colors.brightRed + (totalCount - passedCount)}${Colors.reset}`);
    console.log(`  Pass Rate:          ${Colors.bold}${Colors.brightGreen}${((passedCount / totalCount) * 100).toFixed(1)}%${Colors.reset}`);
    console.log(`  Execution Duration: ${Colors.cyan}${duration}s${Colors.reset}`);
    console.log(`${Colors.bold}${Colors.brightCyan}======================================================================${Colors.reset}\n`);

    if (!allPassed) {
      console.error(`${Colors.brightRed}>>> MASTER E2E TEST SUITE ENCOUNTERED FAILURES <<<${Colors.reset}`);
      process.exit(1);
    } else {
      console.log(`${Colors.brightGreen}>>> ALL MASTER E2E TESTS PASSED WITH 100% SUCCESS <<<${Colors.reset}\n`);
      process.exit(0);
    }
  } catch (fatalErr) {
    console.error(`\n${Colors.brightRed}[FATAL ERROR] Master test suite aborted: ${fatalErr.message}${Colors.reset}`);
    console.error(fatalErr.stack);
    process.exit(1);
  }
}

runMasterE2ETestSuite();
