const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderSource, parseSource } = require('../src/test-transcript.cjs');
const fixture = require('./fixtures/milestone-1.cjs');

test('reads the board and fictional messages back from the posted text', () => {
  assert.deepEqual(parseSource(renderSource(fixture.board, fixture.messages)), {
    board: fixture.board, messages: fixture.messages,
  });
});

test('rejects ordinary chatter and incomplete test transcripts', () => {
  assert.throws(() => parseSource('An unrelated fictional message.'), /Not a fictional/);
  assert.throws(() => parseSource('the helper — MADE-UP TEST\nMissing the board.'), /incomplete/);
});
