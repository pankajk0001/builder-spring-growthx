// One-time migration: keep approved Mac image bytes when moving to Linux.
// Both files are private, outside the repository. Never print saved chat IDs.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { renderBoardImage } = require('../src/board-image.cjs');
const { captureImageSnapshot } = require('../src/board-image-snapshot.cjs');
const { restartSnapshot, verifyRestart } = require('../src/restart-check.cjs');
const [source, destination] = process.argv.slice(2);
if (!source || !destination || source === destination) throw Error('Supply distinct private source and destination files.');
const state = JSON.parse(await readFile(source, 'utf8'));
const before = restartSnapshot(state);
let count = 0;
function preserve(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.board) && value.meeting && value.boardHash) {
    const rendered = renderBoardImage(value);
    const imageSnapshot = captureImageSnapshot(value, rendered);
    if (value.boardHash !== imageSnapshot.sha256) throw Error('A saved board differs from its preview; migration stopped.');
    value.imageSnapshot = imageSnapshot;
    count++;
  }
  for (const [key, child] of Object.entries(value)) if (key !== 'imageSnapshot') preserve(child);
}
preserve(state);
verifyRestart(before, state);
await writeFile(destination, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
console.log(`Prepared ${count} preserved board images; board, approval and posting records unchanged.`);
