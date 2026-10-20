#!/usr/bin/env node

/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * Single-Prompt Interactive CLI & Orchestration Runner
 *
 * Usage:
 *   node src/cli.js --prompt "Create an award-winning site for..."
 *   node src/cli.js (interactive prompt)
 *   node src/cli.js --build-only
 *   node src/cli.js --validate-only
 */

import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { runOrchestration, WorkflowCoordinator, CodeSynthesizer, QAVerifier, Logger, Colors, Badges } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');

// Parse CLI Arguments
const args = process.argv.slice(2);
let prompt = null;
let concurrency = 6;
let skipQA = false;
let buildOnly = false;
let validateOnly = false;
let useDag = false;
let scope = null;
let phases = null;
let departments = null;
let skipPhases = null;
let allowFallback = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--prompt' || arg === '-p' || arg === '--brief' || arg === '-b') {
    prompt = args[++i];
  } else if (arg === '--concurrency' || arg === '-c') {
    concurrency = parseInt(args[++i], 10) || 6;
  } else if (arg === '--allow-fallback') {
    allowFallback = true;
  } else if (arg === '--skip-qa') {
    skipQA = true;
  } else if (arg === '--build-only') {
    buildOnly = true;
  } else if (arg === '--validate-only') {
    validateOnly = true;
  } else if (arg === '--dag') {
    useDag = true;
  } else if (arg === '--workflow') {
    useDag = false;
  } else if (arg === '--scope' || arg === '-s') {
    scope = args[++i];
  } else if (arg === '--phases' || arg === '-ph') {
    const raw = args[++i] || '';
    phases = raw.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
  } else if (arg === '--departments' || arg === '-d') {
    const raw = args[++i] || '';
    departments = raw.split(',').map((d) => d.trim()).filter(Boolean);
  } else if (arg === '--skip-phases') {
    const raw = args[++i] || '';
    skipPhases = raw.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
  } else if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
}

function printHelp() {
  Logger.banner();
  console.log(`
${Colors.bold}USAGE:${Colors.reset}
  node src/cli.js [options]

${Colors.bold}OPTIONS:${Colors.reset}
  -p, --prompt <text>         Website vision prompt to orchestrate
  -c, --concurrency <num>     Max concurrent agents in parallel branches (default: 6)
  -s, --scope <name>          Detached execution scope (design_only, docs_only, architecture_only, code_only, qa_only, remediation_only)
  -ph, --phases <list>        Specific phases to run in detached mode (e.g. "1,2" or "4")
  -d, --departments <list>    Specific departments to execute (e.g. "creative_research,experience_design")
      --skip-phases <list>    Specific phases to cleanly skip (e.g. "5,6")
      --skip-qa               Skip post-synthesis automated verification
      --allow-fallback        Allow synthetic fallback when Antigravity CLI is unavailable
      --build-only            Assemble website directly from existing artifacts
      --validate-only         Execute QA verification suite on existing website
  -h, --help                  Show this help message

${Colors.bold}EXAMPLES:${Colors.reset}
  node src/cli.js --prompt "Create an award-winning site for Studio Synthetix with kinetic canvas"
  node src/cli.js --prompt "Create an ultra-luxury neuro-tech platform" --scope design_only
  node src/cli.js --prompt "Portfolio site" --phases 1,2
  node src/cli.js --validate-only
`);
}

async function askPromptInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `\n${Colors.brightCyan}${Colors.bold}Enter your website vision prompt:${Colors.reset} `,
      (answer) => {
        rl.close();
        resolve(answer.trim());
      }
    );
  });
}

async function main() {
  Logger.banner();

  // Validate Only Mode
  if (validateOnly) {
    Logger.info('Running QA Verification Suite on synthesized website...');
    const verifier = new QAVerifier({ agencyDir });
    const qaResults = await verifier.runAllChecks();
    printQaSummary(qaResults);
    process.exit(qaResults.passed ? 0 : 1);
  }

  // Build Only Mode
  if (buildOnly) {
    Logger.info('Synthesizing Next.js 15 website from existing artifacts...');
    const synthesizer = new CodeSynthesizer({ agencyDir });
    const briefArtifactPath = path.join(agencyDir, 'workspace', 'artifacts', '00_executive_brief.json');
    let briefData = {};
    try {
      const fs = await import('fs');
      if (fs.existsSync(briefArtifactPath)) {
        briefData = JSON.parse(fs.readFileSync(briefArtifactPath, 'utf8'));
      }
    } catch {}
    const synthResult = await synthesizer.synthesize(briefData);
    Logger.success(`Synthesized ${synthResult.fileCount} production files in: ${synthResult.outputDir}`);
    printNextSteps(synthResult.brandName);
    process.exit(0);
  }

  // Single-Prompt intake
  if (!prompt) {
    prompt = await askPromptInteractive();
  }

  if (!prompt) {
    prompt = 'Create an award-winning portfolio for a generative AI architecture studio named Studio Synthetix, featuring kinetic typography, dark oklch palette, interactive canvas shader, and smooth Lenis scrolling.';
    Logger.info(`No prompt supplied. Using benchmark reference:\n"${Colors.italic}${prompt}${Colors.reset}"`);
  } else {
    Logger.info(`Intake prompt accepted:\n"${Colors.bold}${prompt}${Colors.reset}"`);
  }

  if (useDag) {
    console.log(`\n${Colors.dim}Initializing ZadRow Multi-Agent DAG Orchestrator with concurrency limit: ${concurrency}${Colors.reset}\n`);

    // Initialize Orchestration
    const { dag, agentRunner } = await runOrchestration(prompt, {
      agencyDir,
      concurrency,
      skipQA,
      allowFallback,
    });

    let currentTier = -1;

    // Real-time DAG Event Telemetry
    dag.on('dag:start', ({ totalNodes }) => {
      Logger.info(`DAG compilation verified: ${totalNodes} atomic agent nodes registered.`);
    });

    dag.on('node:start', ({ node }) => {
      if (node.tier !== currentTier) {
        currentTier = node.tier;
        const tierDescriptions = [
          'Executive Intake & Strategic Scope Framing',
          'Creative Direction, Information Architecture & Brand Voice',
          'System Architecture, Design Tokens & Motion Choreography',
          'Core App Shell Scaffolding & Kinetic React 19 Components',
          'Sub-Agent Micro-Interactions & Procedural Vector Assets',
          'Automated WCAG 2.2 AAA Audit & Delivery Release',
        ];
        Logger.tier(`Tier ${currentTier}`, tierDescriptions[currentTier] || '');
      }
      console.log(`  ${Badges.RUNNING} ${Colors.bold}${node.id.padEnd(25)}${Colors.reset} ${Colors.dim}[${node.name}]${Colors.reset}`);
    });

    dag.on('node:complete', ({ node, durationMs, result }) => {
      const durStr = `${durationMs}ms`.padStart(7);
      const artStr = node.primaryArtifact ? `-> ${node.primaryArtifact}` : '';
      console.log(`  ${Badges.COMPLETED} ${Colors.brightGreen}${node.id.padEnd(25)}${Colors.reset} ${Colors.cyan}(${durStr})${Colors.reset} ${Colors.dim}${artStr}${Colors.reset}`);
    });

    dag.on('node:fail', ({ node, error }) => {
      console.error(`  ${Badges.FAILED} ${node.id}: ${error.message}`);
    });

    // Execute the DAG
    const summary = await dag.run();

    // Print Summary Timeline Table
    Logger.summaryTable(summary.nodes);

    // Synthesize Complete Website
    Logger.tier('SYNTHESIS', 'Assembling Next.js 15 / React 19 Production Codebase');
    const synthesizer = new CodeSynthesizer({ agencyDir });
    const briefData = dag.context.outputs['E01_BriefAnalyst']?.data || {};
    const synthResult = await synthesizer.synthesize(briefData, dag.context.artifacts);
    Logger.success(`Synthesized ${synthResult.fileCount} clean production files into: ${Colors.bold}${synthResult.outputDir}${Colors.reset}`);

    // Automated QA Verification Engine
    if (!skipQA) {
      Logger.tier('QA AUDIT', 'Automated Mathematical WCAG, Placeholder & Import Verifications');
      const verifier = new QAVerifier({ agencyDir });
      const qaResults = await verifier.runAllChecks();
      printQaSummary(qaResults);
    }

    // Final Celebration & Quick Start Box
    printNextSteps(synthResult.brandName);
  } else {
    console.log(`\n${Colors.dim}Initializing AURA Multi-Agent 7-Phase Workflow Pipeline (42 Agents across 9 Departments)${Colors.reset}\n`);

    const coordinator = new WorkflowCoordinator({ agencyDir, allowFallback });

    coordinator.on('phase:start', (data) => {
      Logger.tier(`Phase ${data.phase}`, `${data.name} [${data.agents.join(', ')}]`);
    });

    coordinator.on('phase:skip', (data) => {
      console.log(`  ${Colors.dim}[SKIPPED DETACHED] Phase ${data.phase}: ${data.name} (${data.reason})${Colors.reset}`);
    });

    coordinator.on('gate:evaluate', (data) => {
      const icon = data.passed ? Badges.GATE_PASS : Badges.GATE_FAIL;
      console.log(`  ${icon} Gate Evaluation [${data.gateName}]: ${data.passed ? Colors.brightGreen + 'APPROVED' : Colors.brightRed + 'FAILED'}${Colors.reset}`);
    });

    coordinator.on('remediation:loop', (data) => {
      Logger.warn(`Remediation Cycle ${data.cycle}/${data.maxCycles}: Triaging ${data.defectsCount} defect(s) to implementation owners`);
    });

    await coordinator.run(prompt, { skipQA, scope, phases, departments, skipPhases, allowFallback });
    const brandName = coordinator.projectBrief?.brandName || 'STUDIO SYNTHETIX';

    // In detached mode, only run standalone QA audit if QA phase was active or website was synthesized
    const shouldRunStandaloneQA = !skipQA && (!coordinator.isDetachedMode || coordinator.activePhases.has(5) || coordinator.activePhases.has(4));
    if (shouldRunStandaloneQA) {
      Logger.tier('QA AUDIT', 'Automated Mathematical WCAG, Placeholder & Import Verifications');
      const verifier = new QAVerifier({ agencyDir });
      const qaResults = await verifier.runAllChecks();
      printQaSummary(qaResults);
    }

    printNextSteps(brandName);
  }
}

function printQaSummary(qa) {
  console.log(`\n${Colors.bold}${Colors.brightWhite}--- QA VERIFICATION AUDIT MATRIX ---${Colors.reset}`);

  // WCAG
  console.log(`\n${Colors.bold}1. WCAG 2.2 Mathematical Contrast Verification:${Colors.reset}`);
  for (const r of qa.wcagContrast.results) {
    const badge = r.passAA ? Badges.QA_PASS : Badges.QA_FAIL;
    const ratioStr = `${r.ratio}:1`.padEnd(8);
    const aaStr = r.passAA ? `${Colors.green}AA Pass${Colors.reset}` : `${Colors.red}AA Fail${Colors.reset}`;
    const aaaStr = r.passAAA ? `${Colors.green}AAA Pass${Colors.reset}` : `${Colors.dim}AAA Minor${Colors.reset}`;
    console.log(`   ${badge} ${r.name.padEnd(36)} Ratio: ${Colors.bold}${ratioStr}${Colors.reset} [${aaStr} | ${aaaStr}]`);
  }

  // Placeholders
  console.log(`\n${Colors.bold}2. Placeholder & TODO Token Audit:${Colors.reset}`);
  if (qa.placeholderAudit.passed) {
    console.log(`   ${Badges.QA_PASS} Scanned ${qa.placeholderAudit.scannedFilesCount} files: Zero forbidden tokens found.`);
  } else {
    console.log(`   ${Badges.QA_FAIL} Found ${qa.placeholderAudit.findings.length} forbidden token(s):`);
    for (const f of qa.placeholderAudit.findings) {
      console.log(`     - ${f.file}:${f.line} -> "${f.snippet}"`);
    }
  }

  // Imports
  console.log(`\n${Colors.bold}3. Broken Component Import Audit:${Colors.reset}`);
  if (qa.importResolution.passed) {
    console.log(`   ${Badges.QA_PASS} All internal component & @/* path aliases resolved successfully.`);
  } else {
    console.log(`   ${Badges.QA_FAIL} Detected broken imports:`);
    for (const b of qa.importResolution.brokenImports) {
      console.log(`     - In ${b.file}: cannot resolve "${b.importPath}"`);
    }
  }

  // Syntax
  console.log(`\n${Colors.bold}4. TypeScript Syntax & Structural Integrity:${Colors.reset}`);
  if (qa.syntaxAudit.passed) {
    console.log(`   ${Badges.QA_PASS} All TypeScript component interfaces, braces, and exports valid.`);
  } else {
    console.log(`   ${Badges.QA_FAIL} Syntax issues detected:`);
    for (const issue of qa.syntaxAudit.issues) {
      console.log(`     - ${issue.file}: ${issue.issue}`);
    }
  }
}

function printNextSteps(brandName) {
  const boxWidth = 72;
  const line = '═'.repeat(boxWidth);
  console.log(`\n${Colors.brightCyan}╔${line}╗`);
  console.log(`║${' '.repeat(Math.floor((boxWidth - 58) / 2))}${Colors.bold}${Colors.brightGreen}🎉 AURA EXECUTION COMPLETE: AWWWARDS-READY SITE DELIVERED${Colors.reset}${Colors.brightCyan}${' '.repeat(Math.ceil((boxWidth - 58) / 2))}║`);
  console.log(`╚${line}╝${Colors.reset}\n`);

  console.log(`${Colors.bold}To preview and launch your website locally:${Colors.reset}\n`);
  console.log(`  ${Colors.brightYellow}cd mas_agency/output/website${Colors.reset}`);
  console.log(`  ${Colors.brightYellow}npm install${Colors.reset}`);
  console.log(`  ${Colors.brightYellow}npm run dev${Colors.reset}\n`);
  console.log(`Then open ${Colors.brightCyan}${Colors.underline}http://localhost:3000${Colors.reset} in your browser.\n`);
}

main().catch((err) => {
  Logger.error(`Orchestration execution terminated: ${err.message}`);
  console.error(err);
  process.exit(1);
});
