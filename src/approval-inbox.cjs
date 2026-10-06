// Accept only fresh, phone-originated self-chat events, never helper prompts,
// old history, other DMs, or group messages. Real chat text is never logged.
function secretaryCommand(event, { secretaryId, secretaryLid, startedAt, ownIds }) {
  if (event.type !== 'notify') return null;
  const message = event.message;
  const chat = message?.key?.remoteJid;
  if (chat !== secretaryId && (!secretaryLid || chat !== secretaryLid)) return null;
  if (message.key.fromMe !== true || !message.key.id || ownIds.has(message.key.id)) return null;
  const timestamp = Number(message.messageTimestamp) * 1000;
  if (!Number.isFinite(timestamp) || timestamp < Math.floor(startedAt / 1000) * 1000) return null;
  const body = event.content;
  const text = body?.conversation ?? body?.extendedTextMessage?.text;
  if (typeof text !== 'string' || !text.trim() || text.length > 200 || text.startsWith('the helper —')) return null;
  return { id: message.key.id, chatId: secretaryId, senderId: secretaryId, text };
}
module.exports = { secretaryCommand };
