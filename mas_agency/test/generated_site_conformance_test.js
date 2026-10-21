/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: Generated Site Conformance
 *
 * Root cause this suite guards against: the deliverable was never checked against the
 * plan the agents produced. The synthesis engine applied its own fixed composition, so
 * a site could be reported as complete while carrying sections the wireframes never
 * asked for and omitting the ones they did. Nothing compared the output to the plan.
 *
 * This suite runs the pipeline end to end, then holds the generated site against the
 * page assemblies that same run produced. It needs no browser and no network, so it
 * runs anywhere — the browser rendering check lives in `verify_generated_site.js`,
 * which is opt-in because it needs a browser binary.
 *
 * Verifies:
 * 1. Every route the artifacts declare exists as a route file on disk
 * 2. Every `@/components/*` import in the generated site resolves to a real file
 * 3. Each route renders exactly the sections its page assembly prescribes, in order
 * 4. No section component is generated that no route prescribes
 * 5. No offline placeholder text reaches the deliverable
 * 6. The site passes the existing QA gate (imports, syntax, WCAG, accessibility, placeholders)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WorkflowCoordinator } from '../src/engine/workflow_coordinator.js';
import { QAVerifier } from '../src/engine/qa_verifier.js';
import { Logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');

function createTestDir(name) {
  const dir = path.join(agencyDir, 'workspace', `test_conformance_${name}_${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanTestDir(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

/** Every file under `dir` with the given extension, as paths relative to `dir`. */
function walk(dir, extension, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, extension, base));
    else if (entry.name.endsWith(extension)) out.push(path.relative(base, full));
  }
  return out;
}

/** The components a generated route file imports and renders, in order. */
function routeComposition(outputDir, relativePath) {
  const source = fs.readFileSync(path.join(outputDir, relativePath), 'utf8');
  const imported = source
    .split('\n')
    .filter((line) => line.startsWith('import '))
    .map((line) => /components\/([A-Za-z]+)'/.exec(line)?.[1])
    .filter(Boolean);
  const rendered = source
    .split('\n')
    .map((line) => /<([A-Za-z]+) \/>/.exec(line.trim())?.[1])
    .filter(Boolean);
  return { source, imported, rendered };
}

/** The route file path a route maps to under the Next.js app router. */
function routeFileFor(route) {
  return route === '/' ? 'src/app/page.tsx' : `src/app/${route.replace(/^\/+|\/+$/g, '')}/page.tsx`;
}

async function runSuite() {
  console.log('\n====================================================');
  console.log('   MAS 2.0 GENERATED SITE CONFORMANCE SUITE');
  console.log('====================================================\n');

  const testDir = createTestDir('e2e');
  const outputDir = path.join(testDir, 'output');

  try {
    // --- Run the pipeline end to end -----------------------------------------
    Logger.info('Running the full pipeline to produce a site and its plan...');
    const coordinator = new WorkflowCoordinator({
      agencyDir,
      rootDir,
      artifactsDir: testDir,
      outputDir,
      executionMode: 'synthetic',
    });
    const result = await coordinator.run(
      'Award-winning portfolio for Studio Synthetix, featuring kinetic typography, ' +
        'dark oklch palette, interactive canvas shader, and smooth Lenis scrolling.'
    );
    assert.strictEqual(result.success, true, 'The pipeline must complete');

    // --- Read the plan the agents produced ------------------------------------
    const assemblies = JSON.parse(
      fs.readFileSync(path.join(testDir, '52_page_assemblies.json'), 'utf8')
    );
    assert(
      Array.isArray(assemblies.pages) && assemblies.pages.length > 0,
      'A52 must have produced page assemblies for the site to be checked against'
    );

    // --- 1. Every declared route exists ---------------------------------------
    for (const page of assemblies.pages) {
      const routeFile = routeFileFor(page.route);
      assert(
        fs.existsSync(path.join(outputDir, routeFile)),
        `Route ${page.route} is declared by A52 but has no route file at ${routeFile}`
      );
    }
    Logger.info(`Verified ${assemblies.pages.length} declared route(s) exist on disk.`);

    // --- 2. Every component import resolves ------------------------------------
    const generatedComponents = new Set(
      walk(path.join(outputDir, 'src', 'components'), '.tsx').map((f) =>
        f.replace(/\.tsx$/, '').split(path.sep).pop()
      )
    );
    const sourceFiles = walk(path.join(outputDir, 'src'), '.tsx');
    let importCount = 0;
    for (const file of sourceFiles) {
      const source = fs.readFileSync(path.join(outputDir, 'src', file), 'utf8');
      for (const match of source.matchAll(/from '@\/components\/([A-Za-z]+)'/g)) {
        importCount++;
        assert(
          generatedComponents.has(match[1]),
          `${file} imports @/components/${match[1]}, which was not generated`
        );
      }
    }
    assert(importCount > 0, 'The generated site must import at least one component');
    Logger.info(`Verified ${importCount} component import(s) resolve to generated files.`);

    // --- 3. Each route renders exactly its prescribed sections, in order -------
    for (const page of assemblies.pages) {
      const prescribed = ['Navigation']; // structural chrome, always present
      for (const section of page.assembled_sections || []) {
        for (const component of section.components || []) prescribed.push(component);
      }
      const { rendered } = routeComposition(outputDir, routeFileFor(page.route));
      assert.deepStrictEqual(
        rendered,
        prescribed,
        `Route ${page.route} must render exactly the sections A52 prescribed, in order`
      );
    }
    Logger.info('Verified every route renders its prescribed sections in the prescribed order.');

    // --- 4. No unprescribed section component exists --------------------------
    const prescribedComponents = new Set(['Navigation']);
    for (const page of assemblies.pages) {
      for (const section of page.assembled_sections || []) {
        for (const component of section.components || []) prescribedComponents.add(component);
      }
    }
    const sectionComponents = [
      'Navigation',
      'HeroStage',
      'FeatureBento',
      'InteractiveShowcase',
      'FooterConversion',
    ];
    for (const component of sectionComponents) {
      if (prescribedComponents.has(component)) continue;
      assert(
        !generatedComponents.has(component),
        `${component} is not prescribed by any page assembly and must not be generated`
      );
    }
    assert(
      !generatedComponents.has('FeatureBento'),
      'A bento grid is not prescribed for this brief and must not be forced into the deliverable'
    );
    Logger.info('Verified no unprescribed section component was generated.');

    // --- 5. No placeholder text reaches the deliverable ------------------------
    const placeholderMarkers = [
      'Deterministic offline placeholder',
      'Test execution for A',
      '_execution_mode',
      '_mock_agent',
    ];
    for (const file of walk(outputDir, '.tsx').concat(walk(outputDir, '.ts'), walk(outputDir, '.css'))) {
      const source = fs.readFileSync(path.join(outputDir, file), 'utf8');
      for (const marker of placeholderMarkers) {
        assert(
          !source.includes(marker),
          `${file} contains the offline placeholder marker "${marker}"`
        );
      }
    }
    Logger.info('Verified no placeholder text reached the deliverable.');

    // --- 6. The site passes the existing QA gate -------------------------------
    const verifier = new QAVerifier({ agencyDir, artifactsDir: testDir, targetDir: outputDir });
    const qa = await verifier.runAllChecks();
    assert(
      qa.passed,
      `The generated site must pass the QA gate. Defects: ${JSON.stringify(qa.defects || [], null, 2)}`
    );
    Logger.info('Verified the generated site passes the QA gate.');

    console.log('\n====================================================');
    console.log('   ALL 6 GENERATED SITE CONFORMANCE CHECKS PASSED (100%)');
    console.log('====================================================\n');
  } finally {
    cleanTestDir(testDir);
  }
}

runSuite().catch((err) => {
  console.error('\nCONFORMANCE FAILURE:', err);
  process.exit(1);
});
