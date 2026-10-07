const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { join } = require('node:path');
const { validateInput } = require('./role-board.cjs');
const { renumberSpeakerPairs } = require('./speaker-numbering.cjs');
const { restoreImageSnapshot } = require('./board-image-snapshot.cjs');

if (!GlobalFonts.registerFromPath(join(__dirname, '../assets/fonts/InterVariable.ttf'), 'Board Inter')) {
  throw new Error('The board font could not be loaded.');
}
const BLUE = '#064763', RED = '#982438', WHITE = '#FFFFFF';
const WIDTH = 850, SPLIT = 442, SCALE = 2;
const ROWS = [
  { role: 'TMOD', label: 'TMOD (5–7 Minutes)' },
  { role: 'Word & Idiom Master', label: 'Word & Idiom Master (1–2 Minutes)' },
  { role: 'Movie-Master', label: 'Movie-Master (2–3 Minutes)' },
  { section: 'Prepared Speakers', detail: 'Time limit mentioned in the project guidelines' },
  ...[1, 2, 3].map(i => ({ role: `Speaker ${i}`, evaluator: `Evaluator ${i}`, label: `Speaker ${i} (5–7 Minutes)` })),
  { section: 'SECOND SECTION OF THE MEETING' },
  { role: 'Table Topic Master', label: 'TABLE TOPIC MASTER (5–7 Mins.)' },
  { section: 'THIRD SECTION OF THE MEETING' },
  { role: 'General Evaluator', label: 'General Evaluator (5–7 Minutes)' },
  { role: 'Timer', label: 'Timer (2–3 Minutes)' },
  { role: 'Grammarian', label: 'Grammarian (2–3 Minutes)' },
  { role: 'Ah Counter', label: 'Ah! Counter (2–3 Minutes)' },
  { role: 'Listener', label: 'Listener (2–3 Minutes)' },
];
const clean = text => text.replace(/\s+/gu, ' ').trim();
function useFont(ctx, size, bold = false) { ctx.font = `${bold ? 'bold ' : ''}${size}px "Board Inter"`; }

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of clean(text).split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    // Preserve every character even when one name is longer than a whole cell.
    for (const character of Array.from(word)) {
      if (ctx.measureText(line + character).width > width && line) { lines.push(line); line = ''; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderBoardImage({ board, meeting, imageSnapshot }) {
  board = renumberSpeakerPairs(board);
  validateInput(board, []);
  for (const field of ['club', 'number', 'date', 'time', 'badge']) {
    if (typeof meeting?.[field] !== 'string' || !meeting[field].trim()) throw new Error(`Meeting ${field} is required.`);
  }
  const known = new Set(ROWS.flatMap(row => [row.role, row.evaluator]).filter(Boolean));
  if (board.some(row => !known.has(row.role))) throw new Error('A board role has no matching layout slot.');
  const holders = new Map(board.map(row => [row.role, row.member === null ? 'Open' : clean(row.member)]));
  if ([...known].some(role => !holders.has(role))) throw new Error('Every layout slot needs a board role, including open roles.');
  // Preserve an already reviewed image across different server/font runtimes.
  // A role or meeting edit changes its input hash and requires a fresh render.
  const preserved = restoreImageSnapshot({ board, meeting }, imageSnapshot);
  if (preserved) return preserved;
  const measure = createCanvas(1, 1).getContext('2d');
  useFont(measure, 17);
  const nameWidth = WIDTH - SPLIT - 28;
  const inactive = new Set(board.filter(row => row.removed).map(row => row.role));
  const visibleRows = ROWS.flatMap(row => {
    if (row.section === 'Prepared Speakers' && !board.some(item => /^(Speaker|Evaluator) [1-3]$/.test(item.role) && !item.removed)) return [];
    if (!row.role) return [row];
    if (inactive.has(row.role)) {
      if (row.evaluator && !inactive.has(row.evaluator)) return [{ role: row.evaluator, label: `${row.evaluator} (2–3 Minutes)` }];
      return [];
    }
    return [row.evaluator && inactive.has(row.evaluator) ? { ...row, evaluator: undefined } : row];
  });
  const planned = visibleRows.map(row => {
    if (row.section) return { ...row, height: row.detail ? 40 : 32 };
    useFont(measure, 17);
    const lines = wrap(measure, holders.get(row.role), nameWidth);
    const evaluatorLines = row.evaluator ? wrap(measure, `${row.evaluator} (2–3 Minutes): ${holders.get(row.evaluator)}`, nameWidth) : [];
    useFont(measure, 16, true);
    const labelLines = wrap(measure, row.label, SPLIT - 24);
    const nameHeight = (lines.length + evaluatorLines.length) * 23 + (row.evaluator ? 12 : 0);
    return { ...row, lines, evaluatorLines, labelLines, height: Math.max(row.evaluator ? 74 : 42, nameHeight + 16, labelLines.length * 23 + 16) };
  });
  useFont(measure, 20, true);
  const clubLines = wrap(measure, meeting.club, WIDTH - 114);
  useFont(measure, 16, true);
  const meetingLines = wrap(measure, `Meeting #${meeting.number} · ${meeting.date} at ${meeting.time}`, WIDTH - 114);
  const venueLines=typeof meeting.venue==='string'&&meeting.venue.trim()?wrap(measure,`Venue: ${meeting.venue}`,WIDTH-114):[];
  const headerHeight = Math.max(84, (clubLines.length + meetingLines.length + venueLines.length) * 25 + 28);
  const logicalHeight = headerHeight + planned.reduce((sum, row) => sum + row.height, 0) + 40;
  // A square image preserves the whole board in a square chat thumbnail.
  // Extra-long content expands the canvas rather than clipping any row.
  const side = Math.max(WIDTH, logicalHeight);
  const canvas = createCanvas(side * SCALE, side * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = BLUE; ctx.fillRect(0, 0, side, side);
  ctx.translate((side - WIDTH) / 2, (side - logicalHeight) / 2);
  const cells = [];

  function drawLines(lines, x, top, size, bold = false, lineHeight = 23) {
    useFont(ctx, size, bold); ctx.fillStyle = WHITE;
    lines.forEach((line, i) => ctx.fillText(line, x, top + lineHeight * (i + 0.5)));
  }
  // A fictional test-club badge; the reference logo and member names are not copied.
  ctx.strokeStyle = '#D8D3B6'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(49, headerHeight / 2, 32, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(49, headerHeight / 2, 17, 32, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(49, headerHeight / 2, 32, 12, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = BLUE; ctx.fillRect(14, headerHeight / 2 - 13, 70, 26);
  drawLines([meeting.badge], 49, headerHeight / 2 - 11, 18, true);
  const textX = 100 + (WIDTH - 114) / 2;
  const headerTop = (headerHeight - (clubLines.length + meetingLines.length + venueLines.length) * 25) / 2;
  drawLines(clubLines, textX, headerTop, 20, true, 25);
  drawLines(meetingLines, textX, headerTop + clubLines.length * 25, 16, true, 25);
  if(venueLines.length)drawLines(venueLines,textX,headerTop+(clubLines.length+meetingLines.length)*25,16,true,25);

  let y = headerHeight;
  for (const row of planned) {
    if (row.section) {
      drawLines([row.section], WIDTH / 2, y + (row.detail ? 0 : (row.height - 23) / 2), 16, true);
      if (row.detail) drawLines([row.detail], WIDTH / 2, y + 19, 12, false, 18);
    } else {
      ctx.fillStyle = RED; ctx.fillRect(0, y, WIDTH, row.height);
      // Subtle, reproducible botanical linework behind the table.
      ctx.save(); ctx.beginPath(); ctx.rect(0, y, WIDTH, row.height); ctx.clip();
      ctx.strokeStyle = '#AA3B4D'; ctx.lineWidth = 1;
      for (let x = 18; x < WIDTH; x += 86) {
        ctx.beginPath(); ctx.moveTo(x, y + row.height);
        ctx.bezierCurveTo(x - 24, y + row.height / 2, x + 25, y + 12, x + 5, y - 12); ctx.stroke();
        for (let j = 0; j < 3; j++) {
          ctx.beginPath(); ctx.ellipse(x + (j % 2 ? 13 : -10), y + 12 + j * 24, 13, 5, j % 2 ? -0.6 : 0.6, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
      drawLines(row.labelLines, SPLIT / 2, y + (row.height - row.labelLines.length * 23) / 2, 16, true);
      const total = (row.lines.length + row.evaluatorLines.length) * 23 + (row.evaluator ? 12 : 0);
      let nameTop = y + (row.height - total) / 2;
      const addCell = (role, lines, displayedLines = lines) => {
        drawLines(displayedLines, SPLIT + (WIDTH - SPLIT) / 2, nameTop, 17);
        useFont(ctx, 17);
        cells.push({ role, holder: holders.get(role), row: row.role, rowTop: y, rowBottom: y + row.height, top: nameTop, bottom: nameTop + displayedLines.length * 23,
          width: nameWidth, lines, measuredWidths: displayedLines.map(line => ctx.measureText(line).width) });
      };
      addCell(row.role, row.lines);
      if (row.evaluator) {
        nameTop += row.lines.length * 23 + 12;
        addCell(row.evaluator, wrap(measureWithFont(measure, 17), holders.get(row.evaluator), nameWidth), row.evaluatorLines);
      }
      ctx.strokeStyle = '#F5DDE1'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(SPLIT, y); ctx.lineTo(SPLIT, y + row.height); ctx.stroke();
    }
    ctx.strokeStyle = '#F5DDE1'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, y + 0.5, WIDTH - 1, row.height - 1);
    y += row.height;
  }
  drawLines(['ALL THE BEST EVERYONE'], WIDTH / 2, y + 9, 23, true);
  return { png: canvas.encodeSync('png'), cells, venueLines, width: canvas.width, height: canvas.height };
}
function measureWithFont(ctx, size) { useFont(ctx, size); return ctx; }

module.exports = { renderBoardImage };
