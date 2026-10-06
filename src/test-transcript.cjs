const { renderTable, validateInput } = require('./role-board.cjs');
const HEADER = 'the helper — MADE-UP TEST';

function renderSource(board, messages) {
  validateInput(board, messages);
  if (messages.some(message => /[\r\n|]/.test(message.id + message.sender + message.text))) {
    throw new Error('The test transcript requires single-line messages without pipes.');
  }
  return `${HEADER}\nAll names and messages below are fictional.\n\nCURRENT BOARD\n${renderTable(board)}\n\nMADE-UP MESSAGES\n` +
    messages.map(message => `${message.id} | ${message.sender} | ${message.text}`).join('\n');
}

function parseSource(text) {
  if (!text.startsWith(HEADER + '\n')) throw new Error('Not a fictional helper test transcript.');
  const sections = text.split('\n\nMADE-UP MESSAGES\n');
  if (sections.length !== 2) throw new Error('The source transcript is incomplete.');
  const table = sections[0].split('```\n')[1]?.split('\n```')[0];
  if (!table) throw new Error('The source board is missing.');
  const board = table.split('\n').slice(2).map(line => {
    const [role, member, extra] = line.split('|').map(cell => cell.trim());
    if (!role || !member || extra !== undefined) throw new Error('Invalid source board row.');
    return { role, member: member === 'Open' ? null : member };
  });
  const messages = sections[1].split('\n').map(line => {
    const [id, sender, text, extra] = line.split('|').map(cell => cell.trim());
    if (extra !== undefined) throw new Error('Invalid source message.');
    return { id, sender, text };
  });
  validateInput(board, messages);
  return { board, messages };
}

module.exports = { renderSource, parseSource };
