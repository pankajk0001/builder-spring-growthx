const { validateInput, updateBoard } = require('./role-board.cjs');
const { renumberSpeakerPairs } = require('./speaker-numbering.cjs');

function respondToRoles(board, messages, decisions) {
  validateInput(board, messages);
  if (!Array.isArray(decisions) || decisions.length !== messages.length) throw new Error('Every message needs exactly one decision.');
  let current = renumberSpeakerPairs(board);
  const replies = [], notes = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i], decision = decisions[i];
    if (!decision || decision.messageId !== message.id || !['check', 'take', 'drop', 'ignore', 'clarify'].includes(decision.intent)) {
      throw new Error('Decisions must match the original message IDs and order.');
    }
    const row = current.find(row => row.role === decision.role);
    if (decision.intent === 'check' || decision.intent === 'take') {
      if (!row || row.removed) {
        notes.push({ messageId: message.id, kind: 'clarify', text: `Secretary: please confirm the role in ${message.sender}'s message.` });
        continue;
      }
      const text = row.member !== null
        ? row.member === message.sender && decision.intent === 'take'
          ? `The ${row.role} role is already yours, ${message.sender}.`
          : `The ${row.role} role is taken by ${row.member}.`
        : decision.intent === 'check' ? `The ${row.role} role is open.`
          : `The ${row.role} role is yours, ${message.sender}.`;
      replies.push({ messageId: message.id, text });
      if (decision.intent === 'check') continue;
    }
    const applied = updateBoard(current, [message], [decision]);
    current = applied.board;
    // Filled-role replies above already cover conflict notes.
    notes.push(...applied.notes.filter(note => note.kind !== 'conflict'));
    if (decision.intent === 'drop' && !applied.notes.length) {
      replies.push({ messageId: message.id, text: `The ${decision.role} role is open for members to grab.` });
    }
  }
  return { board: current, replies, notes };
}

module.exports = { respondToRoles };
