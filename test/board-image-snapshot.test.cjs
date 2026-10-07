const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderBoardImage } = require('../src/board-image.cjs');
const { captureImageSnapshot } = require('../src/board-image-snapshot.cjs');
const fixture = require('./fixtures/milestone-3.cjs');

test('a moved approved board retains its exact PNG bytes and role positions', () => {
  const rendered = renderBoardImage(fixture);
  const imageSnapshot = captureImageSnapshot(fixture, rendered);
  const restored = renderBoardImage({ ...structuredClone(fixture), imageSnapshot: JSON.parse(JSON.stringify(imageSnapshot)) });
  assert.deepEqual(restored, rendered);
});

test('editing a role or meeting detail cannot reuse the old approved image', () => {
  const rendered = renderBoardImage(fixture);
  const imageSnapshot = captureImageSnapshot(fixture, rendered);
  const changed = structuredClone(fixture);
  changed.board.find(row => row.role === 'Timer').member = 'Zara Example';
  assert.notDeepEqual(renderBoardImage({ ...changed, imageSnapshot }).png, rendered.png);
  changed.meeting.date = '12 October 2026';
  assert.deepEqual(renderBoardImage({ ...changed, imageSnapshot }), renderBoardImage(changed));
});

test('a corrupted preserved image blocks sending instead of silently changing approval', () => {
  const imageSnapshot = captureImageSnapshot(fixture, renderBoardImage(fixture));
  imageSnapshot.pngBase64 = Buffer.from('broken image').toString('base64');
  assert.throws(() => renderBoardImage({ ...fixture, imageSnapshot }), /preserved board image/);
});

test('an identical correction keeps the preserved image used by its resulting state', () => {
  const { createHash } = require('node:crypto');
  const { applyApprovalMessage } = require('../src/approval-flow.cjs');
  const rendered = renderBoardImage(fixture);
  // PNG decoders ignore bytes after IEND; this represents a different encoding
  // of the same reviewed image, as happens when the render platform changes.
  rendered.png = Buffer.concat([rendered.png, Buffer.from('preserved-encoding')]);
  const imageSnapshot = captureImageSnapshot(fixture, rendered);
  const state = { ...structuredClone(fixture), imageSnapshot, status: 'awaiting_edit',
    boardHash: imageSnapshot.sha256, secretaryId: 'fictional-secretary', processedIds: [], testOnly: true };
  const message = { id: 'fictional-identical-edit', chatId: state.secretaryId,
    senderId: state.secretaryId, text: `Meeting time: ${fixture.meeting.time}` };
  const result = applyApprovalMessage(state, message, state.boardHash);
  assert.equal(result.preview, true);
  assert.equal(result.state.boardHash, createHash('sha256').update(renderBoardImage(result.state).png).digest('hex'));
  assert.equal(result.state.boardHash, imageSnapshot.sha256);
});
