const {test}=require('node:test');const assert=require('node:assert/strict');const {createHash}=require('node:crypto');
const {restartSnapshot,verifyRestart}=require('../src/restart-check.cjs');const {editBoard}=require('../src/board-edit.cjs');const {renderBoardImage}=require('../src/board-image.cjs');const fixture=require('./fixtures/milestone-3.cjs');
function saved(){const state={...editBoard(fixture,'Speaker 2: Remove; Timer: Zara Example; Listener: Finn Example'),status:'approved',postAt:'2026-10-07T14:30:00Z',groupPost:{status:'sent',id:'fictional-post',deliveryReceiptVerified:true,secretaryConfirmation:{status:'sent',id:'fictional-private',serverAckVerified:true}},previewReceipt:{id:'fictional-preview'},ownIds:['fictional-preview','fictional-private']};state.boardHash=createHash('sha256').update(renderBoardImage(state).png).digest('hex');state.approvedBoardHash=state.boardHash;return state;}
test('saved role edits, removals, numbering and delivery receipts survive reopening',()=>{
 const state=saved();const snapshot=restartSnapshot(state);const restored=JSON.parse(JSON.stringify(state));assert.equal(verifyRestart(snapshot,restored).boardVerified,true);assert.equal(restored.board.find(r=>r.role==='Speaker 3').removed,true);
});
test('losing a role edit or sent receipt fails the restart check',()=>{
 const state=saved();const snapshot=restartSnapshot(state);
 for(const fault of ['board','receipt']){const restored=structuredClone(state);if(fault==='board')restored.board.find(r=>r.role==='Timer').member=null;else delete restored.groupPost;assert.throws(()=>verifyRestart(snapshot,restored),/changed during restart/);}
});
test('a saved board with the wrong image checksum cannot pass',()=>{
 const state=saved();state.boardHash='a'.repeat(64);assert.throws(()=>verifyRestart(restartSnapshot(state),state),/does not match/);
});
