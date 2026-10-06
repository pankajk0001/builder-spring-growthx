const { test } = require('node:test');
const assert = require('node:assert/strict');
const { updateBoard, renderTable } = require('../src/role-board.cjs');
const fixture = require('./fixtures/milestone-1.cjs');

test('fictional conversation updates the board, protects a filled role, and asks about ambiguity', () => {
  const original = structuredClone(fixture.board);
  const result = updateBoard(fixture.board, fixture.messages, fixture.decisions);
  assert.deepEqual(result.board, fixture.expected);
  assert.deepEqual(fixture.board, original);
  assert.deepEqual(result.notes.map(note => note.kind), ['conflict', 'clarify']);
});

test('a person cannot release another person\'s role', () => {
  const result = updateBoard([{ role: 'Timer', member: 'Mira Example' }],
    [{ id: 'fake-1', sender: 'Noel Example', text: 'Drop Timer.' }],
    [{ messageId: 'fake-1', intent: 'drop', role: 'Timer' }]);
  assert.equal(result.board[0].member, 'Mira Example');
  assert.equal(result.notes[0].kind, 'clarify');
});

test('a withdrawal leaves a role open until someone takes it', () => {
  const result = updateBoard([{ role: 'Timer', member: 'Mira Example' }],
    [{ id: 'fake-1', sender: 'Mira Example', text: 'I cannot do Timer.' }],
    [{ messageId: 'fake-1', intent: 'drop', role: 'Timer' }]);
  assert.equal(result.board[0].member, null);
});

test('unknown roles need Secretary clarification', () => {
  const result = updateBoard([{ role: 'Timer', member: null }],
    [{ id: 'fake-1', sender: 'Mira Example', text: 'I will take helper.' }],
    [{ messageId: 'fake-1', intent: 'take', role: 'Helper' }]);
  assert.equal(result.board[0].member, null);
  assert.equal(result.notes[0].kind, 'clarify');
});

test('rejects more than 300 messages before interpreting them', () => {
  const messages = Array.from({ length: 301 }, (_, i) => ({ id: `fake-${i}`, sender: 'Mira Example', text: 'Hello.' }));
  assert.throws(() => updateBoard(fixture.board, messages, []), /at most 300/);
});

test('missing, reordered, or invented AI decisions are rejected', () => {
  assert.throws(() => updateBoard(fixture.board, fixture.messages, []), /exactly one/);
  const decisions = structuredClone(fixture.decisions);
  decisions[0].messageId = 'invented';
  assert.throws(() => updateBoard(fixture.board, fixture.messages, decisions), /IDs and order/);
});

test('renders open and filled roles as a WhatsApp text table', () => {
  const text = renderTable(fixture.expected);
  assert.ok(text.startsWith('```\n'));
  assert.match(text, /Timer\s+\| Mira Example/);
  assert.match(text, /Listener\s+\| Open/);
});
