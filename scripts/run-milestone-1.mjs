import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { renderSource, parseSource } = require('../src/test-transcript.cjs');
const { updateBoard, renderTable } = require('../src/role-board.cjs');
const { interpretFictionalMessages } = require('../src/hermes-intent.cjs');
const { buildBoardDelivery, assertTestDestination, assertPrivateSendReceipt } = require('../src/note-delivery.cjs');
const fixture = require('../test/fixtures/milestone-1.cjs');
const stateDir = join(homedir(), '.hermes', 'the-helper');
const target = JSON.parse(await readFile(join(stateDir, 'test-group.json'), 'utf8'));
if (target.name !== 'Test_group' || !/^\d+(?:-\d+)?@g\.us$/.test(target.groupId)) {
  throw new Error('The Test_group destination is not configured.');
}
const receiptPath = join(stateDir, 'milestone-1-receipt.json');
const repairGroupOnly = process.argv.includes('--repair-group-only');
let previous;
try {
  previous = JSON.parse(await readFile(receiptPath, 'utf8'));
  if (previous.completed && previous.deliveryVersion === 2 && previous.groupId === target.groupId) {
    console.log('This test was already posted successfully to Test_group; no duplicate messages sent.');
    process.exit(0);
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }

const bridgeDir = join(homedir(), '.hermes', 'hermes-agent', 'scripts', 'whatsapp-bridge');
// Some Signal dependency versions log encryption-session objects with
// console.log despite a silent logger. Suppress dependency console output;
// this runner prints its own plain status lines through stdout below.
const status = message => process.stdout.write(message + '\n');
console.log = () => {};
console.info = () => {};
console.warn = () => {};
const requireBridge = createRequire(join(bridgeDir, 'package.json'));
const baileys = await import(pathToFileURL(requireBridge.resolve('@whiskeysockets/baileys')).href);
const { default: pino } = await import(pathToFileURL(requireBridge.resolve('pino')).href);
const { state, saveCreds } = await baileys.useMultiFileAuthState(target.sessionPath);
const secretaryId = baileys.jidNormalizedUser(state.creds.me?.id || '');
assertTestDestination(target.groupId, target.groupId, secretaryId);
const { version } = await baileys.fetchLatestBaileysVersion();
const sock = baileys.makeWASocket({
  auth: state, version, logger: pino({ level: 'silent' }),
  syncFullHistory: false, markOnlineOnConnect: false, emitOwnEvents: true,
  shouldIgnoreJid: jid => jid !== target.groupId,
});
sock.ev.on('creds.update', saveCreds);
const echoes = new Map();
sock.ev.on('messages.upsert', ({ messages }) => {
  for (const message of messages) {
    if (message.key.remoteJid === target.groupId && message.key.fromMe) {
      echoes.set(message.key.id, message);
    }
  }
});

async function sendVerified(text, destination = target.groupId, editMessageId = null) {
  assertTestDestination(destination, target.groupId, secretaryId);
  // Recheck the group name immediately before each send; never take a chat ID
  // from AI output or from an incoming message.
  if (destination === target.groupId) {
    const metadata = await sock.groupMetadata(target.groupId);
    if (metadata.subject !== 'Test_group') throw new Error('Blocked: the destination is not Test_group.');
  }
  const payload = { text };
  if (editMessageId) payload.edit = { remoteJid: destination, fromMe: true, id: editMessageId };
  const sent = await sock.sendMessage(destination, payload);
  if (!sent?.key?.id || sent.key.remoteJid !== destination) throw new Error('WhatsApp did not confirm the intended destination.');
  if (destination === secretaryId) {
    // Self-chat delivery is checked by its WhatsApp send receipt, then by the
    // Secretary on the phone; it must not depend on a group-stream echo.
    assertPrivateSendReceipt(sent, secretaryId);
    return { id: sent.key.id, text };
  }
  const until = Date.now() + 5000;
  while (!echoes.has(sent.key.id) && Date.now() < until) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const echo = echoes.get(sent.key.id);
  const normalized = baileys.extractMessageContent(echo?.message);
  const content = normalized?.protocolMessage?.editedMessage || normalized;
  const receivedText = content?.conversation ?? content?.extendedTextMessage?.text;
  if (receivedText !== text) throw new Error('The sent message could not be verified in the test-group event stream.');
  return { id: sent.key.id, text: receivedText };
}

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WhatsApp connection timed out.')), 45000);
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') { clearTimeout(timer); resolve(); }
      if (connection === 'close') { clearTimeout(timer); reject(new Error('WhatsApp connection closed.')); }
    });
  });
  let source, input, interpretation, result;
  if ((previous?.completed || previous?.sourceVerified) && previous.groupId === target.groupId) {
    // A delivery correction reuses the verified fictional result; it does not
    // call AI again or duplicate the original source messages.
    source = { id: previous.sourceMessageId };
    input = { messages: previous.messages };
    interpretation = { model: previous.model, provider: previous.provider };
    result = { board: previous.board, notes: previous.notes };
    assert.deepEqual(input.messages, fixture.messages);
  } else {
    source = await sendVerified(renderSource(fixture.board, fixture.messages));
    status('Posted and read back the fictional source board and six messages in Test_group.');
    // AI input comes from the actual test-group event, not the expected decisions.
    input = parseSource(source.text);
    interpretation = await interpretFictionalMessages(input.board, input.messages);
    result = updateBoard(input.board, input.messages, interpretation.decisions);
  }
  assert.deepEqual(result.board, fixture.expected);
  assert.deepEqual(result.notes.map(note => note.kind), ['conflict', 'clarify']);
  const pendingReceipt = { ...previous, sourceVerified: true, groupId: target.groupId,
    sourceMessageId: source.id, board: result.board, messages: input.messages, notes: result.notes,
    model: interpretation.model, provider: interpretation.provider };
  const delivery = buildBoardDelivery(result, input.messages);
  let privateMessageId = previous?.privateMessageId || null;
  if (delivery.secretaryText && !privateMessageId && !previous?.privateVerifiedByUser && !repairGroupOnly) {
    privateMessageId = (await sendVerified(delivery.secretaryText, secretaryId)).id;
    // Save the private-send receipt immediately so a retry cannot duplicate it.
    await writeFile(receiptPath, JSON.stringify({ ...pendingReceipt, privateMessageId }) + '\n', { mode: 0o600 });
    status('WhatsApp confirmed the clarification send to the Secretary self-chat.');
  }
  const editable = previous?.tableMessageId && Date.now() - Date.parse(previous.verifiedAt) < 14 * 60 * 1000;
  const posted = await sendVerified(delivery.groupText, target.groupId, editable ? previous.tableMessageId : null);
  await writeFile(receiptPath, JSON.stringify({
    completed: true, deliveryVersion: 2, privateVerificationPending: repairGroupOnly && !privateMessageId && !previous?.privateVerifiedByUser,
    privateVerifiedByUser: previous?.privateVerifiedByUser || false,
    groupId: target.groupId, sourceMessageId: source.id,
    tableMessageId: editable ? previous.tableMessageId : posted.id, privateMessageId,
    model: interpretation.model, provider: interpretation.provider,
    board: result.board, messages: input.messages, notes: result.notes,
    verifiedAt: new Date().toISOString(),
  }, null, 2) + '\n', { mode: 0o600 });
  status(editable ? 'Edited and read back the group table; its private clarification is removed.' : 'Posted and read back the updated table in Test_group.');
  status(renderTable(result.board));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  sock.end(undefined);
}
