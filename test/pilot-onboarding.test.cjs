const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {applySetup}=require('../src/secretary-setup.cjs');
const {renderBoardImage}=require('../src/board-image.cjs');
const {handleHelperEdit}=require('../src/helper-edit.cjs');
const now=Date.parse('2026-10-07T12:00:00Z');
function conversation(){let state=null,i=0;return {send(text,replyTo){state=applySetup(state,{id:'pilot-'+(++i),text,replyTo},now,{pilotMode:true});return state;},ack(){state.lastPreviewServerAckVerified=true;state.previewReceipt={id:'latest'};state.boardHash='hash';},get state(){return state;}};}
test('pilot setup accepts ordinary fictional names, asks venue once and offers consistent preview choices',()=>{
 const c=conversation();let s=c.send('START');assert.match(s.outbox.at(-1).text,/Hi!|Welcome/);s=c.send('Speaker 1: Ada Finch; Timer: Mira Vale');assert.equal(s.stage,'sample');for(const action of ['APPROVE','EDIT','TABLE','CANCEL'])assert.match(s.outbox.at(-1).caption,new RegExp(action));
 c.ack();c.send('APPROVE');for(const answer of ['Cedar Speakers Club','42','Sunday','11:00 AM'])c.send(answer);assert.equal(c.state.stage,'venue');c.send('Cedar Hall, Room 2');assert.equal(c.state.meeting.venue,'Cedar Hall, Room 2');assert.equal(c.state.stage,'reminder');c.send('Monday 19:00');s=c.send('8:10 PM');assert.equal(s.stage,'final');assert.match(s.outbox.at(-1).text,/Cedar Hall/);c.ack();s=c.send('APPROVE');assert.equal(s.stage,'complete');const meeting=structuredClone(s.meeting);s=c.send('START');assert.deepEqual(s.meeting,meeting);assert.equal(s.stage,'complete');assert.match(s.outbox.at(-1).text,/TABLE.*EDIT.*HELP/s);
});
test('sample edit, table, cancel, help and resume preserve answers without granting stale approval',()=>{
 const c=conversation();c.send('START');c.send('Timer: Mira Vale');c.ack();let s=c.send('EDIT');assert.match(s.outbox.at(-1).text,/correction/i);assert.equal(s.lastPreviewServerAckVerified,false);s=c.send('TABLE');assert.equal(s.outbox.at(-1).kind,'preview');s=c.send('CANCEL');assert.equal(s.setupPaused,true);s=c.send('APPROVE');assert.equal(s.stage,'sample');s=c.send('HELP');assert.match(s.outbox.at(-1).text,/START/);s=c.send('START');assert.equal(s.setupPaused,false);assert.equal(s.board.find(r=>r.role==='Timer').member,'Mira Vale');assert.equal(s.lastPreviewServerAckVerified,false);
});
test('venue appears in board output and changing it invalidates an approved image snapshot',()=>{
 const {captureImageSnapshot}=require('../src/board-image-snapshot.cjs');const c=conversation();let s=c.send('START');c.send('OPEN');s=c.state;s.meeting.venue='Cedar Hall';const first=renderBoardImage(s);s.imageSnapshot=captureImageSnapshot(s,first);s.meeting.venue='Pine Hall';const second=renderBoardImage(s);assert.notEqual(crypto.createHash('sha256').update(first.png).digest('hex'),crypto.createHash('sha256').update(second.png).digest('hex'));assert.ok(first.venueLines.some(line=>line.includes('Cedar Hall')));
 s.stage='complete';let edited=handleHelperEdit(s,{id:'edit',text:'EDIT'},{name:'Pilot group'}).state;edited=handleHelperEdit(edited,{id:'venue',text:'Venue: Oak Hall'},{name:'Pilot group'}).state;assert.equal(edited.memberEdit.meeting.venue,'Oak Hall');assert.equal(edited.memberEdit.previewAcknowledged,false);assert.equal(edited.meeting.venue,'Pine Hall');
});
test('an approved venue correction before connecting a group saves privately without a post or losing setup',()=>{
 const c=conversation();let s=c.send('START');c.send('OPEN');c.ack();c.send('APPROVE');for(const answer of ['Cedar Club','42','Sunday','11:00 AM','Cedar Hall','Monday 19:00','8:10 PM'])c.send(answer);c.ack();s=c.send('APPROVE');
 s=handleHelperEdit(s,{id:'edit-before-group',text:'EDIT'},null).state;s=handleHelperEdit(s,{id:'venue-before-group',text:'Venue: Oak Hall'},null).state;s.memberEdit.previewAcknowledged=true;s.memberEdit.previewReceipt={id:'latest-venue'};
 s=handleHelperEdit(s,{id:'approve-venue',text:'APPROVE',replyTo:'latest-venue'},null).state;assert.equal(s.memberEdit,null);assert.equal(s.meeting.venue,'Oak Hall');assert.equal(s.helperGroupPost,undefined);assert.equal(s.stage,'complete');
});
test('a fresh weekly board reuses the saved venue and clears previous account ownership',()=>{
 const {startWeeklyBoard}=require('../src/weekly.cjs');const c=conversation();const s=c.send('START');s.meeting.venue='Cedar Hall';s.board[3].member='Ada Finch';s.board[3].memberId='madeup-account';Object.assign(s,{status:'approved',groupPost:{status:'sent'},secretaryId:'111@s.whatsapp.net',targetGroupId:'123@g.us',weekly:{pendingWeek:'2026-10-12T13:30:00.000Z',meetingDay:0,meetingTime:'11:00 AM'}});const fresh=startWeeklyBoard(s,now);assert.equal(fresh.meeting.venue,'Cedar Hall');assert.ok(fresh.board.every(row=>row.member===null&&!row.memberId));
});
