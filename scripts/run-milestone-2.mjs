import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { renderSource, parseSource } = require('../src/test-transcript.cjs');
const { renderTable } = require('../src/role-board.cjs');
const { interpretFictionalMessages } = require('../src/hermes-intent.cjs');
const { buildBoardDelivery, assertTestDestination, assertPrivateSendReceipt } = require('../src/note-delivery.cjs');
const mixedChatter = process.argv.includes('--mixed-chatter');
const longChatter = process.argv.includes('--long-chatter');
const fixture = require(longChatter ? '../test/fixtures/long-chatter.cjs' : mixedChatter ? '../test/fixtures/mixed-chatter.cjs' : '../test/fixtures/milestone-2.cjs');
const { respondToRoles } = require('../src/role-availability.cjs');
const stateDir = join(homedir(), '.hermes', 'the-helper');
const target = JSON.parse(await readFile(join(stateDir, 'test-group.json'), 'utf8'));
if (target.name !== 'Test_group' || !/^\d+(?:-\d+)?@g\.us$/.test(target.groupId)) {
  throw new Error('The Test_group destination is not configured.');
}
const receiptPath = join(stateDir, longChatter ? 'long-chatter-receipt.json' : mixedChatter ? 'mixed-chatter-receipt.json' : 'milestone-2-receipt.json');
let previous;
try {
  previous = JSON.parse(await readFile(receiptPath, 'utf8'));
  if (previous.completed && previous.deliveryVersion === 1 && previous.groupId === target.groupId) {
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
  let receipt = previous?.groupId === target.groupId ? previous : {};
  const save = async () => writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  if (!receipt.sourceText) {
    const source = await sendVerified(renderSource(fixture.board, fixture.messages));
    receipt = { groupId: target.groupId, sourceMessageId: source.id, sourceText: source.text };
    await save();
    status(`Posted and read back ${fixture.messages.length} made-up messages in Test_group.`);
  }
  const input = parseSource(receipt.sourceText);
  assert.deepEqual(input.board, fixture.board);
  assert.deepEqual(input.messages, fixture.messages);
  if (longChatter) {
    // Ten messages per call keep each reply within the existing 500-token cap.
    // Every later batch sees the board resulting from all preceding messages.
    receipt.interpretation ||= { decisions: [] };
    while (receipt.interpretation.decisions.length < input.messages.length) {
      const start = receipt.interpretation.decisions.length;
      const current = respondToRoles(input.board, input.messages.slice(0, start), receipt.interpretation.decisions).board;
      const messages = input.messages.slice(start, start + 10);
      const interpreted = await interpretFictionalMessages(current, messages, 'availability');
      respondToRoles(current, messages, interpreted.decisions);
      receipt.interpretation.decisions.push(...interpreted.decisions);
      receipt.interpretation.model = interpreted.model;
      receipt.interpretation.provider = interpreted.provider;
      await save();
      status(`Interpreted ${receipt.interpretation.decisions.length} of 60 fictional messages.`);
    }
  } else if (!receipt.interpretation) {
    receipt.interpretation = await interpretFictionalMessages(input.board, input.messages, 'availability');
    await save();
  }
  const result = respondToRoles(input.board, input.messages, receipt.interpretation.decisions);
  if (mixedChatter || longChatter) {
    const chatter = receipt.interpretation.decisions.filter(decision => fixture.chatterIds.includes(decision.messageId));
    assert.equal(chatter.length, fixture.chatterIds.length);
    assert.ok(chatter.every(decision => decision.intent === 'ignore'), 'Every unrelated chatter message must be ignored.');
  }
  assert.deepEqual(result.board, fixture.expected);
  assert.deepEqual(result.replies.map(reply => reply.text), fixture.expectedReplies);
  assert.deepEqual(result.notes.map(note => note.kind), ['clarify']);
  const delivery = buildBoardDelivery(result, input.messages);
  receipt.replyMessageIds ||= [];
  for (let i = receipt.replyMessageIds.length; i < result.replies.length; i++) {
    const reply = result.replies[i];
    const source = input.messages.find(message => message.id === reply.messageId);
    const sent = await sendVerified(`the helper — ROLE CHECK TEST\nMade-up message from ${source.sender}: “${source.text}”\n\n${reply.text}`);
    receipt.replyMessageIds.push(sent.id);
    await save();
  }
  if (delivery.secretaryText && !receipt.privateMessageId) {
    receipt.privateMessageId = (await sendVerified(delivery.secretaryText, secretaryId)).id;
    await save();
  }
  if (!receipt.tableMessageId) {
    receipt.tableMessageId = (await sendVerified(delivery.groupText)).id;
    await save();
  }
  receipt.completed = true;
  receipt.deliveryVersion = 1;
  receipt.board = result.board;
  receipt.verifiedAt = new Date().toISOString();
  await save();
  status(`Verified all ${result.replies.length} role replies and the final table in Test_group.`);
  if (mixedChatter || longChatter) status(`Verified that all ${fixture.chatterIds.length} everyday chatter messages were ignored, including unrelated mentions of timer and listener.`);
  status('WhatsApp confirmed the unclear-message clarification was sent privately to Secretary self-chat.');
  status(renderTable(result.board));
} catch (error) {
  // Do not expose provider errors or message contents. The Secretary receives
  // the agreed retry message when interpretation fails, without group chatter.
  console.error(error.message);
  if (error.message.includes('AI') || error.message.includes('Hermes')) {
    try { await sendVerified('the helper — ask the secretary to try again in few minutes', secretaryId); } catch {}
  }
  process.exitCode = 1;
} finally {
  sock.end(undefined);
}
