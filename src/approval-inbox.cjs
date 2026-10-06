function isSecretaryChat(jid, { secretaryId, secretaryLid }) {
  if (typeof jid !== 'string') return false;
  const normalized = jid.replace(/:\d+(?=@(?:s\.whatsapp\.net|lid)$)/, '');
  return normalized === secretaryId || Boolean(secretaryLid && normalized === secretaryLid);
}
// A phone command may arrive as notify or as an offline append event.
// Its timestamp must belong to this request; real chat text is never logged.
function secretaryCommand(event, { secretaryId, secretaryLid, startedAt, ownIds }) {
  if (!['notify', 'append'].includes(event.type)) return null;
  const message = event.message;
  const chat = message?.key?.remoteJid;
  if (!isSecretaryChat(chat, { secretaryId, secretaryLid })) return null;
  if (message.key.fromMe !== true || !message.key.id || ownIds.has(message.key.id)) return null;
  const timestamp = Number(message.messageTimestamp) * 1000;
  if (!Number.isFinite(timestamp) || timestamp < Math.floor(startedAt / 1000) * 1000) return null;
  const body = event.content;
  const text = body?.conversation ?? body?.extendedTextMessage?.text;
  if (typeof text !== 'string' || !text.trim() || text.length > 5000 || text.startsWith('the helper —')) return null;
  return { id: message.key.id, chatId: secretaryId, senderId: secretaryId, text,
    replyTo: body?.extendedTextMessage?.contextInfo?.stanzaId || null };
}
module.exports = { secretaryCommand, isSecretaryChat };
