const { test } = require('node:test');
const assert = require('node:assert/strict');
const { secretaryCommand } = require('../src/approval-inbox.cjs');
const config = { secretaryId: '15550000001@s.whatsapp.net', secretaryLid: '15550000009@lid', startedAt: 1791331200000, ownIds: new Set(['fictional-helper']) };
const event = () => ({ type: 'notify', message: { key: { remoteJid: config.secretaryId, fromMe: true, id: 'fictional-phone' }, messageTimestamp: config.startedAt / 1000 + 1 }, content: { conversation: 'APPROVE' } });
test('fresh phone commands from either self-chat address identify the same Secretary', () => {
  const input = event();
  assert.equal(secretaryCommand(input, config).senderId, config.secretaryId);
  input.message.key.remoteJid = config.secretaryLid;
  assert.equal(secretaryCommand(input, config).chatId, config.secretaryId);
});
test('history, other people, group messages, and the helper itself cannot give approval', () => {
  const changes = [
    e => { e.type = 'append'; },
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
