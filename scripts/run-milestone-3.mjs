import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { renderBoardImage } = require('../src/board-image.cjs');
const { renderTable } = require('../src/role-board.cjs');
const { sendPrivateBoardPreview } = require('../src/preview-delivery.cjs');
const fixture = require('../test/fixtures/milestone-3.cjs');
const stateDir = join(homedir(), '.hermes', 'the-helper');
const target = JSON.parse(await readFile(join(stateDir, 'test-group.json'), 'utf8'));
const receiptPath = join(stateDir, 'milestone-3-receipt.json');
const imagePath = join(stateDir, 'milestone-3-preview.png');
assert.ok(fixture.board.every(row => row.member === null || row.member.endsWith(' Example')));
assert.equal(fixture.meeting.club, 'EXAMPLE SPEAKERS CLUB');
const rendered = renderBoardImage(fixture);
const imageHash = createHash('sha256').update(rendered.png).digest('hex');
let previous;
try { previous = JSON.parse(await readFile(receiptPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
// Suppress encryption-library console output; it may contain session objects.
const status = message => process.stdout.write(message + '\n');
console.log = console.info = console.warn = () => {};
const bridgeDir = join(homedir(), '.hermes', 'hermes-agent', 'scripts', 'whatsapp-bridge');
const requireBridge = createRequire(join(bridgeDir, 'package.json'));
const baileys = await import(pathToFileURL(requireBridge.resolve('@whiskeysockets/baileys')).href);
const { default: pino } = await import(pathToFileURL(requireBridge.resolve('pino')).href);
const { state, saveCreds } = await baileys.useMultiFileAuthState(target.sessionPath);
const secretaryId = baileys.jidNormalizedUser(state.creds.me?.id || '');
if (!/^\d+@s\.whatsapp\.net$/.test(secretaryId)) throw new Error('The paired Secretary self-chat is missing.');
if (previous?.completed && previous.chatPreviewVerified && previous.secretaryId === secretaryId && previous.sha256 === imageHash) {
  status('This image preview was already sent to self-chat; no duplicate sent.');
  process.exit(0);
}
await writeFile(imagePath, rendered.png, { mode: 0o600 });
const { version } = await baileys.fetchLatestBaileysVersion();
const sock = baileys.makeWASocket({ auth: state, version, logger: pino({ level: 'silent' }),
  syncFullHistory: false, markOnlineOnConnect: false,
  shouldIgnoreJid: jid => jid !== secretaryId });
let credentialWrites = Promise.resolve();
sock.ev.on('creds.update', () => { credentialWrites = credentialWrites.then(saveCreds); });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WhatsApp connection timed out.')), 45000);
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') { clearTimeout(timer); resolve(); }
      if (connection === 'close') { clearTimeout(timer); reject(new Error('WhatsApp connection closed.')); }
    });
  });
  const caption = 'the helper — SQUARE BOARD PREVIEW\nMade-up test. Download the image and check the whole board directly in chat, without opening the gallery.\nNot posted to any group. Source table:\n\n' + renderTable(fixture.board);
  const receipt = await sendPrivateBoardPreview(sock, secretaryId, rendered.png, caption);
  await writeFile(receiptPath, JSON.stringify({ completed: true, ...receipt, secretaryId,
    board: fixture.board, meeting: fixture.meeting, width: rendered.width, height: rendered.height,
    verifiedAt: new Date().toISOString(), phoneConfirmed: false }, null, 2) + '\n', { mode: 0o600 });
  status(`WhatsApp confirmed the exact ${rendered.width} × ${rendered.height} board image and source-table caption in Secretary self-chat.`);
  status('No messages were sent to any group.');
} catch (error) {
  console.error('Board preview could not be verified. Check self-chat before retrying.');
  process.exitCode = 1;
} finally {
  sock.end(undefined);
  await credentialWrites;
  // Image-upload connections can otherwise keep a finished CLI run alive.
  // Delivery and credential writes are complete before ending the process.
  process.exit(process.exitCode || 0);
}
