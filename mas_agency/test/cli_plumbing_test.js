/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: CLI Plumbing Guard
 *
 * Root cause this suite guards against: the prompt handed to the Antigravity CLI
 * was silently truncated at 30,000 characters, and the CLI was always invoked with
 * `--dangerously-skip-permissions`.
 *
 * Verifies:
 * 1. The prompt reaches the CLI byte-for-byte, however long it is
 * 2. An over-limit prompt is a loud error, never a silent truncation
 * 3. Real per-agent prompts exceed the old 30,000-character cap (the bug was live)
 * 4. `--dangerously-skip-permissions` is absent unless explicitly opted into
 * 5. The plumbing facts (prompt size, transport, permission posture) are recorded
 */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AgentRunner, PromptBuilder } from '../src/engine/agent_runner.js';
import { Logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(agencyDir, '..');

function createTestDir(name) {
  const dir = path.join(agencyDir, 'workspace', `test_cli_${name}_${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanTestDir(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

/**
 * A stand-in for the Antigravity CLI. It reports back exactly what it received on
 * argv, so the test can assert on the real transport rather than on our own code.
 */
function writeFakeCli(dir) {
  const cliPath = path.join(dir, 'fake-agy');
  const script = `#!/usr/bin/env node
import crypto from 'node:crypto';
const args = process.argv.slice(2);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
};
const prompt = valueOf('--print') || '';
process.stdout.write(JSON.stringify({
  status: 'SUCCESS',
  response: JSON.stringify({
    agent: valueOf('--agent'),
    effort: valueOf('--effort'),
    outputFormat: valueOf('--output-format'),
    disableSlashCommands: args.includes('--disable-slash-commands'),
    skipPermissions: args.includes('--dangerously-skip-permissions'),
    promptChars: prompt.length,
    promptSha256: crypto.createHash('sha256').update(prompt, 'utf8').digest('hex'),
    argvChars: args.join(' ').length,
  }),
}));
`;
  fs.writeFileSync(cliPath, script, { mode: 0o755 });
  return cliPath;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function makeRunner(extra = {}) {
  return new AgentRunner({
    agencyDir,
    rootDir,
    executionMode: 'cli',
    cliPath: extra.cliPath,
    ...extra,
  });
}

// =====================================================================
// Test 1: The prompt reaches the CLI verbatim, however long it is
// =====================================================================
async function testPromptReachesCliVerbatim() {
  Logger.info('Verifying a long prompt reaches the CLI byte-for-byte...');
  const testDir = createTestDir('verbatim');

  try {
    const cliPath = writeFakeCli(testDir);
    const runner = makeRunner({ cliPath });

    // 40,000 characters: comfortably past the old 30,000 cap.
    const prompt = 'A'.repeat(20000) + '\n\n' + 'B'.repeat(20000);
    assert.strictEqual(prompt.length, 40002, 'Fixture must be past the old 30,000 cap');

    const result = await runner._invokeCliProcess(prompt, { agentId: 'A01' });
    const received = JSON.parse(result.responseText);

    assert.strictEqual(received.promptChars, prompt.length, 'CLI must receive the whole prompt');
    assert.strictEqual(received.promptSha256, sha256(prompt), 'CLI must receive the prompt unmodified');
    assert.strictEqual(received.agent, 'A01', 'Agent id must be forwarded');
    assert.strictEqual(received.outputFormat, 'json', 'Output format must be requested');
    assert.strictEqual(received.disableSlashCommands, true, 'Slash commands must stay disabled');

    // The plumbing facts must be recorded on the result.
    assert.strictEqual(result.promptChars, prompt.length, 'Result must record the prompt size');
    assert.strictEqual(result.promptTransport, 'argv', 'Result must record the transport used');
    assert.strictEqual(result.permissionsSkipped, false, 'Result must record the permission posture');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 2: An over-limit prompt is a loud error, never a truncation
// =====================================================================
async function testOverLimitPromptFailsLoudly() {
  Logger.info('Verifying an over-limit prompt throws instead of truncating...');
  const testDir = createTestDir('overlimit');

  try {
    const cliPath = writeFakeCli(testDir);
    const runner = makeRunner({ cliPath, maxPromptChars: 500 });

    const prompt = 'X'.repeat(2000);
    let thrown = null;
    try {
      await runner._invokeCliProcess(prompt, { agentId: 'A42' });
    } catch (err) {
      thrown = err;
    }

    assert(thrown, 'An over-limit prompt must throw rather than be silently truncated');
    assert(thrown.message.includes('2000'), `Error must name the actual size (got: ${thrown.message})`);
    assert(thrown.message.includes('500'), `Error must name the limit (got: ${thrown.message})`);
    assert(thrown.message.includes('A42'), `Error must name the agent (got: ${thrown.message})`);
    assert(
      /truncat/i.test(thrown.message),
      `Error must explain why truncation is not an option (got: ${thrown.message})`
    );

    // A prompt exactly at the limit is still allowed.
    const atLimit = await runner._invokeCliProcess('Y'.repeat(500), { agentId: 'A42' });
    assert.strictEqual(JSON.parse(atLimit.responseText).promptChars, 500, 'A prompt at the limit must pass');
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 3: The old 30,000 cap was reachable, so the truncation was a real hazard
// =====================================================================
async function testOldCapWasReachable() {
  Logger.info('Measuring how much upstream context it takes to reach the old 30,000-character cap...');

  const testDir = createTestDir('reachable');

  try {
    const cliPath = writeFakeCli(testDir);
    const runner = makeRunner({ cliPath, executionMode: 'mock' });
    const registry = JSON.parse(
      fs.readFileSync(path.join(agencyDir, 'agents', 'agent_registry.json'), 'utf8')
    );
    const agentIds = Object.keys(registry.agents || {});
    assert(agentIds.length > 0, 'Agent registry must define agents');

    const buildFor = (agentId, upstreamContext) => {
      const persona = runner.getPersona(agentId);
      const skills = runner.loadSkills(persona.skills);
      return PromptBuilder.buildPrompt({
        persona,
        prompt: 'Build an award-winning site for Northwind Atoll, a coastal research institute.',
        upstreamContext,
        skills,
        brandName: 'NORTHWIND ATOLL',
        targetIndustry: 'Oceanographic Research',
      });
    };

    // 3a. Baseline: persona + skills only, no upstream artifacts.
    let largestBaseline = { agentId: null, chars: 0 };
    for (const agentId of agentIds) {
      const chars = buildFor(agentId, {}).length;
      if (chars > largestBaseline.chars) largestBaseline = { agentId, chars };
    }
    console.log(
      `  [info] Baseline prompt (persona + skills, no upstream): largest is ` +
        `${largestBaseline.agentId} at ${largestBaseline.chars} characters.`
    );
    assert(
      largestBaseline.chars < 30000,
      'With no upstream context no prompt should reach the cap; the cap is a context-size effect, not a persona effect'
    );

    // 3b. With a realistic pile of upstream artifacts the prompt crosses the old cap.
    const upstreamContext = {};
    for (let i = 0; i < 4; i++) {
      upstreamContext[`artifact_${i}.json`] = { payload: 'Z'.repeat(7500) };
    }
    const bigPrompt = buildFor(largestBaseline.agentId, upstreamContext);
    console.log(
      `  [info] With ~30KB of upstream artifacts the same agent's prompt is ${bigPrompt.length} characters.`
    );
    assert(
      bigPrompt.length > 30000,
      `~30KB of upstream context must push a real prompt past the old 30,000-character cap ` +
        `(got ${bigPrompt.length}); if it no longer does, the old truncation was unreachable and this test should be retired`
    );

    // 3c. The new code never truncates it: either the whole prompt is delivered, or
    //     the call fails naming the size. It is never silently shortened.
    const bigRunner = makeRunner({ cliPath, maxPromptChars: bigPrompt.length + 1000 });
    const delivered = await bigRunner._invokeCliProcess(bigPrompt, { agentId: largestBaseline.agentId });
    const received = JSON.parse(delivered.responseText);
    assert.strictEqual(received.promptChars, bigPrompt.length, 'The whole prompt must be delivered');
    assert.strictEqual(received.promptSha256, sha256(bigPrompt), 'The prompt must arrive unmodified');

    // 3d. And with a limit below the prompt size it refuses rather than truncates.
    const tightRunner = makeRunner({ cliPath, maxPromptChars: 30000 });
    if (bigPrompt.length > 30000) {
      let thrown = null;
      try {
        await tightRunner._invokeCliProcess(bigPrompt, { agentId: largestBaseline.agentId });
      } catch (err) {
        thrown = err;
      }
      assert(thrown, 'A prompt past the configured limit must be refused, not trimmed');
      assert(thrown.message.includes(String(bigPrompt.length)), 'The refusal must name the real size');
    }
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 4: Permission skipping is opt-in only
// =====================================================================
async function testPermissionSkippingIsOptIn() {
  Logger.info('Verifying --dangerously-skip-permissions is opt-in only...');
  const testDir = createTestDir('permissions');

  try {
    const cliPath = writeFakeCli(testDir);
    const prompt = 'Build a site.';

    // 4a. Default: not skipped.
    delete process.env.ANTIGRAVITY_SKIP_PERMISSIONS;
    const defaultRunner = makeRunner({ cliPath });
    assert.strictEqual(defaultRunner.skipPermissions, false, 'Skipping permissions must default to off');
    const defaultResult = await defaultRunner._invokeCliProcess(prompt, { agentId: 'A01' });
    assert.strictEqual(
      JSON.parse(defaultResult.responseText).skipPermissions,
      false,
      'The flag must not be passed unless the operator opted in'
    );

    // 4b. Explicit option: skipped.
    const optedIn = makeRunner({ cliPath, skipPermissions: true });
    assert.strictEqual(optedIn.skipPermissions, true, 'An explicit option must enable it');
    const optedInResult = await optedIn._invokeCliProcess(prompt, { agentId: 'A01' });
    assert.strictEqual(
      JSON.parse(optedInResult.responseText).skipPermissions,
      true,
      'The flag must be passed when the operator opted in'
    );
    assert.strictEqual(optedInResult.permissionsSkipped, true, 'Result must record the posture');

    // 4c. Environment opt-in: skipped.
    process.env.ANTIGRAVITY_SKIP_PERMISSIONS = '1';
    try {
      const envRunner = makeRunner({ cliPath });
      assert.strictEqual(envRunner.skipPermissions, true, 'The environment must be able to opt in');
      const envResult = await envRunner._invokeCliProcess(prompt, { agentId: 'A01' });
      assert.strictEqual(JSON.parse(envResult.responseText).skipPermissions, true);
    } finally {
      delete process.env.ANTIGRAVITY_SKIP_PERMISSIONS;
    }

    // 4d. Any other environment value must not opt in.
    process.env.ANTIGRAVITY_SKIP_PERMISSIONS = 'true';
    try {
      const truthyRunner = makeRunner({ cliPath });
      assert.strictEqual(
        truthyRunner.skipPermissions,
        false,
        'Only the exact value "1" may opt in, so a stray "true" cannot silently disable prompts'
      );
    } finally {
      delete process.env.ANTIGRAVITY_SKIP_PERMISSIONS;
    }
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test 5: The prompt limit is configurable and platform-aware
// =====================================================================
async function testPromptLimitIsConfigurable() {
  Logger.info('Verifying the prompt limit is configurable...');
  const testDir = createTestDir('limit');

  try {
    const cliPath = writeFakeCli(testDir);

    const defaultRunner = makeRunner({ cliPath });
    const expectedDefault = process.platform === 'win32' ? 30000 : 120000;
    assert.strictEqual(
      defaultRunner.maxPromptChars,
      expectedDefault,
      `Default limit must match the platform argument budget (expected ${expectedDefault})`
    );

    const configured = makeRunner({ cliPath, maxPromptChars: 12345 });
    assert.strictEqual(configured.maxPromptChars, 12345, 'An explicit option must win');

    process.env.ANTIGRAVITY_MAX_PROMPT_CHARS = '54321';
    try {
      const fromEnv = makeRunner({ cliPath });
      assert.strictEqual(fromEnv.maxPromptChars, 54321, 'The environment must be able to raise the limit');
    } finally {
      delete process.env.ANTIGRAVITY_MAX_PROMPT_CHARS;
    }

    process.env.ANTIGRAVITY_MAX_PROMPT_CHARS = 'not-a-number';
    try {
      const bogus = makeRunner({ cliPath });
      assert.strictEqual(
        bogus.maxPromptChars,
        expectedDefault,
        'A malformed environment value must fall back to the platform default, not to NaN'
      );
    } finally {
      delete process.env.ANTIGRAVITY_MAX_PROMPT_CHARS;
    }
  } finally {
    cleanTestDir(testDir);
  }
}

// =====================================================================
// Test Runner
// =====================================================================
async function runAllTests() {
  console.log('\n====================================================');
  console.log('   MAS 2.0 CLI PLUMBING GUARD TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  const tests = [
    { name: 'Prompt Reaches The CLI Byte-For-Byte', fn: testPromptReachesCliVerbatim },
    { name: 'Over-Limit Prompt Fails Loudly, Never Truncates', fn: testOverLimitPromptFailsLoudly },
    { name: 'The Old 30,000 Cap Was Reachable By Real Prompts', fn: testOldCapWasReachable },
    { name: 'Permission Skipping Is Opt-In Only', fn: testPermissionSkippingIsOptIn },
    { name: 'Prompt Limit Is Configurable And Platform-Aware', fn: testPromptLimitIsConfigurable },
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
  console.log(`   ALL ${passedCount}/${tests.length} CLI PLUMBING TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
