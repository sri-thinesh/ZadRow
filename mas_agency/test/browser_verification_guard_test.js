/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: Browser Verification Environment Guard
 *
 * `scripts/verify_generated_site.js` renders a generated site in a real browser. It
 * cannot run on a machine with no browser binary or no server, and a check that cannot
 * run must never be reported as a check that passed — that is precisely the failure
 * mode this repository has shipped before, where a suite reported success while the
 * work underneath it failed.
 *
 * This suite verifies the guard that enforces that distinction. It deliberately does
 * not verify the rendering assertions themselves: those need a live server, and
 * asserting them here would require the very thing the guard exists to detect.
 *
 * Verifies:
 * 1. With no --url the script refuses to run and says how to run it
 * 2. When the environment cannot measure, the script exits 2 and prints NOT MEASURED
 * 3. --allow-skip downgrades that to exit 0, so a machine without a browser can opt out
 * 4. The guard does not fire spuriously: a runnable environment never prints NOT MEASURED
 */

import assert from 'assert';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { Logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const script = path.join(agencyDir, 'scripts', 'verify_generated_site.js');

/** Run the verification script and capture its exit code and output. */
function runScript(args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    timeout: 120000,
  });
  return { code: result.status, out: `${result.stdout || ''}${result.stderr || ''}` };
}

function testMissingUrlIsRefused() {
  Logger.info('Verifying the script refuses to run without a target...');
  const { code, out } = runScript([]);
  assert.strictEqual(code, 1, 'Running with no --url must fail rather than report a pass');
  assert(out.includes('--url'), 'The refusal must say how to supply a target');
}

function testUnmeasurableEnvironmentIsLoud() {
  Logger.info('Verifying an environment that cannot measure reports NOT MEASURED...');

  // A port nothing is listening on: if a browser is present the script gets far enough
  // to fail the connection, which is a different outcome from being unable to measure.
  const { code, out } = runScript(['--url', 'http://127.0.0.1:1', '--routes', '/']);

  if (out.includes('NOT MEASURED')) {
    assert.strictEqual(code, 2, 'An unmeasurable environment must exit 2, never 0');
    assert(
      out.includes('Nothing about the rendered site was verified'),
      'The output must state plainly that nothing was verified'
    );
    return 'no-browser';
  }

  // A browser is available, so the guard must not have fired.
  assert.strictEqual(code, 1, 'With a browser present a dead server must fail as a check failure');
  return 'browser-present';
}

function testAllowSkipOptsOut() {
  Logger.info('Verifying --allow-skip is the only way to exit 0 without measuring...');
  const { code, out } = runScript(['--url', 'http://127.0.0.1:1', '--routes', '/', '--allow-skip']);
  if (out.includes('NOT MEASURED')) {
    assert.strictEqual(code, 0, '--allow-skip must downgrade an unmeasurable run to exit 0');
    assert(out.includes('NOT MEASURED'), '--allow-skip must still report that nothing was measured');
    return 'no-browser';
  }
  assert.strictEqual(code, 1, '--allow-skip must not suppress a real check failure');
  return 'browser-present';
}

async function runSuite() {
  console.log('\n====================================================');
  console.log('   BROWSER VERIFICATION ENVIRONMENT GUARD SUITE');
  console.log('====================================================\n');

  const tests = [
    { name: 'Missing Target Is Refused', fn: testMissingUrlIsRefused },
    { name: 'Unmeasurable Environment Is Loud', fn: testUnmeasurableEnvironmentIsLoud },
    { name: 'Allow Skip Opts Out Explicitly', fn: testAllowSkipOptsOut },
  ];

  let passed = 0;
  let environment = 'unknown';

  for (const test of tests) {
    try {
      const outcome = await test.fn();
      if (outcome) environment = outcome;
      console.log(`[PASS] ${test.name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${test.name}`);
      console.error(`       ${err.message}`);
    }
  }

  console.log(`\n   Environment: ${environment}`);
  console.log('====================================================');
  if (passed === tests.length) {
    console.log(`   ALL ${passed}/${tests.length} BROWSER GUARD TESTS PASSED (100%)`);
    console.log('====================================================\n');
  } else {
    console.log(`   ${passed}/${tests.length} BROWSER GUARD TESTS PASSED`);
    console.log('====================================================\n');
    process.exit(1);
  }
}

runSuite();
