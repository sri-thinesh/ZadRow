/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Automated Skill Delivery Subsystem & Runtime Loader Test Suite
 *
 * Verifies:
 * - Direct loading of all 32 skills across Anthropic, Vercel, UI/UX Pro Max, Superpowers, and Custom categories
 * - YAML frontmatter extraction, metadata integrity, and markdown instruction body retrieval
 * - Alias normalization & resolution (e.g. react-best-practices -> vercel-react-best-practices)
 * - Graceful warning handling for non-existent skills with zero uncaught exceptions
 * - Agency registry validation verifying 100% of assigned skills across all 19 agents exist and resolve
 * - High-signal prompt instruction block formatting for model injection
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SkillLoader } from '../src/engine/skill_loader.js';
import { Logger, Colors } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');

// Canonical 32 Skills Installed in MAS 2.0
const ALL_32_SKILLS = [
  // Anthropic Official (6)
  'algorithmic-art',
  'doc-coauthoring',
  'frontend-design',
  'mcp-builder',
  'skill-creator',
  'webapp-testing',

  // Vercel Engineering & Design (6)
  'find-skills',
  'vercel-composition-patterns',
  'vercel-react-best-practices',
  'vercel-react-view-transitions',
  'web-design-guidelines',
  'writing-guidelines',

  // UI/UX Pro Max (7)
  'banner-design',
  'brand',
  'design',
  'design-system',
  'slides',
  'ui-styling',
  'ui-ux-pro-max',

  // Superpowers Core (8)
  'brainstorming',
  'dispatching-parallel-agents',
  'requesting-code-review',
  'subagent-driven-development',
  'systematic-debugging',
  'test-driven-development',
  'verification-before-completion',
  'writing-plans',

  // AURA Custom Domain Skills (5)
  'awwwards-motion-choreography',
  'design-tokens-specifier',
  'kinetic-canvas-hero',
  'responsive-touch-gatekeeper',
  'wcag-contrast-auditor',
];

/**
 * Test 1: Load all 32 skills by exact identifier
 */
async function testExactSkillLoading() {
  Logger.info(`Testing direct resolution & loading of all ${ALL_32_SKILLS.length} skills...`);
  const loader = new SkillLoader({ rootDir, agencyDir });

  let loadedCount = 0;
  for (const skillId of ALL_32_SKILLS) {
    const skill = loader.loadSkill(skillId);

    assert(skill !== null, `Skill "${skillId}" should resolve and load successfully`);
    assert.strictEqual(skill.id, skillId, `Skill id should match "${skillId}"`);
    assert(skill.name && skill.name.length > 0, `Skill "${skillId}" must have a name`);
    assert(skill.description && skill.description.length > 0, `Skill "${skillId}" must have a description`);
    assert(skill.body && skill.body.length > 50, `Skill "${skillId}" body must deliver real instructions (>50 chars)`);
    assert(typeof skill.frontmatter === 'object', `Skill "${skillId}" must have parsed frontmatter`);
    assert(fs.existsSync(skill.filePath), `Skill file at ${skill.filePath} must exist on disk`);
    assert(skill.byteSize > 0, `Skill file must have non-zero byte size`);

    // Verify cache hit
    const cached = loader.loadSkill(skillId);
    assert.strictEqual(cached, skill, `Subsequent load of "${skillId}" must return cached instance`);

    loadedCount++;
  }

  assert.strictEqual(loadedCount, 32, 'All 32 skills must be successfully loaded');
  Logger.success(`All 32 skills loaded directly with valid YAML frontmatter and instruction bodies.`);
}

/**
 * Test 2: Categorization breakdown of all 32 skills
 */
async function testSkillCategories() {
  Logger.info('Testing skill categorization breakdown (Anthropic, Vercel, UI/UX Pro Max, Superpowers, Custom)...');
  const loader = new SkillLoader({ rootDir, agencyDir });

  const categoryCounts = {
    Anthropic: 0,
    Vercel: 0,
    'UI/UX Pro Max': 0,
    Superpowers: 0,
    Custom: 0,
  };

  for (const skillId of ALL_32_SKILLS) {
    const summary = loader.getSkillSummary(skillId);
    assert(summary.valid, `Summary for "${skillId}" should be valid`);
    assert(categoryCounts[summary.category] !== undefined, `Unknown category "${summary.category}" for "${skillId}"`);
    categoryCounts[summary.category]++;
  }

  assert.strictEqual(categoryCounts['Anthropic'], 6, 'Should have 6 Anthropic skills');
  assert.strictEqual(categoryCounts['Vercel'], 6, 'Should have 6 Vercel skills');
  assert.strictEqual(categoryCounts['UI/UX Pro Max'], 7, 'Should have 7 UI/UX Pro Max skills');
  assert.strictEqual(categoryCounts['Superpowers'], 8, 'Should have 8 Superpowers skills');
  assert.strictEqual(categoryCounts['Custom'], 5, 'Should have 5 Custom skills');

  Logger.success('All 5 skill categories verified with exact quotas (6 Anthropic, 6 Vercel, 7 UI/UX, 8 Superpowers, 5 Custom).');
}

/**
 * Test 3: Alias resolution for shorthand identifiers and paths
 */
async function testAliasResolution() {
  Logger.info('Testing alias resolution and fuzzy identifier mapping...');
  const loader = new SkillLoader({ rootDir, agencyDir });

  const aliasCases = [
    { input: 'react-best-practices', expected: 'vercel-react-best-practices' },
    { input: 'composition-patterns', expected: 'vercel-composition-patterns' },
    { input: 'react-view-transitions', expected: 'vercel-react-view-transitions' },
    { input: 'canvas-design', expected: 'kinetic-canvas-hero' },
    { input: 'kinetic-canvas', expected: 'kinetic-canvas-hero' },
    { input: 'motion-choreography', expected: 'awwwards-motion-choreography' },
    { input: 'tokens-specifier', expected: 'design-tokens-specifier' },
    { input: 'accessibility-auditor', expected: 'wcag-contrast-auditor' },
    { input: 'touch-gatekeeper', expected: 'responsive-touch-gatekeeper' },
    { input: 'code-review', expected: 'requesting-code-review' },
    { input: 'tdd', expected: 'test-driven-development' },
    { input: 'debugging', expected: 'systematic-debugging' },
    { input: 'parallel-agents', expected: 'dispatching-parallel-agents' },
    { input: '.agents/skills/writing-guidelines/SKILL.md', expected: 'writing-guidelines' },
    { input: 'skills/web-design-guidelines', expected: 'web-design-guidelines' },
  ];

  for (const { input, expected } of aliasCases) {
    const resolved = loader.resolveSkillId(input);
    assert.strictEqual(resolved, expected, `Alias "${input}" should resolve to "${expected}", got "${resolved}"`);

    const skill = loader.loadSkill(input);
    assert(skill !== null, `Loading via alias "${input}" should return skill object`);
    assert.strictEqual(skill.id, expected, `Loaded skill id should be canonical "${expected}"`);
  }

  Logger.success('Alias resolution and relative markdown path normalization verified.');
}

/**
 * Test 4: Handling non-existent skills gracefully with warnings
 */
async function testNonExistentSkillsHandling() {
  Logger.info('Testing graceful handling of non-existent skills...');
  const loader = new SkillLoader({ rootDir, agencyDir });

  const initialWarningsCount = loader.warnings.length;

  // 1. loadSkill on phantom skill
  const missing = loader.loadSkill('phantom-non-existent-skill-999');
  assert.strictEqual(missing, null, 'Loading non-existent skill must return null without throwing');
  assert(loader.warnings.length > initialWarningsCount, 'Warning should be recorded in loader.warnings');

  // 2. getSkillSummary on phantom skill
  const summary = loader.getSkillSummary('phantom-non-existent-skill-999');
  assert.strictEqual(summary.valid, false, 'getSkillSummary must return valid: false for missing skill');
  assert(summary.error, 'Summary must include error explanation');

  // 3. loadSkillsForAgent with missing skill
  const agentSkills = loader.loadSkillsForAgent('TestAgent', ['vercel-react-best-practices', 'non-existent-skill-xyz']);
  assert.strictEqual(agentSkills.count, 1, 'Should successfully load 1 valid skill');
  assert(agentSkills.missing.includes('non-existent-skill-xyz'), 'Missing array must contain invalid skill');
  assert(agentSkills.skills['vercel-react-best-practices'], 'Valid skill must be loaded');

  Logger.success('Non-existent skills handled gracefully with zero unhandled exceptions.');
}

/**
 * Test 5: Validate skill assignments for all 19 agents in the agency hierarchy
 */
async function testHierarchyRegistryValidation() {
  Logger.info('Testing permanent agency hierarchy validation across all 19 agents...');
  const loader = new SkillLoader({ rootDir, agencyDir });

  // 1. Validate default hierarchy mapping
  const report = loader.validateSkillAssignments();

  assert.strictEqual(report.valid, true, 'Permanent agency hierarchy validation must be 100% valid');
  assert.strictEqual(report.totalAgents, 19, 'Should validate all 19 specialized agency agents');
  assert(report.totalSkillAssignments >= 50, `Expected at least 50 total skill assignments, got ${report.totalSkillAssignments}`);
  assert.strictEqual(report.missingAssignments.length, 0, `There should be 0 missing assignments, found: ${JSON.stringify(report.missingAssignments)}`);
  assert.strictEqual(report.validAssignments, report.totalSkillAssignments, 'All assigned skills must resolve');

  // 2. Test validating an explicit registry array (simulating index.js agentDefinitions)
  const simulatedRegistry = [
    { id: 'E01_BriefAnalyst', skills: ['writing-guidelines', 'find-skills'] },
    { id: 'SA_TechArchitect', skills: ['vercel-react-best-practices', 'vercel-composition-patterns'] },
    { id: 'ENG_HeroStage', skills: ['kinetic-canvas-hero', 'awwwards-motion-choreography'] },
    { id: 'QA_AccessibilityAuditor', skills: ['wcag-contrast-auditor', 'web-design-guidelines'] },
  ];

  const customReport = loader.validateSkillAssignments(simulatedRegistry);
  assert.strictEqual(customReport.valid, true, 'Simulated registry validation should pass');
  assert.strictEqual(customReport.totalAgents, 4);
  assert.strictEqual(customReport.missingAssignments.length, 0);

  // 3. Test detecting a broken skill assignment in a registry
  const brokenRegistry = [
    { id: 'AgentBroken', skills: ['vercel-react-best-practices', 'completely-bogus-skill'] },
  ];
  const brokenReport = loader.validateSkillAssignments(brokenRegistry);
  assert.strictEqual(brokenReport.valid, false, 'Registry with bogus skill must fail validation');
  assert.strictEqual(brokenReport.missingAssignments.length, 1);
  assert.strictEqual(brokenReport.missingAssignments[0].agentId, 'AgentBroken');

  Logger.success('Permanent agency hierarchy verified: 19 agents and 60+ assignments 100% verified.');
}

/**
 * Test 6: Agent skill prompt formatting and instruction extraction
 */
async function testPromptFormatting() {
  Logger.info('Testing agent skill prompt formatting and instruction extraction...');
  const loader = new SkillLoader({ rootDir, agencyDir });

  const agentResult = loader.loadSkillsForAgent('ENG_HeroStage');
  assert(agentResult.count >= 2, 'ENG_HeroStage should have multiple skills loaded');
  assert(agentResult.promptBlock.length > 500, 'Generated prompt block must contain substantial instructions');
  assert(agentResult.promptBlock.includes('kinetic-canvas-hero'), 'Prompt block must include kinetic-canvas-hero');
  assert(agentResult.promptBlock.includes('awwwards-motion-choreography'), 'Prompt block must include awwwards-motion-choreography');

  // Test concise prompt formatting option
  const conciseBlock = loader.formatSkillPrompt(agentResult.skillsList, {
    concise: true,
    maxCharsPerSkill: 300,
  });
  assert(conciseBlock.includes('[... Skill directives condensed for prompt budget ...]'), 'Concise formatting should trim large skill bodies');

  Logger.success('Skill prompt formatting and model instruction injection blocks verified.');
}

/**
 * Run All Tests
 */
async function runAllTests() {
  console.log(`\n${Colors.bold}${Colors.brightCyan}=== RUNNING MAS 2.0 SKILL LOADER TEST SUITE ===${Colors.reset}\n`);
  try {
    await testExactSkillLoading();
    await testSkillCategories();
    await testAliasResolution();
    await testNonExistentSkillsHandling();
    await testHierarchyRegistryValidation();
    await testPromptFormatting();

    console.log(`\n${Colors.brightGreen}${Colors.bold}ALL SKILL LOADER TESTS PASSED (100% SUCCESS)${Colors.reset}\n`);
  } catch (err) {
    console.error(`\n${Colors.brightRed}${Colors.bold}TEST FAILURE:${Colors.reset}`, err);
    process.exit(1);
  }
}

runAllTests();
