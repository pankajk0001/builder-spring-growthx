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
    return { state: { ...state, ...replacement, outbox: [], previewReceipt: null, flowVerified: false, finalReplyServerAckVerified: false }, reply: 'The board has changed. Its earlier approval and time are cleared. Please check the new preview before replying APPROVE.' };
  }
  if (['approved', 'cancelled'].includes(state.status)) return { state, reply: null };
  const next = { ...state, processedIds: [...state.processedIds, message.id].slice(-300) };
  const command = message.text.trim().toLowerCase();
  if (['approve', 'confirm'].includes(command) && state.board) {
    const { assertUniqueRoleHolders } = require('./role-uniqueness.cjs');
    try { assertUniqueRoleHolders(state.board); }
    catch (error) { return { state: { ...next, status: 'awaiting_edit', approvedBoardHash: null, postAt: null,
      flowVerified: false, finalReplyServerAckVerified: false, pendingEdits: null }, reply: error.message + '\nPlease send corrections before approving this board.' }; }
  }
  if (command === 'approve' && message.replyTo && state.previewReceipt && message.replyTo !== state.previewReceipt.id) {
    return { state: next, reply: 'That reply refers to an older message. Please check and approve the latest board preview.' };
  }
  if (command === 'cancel') {
    return { state: { ...next, status: 'cancelled', postAt: null, approvedBoardHash: null, pendingEdits: null },
      reply: 'Approval cancelled. Nothing has been posted to the group.' };
  }
  if (command === 'edit') {
    const table = state.board ? 'Role board — table view\n' + require('./role-board.cjs').renderTable(state.board) + '\n\n' : '';
    return { state: { ...next, status: 'awaiting_edit', postAt: null, approvedBoardHash: null, approvedAt: null,
      finalReplyServerAckVerified: false, flowVerified: false, pendingEdits: null },
      reply: table + 'What would you like to change?\nSend all corrections in one message, one per line. For example:\nTimer: Zara Example\nListener: Finn Example\n\nUse Open to reopen a role. Use Speaker 2: Remove to hide Speaker 2 and Evaluator 2. Remaining speakers and evaluators are renumbered. Assign the next speaker number to add a new pair. You can also change Club, Meeting number, Meeting date, or Meeting time.' };
  }
  if (state.status === 'awaiting_edit') {
    const { editBoard } = require('./board-edit.cjs');
    const { renderBoardImage } = require('./board-image.cjs');
    const { createHash } = require('node:crypto');
    let edited, boardHash;
    try {
      const replacements = message.text.split(/[\r\n;]+/).map(line => line.trim()).filter(Boolean);
      const pending = state.pendingEdits;
      const text = pending ? [...pending.validCorrections, ...replacements,
        ...pending.invalidCorrections.slice(replacements.length).map(item => item.line)].join('\n') : message.text;
      edited = editBoard(state, text, { testOnly: state.testOnly === true });
      boardHash = createHash('sha256').update(renderBoardImage(edited).png).digest('hex');
    } catch (error) {
      if (error.invalidCorrections) return {
        state: { ...next, pendingEdits: { validCorrections: error.validCorrections, invalidCorrections: error.invalidCorrections } },
        reply: 'Please correct these lines:\n' + error.invalidCorrections.map((item, i) => `${i + 1}. “${item.line}”\n${item.reason}`).join('\n\n') +
          '\n\nResend only the corrected lines, in the order shown. Your valid corrections are kept; the board will update once every correction is valid.',
      };
      return { state: next, reply: error.message };
    }
    return { state: { ...next, board: edited.board, meeting: edited.meeting, boardHash, status: 'awaiting_approval',
      postAt: null, approvedBoardHash: null, approvedAt: null, previewReceipt: null, finalReplyServerAckVerified: false, flowVerified: false,
      editCount: (state.editCount || 0) + 1, lastEditedField: edited.changedField, lastEditedFields: edited.changedFields, pendingEdits: null }, preview: true,
      reply: `Updated ${edited.changedField}. Earlier approval and posting time are cleared.\nCheck this new preview, then reply APPROVE, EDIT, or CANCEL.` };
  }
  if (state.status === 'awaiting_approval') {
    if (command !== 'approve') return { state: next, reply: 'Check the board image, then reply APPROVE to approve it, EDIT to correct it, or CANCEL.' };
    return { state: { ...next, status: 'awaiting_time' },
      reply: `What date and time should this board be posted?\nUse India time and a 24-hour clock, for example: ${dateExample(now)}.` };
  }
  if (state.status === 'awaiting_time') {
    let postAt;
    try { postAt = parseIndiaTime(message.text, now); }
    catch (error) { return { state: next, reply: error.message }; }
    return { state: { ...next, status: 'awaiting_confirmation', postAt },
      reply: `Confirm these details:\nBoard: the exact image you approved\nGroup: Test_group\nTime: ${describeTime(postAt)}\n\nReply CONFIRM to save this approval, EDIT to correct the board, or CANCEL. Nothing has been posted.` };
  }
  if (state.status === 'awaiting_confirmation') {
    if (command !== 'confirm') return { state: next, reply: 'Reply CONFIRM to save the displayed date and time, EDIT to correct the board, or CANCEL.' };
    if (Date.parse(state.postAt) <= now) return { state: { ...next, status: 'awaiting_time', postAt: null },
      reply: 'That time has passed while awaiting confirmation. Please choose a new future date and time.' };
    return { state: { ...next, status: 'approved', approvedBoardHash: state.boardHash, approvedAt: new Date(now).toISOString() },
      reply: `Approval saved for Test_group: ${describeTime(state.postAt)}.\nNothing has been posted. Group posting will be connected in the next milestone.` };
  }
  throw new Error('Unknown approval stage.');
}

module.exports = { createApprovalRequest, applyApprovalMessage, parseIndiaTime, describeTime };
