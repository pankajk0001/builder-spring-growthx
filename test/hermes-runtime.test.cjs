const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { existsSync } = require('node:fs');
const { homedir } = require('node:os');
const { join, resolve } = require('node:path');
const { getHermesRuntimeCommand } = require('../src/hermes-intent.cjs');

test('the installed Hermes runtime executes a helper file by path', {
  skip: !existsSync(join(homedir(), '.local/bin/hermes')),
}, async () => {
  const [binary, ...args] = await getHermesRuntimeCommand(resolve(__dirname, 'fixtures/runtime-probe.py'));
  const { stdout } = await promisify(execFile)(binary, args, { timeout: 15000 });
  assert.deepEqual(JSON.parse(stdout.trim()), { runtime: 'started', data: 'fictional test only' });
});

test('persistent laptop call and budget limits hold across runs', async () => {
  await promisify(execFile)('python3', ['-m', 'unittest', 'discover', '-s', 'test', '-p', '*_test.py'], { timeout: 15000 });
});

test('hosted Hermes interpreter executes the helper without a laptop launcher', async () => {
  const probe = resolve(__dirname, 'fixtures/runtime-probe.py');
  const source = `require('./src/hermes-intent.cjs').getHermesRuntimeCommand(${JSON.stringify(probe)}).then(command => process.stdout.write(JSON.stringify(command)))`;
  const { stdout } = await promisify(execFile)(process.execPath, ['-e', source], {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, HELPER_HERMES_PYTHON: 'python3' },
  });
  const [binary, ...args] = JSON.parse(stdout);
  const result = await promisify(execFile)(binary, args, { timeout: 15000 });
  assert.deepEqual(JSON.parse(result.stdout.trim()), { runtime: 'started', data: 'fictional test only' });
});
