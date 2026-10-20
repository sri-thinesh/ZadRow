/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: AgentRunner & AI Execution Engine
 *
 * Verifies:
 * 1. Persona Discovery & Specification Parsing
 * 2. Dynamic Skill Loading & Caching from .agents/skills and mas_agency/skills
 * 3. High-Fidelity Prompt Construction with Skill & Artifact Injection
 * 4. Response Sanitization & JSON Extraction (fences, thought tokens, trailing commas)
 * 5. Structured Synthetic Fallback Execution & Flagging (`executionMode: "synthetic_fallback"`)
 * 6. Native Antigravity CLI Execution Pipeline (`executionMode: "cli"`)
 * 7. Dynamic Conditional Node Activation & Cascading Skips in DAGRunner
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  AgentRunner,
  SkillLoader,
  PromptBuilder,
  ResponseSanitizer,
  resolveCliPath,
} from '../src/engine/agent_runner.js';
import { DAGRunner, DAGNode } from '../src/engine/dag_runner.js';
import { Logger, Colors } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');

// =====================================================================
// Test 1: Persona Discovery and Specification Parsing
// =====================================================================
async function testPersonaDiscoveryAndParsing() {
  Logger.info('Testing persona discovery and markdown specification parsing...');
  const runner = new AgentRunner({
    agencyDir,
    rootDir,
    cliPath: process.env.ANTIGRAVITY_CLI_PATH || (process.platform === 'win32' ? process.env.COMSPEC || 'cmd.exe' : '/bin/sh'),
  });

  assert(runner.personas.size >= 18, `Expected at least 18 personas loaded, got ${runner.personas.size}`);

  // Inspect E01_BriefAnalyst / A01
  const e01 = runner.getPersona('E01_BriefAnalyst');
  assert.strictEqual(e01.id, 'E01_BriefAnalyst');
  assert(e01.title.length > 0, 'Human title should be populated');
  assert(e01.inScope.length > 0, 'In-scope responsibilities should be parsed');
  assert(e01.forbiddenScope.length > 0, 'Forbidden scope should be parsed');
  assert(e01.skills.length > 0, 'Assigned skills should be parsed');

  // Inspect DS_TokenSpecifier / A32
  const ds = runner.getPersona('DS_TokenSpecifier');
  assert.strictEqual(ds.id, 'DS_TokenSpecifier');
  assert(ds.inScope.length > 0, 'DS in-scope responsibilities should be parsed');
  assert(ds.skills.length > 0, 'DS skills should be parsed');

  Logger.success(`Persona discovery and parsing verified (${runner.personas.size} agents loaded).`);
}

// =====================================================================
// Test 2: Dynamic Skill Loading and Caching
// =====================================================================
async function testDynamicSkillLoading() {
  Logger.info('Testing dynamic skill loading from .agents/skills and mas_agency/skills...');
  const skillsDirs = [
    path.join(agencyDir, 'skills'),
    path.join(rootDir, '.agents', 'skills'),
  ];
  const loader = new SkillLoader(skillsDirs);

  // Load writing-guidelines
  const writingSkill = loader.loadSkill('writing-guidelines');
  assert(writingSkill && writingSkill.length > 0, 'writing-guidelines skill content should be loaded');
  assert(writingSkill.includes('Guidelines') || writingSkill.includes('writing'), 'Skill content should match expected text');

  // Load web-design-guidelines
  const designSkill = loader.loadSkill('web-design-guidelines');
  assert(designSkill && designSkill.length > 0, 'web-design-guidelines skill content should be loaded');

  // Test caching: second load should return cached instance
  const cached = loader.loadSkill('writing-guidelines');
  assert.strictEqual(writingSkill, cached, 'Skill content should be cached');

  // Test batch loading
  const batch = loader.loadSkills(['writing-guidelines', 'web-design-guidelines']);
  assert.strictEqual(Object.keys(batch).length, 2, 'Batch loader should return both skills');

  // Test skill extraction from markdown text
  const sampleMarkdown = `
## 3. Assigned Skills
This agent draws on capabilities documented in:
- \`.agents/skills/writing-guidelines/SKILL.md\`: Enforces crisp language
- \`.agents/skills/vercel-composition-patterns/SKILL.md\`: Theme tokens
`;
  const extractedSkills = loader.extractSkillsFromMarkdown(sampleMarkdown);
  assert(extractedSkills.includes('writing-guidelines'), 'Extracted skills should contain writing-guidelines');
  assert(extractedSkills.includes('vercel-composition-patterns'), 'Extracted skills should contain vercel-composition-patterns');

  Logger.success('Dynamic skill loading and caching verified.');
}

// =====================================================================
// Test 3: High-Fidelity Prompt Construction
// =====================================================================
async function testPromptConstruction() {
  Logger.info('Testing structured prompt construction pipeline...');
  const runner = new AgentRunner({
    agencyDir,
    rootDir,
    cliPath: process.env.ANTIGRAVITY_CLI_PATH || (process.platform === 'win32' ? process.env.COMSPEC || 'cmd.exe' : '/bin/sh'),
  });
  const persona = runner.getPersona('DS_TokenSpecifier');
  const skills = runner.loadSkills(['web-design-guidelines', 'vercel-composition-patterns']);

  const prompt = PromptBuilder.buildPrompt({
    persona,
    prompt: 'Create an award-winning site for NeuroVeil with dark luxury aesthetics',
    upstreamContext: {
      CD_ArtDirector: {
        data: {
          palette: { primary: '#f59e0b', background: '#090a0f' },
          aestheticUniverse: 'Cyber-Luxury Kinetic Brutalism',
        },
      },
    },
    skills,
    brandName: 'NEUROVEIL',
    targetIndustry: 'Neurotechnology & Human Augmentation',
  });

  // Check all structured prompt layers
  assert(prompt.includes('AGENT IDENTITY & ROLE SPECIFICATION: DS_TokenSpecifier'), 'Prompt must define agent identity');
  assert(prompt.includes('STRICT IN-SCOPE RESPONSIBILITIES:'), 'Prompt must define in-scope responsibilities');
  assert(prompt.includes('STRICTLY FORBIDDEN SCOPE (ZERO POLLUTION):'), 'Prompt must define forbidden scope');
  assert(prompt.includes('ASSIGNED SPECIALIZED SKILLS'), 'Prompt must inject assigned skills');
  assert(prompt.includes('CLIENT VISION & PROJECT BRIEF'), 'Prompt must include client brief');
  assert(prompt.includes('Brand Name: NEUROVEIL'), 'Prompt must include extracted brand name');
  assert(prompt.includes('UPSTREAM ARTIFACT CONTEXT (DEPENDENCIES)'), 'Prompt must include upstream artifacts');
  assert(prompt.includes('#f59e0b'), 'Prompt must include upstream art direction palette');
  assert(prompt.includes('MANDATORY OUTPUT CONTRACT (RAW JSON ONLY)'), 'Prompt must enforce strict JSON schema');

  Logger.success('Structured prompt construction verified.');
}

// =====================================================================
// Test 4: Response Sanitization & JSON Extraction
// =====================================================================
async function testResponseSanitizer() {
  Logger.info('Testing response sanitizer and JSON extraction...');

  // 1. Direct raw JSON
  const raw1 = '{"agentId": "DS_TokenSpecifier", "status": "COMPLETED", "data": {"ok": true}}';
  const parsed1 = ResponseSanitizer.extractJsonFromText(raw1);
  assert.strictEqual(parsed1.agentId, 'DS_TokenSpecifier');

  // 2. Markdown fenced code block (```json ... ```)
  const raw2 = `
Here is your requested output:
\`\`\`json
{
  "agentId": "CD_ArtDirector",
  "status": "COMPLETED",
  "artifacts": {
    "01_art_direction.json": { "concept": "Cyber-Luxury" }
  },
  "data": { "concept": "Cyber-Luxury" }
}
\`\`\`
Hope this helps!
`;
  const parsed2 = ResponseSanitizer.extractJsonFromText(raw2);
  assert.strictEqual(parsed2.agentId, 'CD_ArtDirector');
  assert.strictEqual(parsed2.data.concept, 'Cyber-Luxury');

  // 3. Response with <thought> reasoning tokens
  const raw3 = `
<thought>
The user wants a clean executive brief for Studio Synthetix.
I will assemble the pillars and North Star.
</thought>
\`\`\`json
{
  "agentId": "E01_BriefAnalyst",
  "status": "COMPLETED",
  "summary": "Brief analyzed",
  "data": { "brandName": "Studio Synthetix" }
}
\`\`\`
`;
  const parsed3 = ResponseSanitizer.extractJsonFromText(raw3);
  assert.strictEqual(parsed3.agentId, 'E01_BriefAnalyst');
  assert.strictEqual(parsed3.data.brandName, 'Studio Synthetix');

  // 4. Response with trailing commas repair
  const raw4 = `
{
  "agentId": "TEST_Agent",
  "status": "COMPLETED",
  "data": {
    "items": ["a", "b", "c",],
    "count": 3,
  },
}
`;
  const parsed4 = ResponseSanitizer.extractJsonFromText(raw4);
  assert.strictEqual(parsed4.agentId, 'TEST_Agent');
  assert.strictEqual(parsed4.data.count, 3);

  // 5. sanitizeAgentOutput normalization
  const sanitized = ResponseSanitizer.sanitizeAgentOutput(parsed3, 'E01_BriefAnalyst', {
    brandName: 'Studio Synthetix',
    primaryArtifact: '00_executive_brief.json',
  });
  assert.strictEqual(sanitized.agentId, 'E01_BriefAnalyst');
  assert.strictEqual(sanitized.status, 'COMPLETED');
  assert.strictEqual(sanitized.data.brandName, 'Studio Synthetix');
  assert(sanitized.artifacts['00_executive_brief.json'], 'Primary artifact should be mapped');

  Logger.success('Response sanitizer and JSON extraction verified.');
}

// =====================================================================
// Test 5: Missing Antigravity CLI Throws Error (Zero Fallback)
// =====================================================================
async function testMissingCliThrows() {
  Logger.info('Testing missing CLI throws clear error naming ANTIGRAVITY_CLI_PATH...');

  let threwExpected = false;
  try {
    const runner = new AgentRunner({
      agencyDir,
      rootDir,
      cliPath: '/nonexistent/path/to/cli_binary_never_exists_12345',
    });
    await runner.executeAgent('E01_BriefAnalyst', 'Create test brand', {});
  } catch (err) {
    threwExpected = true;
    assert(
      err.message.includes('Antigravity CLI binary not found') ||
      err.message.includes('ANTIGRAVITY_CLI_PATH'),
      `Error message must name CLI or ANTIGRAVITY_CLI_PATH, got: ${err.message}`
    );
  }

  assert.strictEqual(threwExpected, true, 'AgentRunner MUST throw when CLI is missing or unavailable');
  Logger.success('Missing CLI throws clear error (synthetic fallback completely eliminated).');
}

// =====================================================================
// Test 6: Antigravity CLI Path Resolver Precedence & Error Reporting
// =====================================================================
async function testCliPathResolver() {
  Logger.info('Testing CLI path resolver precedence, PATH discovery, and failure reporting...');

  const origEnv = process.env.ANTIGRAVITY_CLI_PATH;
  const origPath = process.env.PATH;

  try {
    // 1. options.cliPath takes highest precedence
    delete process.env.ANTIGRAVITY_CLI_PATH;
    const fromOptions = resolveCliPath({ cliPath: '/opt/custom/antigravity' });
    assert.strictEqual(fromOptions, '/opt/custom/antigravity', 'options.cliPath must take highest precedence');

    // 2. process.env.ANTIGRAVITY_CLI_PATH takes precedence over PATH
    process.env.ANTIGRAVITY_CLI_PATH = '/env/custom/antigravity';
    const fromEnv = resolveCliPath({});
    assert.strictEqual(fromEnv, '/env/custom/antigravity', 'process.env.ANTIGRAVITY_CLI_PATH must take precedence over PATH');

    // 3. 'agy' found on PATH
    delete process.env.ANTIGRAVITY_CLI_PATH;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-resolver-test-'));
    const dummyBinaryName = process.platform === 'win32' ? 'agy.exe' : 'agy';
    const dummyBinaryPath = path.join(tempDir, dummyBinaryName);
    fs.writeFileSync(dummyBinaryPath, '#!/bin/sh\necho agy', 'utf8');

    process.env.PATH = `${tempDir}${path.delimiter}${origPath}`;
    const fromPath = resolveCliPath({});
    assert.strictEqual(path.resolve(fromPath), path.resolve(dummyBinaryPath), 'CLI resolver must discover "agy" on PATH');

    // Also verify AgentRunner constructor resolves this.cliPath when agy is on PATH
    const runnerWithAgy = new AgentRunner({ agencyDir, rootDir, executionMode: 'cli' });
    assert.strictEqual(path.resolve(runnerWithAgy.cliPath), path.resolve(dummyBinaryPath), 'AgentRunner.cliPath must resolve to agy on PATH');

    // 4. Throw clear error naming ANTIGRAVITY_CLI_PATH when not found
    delete process.env.ANTIGRAVITY_CLI_PATH;
    process.env.PATH = ''; // Empty PATH

    let resolverError = null;
    try {
      resolveCliPath({});
    } catch (err) {
      resolverError = err;
    }
    assert(resolverError, 'resolveCliPath must throw when CLI binary cannot be located');
    assert(
      resolverError.message.includes('ANTIGRAVITY_CLI_PATH'),
      `Error message must name ANTIGRAVITY_CLI_PATH, got: "${resolverError.message}"`
    );

    let constructorError = null;
    try {
      new AgentRunner({ agencyDir, rootDir, executionMode: 'auto' });
    } catch (err) {
      constructorError = err;
    }
    assert(constructorError, 'AgentRunner constructor must throw in auto/cli mode when CLI binary cannot be located');
    assert(
      constructorError.message.includes('ANTIGRAVITY_CLI_PATH'),
      `Constructor error message must name ANTIGRAVITY_CLI_PATH, got: "${constructorError.message}"`
    );

    // Clean up temp dir
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    Logger.success('CLI path resolver precedence, PATH discovery, and failure reporting fully verified.');
  } finally {
    if (origEnv !== undefined) {
      process.env.ANTIGRAVITY_CLI_PATH = origEnv;
    } else {
      delete process.env.ANTIGRAVITY_CLI_PATH;
    }
    process.env.PATH = origPath;
  }
}

// =====================================================================
// Test 7: Real Antigravity CLI Execution Pipeline
// =====================================================================
async function testRealCliExecution() {
  Logger.info('Testing native Antigravity CLI execution pipeline...');
  let cliPath;
  try {
    cliPath = AgentRunner.resolveCliPath();
  } catch {
    cliPath = null;
  }

  if (!cliPath || !fs.existsSync(cliPath)) {
    Logger.warn(`CLI binary not found. Live CLI test skipped (CANNOT VERIFY REAL MODEL EXECUTION).`);
    return { skipped: true, reason: 'CLI binary not found on PATH or ANTIGRAVITY_CLI_PATH' };
  }

  const runner = new AgentRunner({
    agencyDir,
    rootDir,
    cliPath,
    executionMode: 'cli',
    allowFallback: false,
    cliTimeoutMs: 120000,
    maxRetries: 1,
  });

  const testPrompt = 'Create an executive brief for studio named KINETIX';
  const result = await runner.executeAgent('E01_BriefAnalyst', testPrompt, {});

  assert.strictEqual(result.status, 'COMPLETED');
  assert.strictEqual(result.executionMode, 'cli', 'Execution mode must be "cli" when real CLI is used');
  assert.strictEqual(result.synthetic, false, 'synthetic flag must be false when real CLI is used');
  assert(result.cliMetadata, 'cliMetadata should be recorded');
  assert(result.cliMetadata.durationSeconds !== undefined, 'CLI duration must be recorded');
  assert(result.data.brandName.toUpperCase().includes('KINETIX'), 'Brand name must match prompt');

  const artifactKeys = Object.keys(result.artifacts || {});
  assert(artifactKeys.length > 0, 'CLI execution must produce at least one artifact');
  const artifactPath = path.join(agencyDir, 'workspace', 'artifacts', artifactKeys[0]);
  assert(fs.existsSync(artifactPath), `CLI generated artifact (${artifactKeys[0]}) must be saved on disk`);

  Logger.success(`Real Antigravity CLI execution verified (duration: ${result.cliMetadata.durationSeconds}s, mode: ${result.executionMode}).`);
}

// =====================================================================
// Test 7: Dynamic Conditional Node Activation in DAGRunner
// =====================================================================
async function testDynamicConditionalDAGActivation() {
  Logger.info('Testing dynamic conditional node activation in DAGRunner...');

  // Scenario 1: Backend is NOT required (condition evaluates to false)
  const dag1 = new DAGRunner({ maxConcurrency: 4 });
  const executedNodes1 = [];
  const skippedNodes1 = [];

  dag1.on('node:complete', ({ node }) => executedNodes1.push(node.id));
  dag1.on('node:skipped', ({ node, reason }) => skippedNodes1.push({ id: node.id, reason }));

  // Root node: Master brief specifying requiresBackend: false
  dag1.addNode({
    id: 'E01_BriefAnalyst',
    tier: 0,
    dependsOn: [],
    execute: async () => ({
      data: { brandName: 'SOLO_FRONTEND', requiresBackend: false },
    }),
  });

  // Frontend squad node: runs unconditionally
  dag1.addNode({
    id: 'ENG_HeroStage',
    tier: 1,
    dependsOn: ['E01_BriefAnalyst'],
    execute: async () => ({
      data: { heroReady: true },
    }),
  });

  // A60 Backend Squad node: conditionally activated only when requiresBackend === true
  dag1.addNode({
    id: 'A60_BackendArchitect',
    tier: 1,
    dependsOn: ['E01_BriefAnalyst'],
    condition: (ctx) => ctx.upstream['E01_BriefAnalyst']?.data?.requiresBackend === true,
    execute: async () => ({
      data: { backendScaffolded: true },
    }),
  });

  // Downstream backend database node: depends on A60_BackendArchitect
  dag1.addNode({
    id: 'A61_DatabaseEngineer',
    tier: 2,
    dependsOn: ['A60_BackendArchitect'],
    execute: async () => ({
      data: { schemaMigrated: true },
    }),
  });

  // Release validator: depends on ENG_HeroStage (runs even if backend was skipped)
  dag1.addNode({
    id: 'REL_ReleaseValidator',
    tier: 2,
    dependsOn: ['ENG_HeroStage'],
    execute: async () => ({
      data: { releaseApproved: true },
    }),
  });

  const summary1 = await dag1.run();

  assert.strictEqual(summary1.completed, 3, 'Expected 3 completed nodes (Brief, HeroStage, ReleaseValidator)');
  assert.strictEqual(summary1.skipped, 2, 'Expected 2 skipped nodes (BackendArchitect and dependent DatabaseEngineer)');
  assert.strictEqual(summary1.failed, 0, 'No nodes should have failed');
  assert(executedNodes1.includes('ENG_HeroStage'), 'Frontend hero stage should have run');
  assert(!executedNodes1.includes('A60_BackendArchitect'), 'Backend architect should NOT have run');
  assert(!executedNodes1.includes('A61_DatabaseEngineer'), 'Database engineer should NOT have run');
  assert(skippedNodes1.some((s) => s.id === 'A60_BackendArchitect'), 'A60_BackendArchitect should be marked SKIPPED');
  assert(skippedNodes1.some((s) => s.id === 'A61_DatabaseEngineer'), 'A61_DatabaseEngineer should be cascadingly SKIPPED');

  Logger.info('Scenario 1 passed: Conditional squad skipped cleanly without blocking DAG.');

  // Scenario 2: Backend IS required (condition evaluates to true)
  const dag2 = new DAGRunner({ maxConcurrency: 4 });
  const executedNodes2 = [];

  dag2.on('node:complete', ({ node }) => executedNodes2.push(node.id));

  dag2.addNode({
    id: 'E01_BriefAnalyst',
    tier: 0,
    dependsOn: [],
    execute: async () => ({
      data: { brandName: 'FULL_STACK_PLATFORM', requiresBackend: true },
    }),
  });

  dag2.addNode({
    id: 'ENG_HeroStage',
    tier: 1,
    dependsOn: ['E01_BriefAnalyst'],
    execute: async () => ({ data: { heroReady: true } }),
  });

  dag2.addNode({
    id: 'A60_BackendArchitect',
    tier: 1,
    dependsOn: ['E01_BriefAnalyst'],
    condition: (ctx) => ctx.upstream['E01_BriefAnalyst']?.data?.requiresBackend === true,
    execute: async () => ({ data: { backendScaffolded: true } }),
  });

  dag2.addNode({
    id: 'A61_DatabaseEngineer',
    tier: 2,
    dependsOn: ['A60_BackendArchitect'],
    execute: async () => ({ data: { schemaMigrated: true } }),
  });

  dag2.addNode({
    id: 'REL_ReleaseValidator',
    tier: 3,
    dependsOn: ['ENG_HeroStage', 'A61_DatabaseEngineer'],
    execute: async () => ({ data: { releaseApproved: true } }),
  });

  const summary2 = await dag2.run();
  assert.strictEqual(summary2.completed, 5, 'All 5 nodes must complete when backend is required');
  assert.strictEqual(summary2.skipped, 0, 'Zero nodes skipped when condition is met');
  assert.strictEqual(executedNodes2.length, 5, 'All 5 nodes must have executed');

  Logger.success('Dynamic conditional DAG node activation and cascading skips fully verified.');
}

// =====================================================================
// Main Runner
// =====================================================================
async function runAllTests() {
  console.log(`\n${Colors.bold}${Colors.brightCyan}====================================================${Colors.reset}`);
  console.log(`${Colors.bold}${Colors.brightCyan}   MAS 2.0 AGENT RUNNER & AI ENGINE TEST SUITE      ${Colors.reset}`);
  console.log(`${Colors.bold}${Colors.brightCyan}====================================================${Colors.reset}\n`);

  let passedCount = 0;
  let skippedCount = 0;

  try {
    await testPersonaDiscoveryAndParsing(); passedCount++;
    await testDynamicSkillLoading(); passedCount++;
    await testPromptConstruction(); passedCount++;
    await testResponseSanitizer(); passedCount++;
    await testMissingCliThrows(); passedCount++;
    await testCliPathResolver(); passedCount++;
    await testDynamicConditionalDAGActivation(); passedCount++;

    const cliResult = await testRealCliExecution();
    if (cliResult?.skipped) {
      skippedCount++;
    } else {
      passedCount++;
    }

    if (skippedCount > 0) {
      console.log(`\n${Colors.brightYellow}${Colors.bold}>>> ${passedCount} PASSED, ${skippedCount} SKIPPED — NOT VERIFIED <<<${Colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`\n${Colors.brightGreen}${Colors.bold}>>> ALL ${passedCount} AGENT RUNNER TESTS PASSED (100% SUCCESS) <<<${Colors.reset}\n`);
      process.exit(0);
    }
  } catch (err) {
    console.error(`\n${Colors.brightRed}${Colors.bold}TEST FAILURE:${Colors.reset}`, err);
    process.exit(1);
  }
}

runAllTests();
