const { createHash } = require('node:crypto');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { assertPrivateSendReceipt } = require('./note-delivery.cjs');

async function sendBoardImage(sock, destination, png, caption, isGroup = false) {
  if (!Buffer.isBuffer(png) || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('A PNG board image is required.');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  const image = await loadImage(png);
  const thumbnail = createCanvas(320, 320);
  const context = thumbnail.getContext('2d');
  const factor = Math.min(320 / width, 320 / height);
  context.fillStyle = '#064763'; context.fillRect(0, 0, 320, 320);
  context.drawImage(image, (320 - width * factor) / 2, (320 - height * factor) / 2, width * factor, height * factor);
  const jpegThumbnail = thumbnail.encodeSync('jpeg', 90);
  const receipt = await sock.sendMessage(destination, { image: png, mimetype: 'image/png', caption, width, height, jpegThumbnail });
  if (isGroup) {
    if (!receipt?.key?.id || receipt.key.remoteJid !== destination || receipt.key.fromMe !== true) throw new Error("WhatsApp did not confirm the test group destination.");
  } else assertPrivateSendReceipt(receipt, destination);
  const sentImage = receipt.message?.imageMessage;
  const sha256 = createHash('sha256').update(png).digest();
  if (!sentImage || sentImage.caption !== caption || !sentImage.fileSha256 || !sha256.equals(Buffer.from(sentImage.fileSha256))) {
    throw new Error('WhatsApp did not confirm the exact board image and caption.');
  }
  if (sentImage.width !== width || sentImage.height !== height || !sentImage.jpegThumbnail || !jpegThumbnail.equals(Buffer.from(sentImage.jpegThumbnail))) {
    throw new Error('WhatsApp did not confirm the full-board thumbnail and image dimensions.');
  }
  return { id: receipt.key.id, sha256: sha256.toString('hex'), chatPreviewVerified: true };
}

async function sendPrivateBoardPreview(sock, secretaryId, png, caption) {
  if (!/^\d+@s\.whatsapp\.net$/.test(secretaryId)) throw new Error('Only the paired Secretary self-chat is allowed for previews.');
  return sendBoardImage(sock, secretaryId, png, caption);
}
async function sendTestGroupBoard(sock, target, png, caption) {
  if (target.name !== 'Test_group' || !/^\d+(?:-\d+)?@g\.us$/.test(target.groupId)) throw new Error('Only Test_group is allowed.');
  const metadata = await sock.groupMetadata(target.groupId);
  if (metadata.subject !== 'Test_group') throw new Error('The destination is no longer Test_group.');
  return sendBoardImage(sock, target.groupId, png, caption, true);
}
module.exports = { sendPrivateBoardPreview, sendTestGroupBoard };
