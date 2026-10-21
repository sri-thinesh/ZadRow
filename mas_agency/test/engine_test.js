/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Comprehensive Systems Engine Test Suite
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DAGRunner, DAGNode } from '../src/engine/dag_runner.js';
import { AgentRunner } from '../src/engine/agent_runner.js';
import { CodeSynthesizer } from '../src/engine/code_synthesizer.js';
import { QAVerifier } from '../src/engine/qa_verifier.js';
import { Logger, Colors } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');

async function testDAGCycleDetection() {
  Logger.info('Testing DAG cycle detection...');
  const dag = new DAGRunner();

  dag.addNode({
    id: 'NodeA',
    tier: 0,
    dependsOn: ['NodeC'],
    execute: async () => ({}),
  });
  dag.addNode({
    id: 'NodeB',
    tier: 1,
    dependsOn: ['NodeA'],
    execute: async () => ({}),
  });
  dag.addNode({
    id: 'NodeC',
    tier: 2,
    dependsOn: ['NodeB'],
    execute: async () => ({}),
  });

  let threw = false;
  try {
    dag.validate();
  } catch (err) {
    threw = true;
    assert(err.message.includes('Cycle detected'), 'Error message should indicate cycle detected');
  }
  assert(threw, 'Validating cyclic DAG should throw an error');
  Logger.success('DAG cycle detection verified.');
}

async function testDAGParallelExecution() {
  Logger.info('Testing DAG parallel execution & barrier joins...');
  const dag = new DAGRunner({ maxConcurrency: 4 });
  const executionOrder = [];

  // Root node
  dag.addNode({
    id: 'root',
    tier: 0,
    dependsOn: [],
    execute: async () => {
      executionOrder.push('root');
      return { val: 'root-out' };
    },
  });

  // Parallel branch 1
  dag.addNode({
    id: 'branch1',
    tier: 1,
    dependsOn: ['root'],
    execute: async () => {
      await new Promise((r) => setTimeout(r, 20));
      executionOrder.push('branch1');
      return { val: 'b1-out' };
    },
  });

  // Parallel branch 2
  dag.addNode({
    id: 'branch2',
    tier: 1,
    dependsOn: ['root'],
    execute: async () => {
      await new Promise((r) => setTimeout(r, 10));
      executionOrder.push('branch2');
      return { val: 'b2-out' };
    },
  });

  // Barrier join node
  dag.addNode({
    id: 'join',
    tier: 2,
    dependsOn: ['branch1', 'branch2'],
    execute: async (ctx) => {
      executionOrder.push('join');
      assert.strictEqual(ctx.upstream['branch1'].val, 'b1-out');
      assert.strictEqual(ctx.upstream['branch2'].val, 'b2-out');
      return { val: 'joined' };
    },
  });

  const summary = await dag.run();
  assert.strictEqual(summary.completed, 4, 'All 4 nodes should complete');
  assert.strictEqual(executionOrder[0], 'root', 'Root must execute first');
  assert.strictEqual(executionOrder[3], 'join', 'Join must execute last after both branches');
  Logger.success('DAG parallel execution and barrier joins verified.');
}

async function testAgentRunnerAndArtifacts() {
  Logger.info('Testing AgentRunner execution & artifact generation...');
  const runner = new AgentRunner({ agencyDir, executionMode: 'mock' });

  const testPrompt = 'Create an award-winning portfolio for Studio Synthetix with kinetic canvas';
  const result = await runner.executeAgent('A01', testPrompt, {});

  assert.strictEqual(result.status, 'COMPLETED');
  assert(result.data.brandName.toUpperCase().includes('SYNTHETIX'), 'Brand name should be extracted');

  const artifactPath = path.join(agencyDir, 'workspace', 'artifacts', '01_scope_charter.json');
  assert(fs.existsSync(artifactPath), 'Artifact file must exist on disk');

  Logger.success('AgentRunner and artifact generation verified.');
}

async function testCodeSynthesizerAndQA() {
  Logger.info('Testing CodeSynthesizer assembly and QAVerifier audit...');
  const synthesizer = new CodeSynthesizer({ agencyDir });
  const briefData = {
    brandName: 'STUDIO SYNTHETIX',
    clientVision: 'High-Performance Generative AI Architecture Studio',
  };

  const synthResult = await synthesizer.synthesize(briefData);
  assert(synthResult.fileCount >= 14, `Expected at least 14 synthesized files, got ${synthResult.fileCount}`);

  // Test QA Verifier
  const verifier = new QAVerifier({ agencyDir });
  const qa = await verifier.runAllChecks();

  assert(qa.wcagContrast.passed, 'WCAG contrast checks should pass');
  assert(qa.placeholderAudit.passed, 'Placeholder token check should pass (zero forbidden tokens)');
  assert(qa.importResolution.passed, 'Component import resolution should pass (zero broken imports)');
  assert(qa.syntaxAudit.passed, 'TypeScript syntax checks should pass');
  assert.strictEqual(qa.passed, true, 'Overall QA suite must pass');

  Logger.success('CodeSynthesizer and QAVerifier successfully verified.');
}

async function runAllTests() {
  console.log(`\n${Colors.bold}${Colors.brightCyan}=== RUNNING MAS ENGINE TEST SUITE ===${Colors.reset}\n`);
  try {
    await testDAGCycleDetection();
    await testDAGParallelExecution();
    await testAgentRunnerAndArtifacts();
    await testCodeSynthesizerAndQA();
    console.log(`\n${Colors.brightGreen}${Colors.bold}ALL MAS ENGINE TESTS PASSED (100% SUCCESS)${Colors.reset}\n`);
  } catch (err) {
    console.error(`\n${Colors.brightRed}${Colors.bold}TEST FAILURE:${Colors.reset}`, err);
    process.exit(1);
  }
}

runAllTests();
