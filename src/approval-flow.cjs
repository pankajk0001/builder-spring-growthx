const TIME_ZONE = 'Asia/Kolkata';
const HASH = /^[a-f0-9]{64}$/;
const SELF_CHAT = /^\d+@s\.whatsapp\.net$/;

function createApprovalRequest({ secretaryId, boardHash, requestId, now = Date.now() }) {
  if (!SELF_CHAT.test(secretaryId) || !HASH.test(boardHash) || typeof requestId !== 'string' || !requestId) {
    throw new Error('A Secretary, exact preview hash, and request ID are required.');
  }
  return { requestId, secretaryId, boardHash, status: 'awaiting_approval', postAt: null,
    approvedBoardHash: null, timeZone: TIME_ZONE, startedAt: now, processedIds: [] };
}

function dateExample(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(now + 86400000));
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')} 20:00`;
}

function parseIndiaTime(text, now = Date.now()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(text.trim());
  if (!match) throw new Error(`Use a date and 24-hour time, like ${dateExample(now)} (India time).`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (year < 1000 || local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1 ||
      local.getUTCDate() !== day || local.getUTCHours() !== hour || local.getUTCMinutes() !== minute) {
    throw new Error('That date or time does not exist. Please choose a valid date and time.');
  }
  const utc = new Date(local.getTime() - 330 * 60000);
  if (utc.getTime() <= now) throw new Error('That time has already passed. Please choose a future date and time.');
  return utc.toISOString();
}

function describeTime(postAt) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(postAt)) + ' India time (IST)';
}

function applyApprovalMessage(state, message, currentBoardHash, now = Date.now()) {
  if (message?.chatId !== state.secretaryId || message.senderId !== state.secretaryId ||
      typeof message.id !== 'string' || !message.id || typeof message.text !== 'string') return { state, reply: null };
  if (state.processedIds.includes(message.id)) return { state, reply: null };
  if (!HASH.test(currentBoardHash)) throw new Error('An exact board preview hash is required.');
  if (currentBoardHash !== state.boardHash) {
    const replacement = createApprovalRequest({ secretaryId: state.secretaryId, boardHash: currentBoardHash,
      requestId: state.requestId, now });
    replacement.processedIds = [...state.processedIds, message.id].slice(-300);
    return { state: replacement, reply: 'The board has changed. Its earlier approval and time are cleared. Please check the new preview before replying APPROVE.' };
  }
  if (['approved', 'cancelled'].includes(state.status)) return { state, reply: null };
  const next = { ...state, processedIds: [...state.processedIds, message.id].slice(-300) };
  const command = message.text.trim().toLowerCase();
  if (command === 'cancel') {
    return { state: { ...next, status: 'cancelled', postAt: null, approvedBoardHash: null },
      reply: 'Approval cancelled. Nothing has been posted to the group.' };
  }
  if (state.status === 'awaiting_approval') {
    if (command !== 'approve') return { state: next, reply: 'Check the board image, then reply APPROVE to approve it, or CANCEL.' };
    return { state: { ...next, status: 'awaiting_time' },
      reply: `What date and time should this board be posted?\nUse India time and a 24-hour clock, for example: ${dateExample(now)}.` };
  }
  if (state.status === 'awaiting_time') {
    let postAt;
    try { postAt = parseIndiaTime(message.text, now); }
    catch (error) { return { state: next, reply: error.message }; }
    return { state: { ...next, status: 'awaiting_confirmation', postAt },
      reply: `Confirm these details:\nBoard: the exact image you approved\nGroup: Test_group\nTime: ${describeTime(postAt)}\n\nReply CONFIRM to save this approval, or CANCEL. Nothing has been posted.` };
  }
  if (state.status === 'awaiting_confirmation') {
    if (command !== 'confirm') return { state: next, reply: 'Reply CONFIRM to save the displayed date and time, or CANCEL.' };
    if (Date.parse(state.postAt) <= now) return { state: { ...next, status: 'awaiting_time', postAt: null },
      reply: 'That time has passed while awaiting confirmation. Please choose a new future date and time.' };
    return { state: { ...next, status: 'approved', approvedBoardHash: state.boardHash, approvedAt: new Date(now).toISOString() },
      reply: `Approval saved for Test_group: ${describeTime(state.postAt)}.\nNothing has been posted. Group posting will be connected in the next milestone.` };
  }
  throw new Error('Unknown approval stage.');
}

module.exports = { createApprovalRequest, applyApprovalMessage, parseIndiaTime, describeTime };
