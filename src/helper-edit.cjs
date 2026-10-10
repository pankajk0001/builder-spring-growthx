const {renderTable}=require('./role-board.cjs');
const {applyRoleEdits}=require('./secretary-setup.cjs');
const {renderBoardImage}=require('./board-image.cjs');
const {verifyMembership}=require('./helper-group-connection.cjs');
const {sendHelperTestGroupBoard}=require('./preview-delivery.cjs');
const {meetingCutoff}=require('./meeting-cycle.cjs');
const {createHash}=require('node:crypto');
const copy=require('./chat-copy.cjs');
const {syncDraft,conflictQuestion,resolveConflict}=require('./draft-sync.cjs');
const {duplicateRoleHolders}=require('./role-uniqueness.cjs');
const {startFreshBoard,queueDraftPreview}=require('./helper-new-board.cjs');
function handleHelperEdit(state,command,target){
 if(state?.stage!=='complete'||(!state.memberEdit&&!/^EDIT$/i.test(command.text)))return {state,handled:false};
 if(state.seen.includes(command.id))return {state,handled:true};
 const s=JSON.parse(JSON.stringify(state));s.seen.push(command.id);
 const note=text=>s.outbox.push({kind:'text',text});
 const text=command.text.trim();
 if(/^START$/i.test(text)){startFreshBoard(s);return {state:s,handled:true};}
 const synced=syncDraft(s);
 if(/^HELP$/i.test(text)&&s.pilotMode){note('Send role or Venue corrections, then review the new preview.\n\nAPPROVE · EDIT · TABLE · CANCEL');return {state:s,handled:true};}
 if(/^EDIT$/i.test(text)){
  if(s.memberEdit?.send){note('A correction send is uncertain. Check the group before making another correction.');return {state:s,handled:true};}
  if(s.memberEdit){s.memberEdit.stage='editing';s.memberEdit.previewAcknowledged=false;s.memberEdit.previewReceipt=null;}
  else s.memberEdit={stage:'editing',board:structuredClone(s.memberLive?.board||s.board),baseBoard:structuredClone(s.memberLive?.board||s.board),meeting:structuredClone(s.meeting),imageSnapshot:s.imageSnapshot,pilotMode:s.pilotMode,testOnly:s.testOnly};
  note(s.pilotMode?copy.editInstructions({...s,board:s.memberEdit.board,meeting:s.memberEdit.meeting,memberLive:null}):'Current role board\n'+renderTable(s.memberEdit.board)+'\n\nSend corrections together, for example Timer: Mira Example; Listener: Open. I will show a new preview. Reply TABLE to see the draft table and preview. Only APPROVE posts it. Reply CANCEL to keep the posted board.');
 }else if(resolveConflict(s,text)){
  const question=conflictQuestion(s);if(question)note(question);else queueDraftPreview(s);
 }else if(/^TABLE$/i.test(text)){
  if(s.memberEdit.send){note('A correction send is uncertain. Check the group before requesting another preview.');}
  else{note('Draft role board\n'+renderTable(s.memberEdit.board)+'\n\nCheck the matching preview below, then reply APPROVE, EDIT, or CANCEL.');queueDraftPreview(s);const question=conflictQuestion(s);if(question)note(question);}
 }
 else if(/^CANCEL$/i.test(text)){
  if(s.memberEdit.send)note('A correction send is uncertain. Check the group before cancelling.');
  else{s.memberEdit=null;note('Corrections cancelled. The posted board is unchanged.');}
 }else if(/^(APPROVE|nothing to correct)[.!]?$/i.test(text)){
  const draft=s.memberEdit;
  const duplicate=duplicateRoleHolders(draft.board)[0];
  if(synced.conflicts.length)note(conflictQuestion(s));
  else if(duplicate)note(`${duplicate.member} now appears in ${duplicate.roles.join(' and ')}. Use EDIT to choose one role before approving.`);
  else if(synced.changed){note('Member roles changed. Check this fresh preview before approving.');queueDraftPreview(s);}
  else if(draft.stage!=='preview'||draft.pendingEdits||!draft.previewAcknowledged||!draft.previewReceipt?.id)note('Check the latest delivered correction preview before approving.');
  else if(command.replyTo&&command.replyTo!==draft.previewReceipt.id)note('Approve the latest correction preview.');
  else if(!s.helperGroupPost){
   Object.assign(s,{board:structuredClone(draft.board),meeting:structuredClone(draft.meeting),imageSnapshot:draft.imageSnapshot,boardHash:draft.boardHash,approvedHash:draft.boardHash,previewReceipt:draft.previewReceipt,lastPreviewServerAckVerified:true,memberEdit:null});
   if(s.groupLink)s.groupLink.approvedHash=s.approvedHash;
   note('Corrections saved. Connect your group, then send POST BOARD to confirm its first post.');
  }else{draft.stage='post_ready';note(`Corrected board approved. I will post this exact preview to ${target?.name||'your club group'} and confirm privately.`);}
 }else if(s.memberEdit.stage==='editing'||s.memberEdit.stage==='preview'){
  try{const before=structuredClone(s.memberEdit.board);applyRoleEdits(s.memberEdit,text);syncDraft(s);const changed=s.memberEdit.board.filter(row=>before.find(r=>r.role===row.role)?.member!==row.member);if(changed.length)note('Draft updated:\n'+changed.map(row=>row.role+' — '+(row.member||'Open')).join('\n'));queueDraftPreview(s);const question=conflictQuestion(s);if(question)note(question);}
  catch(error){if(error.invalidCorrections){s.memberEdit.pendingEdits={validCorrections:error.validCorrections,invalidCorrections:error.invalidCorrections};note('Please correct these lines:\n'+error.message+'\nYour valid corrections are saved. Resend only corrected lines, in the order shown.');}else note(error.message);}
 }else{note('The correction is approved and waiting for verified delivery.');}
 return {state:s,handled:true};
}
async function deliverHelperCorrection({state,target,identity,helper,socket,acknowledgements,save,sendImage=sendHelperTestGroupBoard,now=Date.now()}){
 const draft=state.memberEdit;if(draft?.stage!=='post_ready')return false;
 if(draft.send)throw Error('An earlier corrected-board send is uncertain. Check the group; it will not be resent automatically.');
 const synced=syncDraft(state);
 if(synced.conflicts.length||synced.changed){draft.stage='preview';state.outbox.push({kind:'text',text:conflictQuestion(state)||'Member roles changed. Check this fresh preview before approving.'});queueDraftPreview(state);await save();return false;}
 if(draft.kind!=='new_meeting'&&state.memberLive?.inbox.length){draft.stage='preview';draft.previewAcknowledged=false;state.outbox.push({kind:'text',text:'New member replies are still being checked. Send TABLE after they are checked, then approve the fresh preview.'});await save();return false;}
 const rendered=renderBoardImage(draft),hash=createHash('sha256').update(rendered.png).digest('hex');
 if(!draft.previewAcknowledged||hash!==draft.boardHash||hash!==draft.previewReceipt?.sha256)throw Error('The correction differs from the delivered approved preview.');
 await verifyMembership({state,target,identity,helper,socket,save});
 const publishedHash=state.memberLive?.publishedHash||Object.values(state.memberLive?.posts||{}).filter(p=>p.status==='sent').at(-1)?.hash||state.helperGroupPost.sha256||state.approvedHash;
 if(hash===publishedHash){state.memberEdit=null;state.outbox.push({kind:'text',text:'The board is unchanged. I kept the existing group post.'});await save();return false;}
 draft.send={status:'sending',hash};await save();
 const receipt=await sendImage(socket,target,rendered.png,draft.kind==='new_meeting'?'Role board — approved by the Secretary':'the helper — Corrected role board');
 if(receipt.sha256!==hash||!receipt.id)throw Error('WhatsApp did not confirm the exact corrected image.');
 draft.send.id=receipt.id;await save();await acknowledgements.wait(receipt.id);
 state.previousCorrections||=[];state.previousCorrections.push(state.helperGroupPost);
 if(draft.kind==='new_meeting'){
  state.previousMeetings||=[];state.previousMeetings.push({board:structuredClone(state.board),meeting:structuredClone(state.meeting),groupPost:structuredClone(state.helperGroupPost),memberLive:state.memberLive?structuredClone(state.memberLive):null});
  delete state.memberTest;delete state.memberDeliveryFailureNotified;
  state.memberListeningStartedAt=Math.floor(now/1000)*1000;
  if(state.memberLive)state.memberLive={startedAt:state.memberListeningStartedAt,seen:[],inbox:[],posts:{}};
 }
 state.board=structuredClone(draft.board);state.meeting=structuredClone(draft.meeting);state.imageSnapshot=draft.imageSnapshot;
 state.boardHash=hash;state.approvedHash=hash;state.previewReceipt=draft.previewReceipt;state.lastPreviewServerAckVerified=true;state.groupLink.approvedHash=hash;
 state.helperGroupPost={...receipt,status:'sent',serverAckVerified:true,postedAt:new Date(now).toISOString()};
 if(state.memberLive){Object.assign(state.memberLive,{basePostId:receipt.id,board:structuredClone(draft.board),publishedBoard:structuredClone(draft.board),publishedHash:hash,dirty:false,nextAt:null,windowEnd:meetingCutoff(draft.meeting.date,state.postingTime),authorization:{requestId:hash,initialApprovedHash:hash,groupId:target.groupId},pendingBatch:null});}
 state.memberEdit=null;state.outbox.push({kind:'text',text:`Corrected board posted to ${target.name}. Check every role. Reply TABLE or EDIT privately if needed.`});await save();return true;
}
module.exports={handleHelperEdit,deliverHelperCorrection,queueDraftPreview};
