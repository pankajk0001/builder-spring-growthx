const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { renderBoardImage } = require('../src/board-image.cjs');
const { sendPrivateBoardPreview } = require('../src/preview-delivery.cjs');
const fixture = require('./fixtures/milestone-3.cjs');
const secretary = '15550000001@s.whatsapp.net';

test('the board preview goes only to self-chat, with the exact image and caption', async () => {
  const { png } = renderBoardImage(fixture);
  const destinations = [];
  const socket = { sendMessage: async (destination, payload) => {
    destinations.push(destination);
    return { key: { id: 'fictional-preview', fromMe: true, remoteJid: destination },
      message: { imageMessage: { caption: payload.caption, fileSha256: createHash('sha256').update(payload.image).digest() } } };
  } };
  const result = await sendPrivateBoardPreview(socket, secretary, png, 'Fictional preview');
  assert.deepEqual(destinations, [secretary]);
  assert.equal(result.sha256, createHash('sha256').update(png).digest('hex'));
  await assert.rejects(sendPrivateBoardPreview(socket, '123456789000000@g.us', png, 'Fictional preview'), /Only the paired/);
  assert.equal(destinations.length, 1);
});
test('a different image or destination in the send receipt cannot be marked verified', async () => {
  const { png } = renderBoardImage(fixture);
  const receipt = { key: { id: 'fictional-preview', fromMe: true, remoteJid: secretary },
    message: { imageMessage: { caption: 'Fictional preview', fileSha256: Buffer.alloc(32) } } };
  await assert.rejects(sendPrivateBoardPreview({ sendMessage: async () => receipt }, secretary, png, 'Fictional preview'), /exact board image/);
  receipt.key.remoteJid = '15550000002@s.whatsapp.net';
  await assert.rejects(sendPrivateBoardPreview({ sendMessage: async () => receipt }, secretary, png, 'Fictional preview'), /paired Secretary/);
});
