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
test('EDIT before approval asks for a correction and invalidates any chosen time', () => {
  let state = send(start(), 'APPROVE').state;
  state = send(state, '2026-10-08 20:00').state;
  const result = send(state, 'EDIT');
  assert.equal(result.state.status, 'awaiting_edit');
  assert.equal(result.state.postAt, null);
  assert.equal(result.state.approvedBoardHash, null);
  assert.match(result.reply, /Timer: Zara Example/);
});
test('EDIT includes the current roles table before correction instructions', () => {
  const fixture = require('./fixtures/milestone-3.cjs');
  const state = { ...start(), ...structuredClone(fixture) };
  state.board.find(row => row.role === 'Timer').member = 'Zara Example';
  const result = send(state, 'EDIT');
  assert.match(result.reply, /Timer\s+\| Zara Example/);
  assert.ok(result.reply.indexOf('Role board — table view') < result.reply.indexOf('What would you like to change?'));
  assert.deepEqual(result.state.board, state.board);
  assert.equal(result.preview, undefined);
});
test('a correction generates a new image hash and requires fresh approval', () => {
  const fixture = require('./fixtures/milestone-3.cjs');
  let state = { ...start(), ...structuredClone(fixture) };
  state = send(state, 'EDIT').state;
  const result = send(state, 'Timer: Zara Example');
  assert.equal(result.state.status, 'awaiting_approval');
  assert.equal(result.state.board.find(row => row.role === 'Timer').member, 'Zara Example');
  assert.notEqual(result.state.boardHash, hash);
  assert.equal(result.state.approvedBoardHash, null);
  assert.equal(result.preview, true);
  const staleConfirm = applyApprovalMessage(result.state, { id: 'fictional-stale-confirm', chatId: secretary, senderId: secretary, text: 'CONFIRM' }, result.state.boardHash, now);
  assert.equal(staleConfirm.state.status, 'awaiting_approval');
});
test('an invalid correction remains in editing and preserves the board', () => {
  const fixture = require('./fixtures/milestone-3.cjs');
  let state = { ...start(), ...structuredClone(fixture) };
  state = send(state, 'EDIT').state;
  const result = send(state, 'Something: Zara Example');
  assert.equal(result.state.status, 'awaiting_edit');
  assert.deepEqual(result.state.board, fixture.board);
  assert.equal(result.preview, undefined);
});
test('approving a quoted old preview cannot approve the corrected board', () => {
  const state = { ...start(), previewReceipt: { id: 'fictional-new-preview' } };
  const result = applyApprovalMessage(state, { id: 'fictional-old-reply', chatId: secretary, senderId: secretary,
    text: 'APPROVE', replyTo: 'fictional-old-preview' }, hash, now);
  assert.equal(result.state.status, 'awaiting_approval');
  assert.match(result.reply, /latest board preview/);
});
test('after an edit survives saving, approval binds to the corrected image and requires a new time', () => {
  const fixture = require('./fixtures/milestone-3.cjs');
  let state = { ...start(), ...structuredClone(fixture) };
  state = send(state, 'EDIT').state;
  state = JSON.parse(JSON.stringify(send(state, 'Timer: Zara Example').state));
  const correctedHash = state.boardHash;
  const command = (text, id) => {
    state = applyApprovalMessage(state, { id, chatId: secretary, senderId: secretary, text }, correctedHash, now).state;
  };
  command('APPROVE', 'fictional-approve-new');
  assert.equal(state.status, 'awaiting_time');
  command('2026-10-08 21:00', 'fictional-time-new');
  command('CONFIRM', 'fictional-confirm-new');
  assert.equal(state.approvedBoardHash, correctedHash);
  assert.equal(state.postAt, '2026-10-08T15:30:00.000Z');
});
test('a batch of corrections produces one new preview and rejects the whole batch on an invalid field', () => {
  const fixture = require('./fixtures/milestone-3.cjs');
  let state = { ...start(), ...structuredClone(fixture) };
  state = send(state, 'EDIT').state;
  const invalid = send(state, 'Timer: Zara Example\nMissing Role: Finn Example');
  assert.equal(invalid.state.status, 'awaiting_edit');
  assert.deepEqual(invalid.state.board, fixture.board);
  assert.equal(invalid.state.boardHash, hash);
  assert.equal(invalid.preview, undefined);
  const valid = send(state, 'Timer: Zara Example\nListener: Finn Example');
  assert.equal(valid.preview, true);
  assert.equal(valid.state.editCount, 1);
  assert.deepEqual(valid.state.lastEditedFields, ['Timer', 'Listener']);
  assert.equal(valid.state.postAt, null);
});
test('the helper quotes an invalid correction and retains valid lines for the retry', () => {
  const fixture = require('./fixtures/milestone-3.cjs');
  let state = { ...start(), ...structuredClone(fixture) };
  state = send(state, 'EDIT').state;
  const invalid = send(state, 'Timer: Zara Example\nMeeting time: 25:10');
  assert.match(invalid.reply, /Meeting time: 25:10/);
  assert.deepEqual(invalid.state.board, fixture.board);
  assert.deepEqual(invalid.state.pendingEdits.validCorrections, ['Timer: Zara Example']);
  const retry = send(invalid.state, 'Meeting time: 15:45');
  assert.equal(retry.preview, true);
  assert.equal(retry.state.board.find(row => row.role === 'Timer').member, 'Zara Example');
  assert.equal(retry.state.meeting.time, '3:45 PM');
  assert.equal(retry.state.pendingEdits, null);
});
test('correcting one of two invalid lines keeps the other unresolved and sends no preview yet', () => {
  const fixture = require('./fixtures/milestone-3.cjs');
  let state = { ...start(), ...structuredClone(fixture) };
  state = send(state, 'EDIT').state;
  state = send(state, 'Timer: Zara Example\nMeeting time: 25:10\nMeeting date: 2026-02-30').state;
  const partial = send(state, 'Meeting time: 15:45');
  assert.equal(partial.state.status, 'awaiting_edit');
  assert.equal(partial.preview, undefined);
  assert.match(partial.reply, /Meeting date: 2026-02-30/);
  const complete = send(partial.state, 'Meeting date: 2026-10-18');
  assert.equal(complete.preview, true);
  assert.equal(complete.state.meeting.time, '3:45 PM');
  assert.equal(complete.state.meeting.date, '18 October 2026');
});
