const { test } = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('./fixtures/milestone-3.cjs');
const { renderBoardImage } = require('../src/board-image.cjs');

test('every board holder appears in exactly their named slot, with open roles preserved', () => {
  const original = structuredClone(fixture);
  const rendered = renderBoardImage(fixture);
  assert.deepEqual(fixture, original);
  assert.equal(rendered.cells.length, fixture.board.length);
  for (const row of fixture.board) {
    const cells = rendered.cells.filter(cell => cell.role === row.role);
    assert.equal(cells.length, 1);
    assert.equal(cells[0].holder, row.member ?? 'Open');
  }
  assert.equal(rendered.png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(rendered.png.readUInt32BE(16), rendered.width);
  assert.equal(rendered.png.readUInt32BE(20), rendered.height);
});
test('the image stays square, including when long names need taller rows', () => {
  const regular = renderBoardImage(fixture);
  assert.equal(regular.width, regular.height);
  const long = structuredClone(fixture);
  long.board.find(row => row.role === 'Speaker 1').member = 'Alexandria Very Long Fictional Participant With Several Additional Made Up Names Example';
  const expanded = renderBoardImage(long);
  assert.equal(expanded.width, expanded.height);
  assert.ok(expanded.cells.every(cell => cell.bottom <= cell.rowBottom));
});
test('speakers and their numbered evaluators share a row without mixing names', () => {
  const result = renderBoardImage(fixture);
  for (let i = 1; i <= 3; i++) {
    const speaker = result.cells.find(cell => cell.role === `Speaker ${i}`);
    const evaluator = result.cells.find(cell => cell.role === `Evaluator ${i}`);
    assert.equal(speaker.row, evaluator.row);
    assert.ok(speaker.bottom <= evaluator.top);
  }
});
test('long names wrap inside their own cell rather than hiding or crossing into another row', () => {
  const input = structuredClone(fixture);
  input.board.find(row => row.role === 'Speaker 1').member = 'Alexandria Very Long Fictional Participant With Several Additional Made Up Names Example';
  const result = renderBoardImage(input);
  const cell = result.cells.find(cell => cell.role === 'Speaker 1');
  assert.ok(cell.lines.length > 1);
  assert.equal(cell.lines.join(' '), cell.holder);
  assert.ok(result.cells.every(cell => cell.measuredWidths.every(width => width <= cell.width)));
  assert.ok(result.cells.every(cell => cell.top >= cell.rowTop && cell.bottom <= cell.rowBottom));
});
test('a role with no matching layout slot or duplicate role cannot disappear silently', () => {
  assert.throws(() => renderBoardImage({ ...fixture, board: [...fixture.board, { role: 'Unknown Role', member: 'Noel Example' }] }), /layout slot/);
  assert.throws(() => renderBoardImage({ ...fixture, board: [...fixture.board, fixture.board[0]] }), /unique/);
  assert.throws(() => renderBoardImage({ ...fixture, board: fixture.board.filter(row => row.role !== 'Evaluator 3') }), /Every layout slot/);
});
