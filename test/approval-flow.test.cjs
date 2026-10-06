const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApprovalRequest, applyApprovalMessage, parseIndiaTime } = require('../src/approval-flow.cjs');
const secretary = '15550000001@s.whatsapp.net';
const hash = 'a'.repeat(64);
const now = Date.parse('2026-10-07T00:00:00Z');
const start = () => createApprovalRequest({ secretaryId: secretary, boardHash: hash, requestId: 'fictional-approval', now });
function send(state, text, id = `fictional-${text}`) {
  return applyApprovalMessage(state, { id, chatId: secretary, senderId: secretary, text }, hash, now);
}

test('approval, selected India time, and final confirmation are separate steps', () => {
  let state = start();
  assert.equal(state.status, 'awaiting_approval');
  state = send(state, 'APPROVE').state;
  assert.equal(state.status, 'awaiting_time');
  state = send(state, '2026-10-08 20:00').state;
  assert.equal(state.status, 'awaiting_confirmation');
  assert.equal(state.postAt, '2026-10-08T14:30:00.000Z');
  const result = send(state, 'CONFIRM');
  assert.equal(result.state.status, 'approved');
  assert.equal(result.state.approvedBoardHash, hash);
  assert.match(result.reply, /India time/);
  assert.match(result.reply, /Nothing has been posted/);
});
test('another person or a group cannot approve the board', () => {
  const state = start();
  for (const message of [
    { chatId: secretary, senderId: '15550000002@s.whatsapp.net' },
    { chatId: '123456789000000@g.us', senderId: secretary },
  ]) {
    const result = applyApprovalMessage(state, { ...message, id: 'fictional-unauthorized', text: 'APPROVE' }, hash, now);
    assert.deepEqual(result.state, state);
    assert.equal(result.reply, null);
  }
});
test('a changed board invalidates the old approval and chosen time', () => {
  let state = send(start(), 'APPROVE').state;
  state = send(state, '2026-10-08 20:00').state;
  const result = applyApprovalMessage(state, { id: 'fictional-confirm', senderId: secretary, chatId: secretary, text: 'CONFIRM' }, 'b'.repeat(64), now);
  assert.equal(result.state.status, 'awaiting_approval');
  assert.equal(result.state.postAt, null);
  assert.equal(result.state.approvedBoardHash, null);
});
test('past times, ambiguous times, and impossible dates cannot be saved', () => {
  for (const text of ['2026-10-06 20:00', 'tomorrow at eight', '2026-02-30 20:00', '2026-10-08 25:00']) {
    assert.throws(() => parseIndiaTime(text, now));
    const state = send(start(), 'APPROVE').state;
    assert.equal(send(state, text).state.status, 'awaiting_time');
  }
});
test('duplicate WhatsApp events cannot advance the conversation twice', () => {
  const first = send(start(), 'APPROVE', 'fictional-one');
  const duplicate = send(first.state, 'APPROVE', 'fictional-one');
  assert.deepEqual(duplicate.state, first.state);
  assert.equal(duplicate.reply, null);
});
test('cancel clears the selected time and never approves a board', () => {
  let state = send(start(), 'APPROVE').state;
  state = send(state, '2026-10-08 20:00').state;
  state = send(state, 'CANCEL').state;
  assert.equal(state.status, 'cancelled');
  assert.equal(state.postAt, null);
  assert.equal(state.approvedBoardHash, null);
});
test('an expired confirmation requires choosing a new future time', () => {
  let state = send(start(), 'APPROVE').state;
  state = send(state, '2026-10-08 20:00').state;
  const result = applyApprovalMessage(state, { id: 'fictional-late-confirm', chatId: secretary, senderId: secretary, text: 'CONFIRM' }, hash, Date.parse('2026-10-08T15:00:00Z'));
  assert.equal(result.state.status, 'awaiting_time');
  assert.equal(result.state.postAt, null);
});
