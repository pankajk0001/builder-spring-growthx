const {createHash}=require('node:crypto');
const {applySetup}=require('./secretary-setup.cjs');
const {handleHelperEdit,deliverHelperCorrection,queueDraftPreview}=require('./helper-edit.cjs');
const {syncDraft,conflictQuestion,draftReminderDue}=require('./draft-sync.cjs');
const {activateMembers,readMember,queueMember,applyMembers,deliverMemberUpdate,scheduleMemberTest,syncMemberSchedule}=require('./helper-members.cjs');
const {approvedImage,checkGroup,connectGroup,postGroup}=require('./helper-group-connection.cjs');
const {bindTarget}=require('./multi-club.cjs');
const {renderBoardImage}=require('./board-image.cjs');
const {captureImageSnapshot}=require('./board-image-snapshot.cjs');
const {sendPrivateBoardPreview}=require('./preview-delivery.cjs');
const {assertPrivateSendReceipt}=require('./note-delivery.cjs');
const {queueClubReminder}=require('./club-reminders.cjs');
const {translateSecretary,replacementQuestion}=require('./secretary-language.cjs');
const {begin}=require('./secretary-setup.cjs');
const {ensureActivity,recordActivity,activityMarkers,observeActivity}=require('./admin-activity.cjs');
const {acceptMessage,rebaseResumeSchedule}=require('./admin-controls.cjs');
function createClubEngine({registry,club,socket,helper,acknowledgements,save:persist,interpret,interpretSecretary,now=Date.now,status=()=>{},sendPreview=sendPrivateBoardPreview,sendImage,enableMembers=true,pilotMode=false}){
 const identity=club.identity;
 ensureActivity(club,now());let markers=activityMarkers(club);
 async function save(){markers=observeActivity(club,markers,now());await persist();}
 const failedDelivery=key=>recordActivity(club,'delivery_failure',key,now(),now());
 const options=()=>({state:club.state,target:club.target,identity,helper,socket,acknowledgements,save,now:now(),...(sendImage?{sendImage}:{})});
 async function flush(){
  if(club.paused)return;
  const state=club.state;
  while(state?.outbox.length){
   const item=state.outbox[0];
   if(item.sending&&!item.sentId)throw Error('A private send is uncertain; inspect the phone before recovery.');
   if(!item.sentId){
    item.sending=true;await save();
    if(['preview','edit-preview'].includes(item.kind)){
     const draft=item.kind==='edit-preview'?state.memberEdit:state;if(!draft)throw Error('The correction draft is missing.');
     const image=renderBoardImage(draft);draft.imageSnapshot=captureImageSnapshot(draft,image);draft.boardHash=createHash('sha256').update(image.png).digest('hex');await save();
     const receipt=await sendPreview(socket,identity.secretaryId,image.png,item.caption);draft.previewReceipt=receipt;item.sentId=receipt.id;
    }else{const receipt=await socket.sendMessage(identity.secretaryId,{text:item.text});assertPrivateSendReceipt(receipt,identity.secretaryId);item.sentId=receipt.key.id;}
    await save();
   }
   await acknowledgements.wait(item.sentId);
   if(item.kind==='preview')state.lastPreviewServerAckVerified=true;
   if(item.kind==='edit-preview')state.memberEdit.previewAcknowledged=true;
   state.outbox.shift();await save();status('Private club reply acknowledged.');
  }
 }
 async function ensureMembers(){
  const s=club.state;if(!enableMembers||!club.target||s?.stage!=='complete'||!s.groupLink?.connected||s.helperGroupPost?.status!=='sent')return;
  if(!s.memberLive){club.state=activateMembers(s,club.target,identity,now());await save();}
  if(syncMemberSchedule(club.state,now()))await save();
  if(!club.state.memberGuideSent){club.state.memberGuideSent=true;club.state.outbox.push({kind:'text',text:club.state.pilotMode?`I’m listening for role replies in ${club.target.name}. Changed boards post at ${club.state.postingTime||'8:00 PM'} India time. I’ll ask you privately about unclear messages. TABLE · EDIT · HELP`:`Member reply test is ready in ${club.target.name}. Use made-up names, for example Noah Example: I will take Grammarian. Reply TABLE privately to see current roles. Unclear requests stay private.`});await save();await flush();}
 }
 async function selectGroup(name){
  approvedImage(club.state);
  if(!name&&!club.target)throw Error(club.state.pilotMode?'Add the helper to your group, then send CONNECT GROUP followed by its exact name.':'Send CONNECT TEST GROUP followed by your test group name, for example CONNECT TEST GROUP Example Club Test. Add the helper to that group first.');
  if(name){
   const groups=await socket.groupFetchAllParticipating();
   const matches=Object.entries(groups).filter(([,g])=>g.subject?.trim().toLowerCase()===name.trim().toLowerCase());
   if(matches.length===0)throw Error(club.state.pilotMode?'I couldn’t find that group. Add the helper and send CONNECT GROUP followed by its exact name. Your board is saved.':'Add the helper to your test group first, then resend CONNECT TEST GROUP followed by its name. Your board is saved.');
   if(matches.length!==1)throw Error('More than one group has that name. Give your club group a unique name.');
   const target={groupId:matches[0][0],name:matches[0][1].subject,...(club.state.testOnly===true?{testOnly:true}:{pilotMode:true,secretaryId:identity.secretaryId})};
   checkGroup(await socket.groupMetadata(target.groupId),target,identity,helper);
   bindTarget(registry,club,target);await save();
  }
  return connectGroup(options());
 }
 async function deliverCorrection(){
  if(club.state?.memberEdit?.stage!=='post_ready'||!club.target)return;
  try{await deliverHelperCorrection(options());await flush();}
  catch(error){const s=club.state;if(!s.memberEdit.deliveryErrorNotified){s.memberEdit.deliveryErrorNotified=true;failedDelivery('correction|'+s.memberEdit.boardHash+'|'+now());s.outbox.push({kind:'text',text:error.message});await save();await flush();}}
 }
 async function command(command){
  if(club.paused||command.timestamp!==undefined&&!acceptMessage(club,command.timestamp))return;
  if(!club.state?.seen.includes(command.id)&&recordActivity(club,'secretary_message',command.id,now(),now()))await save();
  await processMembers();
  let s=club.state;
  if(pilotMode&&s){s.pilotMode=true;s.chatVersion=2;}if(s?.seen.includes(command.id))return;
  let followup;
  if(interpretSecretary){
   const translated=await translateSecretary(s,command,interpretSecretary);
   if(s)delete s.secretaryQuestion;
   if(translated.question){
    if(!s)club.state=s=begin(now(),{pilotMode});
    if(translated.pending)s.secretaryQuestion=translated.pending;
    s.seen.push(command.id);s.outbox.push({kind:'text',text:translated.question});await save();await flush();return;
   }
   if(translated.edit&&!s)club.state=s=begin(now(),{pilotMode});
   if(translated.edit&&s?.stage==='complete'&&!s.memberEdit){
    const count=s.outbox.length;club.state=handleHelperEdit(s,{...command,id:command.id+'-open-edit',text:'EDIT'},club.target).state;s=club.state;s.outbox.splice(count);
   }
   followup=translated;
   command={...command,text:translated.text};
   // Exact role lines also work directly in a returning Secretary's chat.
   if(s?.stage==='complete'&&!s.memberEdit&&/^\s*[^:]+:\s*[^:]+/.test(command.text)){
    const count=s.outbox.length;club.state=handleHelperEdit(s,{...command,id:command.id+'-open-edit',text:'EDIT'},club.target).state;s=club.state;s.outbox.splice(count);
   }
  }
  const edit=handleHelperEdit(s,command,club.target);
  if(edit.handled)club.state=edit.state;
  else if(/^(CONNECT (?:TEST )?GROUP(?:\s+.+)?|POST (?:TEST )?BOARD)$/i.test(command.text)&&s){
   s.seen.push(command.id);await save();
   try{
    const connect=/^CONNECT (?:TEST )?GROUP(?:\s+(.+))?$/i.exec(command.text);
    if(!connect&&!club.target)throw Error('Connect your test group before posting.');
    const changed=connect?await selectGroup(connect[1]):await postGroup(options());
    if(!changed)s.outbox.push({kind:'text',text:s.pilotMode?(connect?'Your group is already connected. Send POST BOARD to confirm the first post.':'Your approved board is already posted. TABLE · EDIT · HELP'):connect?'Your test group is already connected. Reply POST TEST BOARD to post the approved board once.':'The board is already posted. No duplicate was sent.'});
   }catch(error){if(s.helperGroupPost?.status==='sending')failedDelivery('initial|'+command.id);s.outbox.push({kind:'text',text:error.message});}
  }else club.state=applySetup(s,command,now(),{pilotMode});
  if(club.state?.stage==='complete'&&!club.target&&!club.state.groupHelpSent){club.state.groupHelpSent=true;club.state.outbox.push({kind:'text',text:club.state.pilotMode?'Add the helper to your club group, then send CONNECT GROUP followed by its name. You can connect one group for your club.':'Add the helper to your test group, then send CONNECT TEST GROUP followed by its name. Each Secretary can connect one club group.'});}
  if(followup&&club.state.memberEdit?.stage==='preview'&&!club.state.memberEdit.pendingEdits){const next=replacementQuestion(club.state,followup.replacements,followup.questionAfter);if(next.pending)club.state.secretaryQuestion=next.pending;if(next.question)club.state.outbox.push({kind:'text',text:next.question});}
  await save();await flush();await deliverCorrection();await ensureMembers();
 }
 async function group(event){
  if(!acceptMessage(club,Number(event.message?.messageTimestamp)*1000))return;
  if(!club.target||!club.state)return;
  await ensureMembers();const message=readMember(event,club.state,club.target,identity);
  if(message){club.state=queueMember(club.state,message,club.target,identity);await save();}
 }
 async function processMembers(){
  let s=club.state,live=s?.memberLive;
  if(s?.memberEdit?.send||s?.memberEdit?.stage==='post_ready'||!s?.groupLink?.connected||!live?.inbox.length||live.retryAt>now())return;
  try{
   if(!live.pendingBatch){const messages=live.inbox.slice(0,10),result=await interpret(live.board,messages,'availability',{pilotAuthorized:s.pilotMode===true});live.pendingBatch={messages,decisions:result.decisions};await save();}
   const batch=live.pendingBatch;let changes=0;
   club.state=applyMembers(s,batch.messages,batch.decisions,club.target,identity,()=>changes++);
   for(let i=0;i<batch.messages.length;i++)if(batch.decisions[i].intent!=='ignore')recordActivity(club,'member_reply',batch.messages[i].id,batch.messages[i].timestamp,now());
   if(changes)recordActivity(club,'role_update',batch.messages.map(m=>m.id).join('|'),now(),now(),changes);
   scheduleMemberTest(club.state,now());await save();await flush();status('Club member batch processed.');
  }catch{
   s=club.state;s.memberLive.retryAt=now()+180000;
   if(!s.memberLive.failureNotified){s.memberLive.failureNotified=true;s.outbox.push({kind:'text',text:'[ask the secretary to try again in few minutes]'});}
   await save();await flush();status('Club member batch preserved for retry.');
  }
 }
 async function tick(){
  if(club.paused)return;
  if(pilotMode&&club.state&&!club.state.pilotMode){club.state.pilotMode=true;club.state.chatVersion=2;await save();}
  await flush();if(queueClubReminder(club.state,now())){await save();await flush();}await deliverCorrection();await ensureMembers();await processMembers();
  const reminderDue=draftReminderDue(club.state,now());
  if(reminderDue){
   const s=club.state;syncDraft(s);s.memberEdit.remindedAt=reminderDue;
   s.outbox.push({kind:'text',text:`You have an unfinished draft. The scheduled group board time is ${s.postingTime||'8:00 PM'} India time. Confirmed member updates will still post if the approved board changed. Check your draft preview: APPROVE · EDIT · CANCEL.${s.memberEdit.pendingEdits?' Some correction lines still need fixing before approval.':''}`});
   queueDraftPreview(s);const question=conflictQuestion(s);if(question)s.outbox.push({kind:'text',text:question});
   await save();await flush();
  }
  if(club.state?.memberLive&&club.state.groupLink?.connected){
   if(rebaseResumeSchedule(club,now()))await save();
   try{if(await deliverMemberUpdate({...options(),now:now()})){await flush();status('Changed club board delivered.');}}
   catch(error){const s=club.state;if(!s.memberDeliveryFailureNotified){s.memberDeliveryFailureNotified=true;failedDelivery('member|'+s.memberLive.nextAt+'|'+now());s.outbox.push({kind:'text',text:error.message});await save();await flush();}}
  }
 }
 return {command,group,tick,flush};
}
module.exports={createClubEngine};
