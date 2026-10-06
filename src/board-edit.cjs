const { validateInput } = require('./role-board.cjs');

function editSingleField({ board, meeting }, text, { testOnly = false } = {}) {
  validateInput(board, []);
  if (typeof text !== 'string' || /[\r\n;]/.test(text)) throw new Error('Send one correction at a time, like Timer: Noel Example.');
  const match = /^\s*([^:]+):\s*(.+)\s*$/.exec(text);
  if (!match) throw new Error('Use a field followed by a colon and its new value, like Timer: Noel Example or Timer: Open.');
  const field = match[1].trim().toLowerCase(), value = match[2].trim().replace(/\s+/g, ' ');
  if (!value || value.length > 120) throw new Error('Use a non-empty value of at most 120 characters.');
  const updated = { board: board.map(row => ({ ...row })), meeting: { ...meeting } };
  const row = updated.board.find(row => row.role.toLowerCase() === field);
  if (row) {
    if (value.includes(':')) throw new Error('Send one role correction at a time, like Timer: Noel Example.');
    if (testOnly && !/^(open|tbd)$/i.test(value) && !value.endsWith(' Example')) throw new Error('Use a made-up test name ending in Example, or Open.');
    row.member = /^(open|tbd)$/i.test(value) ? null : value;
    return { ...updated, changedField: row.role, fieldId: `role:${row.role}` };
  }
  const fields = { club: 'club', 'club name': 'club', 'meeting number': 'number', 'meeting date': 'date', date: 'date', 'meeting time': 'time', time: 'time' };
  const key = fields[field];
  if (!key) throw new Error('That field is not on this board. Use an existing role, Club, Meeting number, Meeting date, or Meeting time.');
  if (testOnly && key === 'club' && !/\bexample\b/i.test(value)) throw new Error('Use a made-up club name containing Example for this test.');
  let normalized = value;
  if (key === 'number' && !/^\d{1,6}$/.test(value)) throw new Error('Meeting number must be a number, like 43.');
  if (key === 'date') {
    const date = new Date(value + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new Error('Use a valid meeting date like 2026-10-17.');
    }
    normalized = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
  }
  if (key === 'time') {
    const twelve = /^(1[0-2]|[1-9]):([0-5]\d)\s*(AM|PM)$/i.exec(value);
    const twentyFour = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (twelve) normalized = `${Number(twelve[1])}:${twelve[2]} ${twelve[3].toUpperCase()}`;
    else if (twentyFour) normalized = `${Number(twentyFour[1]) % 12 || 12}:${twentyFour[2]} ${Number(twentyFour[1]) < 12 ? 'AM' : 'PM'}`;
    else throw new Error('Use a valid meeting time like 14:30 or 2:30 PM.');
  }
  updated.meeting[key] = normalized;
  return { ...updated, changedField: field, fieldId: `meeting:${key}` };
}
function editBoard(input, text, options = {}) {
  if (typeof text !== 'string' || text.length > 10000) throw new Error('Send corrections in a shorter message.');
  const corrections = [...new Set(text.split(/[\r\n;]+/).map(line => line.trim()).filter(Boolean))];
  if (!corrections.length || corrections.length > 25) throw new Error('Send between 1 and 25 corrections, one per line.');
  const byField = new Map(), invalidCorrections = [];
  for (const correction of corrections) {
    try {
      const edited = editSingleField(input, correction, options);
      const records = byField.get(edited.fieldId) || [];
      records.push({ line: correction, edited, signature: JSON.stringify({ board: edited.board, meeting: edited.meeting }) });
      byField.set(edited.fieldId, records);
    } catch (error) { invalidCorrections.push({ line: correction, reason: error.message }); }
  }
  const validCorrections = [];
  for (const records of byField.values()) {
    if (new Set(records.map(record => record.signature)).size > 1) {
      invalidCorrections.push({ line: records.map(record => record.line).join('; '),
        reason: `${records[0].edited.changedField} appears more than once. Send one new value for that field.` });
    } else validCorrections.push(records[0].line);
  }
  if (invalidCorrections.length) {
    const error = new Error(invalidCorrections.map(item => `${item.line}: ${item.reason}`).join('\n'));
    error.invalidCorrections = invalidCorrections;
    error.validCorrections = validCorrections;
    throw error;
  }
  let current = input;
  const changedFields = [];
  for (const correction of validCorrections) {
    const edited = editSingleField(current, correction, options);
    changedFields.push(edited.changedField);
    current = { board: edited.board, meeting: edited.meeting };
  }
  return { ...current, changedFields, changedField: changedFields.join(', ') };
}
module.exports = { editBoard };
