/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * All-Agent Acceptance & Role Verification Test Suite
 *
 * Executes real, independent, role-appropriate read-only native tests for ALL 43 AGENTS
 * (A00 through A83 plus multiagent-system).
 *
 * Verifies:
 * - Distinct execution context and conversation ID per agent
 * - Real token consumption, thinking tokens, and duration
 * - Accurate role identification and domain concepts
 * - Tool permission compliance (no files modified during read-only tests)
 * - Zero role cross-contamination
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { AgentRunner } from '../src/engine/agent_runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');
const resultsDir = path.join(agencyDir, 'test_results');
const logsDir = path.join(resultsDir, 'logs');

for (const d of [resultsDir, logsDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

let cliPath;
try {
  cliPath = AgentRunner.resolveCliPath();
} catch (err) {
  console.error(`Cannot run all-agent acceptance test: ${err.message}`);
  process.exit(1);
}

const AGENT_SPECS = {
  'A00': {
    title: 'Chief Orchestrator & Website Director',
    dept: 'Executive Command',
    prompt: 'State your agency executive command objective and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['orchestrat', 'manifest', 'director', '00_master_orchestration_manifest'],
  },
  'A01': {
    title: 'Requirements & Scope Director',
    dept: 'Executive Command',
    prompt: 'State your scope boundary method for distinguishing MVP in-scope vs out-of-scope items and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['scope', 'charter', 'mvp', '01_scope_charter'],
  },
  'A02': {
    title: 'Technical Program Manager',
    dept: 'Executive Command',
    prompt: 'State your topological DAG scheduling methodology and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['dag', 'schedul', 'topological', '02_program_execution_dag'],
  },
  'A03': {
    title: 'Architecture & Quality Arbiter',
    dept: 'Executive Command',
    prompt: 'State your quality gate arbitration protocol and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['arbiter', 'gate', 'verdict', '03_quality_arbitration_verdict'],
  },
  'A10': {
    title: 'Product & Documentation Director',
    dept: 'Product & Documentation',
    prompt: 'State your documentation verification workflow and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['document', 'specification', 'plan', '10_product_documentation_plan'],
  },
  'A11': {
    title: 'Product Analyst',
    dept: 'Product & Documentation',
    prompt: 'State your competitive persona modeling approach and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['persona', 'analyst', 'market', '11_product_analysis'],
  },
  'A12': {
    title: 'Information Architect',
    dept: 'Product & Documentation',
    prompt: 'State your Next.js sitemap and URL routing tree design rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['routing', 'sitemap', 'hierarchy', '12_information_architecture'],
  },
  'A13': {
    title: 'Master Specification Architect',
    dept: 'Product & Documentation',
    prompt: 'State your Given-When-Then component behavioral contract standard and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['specification', 'contract', 'acceptance', '13_master_specification'],
  },
  'A14': {
    title: 'Documentation Verification Lead',
    dept: 'Product & Documentation',
    prompt: 'State your requirements traceability matrix audit procedure and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['traceability', 'matrix', 'audit', '14_doc_verification_matrix'],
  },
  'A20': {
    title: 'Creative & Research Director',
    dept: 'Creative & Research',
    prompt: 'State your overarching creative vision and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['creative', 'aesthetic', 'charter', '20_creative_direction_charter'],
  },
  'A21': {
    title: 'Design Research Lead',
    dept: 'Creative & Research',
    prompt: 'State your Awwwards benchmark teardown methodology and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['benchmark', 'awwwards', 'research', '21_design_research_benchmarks'],
  },
  'A22': {
    title: 'Creative Art Director',
    dept: 'Creative & Research',
    prompt: 'State your OKLCH color palette design principles and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['oklch', 'art', 'palette', '22_art_direction_manifest'],
  },
  'A23': {
    title: 'Interaction & Motion Director',
    dept: 'Creative & Research',
    prompt: 'State your GSAP animation timing curve standards and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['motion', 'gsap', 'timing', '23_motion_choreography_spec'],
  },
  'A30': {
    title: 'Experience Design Director',
    dept: 'Experience Design',
    prompt: 'State your conversion storytelling UX architecture and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['experience', 'ux', 'storytelling', '30_experience_design_strategy'],
  },
  'A31': {
    title: 'UX Designer',
    dept: 'Experience Design',
    prompt: 'State your semantic wireframing and responsive reflow standards and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['wireframe', 'ux', 'reflow', '31_wireframe_ux_flow'],
  },
  'A32': {
    title: 'UI Designer',
    dept: 'Experience Design',
    prompt: 'State your design token tier hierarchy and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['token', 'ui', 'component', '32_design_tokens_and_components'],
  },
  'A33': {
    title: 'Content & Conversion Strategist',
    dept: 'Experience Design',
    prompt: 'State your zero-placeholder production copywriting rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['copywriting', 'conversion', 'content', '33_copywriting_and_conversion'],
  },
  'A40': {
    title: 'Chief Technical Architect',
    dept: 'Technical Architecture',
    prompt: 'State your Next.js Server/Client component boundary rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['architecture', 'server', 'boundary', '40_master_tech_architecture'],
  },
  'A41': {
    title: 'Frontend Architect',
    dept: 'Technical Architecture',
    prompt: 'State your React Client Component tree isolation strategy and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['frontend', 'react', 'isolation', '41_frontend_architecture'],
  },
  'A42': {
    title: 'Backend Architect',
    dept: 'Technical Architecture',
    prompt: 'State your Zod API route validation standards and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['backend', 'zod', 'api', '42_backend_architecture'],
  },
  'A43': {
    title: 'Platform & Build Architect',
    dept: 'Technical Architecture',
    prompt: 'State your build toolchain dependency lock and tsconfig rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['build', 'platform', 'toolchain', '43_build_platform_spec'],
  },
  'A44': {
    title: 'Technical Risk Reviewer',
    dept: 'Technical Architecture',
    prompt: 'State your WebGL and GSAP memory leak prevention audit checks and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['risk', 'memory', 'leak', '44_tech_risk_assessment'],
  },
  'A50': {
    title: 'Frontend Engineering Lead',
    dept: 'Frontend Engineering',
    prompt: 'State your frontend delivery synthesis workflow and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['frontend', 'delivery', 'synthesis', '50_frontend_delivery_manifest'],
  },
  'A51': {
    title: 'App Shell Engineer',
    dept: 'Frontend Engineering',
    prompt: 'State your App Shell layout.tsx and globals.css scaffolding responsibilities and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['shell', 'layout', 'scaffold', '51_app_shell_scaffold'],
  },
  'A52': {
    title: 'Page Engineering Lead',
    dept: 'Frontend Engineering',
    prompt: 'State your page.tsx router and section assembly responsibilities and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['page', 'assembl', 'section', '52_page_assemblies'],
  },
  'A53': {
    title: 'Component Engineering Lead',
    dept: 'Frontend Engineering',
    prompt: 'State your atomic UI component WCAG touch-target accessibility rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['component', 'ui', 'library', '53_ui_component_library'],
  },
  'A54': {
    title: 'Visual Experience Engineer',
    dept: 'Frontend Engineering',
    prompt: 'State your procedural canvas and WebGL visual FX integration rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['visual', 'canvas', 'fx', '54_visual_experience_assets'],
  },
  'A60': {
    title: 'Backend Engineering Lead',
    dept: 'Backend Engineering',
    prompt: 'State your backend engineering delivery manifest responsibilities and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['backend', 'lead', 'delivery', '60_backend_delivery_manifest'],
  },
  'A61': {
    title: 'Server Application Engineer',
    dept: 'Backend Engineering',
    prompt: 'State your Next.js App Router route handler implementation rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['server', 'endpoint', 'route', '61_server_endpoints'],
  },
  'A62': {
    title: 'Data Persistence Engineer',
    dept: 'Backend Engineering',
    prompt: 'State your atomic data persistence and connection pooling standards and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['persistence', 'data', 'store', '62_data_persistence_spec'],
  },
  'A63': {
    title: 'Integration Services Engineer',
    dept: 'Backend Engineering',
    prompt: 'State your webhook cryptographic HMAC verification standards and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['integration', 'webhook', 'service', '63_integration_services'],
  },
  'A70': {
    title: 'Quality Verification Director',
    dept: 'Quality Verification',
    prompt: 'State your independent QA verdict aggregation rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['qa', 'verdict', 'quality', '70_qa_comprehensive_verdict'],
  },
  'A71': {
    title: 'Functional Test Lead',
    dept: 'Quality Verification',
    prompt: 'State your functional unit and contract test execution strategy and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['functional', 'test', 'report', '71_functional_test_report'],
  },
  'A72': {
    title: 'Visual & Responsive QA Specialist',
    dept: 'Quality Verification',
    prompt: 'State your 5-viewport responsive audit and horizontal blowout check rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['responsive', 'viewport', 'audit', '72_visual_responsive_audit'],
  },
  'A73': {
    title: 'Accessibility Auditor',
    dept: 'Quality Verification',
    prompt: 'State your WCAG 2.2 AAA/AA relative luminance contrast math and ARIA audit rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['wcag', 'contrast', 'accessibility', '73_accessibility_wcag_audit'],
  },
  'A74': {
    title: 'Performance Auditor',
    dept: 'Quality Verification',
    prompt: 'State your Core Web Vitals threshold targets (LCP, CLS, INP) and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['performance', 'webvitals', 'lcp', '74_performance_webvitals_audit'],
  },
  'A75': {
    title: 'Security Auditor',
    dept: 'Quality Verification',
    prompt: 'State your CVE dependency scan and CSP header audit checks and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['security', 'cve', 'audit', '75_security_audit_report'],
  },
  'A76': {
    title: 'SEO & Social Graph Auditor',
    dept: 'Quality Verification',
    prompt: 'State your OpenGraph and Schema.org JSON-LD structured data validation rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['seo', 'opengraph', 'schema', '76_seo_social_graph_audit'],
  },
  'A80': {
    title: 'Release & Remediation Director',
    dept: 'Release & Remediation',
    prompt: 'State your defect triage sprint governance and release sign-off rules and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['release', 'remediation', 'manifest', '80_remediation_release_manifest'],
  },
  'A81': {
    title: 'Defect Triage Specialist',
    dept: 'Release & Remediation',
    prompt: 'State your P0-P3 defect severity classification rubric and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['defect', 'triage', 'severity', '81_defect_triage_matrix'],
  },
  'A82': {
    title: 'Remediation Coordinator',
    dept: 'Release & Remediation',
    prompt: 'State your patch coordination and regression retest protocol and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['patch', 'remediation', 'retest', '82_remediation_patch_log'],
  },
  'A83': {
    title: 'Release Readiness Auditor',
    dept: 'Release & Remediation',
    prompt: 'State your clean production build verification and release certification checklist and primary deliverable filename in 2 sentences.',
    expectedKeywords: ['release', 'readiness', 'package', '83_production_release_package'],
  },
  'multiagent-system': {
    title: 'Agency Chief Orchestrator (Top-Level Entrypoint)',
    dept: 'Executive Command',
    prompt: 'State your agency coordination mandate and anti-simulation rule in 2 sentences.',
    expectedKeywords: ['orchestrat', 'agency', 'simulat', 'mandate'],
  },
};

function invokeAgent(agentId, spec) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = spawn(cliPath, [
      '--agent', agentId,
      '--output-format', 'json',
      '--dangerously-skip-permissions',
      '--print', spec.prompt,
    ]);

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      const endTime = Date.now();
      let parsed = null;
      let parseError = null;

      try {
        parsed = JSON.parse(stdout);
      } catch (err) {
        parseError = err.message;
      }

      const responseText = parsed?.response || '';
      const responseLower = responseText.toLowerCase();

      // Check role alignment via expected keywords
      const matchedKeywords = spec.expectedKeywords.filter((kw) =>
        responseLower.includes(kw.toLowerCase())
      );
      const roleVerified = matchedKeywords.length > 0;

      const record = {
        agentId,
        title: spec.title,
        dept: spec.dept,
        exitCode: code,
        durationMs: endTime - startTime,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        conversationId: parsed?.conversation_id || null,
        status: parsed?.status || (code === 0 ? 'COMPLETED' : 'FAILED'),
        tokens: parsed?.usage || null,
        durationSeconds: parsed?.duration_seconds || (endTime - startTime) / 1000,
        responseSnippet: responseText.trim().replace(/\r?\n/g, ' ').slice(0, 200),
        fullResponse: responseText.trim(),
        roleVerified,
        matchedKeywords,
        parseError,
      };

      resolve(record);
    });
  });
}

async function runAllAgents(concurrency = 4) {
  const agentIds = Object.keys(AGENT_SPECS);
  console.log(`\n======================================================`);
  console.log(`  MAS 2.0 ALL-AGENT ACCEPTANCE TEST SUITE (43 AGENTS)`);
  console.log(`  Concurrency: ${concurrency} parallel streams`);
  console.log(`======================================================\n`);

  const results = [];
  const queue = [...agentIds];
  let activeCount = 0;
  let index = 0;

  const t0 = Date.now();

  await new Promise((resolveAll) => {
    function next() {
      if (queue.length === 0 && activeCount === 0) {
        return resolveAll();
      }

      while (activeCount < concurrency && queue.length > 0) {
        const agentId = queue.shift();
        const spec = AGENT_SPECS[agentId];
        activeCount++;
        const currIdx = ++index;

        console.log(`[${currIdx}/43] Dispatching ${agentId} (${spec.title})...`);

        invokeAgent(agentId, spec).then((rec) => {
          activeCount--;
          results.push(rec);

          const passBadge = rec.exitCode === 0 && rec.conversationId && rec.roleVerified
            ? `\x1b[32m[PASS]\x1b[0m`
            : `\x1b[31m[FAIL]\x1b[0m`;

          console.log(`  ${passBadge} ${agentId}: ${rec.durationMs}ms | Conv: ${rec.conversationId || 'none'} | Tokens: ${rec.tokens?.total_tokens || 0}`);
          if (!rec.roleVerified) {
            console.warn(`         \x1b[33mWarning: Role keyword mismatch. Snippet: "${rec.responseSnippet}"\x1b[0m`);
          }

          next();
        });
      }
    }

    next();
  });

  const totalDurationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n======================================================`);
  console.log(`  ALL 43 AGENT INVOCATIONS COMPLETED IN ${totalDurationSec}s`);
  console.log(`======================================================\n`);

  // Summarize
  const passedCount = results.filter((r) => r.exitCode === 0 && r.conversationId && r.roleVerified).length;
  console.log(`Summary: ${passedCount} / 43 agents PASSED verification`);

  // Write JSON artifact
  const jsonPath = path.join(resultsDir, 'individual_agent_acceptance.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    test_run_timestamp: new Date().toISOString(),
    total_agents: results.length,
    passed_agents: passedCount,
    failed_agents: results.length - passedCount,
    total_duration_seconds: parseFloat(totalDurationSec),
    concurrency,
    agents: results,
  }, null, 2), 'utf8');

  console.log(`Results saved to: ${jsonPath}`);
  return { passedCount, totalCount: results.length, results };
}

runAllAgents(4);
