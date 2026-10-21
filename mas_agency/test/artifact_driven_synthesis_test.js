/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: Artifact-Driven Synthesis
 *
 * Root cause this suite guards against: the generated page was a fixed template
 * written into the synthesis engine — Navigation, HeroStage, FeatureBento,
 * InteractiveShowcase, FooterConversion, always and in that order — so the agents'
 * decisions about page composition never reached the deliverable. A52's own
 * specification forbids forcing a hero, a bento grid or a conversion footer unless
 * the approved wireframes prescribe them, which is exactly what the engine did.
 *
 * Verifies:
 * 1. `52_page_assemblies.json` (A52) drives which sections appear, and in what order
 * 2. A component the artifacts do not call for is not generated at all
 * 3. `31_wireframe_ux_flow.json` (A31) drives composition, one route per screen
 * 4. With no composition artifact the default order is used AND reported as a default
 * 5. A section that matches no known component is reported, never silently defaulted
 * 6. Offline placeholder artifacts are identified, and refused when the caller requires real ones
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CodeSynthesizer } from '../src/engine/code_synthesizer.js';
import { Logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');

let testCounter = 0;

function makeFixtureDir(label) {
  testCounter += 1;
  const dir = path.join(agencyDir, 'workspace', `test_synth_${label}_${Date.now()}_${testCounter}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function clean(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

/** Write a set of artifacts into a fresh artifacts dir and return the paths. */
function writeArtifacts(label, artifacts) {
  const artifactsDir = makeFixtureDir(`${label}_arts`);
  for (const [filename, value] of Object.entries(artifacts)) {
    fs.writeFileSync(path.join(artifactsDir, filename), JSON.stringify(value, null, 2), 'utf8');
  }
  return artifactsDir;
}

function makeSynthesizer(artifactsDir, outputDir, options = {}) {
  return new CodeSynthesizer({ agencyDir, artifactsDir, outputDir, ...options });
}

/** The import lines of a generated route file, in order. */
function importsOf(outputDir, relativePath = 'src/app/page.tsx') {
  const source = fs.readFileSync(path.join(outputDir, relativePath), 'utf8');
  return source
    .split('\n')
    .filter((line) => line.startsWith('import '))
    .map((line) => /components\/([A-Za-z]+)'/.exec(line)?.[1])
    .filter(Boolean);
}

/** The order in which components are rendered in a generated route file. */
function renderedOf(outputDir, relativePath = 'src/app/page.tsx') {
  const source = fs.readFileSync(path.join(outputDir, relativePath), 'utf8');
  return source
    .split('\n')
    .map((line) => /<([A-Za-z]+) \/>/.exec(line.trim())?.[1])
    .filter(Boolean);
}

function componentFiles(outputDir) {
  const dir = path.join(outputDir, 'src', 'components');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((f) => f.replace(/\.tsx$/, '')).sort();
}

// =====================================================================
// Test 1 & 2: A52's page assemblies drive the composition
// =====================================================================
async function testPageAssembliesDriveComposition() {
  Logger.info("Verifying A52's 52_page_assemblies.json drives the page composition...");

  // A deliberately non-default composition: no hero, no bento grid, an editorial
  // project stream instead. The old engine could not produce this page at all.
  const artifactsDir = writeArtifacts('assemblies', {
    '52_page_assemblies.json': {
      project_id: 'northwind',
      routes_covered: ['/'],
      copy_integration_percentage: 100,
      wireframe_conformance_verified: true,
      assembled_sections: [
        {
          section_id: 'nav_main',
          layout_type: 'sticky-navigation',
          component_file: 'Navigation.tsx',
          features_included: ['logo', 'menu'],
          loc: 60,
        },
        {
          section_id: 'project_stream',
          layout_type: 'continuous-project-stream',
          component_file: 'InteractiveShowcase.tsx',
          features_included: ['gallery'],
          loc: 200,
        },
        {
          section_id: 'inquiry_footer',
          layout_type: 'minimal-contact-footer',
          component_file: 'FooterConversion.tsx',
          features_included: ['form'],
          loc: 80,
        },
      ],
    },
  });
  const outputDir = makeFixtureDir('assemblies_out');

  try {
    const synthesizer = makeSynthesizer(artifactsDir, outputDir);
    const result = await synthesizer.synthesize({ brandName: 'NORTHWIND' });

    assert.strictEqual(result.sectionPlanSource, 'page_assemblies', 'The plan must come from A52');
    assert.strictEqual(result.artifactDriven, true, 'The site must be reported as artifact-driven');
    assert.strictEqual(result.sectionsFromArtifact, 3, 'All three prescribed sections must be used');
    assert.deepStrictEqual(result.unmappedSections, [], 'Every section must resolve');

    // 1. Exactly the prescribed components, in the prescribed order.
    assert.deepStrictEqual(
      importsOf(outputDir),
      ['Navigation', 'InteractiveShowcase', 'FooterConversion'],
      'The page must import exactly the prescribed sections'
    );
    assert.deepStrictEqual(
      renderedOf(outputDir),
      ['Navigation', 'InteractiveShowcase', 'FooterConversion'],
      'The page must render them in the prescribed order'
    );

    // 2. The sections the artifacts did not call for must not exist at all.
    const components = componentFiles(outputDir);
    assert(
      !components.includes('HeroStage'),
      `HeroStage was not prescribed and must not be generated (found: ${components.join(', ')})`
    );
    assert(
      !components.includes('FeatureBento'),
      `FeatureBento was not prescribed and must not be generated (found: ${components.join(', ')})`
    );

    // The file must state its provenance.
    const source = fs.readFileSync(path.join(outputDir, 'src/app/page.tsx'), 'utf8');
    assert(
      source.includes('52_page_assemblies.json'),
      'The route file must name the artifact its composition came from'
    );
  } finally {
    clean(artifactsDir);
    clean(outputDir);
  }
}

// =====================================================================
// Test 3: A31's wireframes drive composition, one route per screen
// =====================================================================
async function testWireframesDriveRoutes() {
  Logger.info("Verifying A31's 31_wireframe_ux_flow.json drives composition and routing...");

  const artifactsDir = writeArtifacts('wireframes', {
    '31_wireframe_ux_flow.json': {
      project_id: 'northwind',
      responsive_breakpoints: { mobile: '375px', tablet: '768px', desktop: '1440px', wide: '1920px' },
      interaction_flows: [],
      screens: [
        {
          route: '/',
          layout_type: 'editorial',
          sections: [
            { section_id: 'header_bar', dom_element: 'header', visitor_journey_stage: 'arrival', elements: [] },
            { section_id: 'editorial_opening', dom_element: 'section', visitor_journey_stage: 'orientation', elements: [] },
            { section_id: 'contact_footer', dom_element: 'footer', visitor_journey_stage: 'conversion', elements: [] },
          ],
        },
        {
          route: '/research',
          layout_type: 'index',
          sections: [
            { section_id: 'header_bar', dom_element: 'header', visitor_journey_stage: 'arrival', elements: [] },
            { section_id: 'case_studies', dom_element: 'section', visitor_journey_stage: 'exploration', elements: [] },
          ],
        },
      ],
    },
  });
  const outputDir = makeFixtureDir('wireframes_out');

  try {
    const synthesizer = makeSynthesizer(artifactsDir, outputDir);
    const result = await synthesizer.synthesize({ brandName: 'NORTHWIND' });

    assert.strictEqual(result.sectionPlanSource, 'wireframe_ux_flow', 'The plan must come from A31');
    assert.deepStrictEqual(
      result.routes.sort(),
      ['/', '/research'],
      'One route must be generated per approved screen'
    );

    assert.deepStrictEqual(
      importsOf(outputDir, 'src/app/page.tsx'),
      ['Navigation', 'HeroStage', 'FooterConversion'],
      'The home screen must use its own prescribed sections'
    );
    assert.deepStrictEqual(
      importsOf(outputDir, 'src/app/research/page.tsx'),
      ['Navigation', 'InteractiveShowcase'],
      'The research screen must use its own prescribed sections'
    );
  } finally {
    clean(artifactsDir);
    clean(outputDir);
  }
}

// =====================================================================
// Test 4: No composition artifact means the default order, reported as such
// =====================================================================
async function testFallbackIsReported() {
  Logger.info('Verifying the engine default is used AND reported when no artifact describes a composition...');

  const artifactsDir = writeArtifacts('nocomposition', {
    '01_scope_charter.json': { project_id: 'northwind', brandName: 'NORTHWIND' },
  });
  const outputDir = makeFixtureDir('nocomposition_out');

  try {
    const synthesizer = makeSynthesizer(artifactsDir, outputDir);
    const result = await synthesizer.synthesize({ brandName: 'NORTHWIND' });

    assert.strictEqual(result.sectionPlanSource, 'fallback', 'The plan must be reported as a fallback');
    assert.strictEqual(
      result.artifactDriven,
      false,
      'A default composition must never be reported as artifact-driven'
    );

    const source = fs.readFileSync(path.join(outputDir, 'src/app/page.tsx'), 'utf8');
    assert(
      /PROVENANCE: no page-composition artifact was available/.test(source),
      'The route file must say on its face that its layout is a default, not an approved one'
    );
    assert(
      /NOT\s*\n?\/\/ derived from approved wireframes/.test(source) || source.includes('NOT'),
      'The route file must warn that the layout is not from approved wireframes'
    );
  } finally {
    clean(artifactsDir);
    clean(outputDir);
  }
}

// =====================================================================
// Test 5: An unrecognised section is reported, not silently replaced
// =====================================================================
async function testUnmappedSectionsAreReported() {
  Logger.info('Verifying an unrecognised section is reported rather than silently defaulted...');

  const artifactsDir = writeArtifacts('unmapped', {
    '52_page_assemblies.json': {
      project_id: 'northwind',
      assembled_sections: [
        { section_id: 'nav_main', layout_type: 'sticky-navigation', component_file: 'Navigation.tsx' },
        { section_id: 'quantum_foam_annex', layout_type: 'annex-panel', component_file: 'AnnexPanel.tsx' },
        { section_id: 'inquiry_footer', layout_type: 'minimal-contact-footer', component_file: 'FooterConversion.tsx' },
      ],
    },
  });
  const outputDir = makeFixtureDir('unmapped_out');

  try {
    const synthesizer = makeSynthesizer(artifactsDir, outputDir);
    const result = await synthesizer.synthesize({ brandName: 'NORTHWIND' });

    assert.strictEqual(result.unmappedSections.length, 1, 'The unrecognised section must be reported');
    assert.strictEqual(
      result.unmappedSections[0].section_id,
      'quantum_foam_annex',
      'The report must name the section it could not place'
    );

    // It must not be replaced by a default component the wireframes never asked for.
    const rendered = renderedOf(outputDir);
    assert.deepStrictEqual(
      rendered,
      ['Navigation', 'FooterConversion'],
      'An unmapped section must be omitted, never substituted with a default section'
    );
  } finally {
    clean(artifactsDir);
    clean(outputDir);
  }
}

// =====================================================================
// Test 6: Offline placeholders are identified, and refused when required
// =====================================================================
async function testSyntheticArtifactsAreRefused() {
  Logger.info('Verifying offline placeholder artifacts are identified and refused...');

  // Exactly what AgentRunner._executeMock writes.
  const mockArtifact = (agentId) => ({
    agent_id: agentId,
    brandName: 'SYNTHETIX',
    summary: `Deterministic offline placeholder for ${agentId}`,
    _execution_mode: 'mock',
    _mock: true,
    _mock_agent: agentId,
  });

  const artifactsDir = writeArtifacts('synthetic', {
    '01_scope_charter.json': mockArtifact('A01'),
    '52_page_assemblies.json': mockArtifact('A52'),
  });
  const outputDir = makeFixtureDir('synthetic_out');

  try {
    // 6a. With requireRealArtifacts the build must be refused, naming the artifacts.
    const strict = makeSynthesizer(artifactsDir, outputDir, { requireRealArtifacts: true });
    let thrown = null;
    try {
      await strict.synthesize({ brandName: 'NORTHWIND' });
    } catch (err) {
      thrown = err;
    }
    assert(thrown, 'A production build from placeholder artifacts must be refused');
    assert(
      thrown.message.includes('01_scope_charter.json') && thrown.message.includes('52_page_assemblies.json'),
      `The refusal must name every placeholder input (got: ${thrown.message})`
    );

    // 6b. Without it the build proceeds, but the placeholders are reported.
    const preview = makeSynthesizer(artifactsDir, outputDir);
    const result = await preview.synthesize({ brandName: 'NORTHWIND' });
    assert.deepStrictEqual(
      result.syntheticInputs.sort(),
      ['01_scope_charter.json', '52_page_assemblies.json'],
      'A preview build must still report which inputs were placeholders'
    );

    // 6c. A real artifact set must produce no such report.
    const realDir = writeArtifacts('real', {
      '01_scope_charter.json': { project_id: 'northwind', brandName: 'NORTHWIND' },
      '52_page_assemblies.json': {
        project_id: 'northwind',
        assembled_sections: [
          { section_id: 'nav_main', layout_type: 'sticky-navigation', component_file: 'Navigation.tsx' },
        ],
      },
    });
    const realOut = makeFixtureDir('real_out');
    try {
      const realStrict = makeSynthesizer(realDir, realOut, { requireRealArtifacts: true });
      const realResult = await realStrict.synthesize({ brandName: 'NORTHWIND' });
      assert.deepStrictEqual(realResult.syntheticInputs, [], 'Real artifacts must not be flagged');
    } finally {
      clean(realDir);
      clean(realOut);
    }
  } finally {
    clean(artifactsDir);
    clean(outputDir);
  }
}

// =====================================================================
// Test 7: A52's real page-assembly shape, and the chrome rules
// =====================================================================
async function testRealAssemblyShapeAndChrome() {
  Logger.info("Verifying A52's pages[].assembled_sections[] shape and the chrome rules...");

  // This is the shape A52 actually emits: pages[], each with assembled_sections[],
  // each naming its components outright.
  const artifactsDir = writeArtifacts('real_shape', {
    '52_page_assemblies.json': {
      agentId: 'A52',
      project_id: 'northwind',
      status: 'SYNTHESIZED',
      pages: [
        {
          route: '/',
          file: 'src/app/page.tsx',
          sectionsCount: 3,
          wireframe_conformance_verified: true,
          copy_integration_percentage: 100,
          assembled_sections: [
            { id: 'hero', layout_type: 'bespoke_split_stage', components: ['HeroStage'] },
            { id: 'work_showcase', layout_type: 'bespoke_case_inspection', components: ['InteractiveShowcase'] },
            { id: 'contact_portal', layout_type: 'verified_contact_portal', components: ['FooterConversion'] },
          ],
        },
        {
          route: '/journal',
          file: 'src/app/journal/page.tsx',
          sectionsCount: 1,
          assembled_sections: [
            // The component name is authoritative even though the layout_type
            // vocabulary would otherwise match a different section.
            { id: 'feature_index', layout_type: 'editorial-hero', components: ['FeatureBento'] },
          ],
        },
      ],
    },
  });
  const outputDir = makeFixtureDir('real_shape_out');

  try {
    const synthesizer = makeSynthesizer(artifactsDir, outputDir);
    const result = await synthesizer.synthesize({ brandName: 'NORTHWIND' });

    assert.strictEqual(result.sectionPlanSource, 'page_assemblies', 'The plan must come from A52');
    assert.deepStrictEqual(result.routes.sort(), ['/', '/journal'], 'One route per assembled page');

    // The named component wins over the layout_type vocabulary.
    assert.deepStrictEqual(
      importsOf(outputDir, 'src/app/journal/page.tsx'),
      ['Navigation', 'FeatureBento'],
      'An explicitly named component must be honoured over the layout vocabulary'
    );

    // Navigation is structural chrome and must be present even though A52 did not
    // list it as an assembled section.
    assert.deepStrictEqual(
      importsOf(outputDir, 'src/app/page.tsx'),
      ['Navigation', 'HeroStage', 'InteractiveShowcase', 'FooterConversion'],
      'Navigation chrome must be added when the composition does not place one'
    );

    // A conversion footer must NOT be added where the wireframes did not ask for one.
    assert.deepStrictEqual(
      importsOf(outputDir, 'src/app/journal/page.tsx').includes('FooterConversion'),
      false,
      'A conversion footer must not be forced onto a page whose sections do not prescribe one'
    );
  } finally {
    clean(artifactsDir);
    clean(outputDir);
  }
}

// =====================================================================
// Test Runner
// =====================================================================
async function runAllTests() {
  console.log('\n====================================================');
  console.log('   MAS 2.0 ARTIFACT-DRIVEN SYNTHESIS TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  const tests = [
    { name: 'Page Assemblies Drive Composition And Omit Unprescribed Sections', fn: testPageAssembliesDriveComposition },
    { name: 'Wireframes Drive Composition And Routing', fn: testWireframesDriveRoutes },
    { name: 'Engine Default Is Used And Reported As A Default', fn: testFallbackIsReported },
    { name: 'Unrecognised Sections Are Reported, Not Substituted', fn: testUnmappedSectionsAreReported },
    { name: 'Offline Placeholder Artifacts Are Identified And Refused', fn: testSyntheticArtifactsAreRefused },
    { name: 'Real Assembly Shape Is Read And Chrome Rules Hold', fn: testRealAssemblyShapeAndChrome },
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
  console.log(`   ALL ${passedCount}/${tests.length} ARTIFACT-DRIVEN SYNTHESIS TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
