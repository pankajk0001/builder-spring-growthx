const { test } = require('node:test');
const assert = require('node:assert/strict');
const { secretaryCommand, isSecretaryChat } = require('../src/approval-inbox.cjs');
const config = { secretaryId: '15550000001@s.whatsapp.net', secretaryLid: '15550000009@lid', startedAt: 1791331200000, ownIds: new Set(['fictional-helper']) };
const event = () => ({ type: 'notify', message: { key: { remoteJid: config.secretaryId, fromMe: true, id: 'fictional-phone' }, messageTimestamp: config.startedAt / 1000 + 1 }, content: { conversation: 'APPROVE' } });
test('fresh phone commands from either self-chat address identify the same Secretary', () => {
  const input = event();
  assert.equal(secretaryCommand(input, config).senderId, config.secretaryId);
  input.message.key.remoteJid = config.secretaryLid;
  assert.equal(secretaryCommand(input, config).chatId, config.secretaryId);
});
test('a self-chat reply from a linked device is still the Secretary', () => {
  const input = event();
  input.message.key.remoteJid = '15550000001:7@s.whatsapp.net';
  assert.equal(secretaryCommand(input, config)?.senderId, config.secretaryId);
  assert.equal(isSecretaryChat(input.message.key.remoteJid, config), true);
  assert.equal(isSecretaryChat('15550000002:7@s.whatsapp.net', config), false);
});
test('a delayed self-chat command newer than the active request is accepted', () => {
  const input = event();
  input.type = 'append';
  assert.equal(secretaryCommand(input, config)?.senderId, config.secretaryId);
  input.message.messageTimestamp -= 60;
  assert.equal(secretaryCommand(input, config), null);
});
test('a multiline correction message longer than 200 characters reaches the edit flow', () => {
  const input = event();
  input.content.conversation = ['TMOD', 'Timer', 'Listener', 'Grammarian', 'Movie-Master', 'Speaker 1', 'Evaluator 1', 'Speaker 2']
    .map(role => `${role}: Fictional Participant Example`).join('\n');
  assert.ok(input.content.conversation.length > 200);
  assert.equal(secretaryCommand(input, config).text, input.content.conversation);
});
test('history, other people, group messages, and the helper itself cannot give approval', () => {
  const changes = [
    e => { e.type = 'history'; },
    e => { e.message.key.remoteJid = '123456789000000@g.us'; },
    e => { e.message.key.remoteJid = '15550000002@s.whatsapp.net'; },
    e => { e.message.key.fromMe = false; },
    e => { e.message.key.id = 'fictional-helper'; },
    e => { e.message.messageTimestamp -= 60; },
    e => { e.content.conversation = 'the helper — APPROVE'; },
    e => { e.content = { imageMessage: { caption: 'APPROVE' } }; },
  ];
  for (const change of changes) { const input = event(); change(input); assert.equal(secretaryCommand(input, config), null); }
});
