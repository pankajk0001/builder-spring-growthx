const { validateInput } = require('./role-board.cjs');
const { sentenceCorrections } = require('./correction-sentences.cjs');
const { duplicateRoleHolders } = require('./role-uniqueness.cjs');
const { renumberSpeakerPairs } = require('./speaker-numbering.cjs');

function editSingleField({ board, meeting }, text, { testOnly = false } = {}) {
  validateInput(board, []);
  if (typeof text !== 'string' || /[\r\n;]/.test(text)) throw new Error('Send one correction at a time, like Timer: Zara Example.');
  const match = /^\s*([^:]+):\s*(.+)\s*$/.exec(text);
  if (!match) throw new Error('Use a field followed by a colon and its new value, like Timer: Zara Example or Timer: Open.');
  const suppliedField = match[1].trim().toLowerCase();
  const field = suppliedField === 'listner' ? 'listener' : suppliedField, value = match[2].trim().replace(/\s+/g, ' ');
  if (!value || value.length > (field==='venue'?240:120)) throw new Error('Use a non-empty value of at most 120 characters.');
  const updated = { board: board.map(row => ({ ...row })), meeting: { ...meeting } };
  const row = updated.board.find(row => row.role.toLowerCase() === field);
  if (row) {
    if (value.includes(':')) throw new Error('Send one role correction at a time, like Timer: Zara Example.');
    if (/^(remove|hide)$/i.test(value)) {
      if (!/^Speaker [1-3]$/.test(row.role)) throw new Error('Only a speaker slot can be removed. Use Open for other roles.');
      row.removed = true; row.member = null;
      const evaluator = updated.board.find(item => item.role === row.role.replace('Speaker', 'Evaluator'));
      if (evaluator) { evaluator.removed = true; evaluator.member = null; }
      return { ...updated, changedField: row.role, fieldId: `role:${row.role}` };
    }
    if (testOnly && !/^(open|tbd)$/i.test(value) && !value.endsWith(' Example')) throw new Error('Use a made-up test name ending in Example, or Open.');
    if(row.member!==value){delete row.memberId;delete row.memberIds;}
    row.member = /^(open|tbd)$/i.test(value) ? null : value;
    if (row.removed) {
      row.removed = false;
      if (/^Speaker [1-3]$/.test(row.role)) {
        const evaluator = updated.board.find(item => item.role === row.role.replace('Speaker', 'Evaluator'));
        if (evaluator?.removed) evaluator.removed = false;
      }
    }
    return { ...updated, changedField: row.role, fieldId: `role:${row.role}` };
  }
  const fields = { venue: 'venue', club: 'club', 'club name': 'club', 'meeting number': 'number', 'meeting date': 'date', date: 'date', 'meeting time': 'time', time: 'time' };
  const key = fields[field];
  if (!key) throw new Error('That field is not on this board. Use an existing role, Club, Meeting number, Meeting date, Meeting time, or Venue.');
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
  input = { ...input, board: renumberSpeakerPairs(input.board) };
  if (typeof text !== 'string' || text.length > 10000) throw new Error('Send corrections in a shorter message.');
  const corrections = [...new Set(text.split(/[\r\n;]+/).map(line => line.trim()).filter(Boolean))];
  if (!corrections.length || corrections.length > 25) throw new Error('Send between 1 and 25 corrections, one per line.');
  const byField = new Map(), invalidCorrections = [];
  for (const source of corrections) {
    let normalized;
    try { normalized = sentenceCorrections(input.board, source); }
    catch (error) { invalidCorrections.push({ line: source, reason: error.message }); continue; }
    for (const correction of normalized) {
    try {
      const edited = editSingleField(input, correction, options);
      const records = byField.get(edited.fieldId) || [];
      records.push({ line: correction, edited, signature: JSON.stringify({ board: edited.board, meeting: edited.meeting }) });
      byField.set(edited.fieldId, records);
    } catch (error) { invalidCorrections.push({ line: source, reason: error.message }); }
    }
  }
  const validCorrections = [];
  for (const records of byField.values()) {
    if (new Set(records.map(record => record.signature)).size > 1) {
      invalidCorrections.push({ line: records.map(record => record.line).join('; '),
        reason: `${records[0].edited.changedField} appears more than once. Send one new value for that field.` });
    } else validCorrections.push(records[0].line);
  }
  let current = input;
  const changedFields = [];
  for (const correction of validCorrections) {
    const edited = editSingleField(current, correction, options);
    changedFields.push(edited.changedField);
    current = { board: edited.board, meeting: edited.meeting };
  }
  const conflictingLines = new Set();
  for (const speaker of current.board.filter(row => /^Speaker [1-3]$/.test(row.role) && row.removed)) {
    const role = speaker.role.replace('Speaker', 'Evaluator');
    const evaluator = current.board.find(row => row.role === role);
    if (evaluator && !evaluator.removed) {
      const line = byField.get(`role:${role}`)?.[0]?.line || `${role}: Open`;
      conflictingLines.add(line);
      invalidCorrections.push({ line, reason: `${role} stays removed until the Secretary adds ${speaker.role} back.` });
    }
  }
  for (const conflict of duplicateRoleHolders(current.board)) {
    const changedRoles = conflict.roles.filter(role => byField.has(`role:${role}`));
    const blockedRoles = changedRoles.length ? changedRoles : conflict.roles.slice(1);
    for (const role of blockedRoles) {
      const record = byField.get(`role:${role}`)?.[0];
      const line = record?.line || `${role}: ${conflict.member}`;
      conflictingLines.add(line);
      invalidCorrections.push({ line, reason: `${conflict.member} is assigned to ${conflict.roles.join(' and ')}. Each person can hold only one role; choose a different person or reopen their other role.` });
    }
  }
  if (invalidCorrections.length) {
    const error = new Error(invalidCorrections.map(item => `${item.line}: ${item.reason}`).join('\n'));
    error.invalidCorrections = invalidCorrections;
    error.validCorrections = validCorrections.filter(line => !conflictingLines.has(line));
    throw error;
  }
  return { ...current, board: renumberSpeakerPairs(current.board), changedFields, changedField: changedFields.join(', ') };
}
module.exports = { editBoard };
