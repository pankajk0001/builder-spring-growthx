const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildBoardDelivery, assertTestDestination, assertPrivateSendReceipt } = require('../src/note-delivery.cjs');
const { updateBoard } = require('../src/role-board.cjs');
const fixture = require('./fixtures/milestone-1.cjs');

test('unclear replies go only to the Secretary, with the original fictional message', () => {
  const result = updateBoard(fixture.board, fixture.messages, fixture.decisions);
  const delivery = buildBoardDelivery(result, fixture.messages);
  assert.doesNotMatch(delivery.groupText, /Secretary|clarify|Lena Example|Count me in/);
  assert.match(delivery.groupText, /Timer is already taken by Mira Example/);
  assert.match(delivery.secretaryText, /Lena Example/);
  assert.match(delivery.secretaryText, /Count me in for that one/);
  assert.match(delivery.secretaryText, /No role was changed/);
});

test('a clear conversation needs no private clarification message', () => {
  const delivery = buildBoardDelivery({ board: fixture.expected, notes: [] }, fixture.messages);
  assert.equal(delivery.secretaryText, null);
});

test('blocks sending a private clarification to any other person or group', () => {
  const group = '123456789000000@g.us';
  const secretary = '15550000001@s.whatsapp.net';
  assert.doesNotThrow(() => assertTestDestination(group, group, secretary));
  assert.doesNotThrow(() => assertTestDestination(secretary, group, secretary));
  assert.throws(() => assertTestDestination('15550000002@s.whatsapp.net', group, secretary), /Blocked/);
  assert.throws(() => assertTestDestination('123456789000001@g.us', group, secretary), /Blocked/);
});

test('a confirmed private send does not require an echo from the group message stream', () => {
  const secretary = '15550000001@s.whatsapp.net';
  assert.doesNotThrow(() => assertPrivateSendReceipt({ key: {
    id: 'fictional-private-receipt', remoteJid: secretary, fromMe: true,
  } }, secretary));
  assert.throws(() => assertPrivateSendReceipt({ key: {
    id: 'fictional-private-receipt', remoteJid: '15550000002@s.whatsapp.net', fromMe: true,
  } }, secretary), /did not confirm/);
  assert.throws(() => assertPrivateSendReceipt({ key: { remoteJid: secretary, fromMe: true } }, secretary), /did not confirm/);
});
