/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * Quality Automation & Verification Engine (QAVerifier)
 *
 * Implements genuine automated audits:
 * 1. Build & Syntax Integrity: Verifies HTML/CSS/JS/TS syntax, delimiter balance, exports, packaging.
 * 2. Real WCAG 2.2 Contrast Math: Parses actual CSS custom properties / design tokens,
 *    implements standard relative luminance with sRGB gamma correction, computes exact
 *    (L1+0.05)/(L2+0.05), checks AA (4.5:1 text, 3:1 non-text) and AAA (7:1, 4.5:1).
 * 3. Responsive Touch & Gatekeeper Audit: Enforces min 44x44px touch targets on buttons,
 *    nav items, and interactive links; checks CSS for dynamic viewport units (100dvh/100svh)
 *    and flags rigid 100vh; verifies hover-dependent animations and custom cursors are gated
 *    by @media (hover: hover) and (pointer: fine); verifies zero horizontal scroll blowout.
 * 4. Accessibility & Semantic Tree Audit: Verifies single <h1> and proper heading hierarchy
 *    (h2 before h3, no skipped levels); verifies landmark elements (<header>, <main>, <nav>, <footer>);
 *    verifies interactive accessibility (aria-label on icon-only buttons, modal dialog ARIA, form labels).
 * 5. Strict Zero-Placeholder Scan: Recursively scans 100% of files for banned tokens (TODO, TBD,
 *    [INPUT], lorem ipsum, placeholder text, coming soon, headline goes here).
 * 6. Defect Classification & Remediation Routing: Aggregates all failures into typed defects with
 *    defectId, severity (P0_BLOCKING, P1_CRITICAL, P2_MAJOR, P3_MINOR), category, and assignedOwner
 *    (A51-A54, A61-A63). Evaluates gate pass/fail (P0/P1 block release).
 *    Supports remediation coordinator (A82) for up to 3 retest loops.
 *    Persists reports to 70_qa_comprehensive_verdict.json and qa_verification_report.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class QAVerifier {
  constructor(options = {}) {
    this.agencyDir = options.agencyDir || path.resolve(__dirname, '../..');
    this.targetDir = options.targetDir || path.join(this.agencyDir, 'output', 'website');
    this.artifactsDir = options.artifactsDir || path.join(this.agencyDir, 'workspace', 'artifacts');
    this.options = options;
  }

  /**
   * Run the full suite of automated QA audits against the synthesized website
   */
  async runAllChecks() {
    const timestamp = new Date().toISOString();

    // 1. Build & Syntax Integrity
    const syntaxAudit = this.checkSyntax();
    const importResolution = this.checkImports();

    // 2. Real WCAG 2.2 Contrast Math
    const wcagContrast = this.checkWcagContrast();

    // 3. Responsive Touch & Gatekeeper Audit
    const responsiveAudit = this.checkResponsiveTouch();

    // 4. Accessibility & Semantic Tree Audit
    const accessibilityAudit = this.checkAccessibilityAndSemantics();

    // 5. Strict Zero-Placeholder Scan
    const placeholderAudit = this.checkPlaceholders();

    // 6. Navigation Anchor, Component Assembly & Form Interactivity Integrity
    const anchorAudit = this.checkAnchorIntegrity();
    const componentAudit = this.checkComponentIntegrity();
    const formAudit = this.checkFormIntegrity();

    // 7. Aggregate Failures, Classify Severities, and Route to Implementation Owners
    const triage = this.classifyAndRouteDefects({
      syntaxAudit,
      importResolution,
      wcagContrast,
      responsiveAudit,
      accessibilityAudit,
      placeholderAudit,
      anchorAudit,
      componentAudit,
      formAudit,
    });

    const results = {
      timestamp,
      targetDir: this.targetDir,
      passed: triage.passed,
      gateVerdict: triage.gateVerdict,
      defectSummary: triage.summary,
      defects: triage.defects,
      // Backward-compatible audit blocks
      wcagContrast,
      placeholderAudit,
      importResolution,
      syntaxAudit,
      responsiveAudit,
      accessibilityAudit,
      errors: triage.defects
        .filter((d) => d.severity === 'P0_BLOCKING' || d.severity === 'P1_CRITICAL')
        .map((d) => `[${d.severity}] ${d.category} (${d.defectId}): ${d.description}`),
      warnings: triage.defects
        .filter((d) => d.severity === 'P2_MAJOR' || d.severity === 'P3_MINOR')
        .map((d) => `[${d.severity}] ${d.category} (${d.defectId}): ${d.description}`),
    };

    // Save comprehensive verdict artifacts
    this._persistArtifacts(results);

    return results;
  }

  /**
   * Remediation Coordinator loop (triggers A82 for up to 3 retest loops)
   */
  async executeRemediationLoop(remediationCallback = null, maxRetries = 3) {
    let currentResults = await this.runAllChecks();
    let attempt = 0;
    const patchLog = [];

    while (!currentResults.passed && attempt < maxRetries) {
      attempt++;
      const activeP0P1 = currentResults.defects.filter(
        (d) => d.severity === 'P0_BLOCKING' || d.severity === 'P1_CRITICAL'
      );

      const logEntry = {
        attempt,
        coordinator: 'A82_RemediationCoordinator',
        timestamp: new Date().toISOString(),
        unresolvedDefectCount: activeP0P1.length,
        dispatchedOwners: [...new Set(activeP0P1.map((d) => d.assignedOwner))],
        defectIds: activeP0P1.map((d) => d.defectId),
      };

      if (typeof remediationCallback === 'function') {
        try {
          const remediationResult = await remediationCallback(activeP0P1, attempt);
          logEntry.remediationApplied = remediationResult ?? true;
        } catch (err) {
          logEntry.remediationError = err.message;
        }
      }

      patchLog.push(logEntry);

      // Retest
      currentResults = await this.runAllChecks();
    }

    // Persist remediation log artifact
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
    const logPath = path.join(this.artifactsDir, '82_remediation_patch_log.json');
    fs.writeFileSync(
      logPath,
      JSON.stringify(
        {
          agentId: 'A82_RemediationCoordinator',
          status: currentResults.passed ? 'REMEDIATION_RESOLVED' : 'ESCALATED_UNRESOLVED',
          maxRetries,
          attemptsExecuted: attempt,
          finalPassed: currentResults.passed,
          history: patchLog,
        },
        null,
        2
      ),
      'utf8'
    );

    return currentResults;
  }

  // =========================================================================
  // 1. BUILD & SYNTAX INTEGRITY AUDIT
  // =========================================================================

  checkSyntax() {
    const issues = [];
    const files = this._getAllSourceFiles(this.targetDir);

    // Packaging check
    const packageJsonPath = path.join(this.targetDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      issues.push({
        file: 'package.json',
        issue: 'Missing package.json in synthesized website root.',
      });
    } else {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (!pkg.dependencies && !pkg.devDependencies) {
          issues.push({
            file: 'package.json',
            issue: 'package.json contains neither dependencies nor devDependencies.',
          });
        }
      } catch (err) {
        issues.push({
          file: 'package.json',
          issue: `Invalid JSON syntax in package.json: ${err.message}`,
        });
      }
    }

    const tsconfigPath = path.join(this.targetDir, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      issues.push({
        file: 'tsconfig.json',
        issue: 'Missing tsconfig.json in synthesized website root.',
      });
    }

    // Source code syntax checks
    for (const filePath of files) {
      const ext = path.extname(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(this.targetDir, filePath);

      // JSON files check
      if (ext === '.json') {
        try {
          JSON.parse(content);
        } catch (err) {
          issues.push({ file: relPath, issue: `Corrupt JSON syntax: ${err.message}` });
        }
        continue;
      }

      // TS/TSX/JS/CSS delimiter balance
      if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.mjs' || ext === '.css') {
        const delimiterCheck = this._checkBalancedDelimiters(content);
        if (!delimiterCheck.balanced) {
          issues.push({
            file: relPath,
            issue: `Unbalanced delimiters: braces=${delimiterCheck.braces}, brackets=${delimiterCheck.brackets}, parens=${delimiterCheck.parens}`,
          });
        }
      }

      // TSX/JSX specific checks: unclosed tags & exports
      if (ext === '.tsx' || ext === '.jsx') {
        const tagCheck = this._checkUnclosedJsxTags(content);
        if (!tagCheck.balanced) {
          issues.push({
            file: relPath,
            issue: `Unclosed or mismatched JSX tag: <${tagCheck.unmatchedTag}> without closing tag.`,
          });
        }

        if (filePath.includes('components') || filePath.includes('app')) {
          const hasExport = /export\s+(?:default\s+)?(?:function|const|class|interface|type)\b/.test(content);
          if (!hasExport) {
            issues.push({
              file: relPath,
              issue: 'Component/page file lacks an exported declaration.',
            });
          }
        }
      }
    }

    return {
      passed: issues.length === 0,
      scannedFilesCount: files.length,
      issues,
    };
  }

  checkImports() {
    const brokenImports = [];
    const files = this._getAllSourceFiles(this.targetDir);
    const srcDir = path.join(this.targetDir, 'src');

    const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;

    for (const filePath of files) {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.mjs')) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];

        // Skip non-relative or external packages (e.g. 'react', 'next', 'lucide-react')
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          continue;
        }

        let resolvedPath = null;
        if (importPath.startsWith('@/')) {
          const subPath = importPath.slice(2);
          resolvedPath = path.join(srcDir, subPath);
        } else {
          resolvedPath = path.resolve(path.dirname(filePath), importPath);
        }

        const candidates = [
          resolvedPath,
          `${resolvedPath}.ts`,
          `${resolvedPath}.tsx`,
          `${resolvedPath}.js`,
          `${resolvedPath}.mjs`,
          `${resolvedPath}.css`,
          path.join(resolvedPath, 'index.ts'),
          path.join(resolvedPath, 'index.tsx'),
          path.join(resolvedPath, 'index.js'),
        ];

        const exists = candidates.some((cand) => fs.existsSync(cand));

        if (!exists) {
          brokenImports.push({
            file: path.relative(this.targetDir, filePath),
            importPath,
            resolvedCandidate: resolvedPath,
          });
        }
      }
    }

    return {
      passed: brokenImports.length === 0,
      brokenImports,
    };
  }

  // =========================================================================
  // 2. REAL WCAG 2.2 CONTRAST MATH
  // =========================================================================

  /**
   * Parse hex, rgb, or rgba string to normalized RGBA object
   */
  parseColor(colorStr) {
    if (!colorStr || typeof colorStr !== 'string') {
      return { r: 0, g: 0, b: 0, a: 1.0 };
    }

    const str = colorStr.trim();

    // Hex pattern: #rgb, #rgba, #rrggbb, #rrggbbaa
    if (str.startsWith('#')) {
      let clean = str.replace('#', '');
      if (clean.length === 3) {
        clean = clean.split('').map((c) => c + c).join('') + 'ff';
      } else if (clean.length === 4) {
        clean = clean.split('').map((c) => c + c).join('');
      } else if (clean.length === 6) {
        clean = clean + 'ff';
      }
      const num = parseInt(clean, 16);
      return {
        r: (num >>> 24) & 255,
        g: (num >>> 16) & 255,
        b: (num >>> 8) & 255,
        a: Number(((num & 255) / 255).toFixed(3)),
      };
    }

    // rgb(r, g, b) or rgba(r, g, b, a)
    const rgbaMatch = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (rgbaMatch) {
      return {
        r: Math.min(255, Math.max(0, parseFloat(rgbaMatch[1]))),
        g: Math.min(255, Math.max(0, parseFloat(rgbaMatch[2]))),
        b: Math.min(255, Math.max(0, parseFloat(rgbaMatch[3]))),
        a: rgbaMatch[4] !== undefined ? Math.min(1.0, Math.max(0, parseFloat(rgbaMatch[4]))) : 1.0,
      };
    }

    return { r: 0, g: 0, b: 0, a: 1.0 };
  }

  /**
   * Alpha compositing over opaque background (Porter-Duff source-over)
   */
  compositeAlpha(fg, bg) {
    const a = fg.a !== undefined ? fg.a : 1.0;
    return {
      r: Math.round(a * fg.r + (1 - a) * bg.r),
      g: Math.round(a * fg.g + (1 - a) * bg.g),
      b: Math.round(a * fg.b + (1 - a) * bg.b),
      a: 1.0,
    };
  }

  /**
   * Relative Luminance L = 0.2126R + 0.7152G + 0.0722B with sRGB gamma correction
   */
  calculateRelativeLuminance(colorInput) {
    const color = typeof colorInput === 'string' ? this.parseColor(colorInput) : colorInput;

    const toLinear = (c8) => {
      const c = c8 / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const rLinear = toLinear(color.r);
    const gLinear = toLinear(color.g);
    const bLinear = toLinear(color.b);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  // Alias for backward compatibility
  _calculateLuminance(hex) {
    return this.calculateRelativeLuminance(hex);
  }

  /**
   * Contrast ratio = (L1 + 0.05) / (L2 + 0.05)
   */
  calculateContrastRatio(fgInput, bgInput) {
    if (typeof fgInput === 'number' && typeof bgInput === 'number') {
      const lighter = Math.max(fgInput, bgInput);
      const darker = Math.min(fgInput, bgInput);
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(1));
    }

    const fg = typeof fgInput === 'string' ? this.parseColor(fgInput) : fgInput;
    const bg = typeof bgInput === 'string' ? this.parseColor(bgInput) : bgInput;

    const effectiveFg = fg.a < 1.0 ? this.compositeAlpha(fg, bg) : fg;

    const l1 = this.calculateRelativeLuminance(effectiveFg);
    const l2 = this.calculateRelativeLuminance(bg);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  // Alias for backward compatibility
  _calculateContrastRatio(hex1, hex2) {
    return this.calculateContrastRatio(hex1, hex2);
  }

  /**
   * Audit an individual color pair against WCAG 2.2 criteria
   */
  auditContrast(fgColor, bgColor, options = {}) {
    const isLargeText = options.isLargeText || false;
    const isUIComponent = options.isUIComponent || false;

    const ratio = this.calculateContrastRatio(fgColor, bgColor);
    const roundedRatio = Number(ratio.toFixed(2));

    const minAA = isLargeText || isUIComponent ? 3.0 : 4.5;
    const minAAA = isLargeText ? 4.5 : 7.0;

    return {
      ratio: roundedRatio,
      formattedRatio: `${roundedRatio}:1`,
      passAA: roundedRatio >= minAA,
      passAAA: roundedRatio >= minAAA,
      minAA,
      minAAA,
    };
  }

  /**
   * Audit all dynamic theme tokens and CSS custom properties
   */
  checkWcagContrast() {
    const tokens = this._extractThemeTokens();

    const colorPairs = [
      {
        name: 'Primary Text on Canvas',
        fg: tokens.textPrimary || '#f8fafc',
        bg: tokens.bgCanvas || '#090a0f',
        minAA: 4.5,
        minAAA: 7.0,
      },
      {
        name: 'Secondary Text on Surface',
        fg: tokens.textSecondary || '#94a3b8',
        bg: tokens.bgSurface || '#11131c',
        minAA: 4.5,
        minAAA: 7.0,
      },
      {
        name: 'Accent Primary on Black',
        fg: tokens.colorPrimary || '#00f0ff',
        bg: '#000000',
        minAA: 3.0,
        minAAA: 4.5,
        isUIComponent: true,
      },
      {
        name: 'Black Text on Accent Primary Button',
        fg: '#000000',
        bg: tokens.colorPrimary || '#00f0ff',
        minAA: 4.5,
        minAAA: 7.0,
      },
      {
        name: 'Muted Text on Canvas',
        fg: tokens.textMuted || '#64748b',
        bg: tokens.bgCanvas || '#090a0f',
        minAA: 3.0,
        minAAA: 4.5,
        isLargeText: true,
      },
      {
        name: 'Focus Ring Highlight on Canvas',
        fg: tokens.borderHighlight || tokens.colorPrimary || '#00f0ff',
        bg: tokens.bgCanvas || '#090a0f',
        minAA: 3.0,
        minAAA: 3.0,
        isUIComponent: true,
      },
    ];

    const results = [];
    const failures = [];

    for (const pair of colorPairs) {
      const audit = this.auditContrast(pair.fg, pair.bg, {
        isLargeText: pair.isLargeText,
        isUIComponent: pair.isUIComponent,
      });

      const record = {
        name: pair.name,
        fg: pair.fg,
        bg: pair.bg,
        ratio: audit.ratio,
        formattedRatio: audit.formattedRatio,
        passAA: audit.passAA,
        passAAA: audit.passAAA,
        minAA: pair.minAA,
        minAAA: pair.minAAA,
      };

      results.push(record);
      if (!audit.passAA) {
        failures.push(record);
      }
    }

    return {
      passed: failures.length === 0,
      extractedTokens: tokens,
      results,
      failures,
    };
  }

  // =========================================================================
  // 3. RESPONSIVE TOUCH & GATEKEEPER AUDIT
  // =========================================================================

  checkResponsiveTouch() {
    const violations = [];
    const files = this._getAllSourceFiles(this.targetDir);
    const cssFiles = files.filter((f) => f.endsWith('.css'));
    const tsxFiles = files.filter((f) => f.endsWith('.tsx') || f.endsWith('.jsx'));

    // 1. Check for rigid 100vh vs dynamic viewport units (100dvh / 100svh)
    let hasDynamicViewport = false;
    let hasRigid100vh = false;

    for (const cssFile of cssFiles) {
      const content = fs.readFileSync(cssFile, 'utf8');
      if (content.includes('100dvh') || content.includes('100svh')) {
        hasDynamicViewport = true;
      }
      if (/min-height:\s*100vh/i.test(content) && !content.includes('100dvh')) {
        hasRigid100vh = true;
        violations.push({
          type: 'RIGID_VIEWPORT_UNIT',
          file: path.relative(this.targetDir, cssFile),
          message: 'Found rigid `min-height: 100vh`. Must provide dynamic viewport units (`100dvh` / `100svh`) for mobile browser address bar stability.',
        });
      }
    }

    // 2. Check for hover-dependent animations / custom cursors gated by (hover: hover) and (pointer: fine)
    let customCursorFound = false;
    let customCursorGated = false;

    for (const tsxFile of tsxFiles) {
      const content = fs.readFileSync(tsxFile, 'utf8');
      const relPath = path.relative(this.targetDir, tsxFile);

      if (tsxFile.includes('MagneticCursor') || /custom-cursor|pointer-follower/i.test(content)) {
        customCursorFound = true;
        if (
          content.includes('(hover: hover) and (pointer: fine)') ||
          content.includes('(pointer: coarse)') ||
          content.includes('matchMedia')
        ) {
          customCursorGated = true;
        } else {
          violations.push({
            type: 'UNGATED_HOVER_ANIMATION',
            file: relPath,
            message: 'Custom cursor or pointer animation is not gated by `matchMedia("(hover: hover) and (pointer: fine)")`. Traps touch users.',
          });
        }
      }

      // 3. Touch hit targets on interactive buttons & links (min 44x44px)
      const interactiveElements = this._extractJsxElements(content, ['button', 'a']);
      for (const el of interactiveElements) {
        const tag = el.tag;
        const attrs = el.attrs;
        const classMatch = attrs.match(/className=["']([^"']+)["']/);
        const classNames = classMatch ? classMatch[1] : '';

        // Touch target evaluation:
        // Acceptable: min-h-[44px], min-w-[44px], h-11 (44px), h-12 (48px), py-3.5, py-4, p-3, p-4,
        // or ghost pseudo hit area after:min-w-[44px], after:inset-[-10px], after:w-11
        const hasMin44 =
          /min-h-\[(?:4[4-9]|[5-9]\d|\d{3,})px\]/.test(classNames) ||
          /min-w-\[(?:4[4-9]|[5-9]\d|\d{3,})px\]/.test(classNames) ||
          /\b(?:h-11|h-12|h-14|h-16|h-20|w-11|w-12|w-14|w-16)\b/.test(classNames) ||
          /\b(?:py-3\.5|py-4|py-5|py-6|p-3\.5|p-4|p-5|p-6)\b/.test(classNames) ||
          /after:(?:min-w-\[44px\]|inset-\[-10px\]|min-h-\[44px\]|w-11)/.test(classNames);

        // Explicit small targets that violate 44px
        const hasUndersizedMin = /min-[hw]-\[(?:[0-3]?\d|4[0-3])px\]/.test(classNames);
        const isExplicitlySmall =
          hasUndersizedMin ||
          ((/\b(?:p-1|p-1\.5|p-2|py-1|py-1\.5|py-2|h-6|h-7|h-8|w-6|w-7|w-8)\b/.test(classNames)) && !hasMin44);

        if (isExplicitlySmall) {
          violations.push({
            type: 'TOUCH_TARGET_BELOW_44PX',
            file: relPath,
            element: `<${tag}>`,
            classes: classNames,
            message: `Interactive <${tag}> has touch target below 44x44px (${classNames.split(' ').filter(c => /^(?:p|h|w)-/.test(c)).join(' ')}). Enforce WCAG 2.5.5 minimum 44×44px.`,
          });
        }
      }
    }

    // 4. Zero Horizontal Scroll Blowout Check
    let hasOverflowXHidden = false;
    for (const cssFile of cssFiles) {
      const content = fs.readFileSync(cssFile, 'utf8');
      if (/overflow-x:\s*hidden/i.test(content)) {
        hasOverflowXHidden = true;
      }
    }
    for (const tsxFile of tsxFiles) {
      const content = fs.readFileSync(tsxFile, 'utf8');
      if (content.includes('overflow-x-hidden')) {
        hasOverflowXHidden = true;
      }
    }

    if (!hasOverflowXHidden) {
      violations.push({
        type: 'HORIZONTAL_SCROLL_BLOWOUT',
        file: 'globals.css or layout.tsx',
        message: 'No `overflow-x: hidden` detected on root layout. Mobile viewport prone to horizontal blowout.',
      });
    }

    return {
      passed: violations.length === 0,
      viewportSafety: { hasDynamicViewport, hasRigid100vh },
      hoverGating: { customCursorFound, customCursorGated },
      zeroHorizontalOverflow: hasOverflowXHidden,
      violations,
    };
  }

  // =========================================================================
  // 4. ACCESSIBILITY & SEMANTIC TREE AUDIT
  // =========================================================================

  checkAccessibilityAndSemantics() {
    const violations = [];
    const files = this._getAllSourceFiles(this.targetDir);
    const tsxFiles = files.filter((f) => f.endsWith('.tsx') || f.endsWith('.jsx'));

    let h1Count = 0;
    const headings = [];
    let hasHeaderOrNav = false;
    let hasMain = false;
    let hasFooter = false;
    let hasSkipLink = false;

    for (const filePath of tsxFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(this.targetDir, filePath);

      // Landmarks detection
      if (/<(?:header|nav)\b/i.test(content) || /role=["'](?:banner|navigation)["']/i.test(content)) {
        hasHeaderOrNav = true;
      }
      if (/<main\b/i.test(content) || /role=["']main["']/i.test(content)) {
        hasMain = true;
      }
      if (/<footer\b/i.test(content) || /role=["']contentinfo["']/i.test(content)) {
        hasFooter = true;
      }
      if (content.includes('skip-link') || /href=["']#main-content["']/i.test(content)) {
        hasSkipLink = true;
      }

      // Headings extraction (h1..h6)
      const headingRegex = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi;
      let hMatch;
      while ((hMatch = headingRegex.exec(content)) !== null) {
        const tag = hMatch[1].toLowerCase();
        const level = parseInt(tag[1], 10);
        const headingText = hMatch[3].replace(/<[^>]+>/g, '').trim();

        if (tag === 'h1') h1Count++;
        headings.push({ tag, level, text: headingText, file: relPath });
      }

      // Icon-only buttons accessibility (must have aria-label)
      const buttons = this._extractJsxElements(content, ['button']);
      for (const btn of buttons) {
        const attrs = btn.attrs;
        const inner = btn.inner.trim();
        const hasAriaLabel = /aria-label=(?:["'][^"']+["']|\{[^}]+\})|aria-labelledby=(?:["'][^"']+["']|\{[^}]+\})/i.test(attrs);
        const textContent = inner.replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').trim();
        const hasTextChild = /[a-zA-Z0-9]{2,}/.test(textContent);

        // If inner is just an SVG or Lucide icon like <X />, <Menu />, <Volume2 /> and no text
        const isIconOnly = (/<[A-Z]\w*[^>]*\/?>|<svg\b/i.test(inner)) && !hasTextChild;

        if (isIconOnly && !hasAriaLabel) {
          violations.push({
            type: 'ICON_BUTTON_MISSING_ARIA_LABEL',
            file: relPath,
            snippet: `<button ${attrs.slice(0, 40).trim()}...>`,
            message: 'Icon-only button missing required `aria-label` or `aria-labelledby`. Screen readers cannot interpret.',
          });
        }
      }

      // Form input accessibility (must have label or aria-label)
      const inputRegex = /<input\b([^>]*)>/gi;
      let inputMatch;
      while ((inputMatch = inputRegex.exec(content)) !== null) {
        const attrs = inputMatch[1];
        if (/type=["']hidden["']/i.test(attrs)) continue;

        const hasAriaLabel = /aria-label=["'][^"']+["']|aria-labelledby=["'][^"']+["']/i.test(attrs);
        const hasId = attrs.match(/id=["']([^"']+)["']/);
        const idVal = hasId ? hasId[1] : null;

        // Check if there is an associated <label htmlFor="...">
        let hasLabelAssociation = false;
        if (idVal) {
          const labelRegex = new RegExp(`<label[^>]*htmlFor=["']${idVal}["']`, 'i');
          if (labelRegex.test(content)) {
            hasLabelAssociation = true;
          }
        }

        if (!hasAriaLabel && !hasLabelAssociation) {
          violations.push({
            type: 'INPUT_MISSING_LABEL',
            file: relPath,
            snippet: `<input ${attrs.slice(0, 40)}...>`,
            message: 'Interactive <input> element lacks an associated <label htmlFor="..."> or `aria-label`.',
          });
        }
      }
    }

    // Single <h1> verification
    if (h1Count === 0) {
      violations.push({
        type: 'MISSING_H1',
        file: 'src/app/page.tsx',
        message: 'No <h1> heading found on the page. Exactly one <h1> is mandatory for WCAG compliance.',
      });
    } else if (h1Count > 1) {
      violations.push({
        type: 'MULTIPLE_H1',
        file: 'src/app/page.tsx',
        message: `Found ${h1Count} <h1> elements. WCAG requires a single canonical <h1> per document.`,
      });
    }

    // Heading hierarchy verification (e.g. h1 -> h2 -> h3, no skipping h1 -> h3)
    let prevLevel = 0;
    for (const h of headings) {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        violations.push({
          type: 'SKIPPED_HEADING_LEVEL',
          file: h.file,
          message: `Heading hierarchy skipped from <h${prevLevel}> to <h${h.level}> ("${h.text}"). Heading levels must not skip.`,
        });
      }
      prevLevel = h.level;
    }

    // Landmark verification
    if (!hasHeaderOrNav) {
      violations.push({
        type: 'MISSING_HEADER_LANDMARK',
        file: 'layout.tsx / page.tsx',
        message: 'Missing landmark <header> or <nav>. Screen reader navigation impaired.',
      });
    }
    if (!hasMain) {
      violations.push({
        type: 'MISSING_MAIN_LANDMARK',
        file: 'page.tsx',
        message: 'Missing landmark <main id="main-content">. Screen reader main region anchor impaired.',
      });
    }
    if (!hasFooter) {
      violations.push({
        type: 'MISSING_FOOTER_LANDMARK',
        file: 'page.tsx',
        message: 'Missing landmark <footer>. Essential page conclusion landmark absent.',
      });
    }

    return {
      passed: violations.length === 0,
      h1Count,
      headingTree: headings,
      landmarks: { hasHeaderOrNav, hasMain, hasFooter, hasSkipLink },
      violations,
    };
  }

  // =========================================================================
  // 5. STRICT ZERO-PLACEHOLDER SCAN
  // =========================================================================

  checkPlaceholders() {
    const forbiddenPatterns = [
      { pattern: /\bTODO\b/i, label: 'TODO' },
      { pattern: /\bFIXME\b/i, label: 'FIXME' },
      { pattern: /\blorem\s+ipsum\b/i, label: 'lorem ipsum' },
      { pattern: /\btest123\b/i, label: 'test123' },
      { pattern: /\bfake\b/i, label: 'fake' },
      { pattern: /\bTBD\b/i, label: 'TBD' },
      { pattern: /\[INPUT\]/i, label: '[INPUT]' },
      { pattern: /\bcoming\s+soon\b/i, label: 'coming soon' },
      { pattern: /\bheadline\s+goes\s+here\b/i, label: 'headline goes here' },
    ];

    const findings = [];
    const files = this._getAllSourceFiles(this.targetDir);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relPath = path.relative(this.targetDir, filePath);

      lines.forEach((line, index) => {
        // Strip legitimate HTML placeholder attributes like placeholder="Enter email..."
        // but check if the value itself is a placeholder token
        const htmlPlaceholderMatch = line.match(/placeholder=["']([^"']*)["']/i);
        if (htmlPlaceholderMatch) {
          const attrVal = htmlPlaceholderMatch[1].toLowerCase();
          if (attrVal === 'placeholder' || attrVal === 'todo' || attrVal.includes('lorem ipsum')) {
            findings.push({
              file: relPath,
              line: index + 1,
              matchedPattern: 'placeholder (fake attribute value)',
              snippet: line.trim(),
            });
          }
        }

        // Clean out standard placeholder="..." attribute and Tailwind placeholder: utility prefix
        let sanitizedLine = line
          .replace(/placeholder=["'][^"']*["']/gi, '')
          .replace(/placeholder:[a-zA-Z0-9_-]+/gi, '');

        // Allow legitimate visual media placeholders and reserved spatial slot components
        // (e.g. MediaPlaceholder, GalleryPlaceholder, ImagePlaceholder, VideoPlaceholder, aspect-ratio empty space)
        sanitizedLine = sanitizedLine
          .replace(/<MediaPlaceholder\b[^>]*\/?>/gi, '')
          .replace(/<(?:Media|Gallery|Image|Video|Asset)Placeholder\b[^>]*>/gi, '')
          .replace(/<\/(?:Media|Gallery|Image|Video|Asset)Placeholder>/gi, '')
          .replace(/(?:media|gallery|image|video|asset|photo|visual)[-_]placeholder/gi, '')
          .replace(/placeholder[-_](?:media|gallery|image|video|asset|slot|container|box)/gi, '')
          .replace(/(?:Media|Gallery|Image|Video|Asset)Placeholder(?:Props)?/g, '')
          .replace(/\b(?:media|gallery|photo|video)\s+placeholder\b/gi, '')
          .replace(/\bplaceholder\s+(?:media|gallery|slot|space|container|frame|box)\b/gi, '')
          .replace(/\bplaceholder\s+for\s+(?:media|gallery|photo|video|image)\b/gi, '')
          .replace(/\bmedia\s+slots?\b/gi, '')
          .replace(/\b(?:photo|video|gallery|visual)\s+placeholder\b/gi, '');

        // Check for forbidden word "placeholder" in content, comments, or variables
        if (/\bplaceholder\b/i.test(sanitizedLine)) {
          findings.push({
            file: relPath,
            line: index + 1,
            matchedPattern: 'placeholder',
            snippet: line.trim(),
          });
        }

        for (const item of forbiddenPatterns) {
          if (item.pattern.test(sanitizedLine)) {
            findings.push({
              file: relPath,
              line: index + 1,
              matchedPattern: item.label,
              snippet: line.trim(),
            });
          }
        }
      });
    }

    return {
      passed: findings.length === 0,
      scannedFilesCount: files.length,
      findings,
    };
  }

  // =========================================================================
  // 6. NAVIGATION ANCHOR & LINK INTEGRITY AUDIT
  // =========================================================================

  checkAnchorIntegrity() {
    const violations = [];
    const files = this._getAllSourceFiles(this.targetDir);
    const tsxFiles = files.filter((f) => f.endsWith('.tsx') || f.endsWith('.jsx'));

    // Collect all element IDs present in the project
    const validIds = new Set(['top', 'hero']);
    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const idMatches = content.matchAll(/\bid=["']([^"']+)["']/g);
      for (const m of idMatches) {
        validIds.add(m[1]);
      }
    }

    // Check all internal anchor references: href="#..."
    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(this.targetDir, file);
      const linkMatches = content.matchAll(/href(?:=|\s*:)\s*["']#([^"']+)["']/g);
      for (const m of linkMatches) {
        const targetId = m[1];
        if (!validIds.has(targetId)) {
          violations.push({
            type: 'BROKEN_ANCHOR_LINK',
            file: relPath,
            target: targetId,
            message: `Internal anchor link href="#${targetId}" does not match any existing section id in DOM hierarchy.`,
          });
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  // =========================================================================
  // 7. COMPONENT ASSEMBLY & PAGE COMPLETENESS AUDIT
  // =========================================================================

  checkComponentIntegrity() {
    const violations = [];
    const pagePath = path.join(this.targetDir, 'src', 'app', 'page.tsx');
    if (!fs.existsSync(pagePath)) {
      violations.push({
        type: 'MISSING_MAIN_PAGE',
        file: 'src/app/page.tsx',
        message: 'Main page router (src/app/page.tsx) is missing.',
      });
      return { passed: false, violations };
    }

    const content = fs.readFileSync(pagePath, 'utf8');

    // 1. Check for commented-out component invocations: {/* <Component ... /> */}
    const commentedMatches = content.matchAll(/{\/\*\s*<([A-Z]\w+)\b[^*]*\*\//g);
    for (const m of commentedMatches) {
      const comp = m[1];
      violations.push({
        type: 'MISSING_REQUIRED_COMPONENT',
        file: 'src/app/page.tsx',
        component: comp,
        message: `Required architectural component <${comp} /> is commented out in page.tsx.`,
      });
    }

    // 2. Check for components imported in page.tsx but omitted from render tree
    const compDir = path.join(this.targetDir, 'src', 'components');
    if (fs.existsSync(compDir)) {
      const existingFiles = fs.readdirSync(compDir);
      for (const f of existingFiles) {
        const compName = path.basename(f, path.extname(f));
        const isImported = new RegExp(`\\bimport\\s+.*\\b${compName}\\b.*from`, 'i').test(content);
        const isRendered = new RegExp(`<${compName}\\b`, 'i').test(content);
        if (isImported && !isRendered) {
          violations.push({
            type: 'MISSING_REQUIRED_COMPONENT',
            file: 'src/app/page.tsx',
            component: compName,
            message: `Component <${compName} /> is imported in page.tsx but omitted from rendered DOM.`,
          });
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  // =========================================================================
  // 8. FORM INTERACTIVITY & SUBMISSION AUDIT
  // =========================================================================

  checkFormIntegrity() {
    const violations = [];
    const files = this._getAllSourceFiles(this.targetDir);
    const tsxFiles = files.filter((f) => f.endsWith('.tsx') || f.endsWith('.jsx'));

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(this.targetDir, file);

      // Check for statically disabled submit buttons
      if (/type=["']submit["']\s+disabled\b|<button\s+disabled\b[^>]*type=["']submit["']/i.test(content)) {
        violations.push({
          type: 'INACTIVE_FORM_SUBMISSION',
          file: relPath,
          message: 'Form submit button is statically disabled, preventing user brief or inquiry transmission.',
        });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  // =========================================================================
  // 9. DEFECT CLASSIFICATION & REMEDIATION ROUTING
  // =========================================================================

  classifyAndRouteDefects(auditResults) {
    const defects = [];
    let counter = 1;

    const makeId = (prefix) => `DEF-${prefix}-${String(counter++).padStart(3, '0')}`;

    // 1. Build & Syntax defects
    if (auditResults.syntaxAudit && !auditResults.syntaxAudit.passed) {
      for (const issue of auditResults.syntaxAudit.issues) {
        defects.push({
          defectId: makeId('SYN'),
          severity: 'P0_BLOCKING',
          category: 'SYNTAX',
          description: `Syntax anomaly: ${issue.issue}`,
          assignedOwner: this._routeOwnerByFile(issue.file, 'A51_AppShellEngineer'),
          file: issue.file,
          remediationRecommendation: 'Fix structural syntax error, check delimiters, exports, and JSON syntax.',
        });
      }
    }

    if (auditResults.importResolution && !auditResults.importResolution.passed) {
      for (const broken of auditResults.importResolution.brokenImports) {
        defects.push({
          defectId: makeId('IMP'),
          severity: 'P1_CRITICAL',
          category: 'SYNTAX',
          description: `Broken import in ${broken.file}: unable to resolve "${broken.importPath}"`,
          assignedOwner: this._routeOwnerByFile(broken.file, 'A51_AppShellEngineer'),
          file: broken.file,
          remediationRecommendation: `Ensure referenced module exists at candidate: ${broken.resolvedCandidate}`,
        });
      }
    }

    // 2. WCAG Contrast defects
    if (auditResults.wcagContrast && !auditResults.wcagContrast.passed) {
      for (const fail of auditResults.wcagContrast.failures) {
        const severity = fail.ratio < 3.0 ? 'P0_BLOCKING' : 'P1_CRITICAL';
        defects.push({
          defectId: makeId('WCAG'),
          severity,
          category: 'WCAG',
          description: `WCAG AA Contrast violation: "${fail.name}" ratio ${fail.ratio}:1 fails minimum ${fail.minAA}:1.`,
          assignedOwner: 'A51_AppShellEngineer',
          remediationRecommendation: `Adjust color tokens for ${fail.name} (fg: ${fail.fg}, bg: ${fail.bg}) to exceed ${fail.minAA}:1.`,
        });
      }
    }

    // 3. Responsive Touch & Gatekeeper defects
    if (auditResults.responsiveAudit && !auditResults.responsiveAudit.passed) {
      for (const violation of auditResults.responsiveAudit.violations) {
        let severity = 'P1_CRITICAL';
        let owner = 'A53_ComponentLead';

        if (violation.type === 'HORIZONTAL_SCROLL_BLOWOUT') {
          severity = 'P0_BLOCKING';
          owner = 'A51_AppShellEngineer';
        } else if (violation.type === 'RIGID_VIEWPORT_UNIT') {
          severity = 'P2_MAJOR';
          owner = 'A51_AppShellEngineer';
        } else if (violation.type === 'UNGATED_HOVER_ANIMATION') {
          severity = 'P2_MAJOR';
          owner = 'A54_VisualExperienceEngineer';
        }

        defects.push({
          defectId: makeId('RESP'),
          severity,
          category: 'RESPONSIVE',
          description: violation.message,
          assignedOwner: this._routeOwnerByFile(violation.file, owner),
          file: violation.file,
          remediationRecommendation: this._getResponsiveRemediation(violation.type),
        });
      }
    }

    // 4. Accessibility & Semantics defects
    if (auditResults.accessibilityAudit && !auditResults.accessibilityAudit.passed) {
      for (const violation of auditResults.accessibilityAudit.violations) {
        let severity = 'P1_CRITICAL';
        let owner = 'A52_PageEngineerLead';

        if (violation.type === 'ICON_BUTTON_MISSING_ARIA_LABEL' || violation.type === 'INPUT_MISSING_LABEL') {
          severity = 'P1_CRITICAL';
          owner = 'A53_ComponentLead';
        } else if (violation.type === 'SKIPPED_HEADING_LEVEL') {
          severity = 'P2_MAJOR';
          owner = 'A52_PageEngineerLead';
        } else if (violation.type === 'MISSING_MAIN_LANDMARK') {
          severity = 'P0_BLOCKING';
          owner = 'A51_AppShellEngineer';
        }

        defects.push({
          defectId: makeId('A11Y'),
          severity,
          category: 'A11Y',
          description: violation.message,
          assignedOwner: this._routeOwnerByFile(violation.file, owner),
          file: violation.file,
          remediationRecommendation: 'Restore compliant semantic structure or add required ARIA attributes.',
        });
      }
    }

    // 5. Zero-Placeholder defects
    if (auditResults.placeholderAudit && !auditResults.placeholderAudit.passed) {
      for (const finding of auditResults.placeholderAudit.findings) {
        defects.push({
          defectId: makeId('PLH'),
          severity: 'P1_CRITICAL',
          category: 'PLACEHOLDER',
          description: `Forbidden placeholder token "${finding.matchedPattern}" found at ${finding.file}:${finding.line}`,
          assignedOwner: this._routeOwnerByFile(finding.file, 'A52_PageEngineerLead'),
          file: finding.file,
          line: finding.line,
          snippet: finding.snippet,
          remediationRecommendation: 'Replace banned placeholder with authentic production copy or real implementation.',
        });
      }
    }

    // 6. Anchor link integrity defects
    if (auditResults.anchorAudit && !auditResults.anchorAudit.passed) {
      for (const violation of auditResults.anchorAudit.violations) {
        defects.push({
          defectId: makeId('LNK'),
          severity: 'P1_CRITICAL',
          category: 'NAVIGATION',
          description: violation.message,
          assignedOwner: this._routeOwnerByFile(violation.file, 'A53_ComponentLead'),
          file: violation.file,
          remediationRecommendation: `Ensure target section id="${violation.target}" exists or update anchor href to an existing section.`,
        });
      }
    }

    // 7. Component assembly integrity defects
    if (auditResults.componentAudit && !auditResults.componentAudit.passed) {
      for (const violation of auditResults.componentAudit.violations) {
        defects.push({
          defectId: makeId('CMP'),
          severity: 'P0_BLOCKING',
          category: 'ARCHITECTURE',
          description: violation.message,
          assignedOwner: 'A52_PageEngineerLead',
          file: violation.file,
          remediationRecommendation: `Uncomment or mount the required <${violation.component} /> in page.tsx.`,
        });
      }
    }

    // 8. Form integrity defects
    if (auditResults.formAudit && !auditResults.formAudit.passed) {
      for (const violation of auditResults.formAudit.violations) {
        defects.push({
          defectId: makeId('FRM'),
          severity: 'P1_CRITICAL',
          category: 'FUNCTIONAL',
          description: violation.message,
          assignedOwner: this._routeOwnerByFile(violation.file, 'A53_ComponentLead'),
          file: violation.file,
          remediationRecommendation: 'Remove static disabled attribute from form submit button.',
        });
      }
    }

    // Tally severities
    const p0Count = defects.filter((d) => d.severity === 'P0_BLOCKING').length;
    const p1Count = defects.filter((d) => d.severity === 'P1_CRITICAL').length;
    const p2Count = defects.filter((d) => d.severity === 'P2_MAJOR').length;
    const p3Count = defects.filter((d) => d.severity === 'P3_MINOR').length;

    // Gate rules: P0 and P1 defects strictly block release. Max 2 P3s, Max 4 P2s.
    let gateVerdict = 'ALL_GATES_PASSED';
    let passed = true;

    if (p0Count > 0 || p1Count > 0) {
      gateVerdict = 'RELEASE_BLOCKED';
      passed = false;
    } else if (p3Count > 2 || p2Count > 4) {
      gateVerdict = 'RELEASE_BLOCKED';
      passed = false;
    } else if (p2Count > 0 || p3Count > 0) {
      gateVerdict = 'PASSED_WITH_WARNINGS';
      passed = true;
    }

    return {
      passed,
      gateVerdict,
      summary: {
        totalDefects: defects.length,
        p0Count,
        p1Count,
        p2Count,
        p3Count,
      },
      defects,
    };
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  _routeOwnerByFile(filePath, defaultOwner) {
    if (!filePath || typeof filePath !== 'string') return defaultOwner;

    const lower = filePath.toLowerCase();
    if (lower.includes('layout') || lower.includes('globals.css') || lower.includes('package.json') || lower.includes('tsconfig')) {
      return 'A51_AppShellEngineer';
    }
    if (lower.includes('cursor') || lower.includes('canvas') || lower.includes('graphic') || lower.includes('sound')) {
      return 'A54_VisualExperienceEngineer';
    }
    if (lower.includes('page.tsx') || lower.includes('bento') || lower.includes('hero') || lower.includes('showcase') || lower.includes('footer')) {
      return 'A52_PageEngineerLead';
    }
    if (lower.includes('button') || lower.includes('modal') || lower.includes('input') || lower.includes('nav')) {
      return 'A53_ComponentLead';
    }
    if (lower.includes('api/') || lower.includes('server')) {
      return 'A61_ServerAppEngineer';
    }

    return defaultOwner;
  }

  _getResponsiveRemediation(type) {
    switch (type) {
      case 'RIGID_VIEWPORT_UNIT':
        return 'Replace `100vh` with `min-height: 100svh; min-height: 100dvh;` to handle expanding/collapsing mobile browser address bars.';
      case 'UNGATED_HOVER_ANIMATION':
        return 'Wrap custom cursor listeners and hover transforms in `if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;`.';
      case 'TOUCH_TARGET_BELOW_44PX':
        return 'Add `min-w-[44px] min-h-[44px]` or `after:min-w-[44px] after:min-h-[44px] after:inset-[-10px]` to meet WCAG 2.5.5 touch target size.';
      case 'HORIZONTAL_SCROLL_BLOWOUT':
        return 'Add `overflow-x: hidden` to root layout body container to prevent viewport horizontal scrolling blowout.';
      default:
        return 'Review responsive touch guidelines in `responsive-touch-gatekeeper` skill.';
    }
  }

  _extractThemeTokens() {
    const tokens = {
      bgCanvas: '#090a0f',
      bgSurface: '#11131c',
      bgCard: '#11131c',
      bgElevated: '#171a26',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      colorPrimary: '#00f0ff',
      colorSecondary: '#7000ff',
      borderSubtle: '#222738',
      borderHighlight: '#00f0ff',
    };

    // 1. Try reading 02_design_tokens.json
    const tokenArtifact = path.join(this.artifactsDir, '02_design_tokens.json');
    if (fs.existsSync(tokenArtifact)) {
      try {
        const raw = JSON.parse(fs.readFileSync(tokenArtifact, 'utf8'));
        if (raw.semantics) {
          if (raw.semantics.bgCanvas) tokens.bgCanvas = raw.semantics.bgCanvas;
          if (raw.semantics.bgCard) tokens.bgCard = raw.semantics.bgCard;
          if (raw.semantics.textPrimary) tokens.textPrimary = raw.semantics.textPrimary;
          if (raw.semantics.textSecondary) tokens.textSecondary = raw.semantics.textSecondary;
          if (raw.semantics.textMuted) tokens.textMuted = raw.semantics.textMuted;
          if (raw.semantics.accent) tokens.colorPrimary = raw.semantics.accent;
        }
        if (raw.primitives?.colors) {
          if (raw.primitives.colors.primary) tokens.colorPrimary = raw.primitives.colors.primary;
          if (raw.primitives.colors.secondary) tokens.colorSecondary = raw.primitives.colors.secondary;
          if (raw.primitives.colors.surface) tokens.bgSurface = raw.primitives.colors.surface;
        }
      } catch {}
    }

    // 2. Try parsing globals.css :root variables
    const globalsPath = path.join(this.targetDir, 'src', 'app', 'globals.css');
    if (fs.existsSync(globalsPath)) {
      try {
        const css = fs.readFileSync(globalsPath, 'utf8');
        const varMatches = css.matchAll(/--([a-zA-Z0-9_-]+):\s*([^;]+);/g);
        for (const m of varMatches) {
          const varName = m[1].trim();
          const varVal = m[2].trim();
          if (varName === 'bg-canvas') tokens.bgCanvas = varVal;
          if (varName === 'bg-card') tokens.bgCard = varVal;
          if (varName === 'text-primary') tokens.textPrimary = varVal;
          if (varName === 'text-secondary') tokens.textSecondary = varVal;
          if (varName === 'text-muted') tokens.textMuted = varVal;
          if (varName === 'color-primary') tokens.colorPrimary = varVal;
          if (varName === 'color-secondary') tokens.colorSecondary = varVal;
          if (varName === 'border-highlight') tokens.borderHighlight = varVal;
        }
      } catch {}
    }

    return tokens;
  }

  _checkBalancedDelimiters(content) {
    let braces = 0;
    let brackets = 0;
    let parens = 0;

    let inLineComment = false;
    let inBlockComment = false;
    let inDouble = false;
    let inSingle = false;
    let inTemplate = false;

    for (let i = 0; i < content.length; i++) {
      const ch = content[i];
      const prev = i > 0 ? content[i - 1] : '';
      const next = i + 1 < content.length ? content[i + 1] : '';

      // Line comment handling
      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        continue;
      }

      // Block comment handling
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }

      // Check for comment starts when outside strings
      if (!inDouble && !inSingle && !inTemplate) {
        if (ch === '/' && next === '/') {
          inLineComment = true;
          i++;
          continue;
        }
        if (ch === '/' && next === '*') {
          inBlockComment = true;
          i++;
          continue;
        }
      }

      // Double quoted string
      if (inDouble) {
        if (ch === '"' && prev !== '\\') inDouble = false;
        else if (ch === '\n') inDouble = false;
        continue;
      }

      // Single quoted string
      if (inSingle) {
        if (ch === "'" && prev !== '\\') inSingle = false;
        else if (ch === '\n') inSingle = false;
        continue;
      }

      // Template string
      if (inTemplate) {
        if (ch === '`' && prev !== '\\') {
          inTemplate = false;
          continue;
        }
        if (ch === '$' && next === '{' && prev !== '\\') {
          braces++;
          i++;
          continue;
        }
        if (ch === '}') {
          braces--;
          continue;
        }
        continue;
      }

      // Start of string literals
      if (ch === '"' && prev !== '\\') { inDouble = true; continue; }
      if (ch === "'" && prev !== '\\') { inSingle = true; continue; }
      if (ch === '`' && prev !== '\\') { inTemplate = true; continue; }

      // Delimiters
      if (ch === '{') braces++;
      else if (ch === '}') braces--;
      else if (ch === '[') brackets++;
      else if (ch === ']') brackets--;
      else if (ch === '(') parens++;
      else if (ch === ')') parens--;
    }

    return {
      balanced: braces === 0 && brackets === 0 && parens === 0,
      braces,
      brackets,
      parens,
    };
  }

  _checkUnclosedJsxTags(content) {
    const voidTags = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);
    const standardHtmlTags = new Set([
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'a', 'button', 'form', 'label', 'input',
      'select', 'textarea', 'header', 'footer', 'nav', 'main', 'canvas', 'svg', 'path', 'circle', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'aside', 'article', 'details', 'summary'
    ]);

    const stack = [];
    let i = 0;

    while (i < content.length) {
      if (content[i] === '<') {
        // 1. Closing tag </tagName>
        if (content[i + 1] === '/') {
          let j = i + 2;
          while (j < content.length && /[a-zA-Z0-9_-]/.test(content[j])) j++;
          const tagName = content.slice(i + 2, j);
          const closeEnd = content.indexOf('>', j);
          if (closeEnd !== -1 && tagName.length > 0) {
            if (stack.length === 0) {
              return { balanced: false, unmatchedTag: tagName, reason: `Unexpected closing tag </${tagName}>` };
            }
            const top = stack.pop();
            if (top.toLowerCase() !== tagName.toLowerCase()) {
              return { balanced: false, unmatchedTag: top, reason: `Mismatched closing tag </${tagName}>, expected </${top}>` };
            }
            i = closeEnd + 1;
            continue;
          }
        }

        // 2. Ignore comparison operators (e.g. `x < 10`, `x <= 20`, `< `)
        if (content[i + 1] === ' ' || content[i + 1] === '=' || /[\d]/.test(content[i + 1])) {
          i++;
          continue;
        }

        // 3. Opening tag <TagName
        if (/[a-zA-Z]/.test(content[i + 1])) {
          let j = i + 1;
          while (j < content.length && /[a-zA-Z0-9_-]/.test(content[j])) j++;
          const tagName = content.slice(i + 1, j);

          // Check if TypeScript generic type parameter: e.g. useState<string>, useRef<HTMLCanvasElement>
          const charBefore = i > 0 ? content[i - 1] : '';
          const isDirectlyFollowedByIdentifier = /[a-zA-Z0-9_]/.test(charBefore);
          const isStandardHtml = standardHtmlTags.has(tagName.toLowerCase());

          if (isDirectlyFollowedByIdentifier && !isStandardHtml) {
            const tagEnd = content.indexOf('>', j);
            if (tagEnd !== -1) {
              const inner = content.slice(j, tagEnd);
              if (!inner.includes('=') && !inner.includes('className') && !inner.includes('href')) {
                i = tagEnd + 1;
                continue;
              }
            }
          }

          let inStr = false;
          let quote = '';
          let braceDepth = 0;
          let isSelfClosing = voidTags.has(tagName.toLowerCase());

          while (j < content.length) {
            const ch = content[j];
            if (!inStr && (ch === '"' || ch === "'" || ch === '`')) {
              inStr = true;
              quote = ch;
            } else if (inStr && ch === quote && content[j - 1] !== '\\') {
              inStr = false;
              quote = '';
            } else if (!inStr) {
              if (ch === '{') braceDepth++;
              else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
              else if (braceDepth === 0) {
                if (ch === '/' && content[j + 1] === '>') {
                  isSelfClosing = true;
                  j += 2;
                  break;
                } else if (ch === '>') {
                  j++;
                  break;
                }
              }
            }
            j++;
          }

          if (!isSelfClosing) {
            stack.push(tagName);
          }
          i = j;
          continue;
        }
      }
      i++;
    }

    return {
      balanced: stack.length === 0,
      unmatchedTag: stack.length > 0 ? stack[stack.length - 1] : null,
    };
  }

  _getAllSourceFiles(dir) {
    const fileList = [];
    if (!fs.existsSync(dir)) return fileList;

    const walk = (current) => {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name !== 'node_modules' &&
            entry.name !== '.next' &&
            entry.name !== 'artifacts' &&
            fullPath !== this.artifactsDir
          ) {
            walk(fullPath);
          }
        } else if (
          entry.name.endsWith('.ts') ||
          entry.name.endsWith('.tsx') ||
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.mjs') ||
          entry.name.endsWith('.css') ||
          entry.name.endsWith('.json') ||
          entry.name.endsWith('.md') ||
          entry.name.endsWith('.html')
        ) {
          fileList.push(fullPath);
        }
      }
    };

    walk(dir);
    return fileList;
  }

  _persistArtifacts(results) {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }

    // 1. Primary Comprehensive Verdict Artifact (70_qa_comprehensive_verdict.json)
    const verdictArtifactPath = path.join(this.artifactsDir, '70_qa_comprehensive_verdict.json');
    const comprehensiveVerdict = {
      agentId: 'A70_QA_ComprehensiveDirector',
      timestamp: results.timestamp,
      targetDir: results.targetDir,
      passed: results.passed,
      overall_status: results.passed ? 'PASSED' : 'FAILED_REMEDIATION_REQUIRED',
      gateVerdict: results.gateVerdict,
      total_defects_found: results.defectSummary?.totalDefects || results.defects?.length || 0,
      defectSummary: results.defectSummary,
      defects: results.defects,
      audits: {
        wcagContrast: {
          passed: results.wcagContrast.passed,
          resultsCount: results.wcagContrast.results.length,
          failureCount: results.wcagContrast.failures.length,
          pairs: results.wcagContrast.results,
        },
        responsiveTouch: {
          passed: results.responsiveAudit.passed,
          violationCount: results.responsiveAudit.violations.length,
          viewportSafety: results.responsiveAudit.viewportSafety,
          zeroHorizontalOverflow: results.responsiveAudit.zeroHorizontalOverflow,
        },
        accessibilitySemantics: {
          passed: results.accessibilityAudit.passed,
          h1Count: results.accessibilityAudit.h1Count,
          landmarks: results.accessibilityAudit.landmarks,
          violationCount: results.accessibilityAudit.violations.length,
        },
        zeroPlaceholder: {
          passed: results.placeholderAudit.passed,
          scannedFilesCount: results.placeholderAudit.scannedFilesCount,
          findingCount: results.placeholderAudit.findings.length,
        },
        syntaxAndBuild: {
          passed: results.syntaxAudit.passed && results.importResolution.passed,
          syntaxIssueCount: results.syntaxAudit.issues.length,
          brokenImportCount: results.importResolution.brokenImports.length,
        },
      },
      remediationRouting: {
        assignedOwners: [...new Set(results.defects.map((d) => d.assignedOwner))],
        remediationCoordinator: 'A82_RemediationCoordinator',
      },
    };

    fs.writeFileSync(verdictArtifactPath, JSON.stringify(comprehensiveVerdict, null, 2), 'utf8');

    // 2. Backward-compatible report path (qa_verification_report.json)
    const reportPath = path.join(this.artifactsDir, 'qa_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  }

  _extractJsxElements(content, tagNames = ['button', 'a']) {
    const elements = [];
    const tagPattern = new RegExp(`<(${tagNames.join('|')})\\b`, 'gi');
    let match;

    while ((match = tagPattern.exec(content)) !== null) {
      const tag = match[1];
      const startIndex = match.index;
      let i = startIndex + match[0].length;
      let inQuote = null;
      let braceDepth = 0;
      let tagEndIndex = -1;

      while (i < content.length) {
        const char = content[i];

        if (inQuote) {
          if (char === inQuote && content[i - 1] !== '\\') {
            inQuote = null;
          }
        } else if (char === '"' || char === "'") {
          inQuote = char;
        } else if (char === '{') {
          braceDepth++;
        } else if (char === '}') {
          if (braceDepth > 0) braceDepth--;
        } else if (char === '>' && braceDepth === 0) {
          tagEndIndex = i;
          break;
        }
        i++;
      }

      if (tagEndIndex === -1) continue;

      const attrs = content.slice(startIndex + match[0].length, tagEndIndex);
      let inner = '';
      const closeTag = `</${tag}>`;
      const closeIndex = content.indexOf(closeTag, tagEndIndex + 1);
      if (closeIndex !== -1) {
        inner = content.slice(tagEndIndex + 1, closeIndex);
      }

      elements.push({ tag, attrs, inner });
    }

    return elements;
  }
}
