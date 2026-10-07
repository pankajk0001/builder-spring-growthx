const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { homedir } = require('node:os');
const { join, resolve } = require('node:path');
const { validateInput } = require('./role-board.cjs');
const exec = promisify(execFile);

async function getHermesRuntimeCommand(script) {
  // A hosted service uses the installed Hermes environment directly. Its
  // PYTHONPATH points to Hermes source; no laptop launcher or paid API fallback.
  if (process.env.HELPER_HERMES_PYTHON) {
    return [process.env.HELPER_HERMES_PYTHON, script];
  }
  const launcher = join(homedir(), '.local/bin/hermes');
  const { stdout } = await exec(launcher, ['--print-runtime-command', '--module', 'runpy', script]);
  const [binary, ...args] = JSON.parse(stdout);
  const bootstrapIndex = args.indexOf('-c') + 1;
  const moduleEntry = "runpy.run_module('runpy', run_name='__main__', alter_sys=True)";
  if (!args[bootstrapIndex]?.endsWith(moduleEntry)) throw new Error('The Hermes runtime launcher format changed.');
  args[bootstrapIndex] = args[bootstrapIndex].replace(moduleEntry, "runpy.run_path(sys.argv[1], run_name='__main__')");
  return [binary, ...args];
}

async function interpretFictionalMessages(board, messages, task = 'update', options = {}) {
  validateInput(board, messages);
  const script = resolve(__dirname, '../scripts/hermes-intent.py');
  const [binary, ...args] = await getHermesRuntimeCommand(script);
  return new Promise((resolveResult, reject) => {
    const child = execFile(binary, args, { timeout: 60000, maxBuffer: 100000 }, (error, output) => {
      let result;
      try { result = JSON.parse(output.trim()); } catch { return reject(new Error('Hermes did not return a usable AI reply.')); }
      if (error || result.error) return reject(new Error(result.error || 'Hermes AI call failed.'));
      resolveResult(result);
    });
    child.stdin.end(JSON.stringify({ testOnly: !options.pilotAuthorized, pilotAuthorized: options.pilotAuthorized===true, secretaryAuthorized:options.secretaryAuthorized===true, context:options.context, board, messages, task }));
  });
}

const interpretSecretaryMessage=(board,messages,context)=>interpretFictionalMessages(board,messages,'secretary',{secretaryAuthorized:true,context});
module.exports = { interpretFictionalMessages, interpretSecretaryMessage, getHermesRuntimeCommand };
