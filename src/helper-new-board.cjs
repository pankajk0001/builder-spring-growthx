const {renderBoardImage}=require('./board-image.cjs');
const {captureImageSnapshot}=require('./board-image-snapshot.cjs');
const {createHash}=require('node:crypto');
const {nextMeetingDate,parseMeetingDay,meetingDateStart}=require('./meeting-cycle.cjs');
function queueDraftPreview(s){
 const draft=s.memberEdit,rendered=renderBoardImage(draft);
 draft.imageSnapshot=captureImageSnapshot(draft,rendered);draft.boardHash=createHash('sha256').update(rendered.png).digest('hex');
 draft.previewReceipt=null;draft.previewAcknowledged=false;draft.stage='preview';
 s.outbox.push({kind:'edit-preview',caption:draft.kind==='new_meeting'?`New meeting board — check every role, date and venue.\nAPPROVE to ${s.helperGroupPost?'post':'save'} · EDIT to change · TABLE to view roles · CANCEL to keep the previous board.`:s.pilotMode?`Updated board. Check every role and the venue.\nAPPROVE to ${s.helperGroupPost?'post':'save'} · EDIT to change · TABLE to view roles · CANCEL to keep the current board.`:'Corrected board preview. Check every role, then reply APPROVE to post, EDIT to make more changes, TABLE to view the draft as a table and preview, or CANCEL to keep the current group board.'});
}
function startFreshBoard(s,now=Date.now()){
 if(s.memberEdit){
  s.outbox.push({kind:'text',text:s.memberEdit.send?'A board send is uncertain. Check the group before starting another board.':s.memberEdit.kind==='new_meeting'?'Your fresh draft is already open. TABLE to view it, EDIT to change it, or CANCEL to keep the previous board.':'You have an unfinished correction draft. Use TABLE to review it or CANCEL it, then send START for a fresh board.'});
  return s;
 }
 const board=(s.memberLive?.board||s.board).map(row=>{const fresh={...row,member:null};delete fresh.memberId;delete fresh.memberIds;return fresh;});
 const day=Number.isInteger(s.meetingDayIndex)?s.meetingDayIndex:s.meetingDay?parseMeetingDay(s.meetingDay):new Date(meetingDateStart(s.meeting.date)+330*60000).getUTCDay();
 const meeting={...s.meeting,date:nextMeetingDate(day,now)};
 if(/^\d+$/.test(meeting.number))meeting.number=String(Number(meeting.number)+1);
 s.memberEdit={kind:'new_meeting',stage:'preview',board,meeting,pilotMode:s.pilotMode,testOnly:s.testOnly};
 delete s.secretaryQuestion;
 s.outbox.push({kind:'text',text:`Fresh board for ${meeting.date}. All visible roles are open. Your club settings are saved. Add pre-filled roles, for example Speaker 1: Ada Example, or approve the preview below. The previous approved board stays in place until you approve this draft.\nAPPROVE · EDIT · TABLE · CANCEL`});
 queueDraftPreview(s);return s;
}
module.exports={startFreshBoard,queueDraftPreview};
