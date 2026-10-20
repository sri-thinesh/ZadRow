/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Quality Automation Verifier Test Suite
 *
 * Verifies:
 * 1. Real WCAG 2.2 Contrast Math Accuracy (Luminance, Contrast Ratio, Alpha Blending, Color Parsing)
 * 2. Responsive Touch & Gatekeeper Audit (Min 44x44px targets, Dynamic Viewport 100dvh, Media Gating)
 * 3. Strict Zero-Placeholder Scan (Detects banned tokens, ignores valid HTML attributes)
 * 4. Accessibility & Semantic Tree Audit (Single <h1>, Heading Hierarchy, Landmarks, ARIA Labels)
 * 5. Defect Severity Classification & Remediation Routing (P0-P3, Gatekeeper Pass/Fail, Owner Routing)
 * 6. Remediation Coordinator (A82) Retest Loop & Patch Log Generation
 * 7. Live Site Comprehensive Verification & Artifact Persistence
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { QAVerifier } from '../src/engine/qa_verifier.js';
import { Logger, Colors } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');

// Helper to create a sandbox directory within target plugins folder
function createSandbox(name) {
  const tmpDir = path.join(agencyDir, 'test', `sandbox_${name}_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

function cleanupSandbox(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {}
}

/**
 * TEST 1: Real WCAG 2.2 Contrast Math Accuracy
 */
async function testWcagContrastMath() {
  Logger.info('TEST 1: Verifying WCAG 2.2 Mathematical Algorithms & Relative Luminance...');
  const verifier = new QAVerifier({ agencyDir });

  // 1. Relative Luminance of standard reference colors
  const lumBlack = verifier.calculateRelativeLuminance('#000000');
  const lumWhite = verifier.calculateRelativeLuminance('#ffffff');
  assert.strictEqual(lumBlack, 0.0, 'Pure black relative luminance must be 0.0');
  assert.strictEqual(lumWhite, 1.0, 'Pure white relative luminance must be 1.0');

  // 2. Exact mathematical contrast ratios
  const blackOnWhiteRatio = verifier.calculateContrastRatio('#000000', '#ffffff');
  assert(Math.abs(blackOnWhiteRatio - 21.0) < 0.01, `Pure black on pure white must equal 21:1, got ${blackOnWhiteRatio}`);

  const identicalColorRatio = verifier.calculateContrastRatio('#00f0ff', '#00f0ff');
  assert(Math.abs(identicalColorRatio - 1.0) < 0.01, `Same color against itself must equal 1:1, got ${identicalColorRatio}`);

  // 3. Dynamic theme color pairs
  // High contrast: Light text (#f8fafc) on Dark canvas (#090a0f)
  const textOnCanvas = verifier.auditContrast('#f8fafc', '#090a0f');
  assert(textOnCanvas.ratio >= 15.0, `Primary text on canvas should be >= 15:1, got ${textOnCanvas.ratio}`);
  assert.strictEqual(textOnCanvas.passAA, true, 'Primary text on canvas must pass AA');
  assert.strictEqual(textOnCanvas.passAAA, true, 'Primary text on canvas must pass AAA');

  // Cyan Accent (#00f0ff) on Pure Black (#000000)
  const accentOnBlack = verifier.auditContrast('#00f0ff', '#000000', { isUIComponent: true });
  assert(accentOnBlack.ratio >= 14.0, `Accent on black should be >= 14:1, got ${accentOnBlack.ratio}`);
  assert.strictEqual(accentOnBlack.passAA, true, 'Accent on black must pass AA');

  // Low contrast: Muted grey (#64748b) on Slate surface (#334155)
  const lowContrast = verifier.auditContrast('#64748b', '#334155');
  assert(lowContrast.ratio < 4.5, `Low contrast pair should fail AA (< 4.5:1), got ${lowContrast.ratio}`);
  assert.strictEqual(lowContrast.passAA, false, 'Low contrast pair must fail AA');

  // 4. Alpha compositing & transparency handling
  // Semi-transparent cyan rgba(0, 240, 255, 0.55) over #090a0f
  const blendedFg = verifier.compositeAlpha(verifier.parseColor('rgba(0, 240, 255, 0.55)'), verifier.parseColor('#090a0f'));
  const blendedLum = verifier.calculateRelativeLuminance(blendedFg);
  assert(blendedLum > 0.1, 'Blended cyan luminance must be greater than base dark canvas');

  // 5. Multi-format color parsing (3-digit, 6-digit, 8-digit, rgb, rgba)
  const c3 = verifier.parseColor('#fff');
  const c6 = verifier.parseColor('#ffffff');
  const c8 = verifier.parseColor('#ffffff80');
  const cRgb = verifier.parseColor('rgb(255, 255, 255)');
  const cRgba = verifier.parseColor('rgba(255, 255, 255, 0.5)');

  assert.strictEqual(c3.r, 255);
  assert.strictEqual(c6.r, 255);
  assert.strictEqual(c8.a, 0.502);
  assert.strictEqual(cRgb.r, 255);
  assert.strictEqual(cRgba.a, 0.5);

  Logger.success('WCAG 2.2 Mathematical algorithms verified (100% precision).');
}

/**
 * TEST 2: Responsive Touch & Gatekeeper Audit
 */
async function testResponsiveTouchAndGatekeeper() {
  Logger.info('TEST 2: Verifying Responsive Touch Targets & Media Query Gating Detection...');
  const sandboxDir = createSandbox('responsive');

  try {
    const srcDir = path.join(sandboxDir, 'src');
    const appDir = path.join(srcDir, 'app');
    const compDir = path.join(srcDir, 'components');
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(compDir, { recursive: true });

    // 1. Test violation: Button with touch target < 44px
    const badButtonComponent = `
export function BadNav() {
  return (
    <div>
      <button className="p-1 w-6 h-6 text-white">Small</button>
    </div>
  );
}`;
    fs.writeFileSync(path.join(compDir, 'BadNav.tsx'), badButtonComponent, 'utf8');

    // 2. Test violation: Rigid 100vh in CSS without 100dvh
    const rigidCss = `
body {
  min-height: 100vh;
}
`;
    fs.writeFileSync(path.join(appDir, 'globals.css'), rigidCss, 'utf8');

    // 3. Test violation: Ungated custom cursor
    const ungatedCursor = `
export function MagneticCursor() {
  return <div className="custom-cursor fixed pointer-events-none" />;
}`;
    fs.writeFileSync(path.join(compDir, 'MagneticCursor.tsx'), ungatedCursor, 'utf8');

    const verifier = new QAVerifier({ targetDir: sandboxDir });
    const responsiveResult = verifier.checkResponsiveTouch();

    assert.strictEqual(responsiveResult.passed, false, 'Should fail when responsive touch violations are present');
    assert(
      responsiveResult.violations.some((v) => v.type === 'TOUCH_TARGET_BELOW_44PX'),
      'Must detect touch target below 44px'
    );
    assert(
      responsiveResult.violations.some((v) => v.type === 'RIGID_VIEWPORT_UNIT'),
      'Must detect rigid min-height: 100vh'
    );
    assert(
      responsiveResult.violations.some((v) => v.type === 'UNGATED_HOVER_ANIMATION'),
      'Must detect ungated custom cursor'
    );
    assert(
      responsiveResult.violations.some((v) => v.type === 'HORIZONTAL_SCROLL_BLOWOUT'),
      'Must detect lack of overflow-x: hidden'
    );

    // Now test compliant code:
    const goodButtonComponent = `
export function GoodNav() {
  return (
    <div className="overflow-x-hidden">
      <button className="min-w-[44px] min-h-[44px] p-2.5 text-white">Accessible Button</button>
      <a href="#link" className="h-11 w-11 inline-flex items-center justify-center">Link</a>
    </div>
  );
}`;
    fs.writeFileSync(path.join(compDir, 'BadNav.tsx'), goodButtonComponent, 'utf8');

    const goodCss = `
body {
  overflow-x: hidden;
  min-height: 100svh;
  min-height: 100dvh;
}
`;
    fs.writeFileSync(path.join(appDir, 'globals.css'), goodCss, 'utf8');

    const gatedCursor = `
export function MagneticCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return null;
  return <div className="custom-cursor fixed pointer-events-none" />;
}`;
    fs.writeFileSync(path.join(compDir, 'MagneticCursor.tsx'), gatedCursor, 'utf8');

    const fixedResult = verifier.checkResponsiveTouch();
    assert.strictEqual(fixedResult.passed, true, 'Compliant responsive components must pass with 0 violations');
    assert.strictEqual(fixedResult.violations.length, 0);

    Logger.success('Responsive touch target and media query gating detection verified.');
  } finally {
    cleanupSandbox(sandboxDir);
  }
}

/**
 * TEST 3: Strict Zero-Placeholder Scan
 */
async function testPlaceholderScanner() {
  Logger.info('TEST 3: Verifying Strict Zero-Placeholder Token Scanner...');
  const sandboxDir = createSandbox('placeholders');

  try {
    fs.mkdirSync(path.join(sandboxDir, 'src'), { recursive: true });

    // File with forbidden tokens
    const dirtyContent = `
// TODO: Replace this later with real API call
export const data = {
  status: 'TBD',
  headline: 'headline goes here',
  description: 'lorem ipsum dolor sit amet',
  upcoming: 'coming soon',
  token: '[INPUT]'
};
`;
    fs.writeFileSync(path.join(sandboxDir, 'src', 'dirty.ts'), dirtyContent, 'utf8');

    const verifier = new QAVerifier({ targetDir: sandboxDir });
    const dirtyResult = verifier.checkPlaceholders();

    assert.strictEqual(dirtyResult.passed, false, 'Must fail when banned tokens are present');
    assert(dirtyResult.findings.length >= 6, `Expected at least 6 banned token findings, got ${dirtyResult.findings.length}`);

    // Verify finding metadata (file, line number, matchedPattern, snippet)
    const todoFinding = dirtyResult.findings.find((f) => f.matchedPattern.toUpperCase() === 'TODO');
    assert(todoFinding, 'TODO token must be identified');
    assert(todoFinding.line > 0, 'Line number must be reported');
    assert(todoFinding.snippet.includes('TODO'), 'Snippet must include matched line');

    // Clean file with legitimate HTML placeholder attribute
    const cleanContent = `
export function CleanForm() {
  return (
    <input 
      type="email" 
      placeholder="Enter executive email address..." 
      className="placeholder:text-gray-400"
    />
  );
}`;
    fs.writeFileSync(path.join(sandboxDir, 'src', 'dirty.ts'), cleanContent, 'utf8');

    const cleanResult = verifier.checkPlaceholders();
    assert.strictEqual(cleanResult.passed, true, 'Clean file with valid HTML placeholder attribute must pass');
    assert.strictEqual(cleanResult.findings.length, 0);

    // Authorized MediaPlaceholders & Spatial aspect ratio containers
    const mediaPlaceholderContent = `
import { MediaPlaceholder } from './MediaPlaceholder';

export function MediaShowcase() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <MediaPlaceholder type="photo" label="Architectural Spatial Model" aspectRatio="video" />
      <MediaPlaceholder type="video" label="Generative Canvas Preview" aspectRatio="video" />
      <div className="relative aspect-video rounded-xl border border-white/10 bg-black/40 overflow-hidden" />
    </div>
  );
}
`;
    fs.writeFileSync(path.join(sandboxDir, 'src', 'MediaShowcase.tsx'), mediaPlaceholderContent, 'utf8');

    const mediaResult = verifier.checkPlaceholders();
    assert.strictEqual(mediaResult.passed, true, 'Authorized MediaPlaceholder and aspect-ratio empty containers must pass zero-placeholder scan');
    assert.strictEqual(mediaResult.findings.length, 0);

    Logger.success('Zero-placeholder scanner verified (blocks banned copy tokens, permits valid HTML attributes & MediaPlaceholders).');
  } finally {
    cleanupSandbox(sandboxDir);
  }
}

/**
 * TEST 4: Semantic DOM Audit and Heading Hierarchy
 */
async function testSemanticDOMAudit() {
  Logger.info('TEST 4: Verifying Semantic DOM Tree & Heading Hierarchy Audit...');
  const sandboxDir = createSandbox('semantics');

  try {
    fs.mkdirSync(path.join(sandboxDir, 'src'), { recursive: true });

    // 1. Test violation: Multiple <h1> tags and skipped heading hierarchy (h1 -> h3)
    const badSemantics = `
export function BrokenPage() {
  return (
    <div>
      <h1>First Main Title</h1>
      <h1>Second Duplicate Title</h1>
      <h3>Skipped Level Title</h3>
      <button><svg /></button>
      <input type="text" />
    </div>
  );
}`;
    fs.writeFileSync(path.join(sandboxDir, 'src', 'BrokenPage.tsx'), badSemantics, 'utf8');

    const verifier = new QAVerifier({ targetDir: sandboxDir });
    const result = verifier.checkAccessibilityAndSemantics();

    assert.strictEqual(result.passed, false, 'Must fail when semantic violations are present');
    assert(
      result.violations.some((v) => v.type === 'MULTIPLE_H1'),
      'Must detect multiple <h1> elements'
    );
    assert(
      result.violations.some((v) => v.type === 'SKIPPED_HEADING_LEVEL'),
      'Must detect skipped heading hierarchy (h1 -> h3)'
    );
    assert(
      result.violations.some((v) => v.type === 'MISSING_HEADER_LANDMARK'),
      'Must detect missing <header> landmark'
    );
    assert(
      result.violations.some((v) => v.type === 'MISSING_MAIN_LANDMARK'),
      'Must detect missing <main> landmark'
    );
    assert(
      result.violations.some((v) => v.type === 'MISSING_FOOTER_LANDMARK'),
      'Must detect missing <footer> landmark'
    );
    assert(
      result.violations.some((v) => v.type === 'ICON_BUTTON_MISSING_ARIA_LABEL'),
      'Must detect icon-only button without aria-label'
    );
    assert(
      result.violations.some((v) => v.type === 'INPUT_MISSING_LABEL'),
      'Must detect input without associated label'
    );

    // 2. Test compliant semantic page
    const goodSemantics = `
export function CleanPage() {
  return (
    <div>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header><nav aria-label="Main Navigation">Nav</nav></header>
      <main id="main-content">
        <h1>Single Canonical Title</h1>
        <h2>Section Level 2</h2>
        <h3>Subsection Level 3</h3>
        <button type="button" aria-label="Close dialog"><svg /></button>
        <label htmlFor="user-email">Email Address</label>
        <input id="user-email" type="email" />
      </main>
      <footer>Footer Information</footer>
    </div>
  );
}`;
    fs.writeFileSync(path.join(sandboxDir, 'src', 'BrokenPage.tsx'), goodSemantics, 'utf8');

    const cleanResult = verifier.checkAccessibilityAndSemantics();
    assert.strictEqual(cleanResult.passed, true, 'Compliant semantic DOM structure must pass with 0 violations');
    assert.strictEqual(cleanResult.violations.length, 0);

    Logger.success('Semantic DOM and heading hierarchy checks verified.');
  } finally {
    cleanupSandbox(sandboxDir);
  }
}

/**
 * TEST 5: Defect Severity Classification & Remediation Routing
 */
async function testDefectClassificationAndRouting() {
  Logger.info('TEST 5: Verifying Defect Severity Classification & Owner Routing...');
  const verifier = new QAVerifier({ agencyDir });

  // Mock synthetic audit results containing various defect categories
  const syntheticAuditResults = {
    syntaxAudit: {
      passed: false,
      issues: [{ file: 'src/app/layout.tsx', issue: 'Unbalanced braces' }],
    },
    importResolution: {
      passed: false,
      brokenImports: [{ file: 'src/app/page.tsx', importPath: '@/components/Missing', resolvedCandidate: 'Missing.tsx' }],
    },
    wcagContrast: {
      passed: false,
      failures: [{ name: 'Test Low Contrast', ratio: 2.1, minAA: 4.5, fg: '#666', bg: '#444' }],
    },
    responsiveAudit: {
      passed: false,
      violations: [
        { type: 'TOUCH_TARGET_BELOW_44PX', file: 'src/components/Navigation.tsx', message: 'Button < 44px' },
        { type: 'UNGATED_HOVER_ANIMATION', file: 'src/components/MagneticCursor.tsx', message: 'Ungated cursor' },
        { type: 'RIGID_VIEWPORT_UNIT', file: 'src/app/globals.css', message: 'Rigid 100vh' },
      ],
    },
    accessibilityAudit: {
      passed: false,
      violations: [
        { type: 'ICON_BUTTON_MISSING_ARIA_LABEL', file: 'src/components/Navigation.tsx', message: 'Missing aria-label' },
        { type: 'SKIPPED_HEADING_LEVEL', file: 'src/app/page.tsx', message: 'Skipped h1 -> h3' },
      ],
    },
    placeholderAudit: {
      passed: false,
      findings: [{ file: 'src/components/HeroStage.tsx', line: 12, matchedPattern: 'TODO', snippet: '// TODO: fix' }],
    },
  };

  const triage = verifier.classifyAndRouteDefects(syntheticAuditResults);

  // 1. Release Gate evaluation: P0/P1 must block release
  assert.strictEqual(triage.passed, false, 'Defects with P0 and P1 must block release');
  assert.strictEqual(triage.gateVerdict, 'RELEASE_BLOCKED', 'Verdict must be RELEASE_BLOCKED');
  assert(triage.summary.p0Count > 0, 'Must identify P0_BLOCKING defects');
  assert(triage.summary.p1Count > 0, 'Must identify P1_CRITICAL defects');
  assert(triage.summary.p2Count > 0, 'Must identify P2_MAJOR defects');

  // 2. Owner Routing validation
  const defects = triage.defects;
  const layoutDefect = defects.find((d) => d.file?.includes('layout.tsx'));
  assert.strictEqual(layoutDefect.assignedOwner, 'A51_AppShellEngineer', 'Layout issues must route to A51_AppShellEngineer');

  const cursorDefect = defects.find((d) => d.file?.includes('MagneticCursor.tsx'));
  assert.strictEqual(cursorDefect.assignedOwner, 'A54_VisualExperienceEngineer', 'Cursor issues must route to A54_VisualExperienceEngineer');

  const navTouchDefect = defects.find((d) => d.file?.includes('Navigation.tsx') && d.category === 'RESPONSIVE');
  assert.strictEqual(navTouchDefect.assignedOwner, 'A53_ComponentLead', 'Component touch targets must route to A53_ComponentLead');

  const heroPlaceholder = defects.find((d) => d.file?.includes('HeroStage.tsx') && d.category === 'PLACEHOLDER');
  assert.strictEqual(heroPlaceholder.assignedOwner, 'A52_PageEngineerLead', 'Page component placeholders must route to A52_PageEngineerLead');

  Logger.success('Defect severity classification and owner routing verified.');
}

/**
 * TEST 6: Remediation Coordinator (A82) Retest Loop & Patch Log
 */
async function testRemediationCoordinatorLoop() {
  Logger.info('TEST 6: Verifying Remediation Coordinator (A82) Retest Loop...');
  const sandboxDir = createSandbox('remediation');
  const artifactsDir = path.join(sandboxDir, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  try {
    const srcDir = path.join(sandboxDir, 'src', 'app');
    fs.mkdirSync(srcDir, { recursive: true });

    // Step 1: Create a file with a defect (forbidden placeholder)
    const targetFile = path.join(srcDir, 'page.tsx');
    const pageWithTodo = `
export default function Page() {
  return (
    <div>
      <header><nav>Nav</nav></header>
      <main id="main-content">
        <h1>Single Canonical</h1>
      </main>
      <footer>Footer</footer>
    </div>
  );
}
// TODO: replace with real backend integration
`;
    fs.writeFileSync(targetFile, pageWithTodo, 'utf8');

    // Create required package.json, tsconfig & globals.css
    fs.writeFileSync(path.join(sandboxDir, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0' } }), 'utf8');
    fs.writeFileSync(path.join(sandboxDir, 'tsconfig.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(srcDir, 'globals.css'), 'body { overflow-x: hidden; min-height: 100svh; min-height: 100dvh; }', 'utf8');

    const verifier = new QAVerifier({
      agencyDir,
      targetDir: sandboxDir,
      artifactsDir,
    });

    let loopExecutionCount = 0;

    // Simulate remediation callback fixing the file on attempt 1
    const remediationCallback = async (defects, attempt) => {
      loopExecutionCount++;
      // Remediate by rewriting clean file without TODO
      const cleanPage = pageWithTodo.replace('// TODO: replace with real backend integration', '// Clean implementation');
      fs.writeFileSync(targetFile, cleanPage, 'utf8');
      return true;
    };

    const finalResult = await verifier.executeRemediationLoop(remediationCallback, 3);
    assert.strictEqual(finalResult.passed, true, 'Should pass after successful remediation loop');
    assert.strictEqual(loopExecutionCount, 1, 'Should execute exactly 1 remediation loop before passing');

    // Verify patch log artifact
    const patchLogPath = path.join(artifactsDir, '82_remediation_patch_log.json');
    assert(fs.existsSync(patchLogPath), '82_remediation_patch_log.json must be written to disk');

    const patchLog = JSON.parse(fs.readFileSync(patchLogPath, 'utf8'));
    assert.strictEqual(patchLog.agentId, 'A82_RemediationCoordinator');
    assert.strictEqual(patchLog.status, 'REMEDIATION_RESOLVED');
    assert.strictEqual(patchLog.finalPassed, true);

    Logger.success('Remediation coordinator (A82) retest loop verified.');
  } finally {
    cleanupSandbox(sandboxDir);
  }
}

/**
 * TEST 7: Live Comprehensive Website Verification & Artifacts Persistence
 */
async function testLiveSiteVerification() {
  Logger.info('TEST 7: Executing Comprehensive Verification on Synthesized Website...');
  const verifier = new QAVerifier({ agencyDir });
  const results = await verifier.runAllChecks();

  assert.strictEqual(results.passed, true, 'Synthesized website must pass all genuine QA audits');
  assert.strictEqual(results.gateVerdict, 'ALL_GATES_PASSED', 'Gate verdict must be ALL_GATES_PASSED');
  assert.strictEqual(results.defects.length, 0, 'There must be zero defects in synthesized code');
  assert.strictEqual(results.errors.length, 0, 'Zero blocking errors');

  // Verify primary verdict artifact
  const verdictPath = path.join(agencyDir, 'workspace', 'artifacts', '70_qa_comprehensive_verdict.json');
  assert(fs.existsSync(verdictPath), '70_qa_comprehensive_verdict.json must exist');

  const verdict = JSON.parse(fs.readFileSync(verdictPath, 'utf8'));
  assert.strictEqual(verdict.agentId, 'A70_QA_ComprehensiveDirector');
  assert.strictEqual(verdict.passed, true);
  assert.strictEqual(verdict.gateVerdict, 'ALL_GATES_PASSED');
  assert(verdict.audits.wcagContrast.passed);
  assert(verdict.audits.responsiveTouch.passed);
  assert(verdict.audits.accessibilitySemantics.passed);
  assert(verdict.audits.zeroPlaceholder.passed);
  assert(verdict.audits.syntaxAndBuild.passed);

  // Verify backward-compatible report artifact
  const reportPath = path.join(agencyDir, 'workspace', 'artifacts', 'qa_verification_report.json');
  assert(fs.existsSync(reportPath), 'qa_verification_report.json must exist');

  Logger.success('Live synthesized website successfully certified by QAVerifier.');
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log(`\n${Colors.bold}${Colors.brightCyan}=== RUNNING GENUINE QA VERIFIER TEST SUITE ===${Colors.reset}\n`);
  try {
    await testWcagContrastMath();
    await testResponsiveTouchAndGatekeeper();
    await testPlaceholderScanner();
    await testSemanticDOMAudit();
    await testDefectClassificationAndRouting();
    await testRemediationCoordinatorLoop();
    await testLiveSiteVerification();

    console.log(`\n${Colors.brightGreen}${Colors.bold}ALL QA VERIFIER TESTS PASSED (100% SUCCESS)${Colors.reset}\n`);
  } catch (err) {
    console.error(`\n${Colors.brightRed}${Colors.bold}QA TEST FAILURE:${Colors.reset}`, err);
    process.exit(1);
  }
}

runAllTests();
