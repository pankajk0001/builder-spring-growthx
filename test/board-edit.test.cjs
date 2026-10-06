const { test } = require('node:test');
const assert = require('node:assert/strict');
const { editBoard } = require('../src/board-edit.cjs');
const fixture = require('./fixtures/milestone-3.cjs');
test('a Secretary correction changes only the named role, without mutating the source', () => {
  const original = structuredClone(fixture);
  const edited = editBoard(fixture, 'timer: Noel Example');
  assert.equal(edited.board.find(row => row.role === 'Timer').member, 'Noel Example');
  assert.deepEqual(edited.board.filter(row => row.role !== 'Timer'), fixture.board.filter(row => row.role !== 'Timer'));
  assert.deepEqual(fixture, original);
});
test('the Secretary can reopen a role or correct a numbered evaluator independently', () => {
  assert.equal(editBoard(fixture, 'Timer: Open').board.find(row => row.role === 'Timer').member, null);
  const edited = editBoard(fixture, 'Evaluator 2: Pia Example');
  assert.equal(edited.board.find(row => row.role === 'Evaluator 2').member, 'Pia Example');
  assert.equal(edited.board.find(row => row.role === 'Speaker 2').member, 'Nora Example');
});
test('meeting details can be corrected with validated dates and times', () => {
  assert.equal(editBoard(fixture, 'Club: MADE UP EXAMPLE CLUB').meeting.club, 'MADE UP EXAMPLE CLUB');
  assert.equal(editBoard(fixture, 'Meeting number: 43').meeting.number, '43');
  assert.equal(editBoard(fixture, 'Meeting date: 2026-10-18').meeting.date, '18 October 2026');
  assert.equal(editBoard(fixture, 'Meeting time: 15:45').meeting.time, '3:45 PM');
});
test('unknown fields, ambiguous multi-edits, and impossible meeting details cannot change the board', () => {
  for (const text of ['Noel should do that one', 'Helper: Noel Example', 'Timer: Noel Example; Listener: Pia Example', 'Timer: Noel Example\nListener: Pia Example', 'Meeting date: 2026-02-30', 'Meeting time: 25:10', 'Meeting number: abc']) {
    assert.throws(() => editBoard(fixture, text));
  }
});
test('the live fictional test refuses non-example names and non-example club details', () => {
  assert.throws(() => editBoard(fixture, 'Timer: Unspecified Person', { testOnly: true }), /made-up test name/);
  assert.throws(() => editBoard(fixture, 'Club: Unspecified Club', { testOnly: true }), /made-up club/);
  assert.equal(editBoard(fixture, 'Timer: Open', { testOnly: true }).board.find(row => row.role === 'Timer').member, null);
});
