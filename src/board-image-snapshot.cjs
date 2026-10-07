const { createHash } = require('node:crypto');
const { renumberSpeakerPairs } = require('./speaker-numbering.cjs');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function imageInputHash({ board, meeting }) {
  const roles = renumberSpeakerPairs(board).map(({ role, member, removed }) => ({
    role, member, removed: !!removed,
  })).sort((a, b) => a.role.localeCompare(b.role, 'en'));
  const details = Object.fromEntries(['club', 'number', 'date', 'time', 'badge'].map(key => [key, meeting[key]]));
  if(typeof meeting.venue==='string'&&meeting.venue.trim())details.venue=meeting.venue;
  return sha256(JSON.stringify({ board: roles, meeting: details }));
}

function captureImageSnapshot(input, rendered) {
  return {
    inputHash: imageInputHash(input), sha256: sha256(rendered.png),
    pngBase64: rendered.png.toString('base64'), cells: structuredClone(rendered.cells),venueLines:rendered.venueLines,
    width: rendered.width, height: rendered.height,
  };
}

function restoreImageSnapshot(input, snapshot) {
  if (!snapshot || snapshot.inputHash !== imageInputHash(input)) return null;
  const png = Buffer.from(snapshot.pngBase64 || '', 'base64');
  if (sha256(png) !== snapshot.sha256 || png.length < 24 ||
      !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      png.readUInt32BE(16) !== snapshot.width || png.readUInt32BE(20) !== snapshot.height ||
      !Array.isArray(snapshot.cells)) {
    throw new Error('The preserved board image is damaged; sending is blocked.');
  }
  return { png, cells: structuredClone(snapshot.cells), width: snapshot.width, height: snapshot.height,venueLines:snapshot.venueLines };
}
module.exports = { captureImageSnapshot, restoreImageSnapshot };
