import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QAVerifier } from '../src/engine/qa_verifier.js';
import { CodeSynthesizer } from '../src/engine/code_synthesizer.js';
import { WorkflowCoordinator } from '../src/engine/workflow_coordinator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const tmpDir = path.resolve(agencyDir, 'test_results/tmp_5defects');
const siteDir = path.join(tmpDir, 'site');

async function testFiveDefectLifecycle() {
  console.log('\n======================================================');
  console.log('   FIVE-DEFECT INJECTION, DETECTION & REPAIR TEST    ');
  console.log('======================================================\n');

  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  fs.mkdirSync(siteDir, { recursive: true });

  const synth = new CodeSynthesizer({
    agencyDir,
    artifactsDir: tmpDir,
    outputDir: siteDir,
  });
  await synth.synthesize({ brandName: 'VELOX' });

  // 1. Broken link in Navigation.tsx
  const navPath = path.join(siteDir, 'src/components/Navigation.tsx');
  let nav = fs.readFileSync(navPath, 'utf8');
  const navBefore = nav;
  nav = nav.replace(/href:\s*['"]#features['"]/, "href: '#missing-section-broken'");
  // An injection that silently fails to apply would leave the suite asserting that a
  // defect it never introduced went undetected, which reads as a detector failure.
  if (nav === navBefore) {
    throw new Error(
      'Defect injection failed: no `href: \'#features\'` link found in Navigation.tsx. ' +
        'The synthesizer changed how navigation links are emitted; update this injection.'
    );
  }

  // 4. Touch target below 44px
  nav = nav.replace(/min-h-\[44px\]/g, 'min-h-[24px]');

  // 5. Accessibility missing aria-label
  nav = nav.replace(/aria-label=\{mobileMenuOpen[^}]+\}/, '');
  fs.writeFileSync(navPath, nav, 'utf8');

  // 2. Missing component in page.tsx
  const pagePath = path.join(siteDir, 'src/app/page.tsx');
  let page = fs.readFileSync(pagePath, 'utf8');
  page = page.replace(/<InteractiveShowcase\s*\/>/, '{/* <InteractiveShowcase /> */}');
  fs.writeFileSync(pagePath, page, 'utf8');

  // 3. Disabled submit button
  const footerPath = path.join(siteDir, 'src/components/FooterConversion.tsx');
  let footer = fs.readFileSync(footerPath, 'utf8');
  footer = footer.replace('type="submit"', 'type="submit" disabled');
  fs.writeFileSync(footerPath, footer, 'utf8');

  // Run QA Verifier
  const verifier = new QAVerifier({
    agencyDir,
    artifactsDir: tmpDir,
    targetDir: siteDir,
  });
  const result = await verifier.runAllChecks();

  console.log(`[QA SCAN] Total defects detected: ${result.defects.length}`);
  for (const d of result.defects) {
    console.log(`  - [${d.severity}] ${d.category} (${d.defectId}): ${d.description} (Owner: ${d.assignedOwner})`);
  }

  // Assert all 5 distinct defect categories are detected
  const categories = result.defects.map((d) => d.category);
  const defectTypes = result.defects.map((d) => d.description);

  assert(categories.includes('NAVIGATION'), 'Must detect broken navigation anchor link');
  assert(categories.includes('ARCHITECTURE'), 'Must detect missing required page component');
  assert(categories.includes('FUNCTIONAL'), 'Must detect disabled form submission');
  assert(categories.includes('RESPONSIVE'), 'Must detect touch target below 44px');
  assert(categories.includes('A11Y'), 'Must detect missing icon-only button aria-label');
  assert(result.defects.length >= 5, `Expected at least 5 defects detected, got ${result.defects.length}`);

  console.log('\n[PASS] All 5 injected defects successfully detected and categorized with owners!');

  // Run Remediation Loop
  const coordinator = new WorkflowCoordinator({
    agencyDir,
    artifactsDir: tmpDir,
    outputDir: siteDir,
    executionMode: 'synthetic',
    qaVerifier: verifier,
  });

  coordinator.saveArtifact('70_qa_comprehensive_verdict.json', {
    project_id: 'proj_velox',
    overall_status: 'FAILED_REMEDIATION_REQUIRED',
    total_defects_found: result.defects.length,
    defects: result.defects.map((d, i) => ({
      id: d.defectId || `DEF-${i + 1}`,
      severity: d.severity,
      category: d.category,
      target_file: d.file,
      description: d.description,
      assigned_agent: d.assignedOwner,
      recommended_fix: d.remediationRecommendation,
    })),
  });

  console.log('\n[REMEDIATION] Dispatching tickets to implementation owners and applying real patches...');
  await coordinator.executePhase6_RemediationLoop({
    applyRealPatches: true,
    runRealVerifier: true,
  });

  // Independent post-remediation audit
  console.log('[POST-REMEDIATION AUDIT] Running independent verification on remediated files...');
  const postVerifier = new QAVerifier({
    agencyDir,
    artifactsDir: tmpDir,
    targetDir: siteDir,
  });
  const postResult = await postVerifier.runAllChecks();

  console.log(`[POST-REMEDIATION AUDIT] Defects remaining: ${postResult.defects.length}`);
  assert.strictEqual(postResult.passed, true, 'Post-remediation check must be 100% clean');
  assert.strictEqual(postResult.defects.length, 0, 'Zero defects must remain after remediation');

  console.log('\n======================================================');
  console.log('   ALL 5 DEFECTS DETECTED, ASSIGNED, FIXED & RETESTED');
  console.log('======================================================\n');

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

testFiveDefectLifecycle().catch((err) => {
  console.error('[FATAL ERROR] Five-defect test failed:', err);
  process.exit(1);
});
