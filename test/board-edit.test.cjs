const { test } = require('node:test');
const assert = require('node:assert/strict');
const { editBoard } = require('../src/board-edit.cjs');
const fixture = require('./fixtures/milestone-3.cjs');
test('a Secretary correction changes only the named role, without mutating the source', () => {
  const original = structuredClone(fixture);
  const edited = editBoard(fixture, 'timer: Zara Example');
  assert.equal(edited.board.find(row => row.role === 'Timer').member, 'Zara Example');
  assert.deepEqual(edited.board.filter(row => row.role !== 'Timer'), fixture.board.filter(row => row.role !== 'Timer'));
  assert.deepEqual(fixture, original);
});
test('the Secretary can reopen a role or correct a numbered evaluator independently', () => {
  assert.equal(editBoard(fixture, 'Timer: Open').board.find(row => row.role === 'Timer').member, null);
  const edited = editBoard(fixture, 'Evaluator 2: Finn Example');
  assert.equal(edited.board.find(row => row.role === 'Evaluator 2').member, 'Finn Example');
  assert.equal(edited.board.find(row => row.role === 'Speaker 2').member, 'Nora Example');
});
test('meeting details can be corrected with validated dates and times', () => {
  assert.equal(editBoard(fixture, 'Club: MADE UP EXAMPLE CLUB').meeting.club, 'MADE UP EXAMPLE CLUB');
  assert.equal(editBoard(fixture, 'Meeting number: 43').meeting.number, '43');
  assert.equal(editBoard(fixture, 'Meeting date: 2026-10-18').meeting.date, '18 October 2026');
  assert.equal(editBoard(fixture, 'Meeting time: 15:45').meeting.time, '3:45 PM');
});
test('unknown fields and impossible meeting details cannot change the board', () => {
  for (const text of ['Noel should do that one', 'Helper: Zara Example', 'Meeting date: 2026-02-30', 'Meeting time: 25:10', 'Meeting number: abc']) {
    assert.throws(() => editBoard(fixture, text));
  }
});
test('several role and meeting corrections can be applied in one message', () => {
  const edited = editBoard(fixture, 'Timer: Zara Example\nListener: Finn Example\nMeeting time: 15:45');
  assert.equal(edited.board.find(row => row.role === 'Timer').member, 'Zara Example');
  assert.equal(edited.board.find(row => row.role === 'Listener').member, 'Finn Example');
  assert.equal(edited.meeting.time, '3:45 PM');
  assert.equal(edited.changedFields.length, 3);
});
test('semicolon-separated corrections also work, and an invalid batch changes nothing', () => {
  const original = structuredClone(fixture);
  const edited = editBoard(fixture, 'Timer: Open; Evaluator 2: Finn Example');
  assert.equal(edited.board.find(row => row.role === 'Timer').member, null);
  assert.equal(edited.board.find(row => row.role === 'Evaluator 2').member, 'Finn Example');
  assert.throws(() => editBoard(fixture, 'Timer: Zara Example\nMeeting date: 2026-02-30'));
  assert.deepEqual(fixture, original);
});
test('two conflicting corrections for the same field cannot be guessed', () => {
  assert.throws(() => editBoard(fixture, 'Timer: Zara Example\nTimer: Finn Example'), /appears more than once/);
  assert.throws(() => editBoard(fixture, 'Date: 2026-10-18\nMeeting date: 2026-10-19'), /appears more than once/);
});
test('the live fictional test refuses non-example names and non-example club details', () => {
  assert.throws(() => editBoard(fixture, 'Timer: Unspecified Person', { testOnly: true }), /made-up test name/);
  assert.throws(() => editBoard(fixture, 'Club: Unspecified Club', { testOnly: true }), /made-up club/);
  assert.equal(editBoard(fixture, 'Timer: Open', { testOnly: true }).board.find(row => row.role === 'Timer').member, null);
});
test('ordinary assignment sentences can correct Timer and Listener together',()=>{
 const edited=editBoard(fixture,'Timer is taken by Zara Example and Listener is taken by Finn Example',{testOnly:true});
 assert.equal(edited.board.find(r=>r.role==='Timer').member,'Zara Example');
 assert.equal(edited.board.find(r=>r.role==='Listener').member,'Finn Example');
 assert.deepEqual(edited.changedFields,['Timer','Listener']);
});
test('a shared holder is rejected, while distinct reverse assignments work',()=>{
 assert.throws(()=>editBoard(fixture,'The Timer and Listener roles are taken by Zara Example.',{testOnly:true}),/only one role/);
 const reverse=editBoard(fixture,'Zara Example has taken Timer\nFinn Example will take Listener',{testOnly:true});
 assert.equal(reverse.board.find(r=>r.role==='Timer').member,'Zara Example');
 assert.equal(reverse.board.find(r=>r.role==='Listener').member,'Finn Example');
});
test('uncertain or negated assignment sentences cannot fill a role',()=>{
 for(const text of ['Timer is not taken by Zara Example','Maybe Zara Example has taken Timer','Timer is taken by Zara Example or Finn Example']){
  assert.throws(()=>editBoard(fixture,text,{testOnly:true}));
 }
});
test('Listner spelling in a semicolon batch still updates the Listener slot',()=>{
 const edited=editBoard(fixture,'Timer: Zara Example; Listner: Finn Example',{testOnly:true});
 assert.equal(edited.board.find(r=>r.role==='Timer').member,'Zara Example');
 assert.equal(edited.board.find(r=>r.role==='Listener').member,'Finn Example');
 assert.deepEqual(edited.changedFields,['Timer','Listener']);
 assert.equal(edited.board.length,fixture.board.length);
});
