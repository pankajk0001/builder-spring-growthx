const { test } = require('node:test');
const assert = require('node:assert/strict');
const { respondToRoles } = require('../src/role-availability.cjs');
const board = [{ role: 'Timer', member: 'Mira Example' }, { role: 'Listener', member: null }];
function run(intent, role, sender = 'Noel Example') {
  return respondToRoles(board, [{ id: 'fictional-1', sender, text: role || 'That one' }],
    [{ messageId: 'fictional-1', intent, role }]);
}
test('a filled role names its holder and never replaces them', () => {
  const result = run('take', 'Timer');
  assert.deepEqual(result.board, board);
  assert.equal(result.replies[0].text, 'The Timer role is taken by Mira Example.');
});
test('asking availability leaves an open role open', () => {
  const result = run('check', 'Listener');
  assert.deepEqual(result.board, board);
  assert.equal(result.replies[0].text, 'The Listener role is open.');
});
test('an explicit claim fills an open role before the next request', () => {
  const messages = ['Noel Example', 'Iris Example'].map((sender, i) => ({ id: `fictional-${i}`, sender, text: 'Listener' }));
  const result = respondToRoles(board, messages, messages.map(m => ({ messageId: m.id, intent: 'take', role: 'Listener' })));
  assert.equal(result.board[1].member, 'Noel Example');
  assert.deepEqual(result.replies.map(r => r.text), ['The Listener role is yours, Noel Example.', 'The Listener role is taken by Noel Example.']);
});
test('an unclear or unknown role produces only a private clarification', () => {
  for (const result of [run('clarify'), run('check', 'Bookmaster')]) {
    assert.deepEqual(result.board, board);
    assert.equal(result.replies.length, 0);
    assert.equal(result.notes[0].kind, 'clarify');
  }
});
test('an availability question names the current holder without changing the board', () => {
  assert.equal(run('check', 'Timer').replies[0].text, 'The Timer role is taken by Mira Example.');
});
test('unrelated chatter gets no role reply', () => {
  assert.equal(run('ignore').replies.length, 0);
});
test('a valid withdrawal makes the next availability check see an open role', () => {
  const messages = [
    { id: 'fictional-1', sender: 'Mira Example', text: 'I cannot do Timer.' },
    { id: 'fictional-2', sender: 'Noel Example', text: 'Is Timer open?' },
  ];
  const result = respondToRoles(board, messages, [
    { messageId: 'fictional-1', intent: 'drop', role: 'Timer' },
    { messageId: 'fictional-2', intent: 'check', role: 'Timer' },
  ]);
  assert.equal(result.board[0].member, null);
  assert.equal(result.replies[1].text, 'The Timer role is open.');
});
test('invented or missing message decisions cannot change the board', () => {
  const messages = [{ id: 'fictional-1', sender: 'Noel Example', text: 'Listener' }];
  assert.throws(() => respondToRoles(board, messages, []), /exactly one/);
  assert.throws(() => respondToRoles(board, messages, [{ messageId: 'invented', intent: 'take', role: 'Listener' }]), /IDs and order/);
});
test('mixed everyday chatter does not change roles or produce replies', () => {
  const mixed = require('./fixtures/mixed-chatter.cjs');
  const roleDecisions = ['check', 'take', 'take', 'take', 'check', 'clarify'];
  const roleNames = ['Listener', 'Timer', 'Listener', 'Listener', 'Timer'];
  let index = 0;
  const decisions = mixed.messages.map(message => {
    if (mixed.chatterIds.includes(message.id)) return { messageId: message.id, intent: 'ignore' };
    const i = index++;
    return { messageId: message.id, intent: roleDecisions[i], role: roleNames[i] };
  });
  const result = respondToRoles(mixed.board, mixed.messages, decisions);
  assert.deepEqual(result.board, mixed.expected);
  assert.deepEqual(result.replies.map(reply => reply.text), mixed.expectedReplies);
  assert.ok(result.replies.every(reply => !mixed.chatterIds.includes(reply.messageId)));
  assert.deepEqual(result.notes.map(note => note.kind), ['clarify']);
});
