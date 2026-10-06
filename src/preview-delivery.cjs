const { createHash } = require('node:crypto');
const { assertPrivateSendReceipt } = require('./note-delivery.cjs');

async function sendPrivateBoardPreview(sock, secretaryId, png, caption) {
  if (!/^\d+@s\.whatsapp\.net$/.test(secretaryId)) throw new Error('Only the paired Secretary self-chat is allowed for previews.');
  if (!Buffer.isBuffer(png) || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('A PNG board image is required.');
  const receipt = await sock.sendMessage(secretaryId, { image: png, mimetype: 'image/png', caption });
  assertPrivateSendReceipt(receipt, secretaryId);
  const sentImage = receipt.message?.imageMessage;
  const sha256 = createHash('sha256').update(png).digest();
  if (!sentImage || sentImage.caption !== caption || !sentImage.fileSha256 || !sha256.equals(Buffer.from(sentImage.fileSha256))) {
    throw new Error('WhatsApp did not confirm the exact board image and caption.');
  }
  return { id: receipt.key.id, sha256: sha256.toString('hex') };
}

module.exports = { sendPrivateBoardPreview };
