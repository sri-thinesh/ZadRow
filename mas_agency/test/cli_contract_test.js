/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Standalone Test Suite: Antigravity CLI Response Contract
 *
 * Root cause this suite guards against: `_invokeCliProcess` parsed the CLI's stdout
 * but fell back to treating *anything* it could not parse as the agent's response,
 * and used the raw JSON envelope as the response when the envelope carried no
 * `response` field. A wrapper script, a banner line, a different binary at the
 * configured path, or an envelope with an unfamiliar key would therefore be read as a
 * successful agent run, and its text parsed as the agent's deliverable. The pipeline
 * would report success without ever having measured a model's output.
 *
 * The CLI is invoked with `--output-format json`, so stdout is a JSON envelope. This
 * suite asserts that the envelope is required, that its status is honoured, and that
 * an unrecognised shape is a loud error naming what was seen.
 *
 * Verifies:
 * 1. A well-formed envelope yields the response, duration and usage
 * 2. A lowercase or `OK`/`COMPLETED` status is accepted, not rejected as a failure
 * 3. Tolerated framings still work: a log line before the JSON, a JSON array, JSONL
 * 4. A failure status is an error whether the exit code is 0 or non-zero
 * 5. Non-JSON stdout is an error, never silently treated as the agent's output
 * 6. An envelope with no response payload is an error naming the keys it did find
 * 7. The raw envelope is never used as the response text
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AgentRunner } from '../src/engine/agent_runner.js';
import { Logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.resolve(__dirname, '..');

function createTestDir(name) {
  const dir = path.join(agencyDir, 'workspace', `test_clicontract_${name}_${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanTestDir(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

/**
 * A stand-in CLI that prints whatever the test tells it to. The body is supplied
 * through env vars so the script itself stays fixed and the test controls the shape
 * under examination.
 */
function writeStubCli(dir) {
  const cliPath = path.join(dir, 'stub-agy');
  const script = `#!/usr/bin/env node
const out = process.env.STUB_STDOUT ?? '';
const err = process.env.STUB_STDERR ?? '';
const code = Number(process.env.STUB_EXIT ?? '0');
if (out) process.stdout.write(out);
if (err) process.stderr.write(err);
process.exit(code);
`;
  fs.writeFileSync(cliPath, script, 'utf8');
  fs.chmodSync(cliPath, 0o755);
  return cliPath;
}

function makeRunner(cliPath, dir) {
  return new AgentRunner({
    agencyDir,
    artifactsDir: dir,
    cliPath,
    executionMode: 'cli',
    maxRetries: 0,
  });
}

/** Invoke the stub with a given stdout/exit code and return the outcome. */
async function invoke(cliPath, dir, { stdout = '', stderr = '', exit = 0 }) {
  const previous = {
    STUB_STDOUT: process.env.STUB_STDOUT,
    STUB_STDERR: process.env.STUB_STDERR,
    STUB_EXIT: process.env.STUB_EXIT,
  };
  process.env.STUB_STDOUT = stdout;
  process.env.STUB_STDERR = stderr;
  process.env.STUB_EXIT = String(exit);

  try {
    const runner = makeRunner(cliPath, dir);
    return await runner._invokeCliProcess('test prompt', { agentId: 'A01' });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/** Invoke and return the thrown error, failing if nothing was thrown. */
async function invokeExpectingError(cliPath, dir, options) {
  let thrown = null;
  try {
    await invoke(cliPath, dir, options);
  } catch (err) {
    thrown = err;
  }
  assert(thrown, `Expected an error for stdout=${JSON.stringify(options.stdout)} exit=${options.exit}`);
  return thrown;
}

// =====================================================================
// Test 1 & 2: well-formed envelopes in every accepted status spelling
// =====================================================================
async function testWellFormedEnvelopes() {
  Logger.info('Verifying well-formed envelopes are accepted in every status spelling...');

  const dir = createTestDir('wellformed');
  try {
    const cliPath = writeStubCli(dir);

    const cases = [
      {
        label: 'canonical envelope',
        stdout: JSON.stringify({
          status: 'SUCCESS',
          response: '{"agent":"A01","deliverable":"x"}',
          duration_seconds: 1.5,
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
        expectResponse: '{"agent":"A01","deliverable":"x"}',
        expectDuration: 1.5,
      },
      { label: 'lowercase status', stdout: JSON.stringify({ status: 'success', text: 'lowercase ok' }), expectResponse: 'lowercase ok' },
      { label: 'OK status', stdout: JSON.stringify({ status: 'OK', response: 'ok spelling' }), expectResponse: 'ok spelling' },
      { label: 'COMPLETED status', stdout: JSON.stringify({ status: 'COMPLETED', response: 'completed spelling' }), expectResponse: 'completed spelling' },
      { label: 'result key', stdout: JSON.stringify({ status: 'SUCCESS', result: 'via result' }), expectResponse: 'via result' },
      { label: 'no status at all, but a response', stdout: JSON.stringify({ response: 'statusless' }), expectResponse: 'statusless' },
      { label: 'camelCase duration', stdout: JSON.stringify({ status: 'SUCCESS', response: 'r', durationSeconds: 2.25 }), expectResponse: 'r', expectDuration: 2.25 },
      { label: 'log line before the JSON', stdout: `[INFO] starting up\n${JSON.stringify({ status: 'SUCCESS', response: 'after a log line' })}`, expectResponse: 'after a log line' },
      { label: 'JSON array of messages', stdout: JSON.stringify([{ type: 'log', text: 'noise' }, { status: 'SUCCESS', response: 'from an array' }]), expectResponse: 'from an array' },
      { label: 'JSONL', stdout: `{"type":"log"}\n${JSON.stringify({ status: 'SUCCESS', response: 'from jsonl' })}`, expectResponse: 'from jsonl' },
      { label: 'trailing whitespace', stdout: `${JSON.stringify({ status: 'SUCCESS', response: 'padded' })}\n\n`, expectResponse: 'padded' },
    ];

    for (const c of cases) {
      const result = await invoke(cliPath, dir, { stdout: c.stdout });
      assert.strictEqual(
        result.responseText,
        c.expectResponse,
        `[${c.label}] response text must be the envelope's payload`
      );
      assert.strictEqual(result.promptTransport, 'argv', `[${c.label}] transport must be recorded`);
      if (c.expectDuration !== undefined) {
        assert.strictEqual(result.durationSeconds, c.expectDuration, `[${c.label}] duration must be read`);
      }
    }

    // The canonical case must also carry usage through.
    const canonical = await invoke(cliPath, dir, { stdout: cases[0].stdout });
    assert.deepStrictEqual(
      canonical.usage,
      { input_tokens: 10, output_tokens: 20 },
      'Usage metadata must be carried through'
    );
  } finally {
    cleanTestDir(dir);
  }
}

// =====================================================================
// Test 4: a failure status is an error, whatever the exit code
// =====================================================================
async function testFailureStatusIsAnError() {
  Logger.info('Verifying a failure status is an error whether the exit code is 0 or non-zero...');

  const dir = createTestDir('failure');
  try {
    const cliPath = writeStubCli(dir);
    const failed = JSON.stringify({ status: 'FAILED', error: 'model refused the request' });

    const atZero = await invokeExpectingError(cliPath, dir, { stdout: failed, exit: 0 });
    assert(
      atZero.message.includes('model refused the request'),
      `A failure reported with exit code 0 must still name the error (got: ${atZero.message})`
    );

    const atOne = await invokeExpectingError(cliPath, dir, { stdout: failed, exit: 1 });
    assert(
      atOne.message.includes('model refused the request'),
      `A failure reported with exit code 1 must name the error (got: ${atOne.message})`
    );

    // A non-zero exit with no parseable envelope must report the exit code and stderr.
    const unparseable = await invokeExpectingError(cliPath, dir, {
      stdout: 'not json at all',
      stderr: 'binary exploded',
      exit: 3,
    });
    assert(
      unparseable.message.includes('code 3') && unparseable.message.includes('binary exploded'),
      `A crash must report the exit code and stderr (got: ${unparseable.message})`
    );
  } finally {
    cleanTestDir(dir);
  }
}

// =====================================================================
// Test 5, 6 & 7: unrecognised output and missing payloads are loud errors
// =====================================================================
async function testUnrecognisedOutputIsLoud() {
  Logger.info('Verifying unrecognised output is a loud error, never a silent pass-through...');

  const dir = createTestDir('unrecognised');
  try {
    const cliPath = writeStubCli(dir);

    // 5. Non-JSON stdout. The old code returned this as the agent's response.
    const plainText = await invokeExpectingError(cliPath, dir, {
      stdout: 'Hello! I am a helpful assistant and here is your website.',
      exit: 0,
    });
    assert(
      plainText.message.includes('did not return the JSON envelope'),
      `Non-JSON stdout must be refused (got: ${plainText.message})`
    );
    assert(
      plainText.message.includes('Hello! I am a helpful assistant'),
      'The refusal must quote what it actually saw, so the operator can diagnose it'
    );

    // Empty stdout is the same failure, not an empty success.
    const empty = await invokeExpectingError(cliPath, dir, { stdout: '', exit: 0 });
    assert(
      empty.message.includes('(empty)'),
      `Empty stdout must be refused and reported as empty (got: ${empty.message})`
    );

    // 6. A valid envelope with no response payload. The old code used the whole
    //    envelope as the response text.
    const envelopeless = await invokeExpectingError(cliPath, dir, {
      stdout: JSON.stringify({ status: 'SUCCESS', duration_seconds: 1.0, usage: { tokens: 5 } }),
      exit: 0,
    });
    assert(
      envelopeless.message.includes('no response payload'),
      `An envelope without a payload must be refused (got: ${envelopeless.message})`
    );
    assert(
      envelopeless.message.includes('duration_seconds') && envelopeless.message.includes('usage'),
      `The refusal must name the keys it found (got: ${envelopeless.message})`
    );

    // 7. The raw envelope must never be used as the response text.
    let leakedEnvelope = false;
    try {
      const result = await invoke(cliPath, dir, {
        stdout: JSON.stringify({ status: 'SUCCESS', duration_seconds: 1.0 }),
        exit: 0,
      });
      leakedEnvelope = typeof result.responseText === 'string' && result.responseText.includes('duration_seconds');
    } catch (_) {
      leakedEnvelope = false;
    }
    assert(!leakedEnvelope, 'The transport envelope must never be substituted for the agent output');

    // An error reported without a status must surface the error, not a payload complaint.
    const statuslessError = await invokeExpectingError(cliPath, dir, {
      stdout: JSON.stringify({ error: 'quota exhausted' }),
      exit: 0,
    });
    assert(
      statuslessError.message.includes('quota exhausted'),
      `An error without a status must name the error (got: ${statuslessError.message})`
    );
  } finally {
    cleanTestDir(dir);
  }
}

// =====================================================================
// Test Runner
// =====================================================================
async function runAllTests() {
  console.log('\n====================================================');
  console.log('   MAS 2.0 ANTIGRAVITY CLI RESPONSE CONTRACT SUITE');
  console.log('====================================================\n');

  const tests = [
    { name: 'Well-Formed Envelopes Are Accepted In Every Status Spelling', fn: testWellFormedEnvelopes },
    { name: 'A Failure Status Is An Error At Any Exit Code', fn: testFailureStatusIsAnError },
    { name: 'Unrecognised Output Is A Loud Error', fn: testUnrecognisedOutputIsLoud },
  ];

  let passedCount = 0;
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
  console.log(`   ALL ${passedCount}/${tests.length} CLI CONTRACT TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
