import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { renderBoardImage } = require('../src/board-image.cjs');
const { sendPrivateBoardPreview } = require('../src/preview-delivery.cjs');
const { assertPrivateSendReceipt } = require('../src/note-delivery.cjs');
const { createApprovalRequest, applyApprovalMessage, describeTime } = require('../src/approval-flow.cjs');
const { secretaryCommand, isSecretaryChat } = require('../src/approval-inbox.cjs');
const { createMessageAckTracker } = require('../src/message-ack.cjs');
const fixture = require('../test/fixtures/milestone-3.cjs');
const stateDir = join(homedir(), '.hermes', 'the-helper');
const target = JSON.parse(await readFile(join(stateDir, 'test-group.json'), 'utf8'));
assert.equal(target.name, 'Test_group');
assert.match(target.groupId, /^\d+(?:-\d+)?@g\.us$/);
assert.ok(fixture.board.every(row => row.member === null || row.member.endsWith(' Example')));
const rendered = renderBoardImage(fixture);
const boardHash = createHash('sha256').update(rendered.png).digest('hex');
const confirmedPreview = JSON.parse(await readFile(join(stateDir, 'milestone-3-receipt.json'), 'utf8'));
if (!confirmedPreview.phoneConfirmed || confirmedPreview.sha256 !== boardHash) throw new Error('Confirm the current board preview on the phone before requesting approval.');
const statePath = join(stateDir, 'approval-state.json');
const status = text => process.stdout.write(text + '\n');
console.log = console.info = console.warn = () => {};
const bridgeDir = join(homedir(), '.hermes', 'hermes-agent', 'scripts', 'whatsapp-bridge');
const requireBridge = createRequire(join(bridgeDir, 'package.json'));
const baileys = await import(pathToFileURL(requireBridge.resolve('@whiskeysockets/baileys')).href);
const { default: pino } = await import(pathToFileURL(requireBridge.resolve('pino')).href);
const { state: auth, saveCreds } = await baileys.useMultiFileAuthState(target.sessionPath);
const secretaryId = baileys.jidNormalizedUser(auth.creds.me?.id || '');
const secretaryLid = auth.creds.me?.lid ? baileys.jidNormalizedUser(auth.creds.me.lid) : null;
assert.match(secretaryId, /^\d+@s\.whatsapp\.net$/);
assert.equal(confirmedPreview.secretaryId, secretaryId);
let approval;
try { approval = JSON.parse(await readFile(statePath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!approval || approval.boardHash !== boardHash || approval.secretaryId !== secretaryId || approval.targetGroupId !== target.groupId) {
  approval = { ...createApprovalRequest({ secretaryId, boardHash, requestId: randomUUID() }), targetGroupId: target.groupId,
    board: fixture.board, meeting: fixture.meeting, outbox: [], ownIds: [] };
}
async function save() {
  const temporary = statePath + '.tmp';
  await writeFile(temporary, JSON.stringify(approval, null, 2) + '\n', { mode: 0o600 });
  await rename(temporary, statePath);
}
await save();
if (approval.status === 'approved' && !approval.finalReplyServerAckVerified && !approval.outbox.length) {
  approval.outbox.push({ text: `Approval saved for Test_group: ${describeTime(approval.postAt)}.\nNothing has been posted. Group posting will be connected in the next milestone.` });
  approval.flowVerified = false;
  await save();
}
if (['approved', 'cancelled'].includes(approval.status) && !approval.outbox.length) {
  status(`This approval request is already ${approval.status}; no duplicate prompts sent.`);
  process.exit(0);
}
const { version } = await baileys.fetchLatestBaileysVersion();
const sock = baileys.makeWASocket({ auth, version, logger: pino({ level: 'silent' }),
  syncFullHistory: false, markOnlineOnConnect: false, emitOwnEvents: true,
  shouldIgnoreJid: jid => !isSecretaryChat(jid, { secretaryId, secretaryLid }) });
let credentialWrites = Promise.resolve();
sock.ev.on('creds.update', () => { credentialWrites = credentialWrites.then(saveCreds); });
const acknowledgements = createMessageAckTracker(sock.ev, { secretaryId, secretaryLid });
let accepting = false, queue = Promise.resolve(), finish;
const finished = new Promise(resolve => { finish = resolve; });
async function flushOutbox() {
  while (approval.outbox.length) {
    const item = approval.outbox[0];
    const sent = await sock.sendMessage(secretaryId, { text: 'the helper — APPROVAL TEST\n' + item.text });
    assertPrivateSendReceipt(sent, secretaryId);
    assert.equal(sent.message?.conversation ?? sent.message?.extendedTextMessage?.text, 'the helper — APPROVAL TEST\n' + item.text);
    approval.ownIds.push(sent.key.id);
    await save();
    await acknowledgements.wait(sent.key.id);
    approval.lastReplyMessageId = sent.key.id;
    if (approval.status === 'approved') approval.finalReplyServerAckVerified = true;
    approval.outbox.shift();
    await save();
  }
}
sock.ev.on('messages.upsert', ({ type, messages }) => {
  if (!accepting) return;
  for (const message of messages) {
    const command = secretaryCommand({ type, message, content: baileys.extractMessageContent(message.message) },
      { secretaryId, secretaryLid, startedAt: approval.startedAt, ownIds: new Set(approval.ownIds) });
    if (process.argv.includes('--diagnose') && isSecretaryChat(message.key?.remoteJid, { secretaryId, secretaryLid })) {
      // Booleans only: no chat text, account IDs, message IDs, or keys.
      status(JSON.stringify({ selfChatEvent: true, type, fromMe: message.key?.fromMe === true,
        knownHelperMessage: approval.ownIds.includes(message.key?.id), acceptedCommand: Boolean(command) }));
    }
    if (!command) continue;
    queue = queue.then(async () => {
      const result = applyApprovalMessage(approval, command, boardHash);
      if (!result.reply) return;
      approval = { ...result.state, outbox: [...approval.outbox, { text: result.reply }] };
      await save();
      await flushOutbox();
      status(`Secretary reply processed; approval stage: ${approval.status}.`);
      if (['approved', 'cancelled'].includes(approval.status)) finish();
    }).catch(() => { process.exitCode = 1; status('Approval could not be verified; saved state retained.'); finish(); });
  }
});
let listenerTimer;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WhatsApp connection timed out.')), 45000);
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') { clearTimeout(timer); resolve(); }
      if (connection === 'close') { clearTimeout(timer); reject(new Error('WhatsApp connection closed.')); if (accepting) { process.exitCode = 1; finish(); } }
    });
  });
  if (!approval.previewReceipt) {
    approval.previewReceipt = await sendPrivateBoardPreview(sock, secretaryId, rendered.png,
      'the helper — APPROVAL TEST\nFictional board for Test_group. Nothing has been posted.\nCheck this exact image, then reply APPROVE to approve it, or CANCEL.');
    approval.ownIds.push(approval.previewReceipt.id);
    await save();
    status('Verified the exact square approval preview in Secretary self-chat.');
  }
  await flushOutbox();
  if (process.argv.includes('--diagnose') && approval.status === 'awaiting_approval') {
    approval.outbox.push({ text: 'The self-chat reply check is active again. Please reply APPROVE to this message to test your phone reply.' });
    await save(); await flushOutbox();
  }
  if (['approved', 'cancelled'].includes(approval.status)) finish();
  accepting = true;
  status(`Listening only to Secretary self-chat; stage: ${approval.status}. No group posting is enabled.`);
  listenerTimer = setTimeout(() => { status('Approval listener paused after 15 minutes; rerun to resume the saved request.'); finish(); }, 15 * 60000);
  await finished;
  accepting = false;
  await queue;
  if (approval.status === 'approved') {
    assert.equal(approval.approvedBoardHash, boardHash);
    assert.ok(approval.postAt && approval.lastReplyMessageId && !approval.outbox.length);
    approval.flowVerified = true;
    await save();
    status('Verified real Secretary approval, a future India-time selection, and final confirmation. Nothing was posted to any group.');
  }
} catch {
  status('Approval test stopped before completion; saved state retained.'); process.exitCode = 1;
} finally {
  clearTimeout(listenerTimer); accepting = false; sock.end(undefined); await credentialWrites;
  process.exit(process.exitCode || 0);
}
