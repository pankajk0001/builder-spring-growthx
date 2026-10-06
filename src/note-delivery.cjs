const { renderTable } = require('./role-board.cjs');

function buildBoardDelivery(result, messages) {
  const publicNotes = [];
  const privateNotes = [];
  for (const note of result.notes) {
    if (note.kind === 'conflict') {
      publicNotes.push(note.text);
    } else if (note.kind === 'clarify') {
      const source = messages.find(message => message.id === note.messageId);
      if (!source) throw new Error('A clarification must include its original message.');
      privateNotes.push(`${note.text}\nOriginal made-up message from ${source.sender}: “${source.text}”\nNo role was changed for this unclear reply.`);
    } else {
      throw new Error('Unknown note type; refusing to post it in the group.');
    }
  }
  return {
    groupText: `the helper — UPDATED TEST BOARD\nBuilt from the made-up source messages in this group.\n\n${renderTable(result.board)}` +
      (publicNotes.length ? '\n\n' + publicNotes.join('\n') : ''),
    secretaryText: privateNotes.length
      ? 'the helper — PRIVATE TEST CLARIFICATION\nFor the Secretary only. All names and messages are fictional.\n\n' + privateNotes.join('\n\n')
      : null,
  };
}

function assertTestDestination(destination, groupId, secretaryId) {
  if (!/^\d+(?:-\d+)?@g\.us$/.test(groupId) || !/^\d+@s\.whatsapp\.net$/.test(secretaryId)) {
    throw new Error('The test group and paired Secretary account must be configured.');
  }
  if (destination !== groupId && destination !== secretaryId) {
    throw new Error('Blocked: only Test_group and the paired Secretary self-chat are allowed.');
  }
}

function assertPrivateSendReceipt(receipt, secretaryId) {
  if (!receipt?.key?.id || receipt.key.remoteJid !== secretaryId || receipt.key.fromMe !== true) {
    throw new Error('WhatsApp did not confirm a private send to the paired Secretary account.');
  }
}

module.exports = { buildBoardDelivery, assertTestDestination, assertPrivateSendReceipt };
