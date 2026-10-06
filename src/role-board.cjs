const RETRY_MESSAGE = 'Please try again in a few minutes.';

function validateInput(board, messages) {
  if (!Array.isArray(board) || board.length === 0) throw new Error('A current board is required.');
  const roles = new Set();
  for (const row of board) {
    if (!row || typeof row.role !== 'string' || !row.role.trim() || roles.has(row.role)) {
      throw new Error('Each role must have a unique, non-empty name.');
    }
    if (row.member !== null && (typeof row.member !== 'string' || !row.member.trim())) {
      throw new Error('A role holder must be a name or null for an open role.');
    }
    roles.add(row.role);
  }
  if (!Array.isArray(messages) || messages.length > 300) throw new Error('Use at most 300 messages.');
  const ids = new Set();
  for (const message of messages) {
    if (!message || typeof message.id !== 'string' || !message.id || ids.has(message.id) ||
        typeof message.sender !== 'string' || !message.sender.trim() ||
        typeof message.text !== 'string' || !message.text.trim()) {
      throw new Error('Each message needs a unique ID, sender, and text.');
    }
    ids.add(message.id);
  }
}

// Hermes extracts intent; these rules decide whether the board may change.
// One decision per message, in the same order as the supplied conversation.
function updateBoard(board, messages, decisions) {
  validateInput(board, messages);
  if (!Array.isArray(decisions) || decisions.length !== messages.length) {
    throw new Error('Every message needs exactly one decision.');
  }
  const updated = board.map(row => ({ ...row }));
  const notes = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const decision = decisions[i];
    if (!decision || decision.messageId !== message.id ||
        !['take', 'drop', 'ignore', 'clarify'].includes(decision.intent)) {
      throw new Error('Decisions must match the original message IDs and order.');
    }
    if (decision.intent === 'ignore') continue;
    if (decision.intent === 'clarify') {
      notes.push({ messageId: message.id, kind: 'clarify', text: `Secretary: please clarify ${message.sender}'s message before changing the board.` });
      continue;
    }
    const row = updated.find(row => row.role === decision.role);
    if (!row) {
      notes.push({ messageId: message.id, kind: 'clarify', text: `Secretary: please confirm the role in ${message.sender}'s message.` });
      continue;
    }
    if (decision.intent === 'take') {
      if (row.member !== null && row.member !== message.sender) {
        notes.push({ messageId: message.id, kind: 'conflict', text: `${row.role} is already taken by ${row.member}.` });
      } else {
        row.member = message.sender;
      }
    } else if (row.member === message.sender) {
      row.member = null;
    } else {
      notes.push({ messageId: message.id, kind: 'clarify', text: `Secretary: ${message.sender} does not hold ${row.role}; please clarify before changing it.` });
    }
  }
  return { board: updated, notes };
}

function safeCell(value) {
  return value.replace(/[\r\n\t]/g, ' ').replace(/[`|]/g, '');
}

function renderTable(board) {
  const rows = board.map(row => [safeCell(row.role), row.member === null ? 'Open' : safeCell(row.member)]);
  const width = Math.max(4, ...rows.map(row => row[0].length));
  return '```\n' + ['Role'.padEnd(width) + ' | Member', '-'.repeat(width) + '-|-------',
    ...rows.map(([role, member]) => role.padEnd(width) + ' | ' + member)].join('\n') + '\n```';
}

const HERMES_REQUEST = Object.freeze({ model: 'gpt-6.1-sol', max_output_tokens: 500 });

module.exports = { RETRY_MESSAGE, HERMES_REQUEST, validateInput, updateBoard, renderTable };
