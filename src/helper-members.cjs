const {ensureLive,groupRoleMessage,enqueueGroupMessage,applyLiveBatch,dailyDecision,updateTime}=require('./live-roles.cjs');
const {approvedImage,verifyMembership}=require('./helper-group-connection.cjs');
const {renderBoardImage}=require('./board-image.cjs');
const {captureImageSnapshot}=require('./board-image-snapshot.cjs');
const {createHash}=require('node:crypto');
const {parseMeetingTime,timeMinutes,meetingCutoff}=require('./meeting-cycle.cjs');
const {sendHelperTestGroupBoard}=require('./preview-delivery.cjs');
function memberProjection(s,target,identity){
 return {board:s.board,meeting:s.meeting,postingTime:s.postingTime,pilotMode:s.pilotMode,testOnly:s.testOnly,status:s.stage==='complete'&&!s.memberEdit?'approved':'awaiting_approval',requestId:s.approvedHash,approvedBoardHash:s.approvedHash,
  targetGroupId:target.groupId,...identity,groupPost:{...s.helperGroupPost,deliveryReceiptVerified:s.helperGroupPost?.status==='sent'&&Boolean(s.helperGroupPost.serverAckVerified||s.helperGroupPost.phoneDeliveryVerified),postedAt:new Date(s.memberListeningStartedAt||0).toISOString()},
  live:s.memberLive,ownIds:[s.helperGroupPost?.id,...Object.values(s.memberLive?.posts||{}).map(p=>p.id)].filter(Boolean),outbox:[]};
}
function activateMembers(s,target,identity,now=Date.now()){
 if(!(target.testOnly===true||s.pilotMode===true&&target.pilotMode===true&&target.secretaryId===identity.secretaryId)||s.groupLink?.connected!==true||s.groupLink.groupId!==target.groupId||s.helperGroupPost?.status!=='sent'||!(s.helperGroupPost.serverAckVerified||s.helperGroupPost.phoneDeliveryVerified))throw Error('Member replies need a verified posted board and connected test group.');
 if(s.memberLive){if(s.memberLive.authorization.groupId!==target.groupId||s.memberLive.authorization.initialApprovedHash!==s.approvedHash)throw Error('Member updates belong to a different approved group board.');return s;}
 approvedImage(s);
 const current={...s,memberListeningStartedAt:Math.floor(now/1000)*1000};
 return {...current,memberLive:ensureLive(memberProjection(current,target,identity)).live};
}
function readMember(event,s,target,identity){
 if(!s.memberLive||s.groupLink?.connected!==true||event.message?.key?.fromMe===true||!event.message?.key?.participant)return null;
 return groupRoleMessage({...event,content:event.message.message},memberProjection(s,target,identity),target);
}
function merge(s,projected){return {...s,memberLive:projected.live,outbox:[...(s.outbox||[]),...(projected.outbox||[])]};}
function queueMember(s,message,target,identity){return merge(s,enqueueGroupMessage(memberProjection(s,target,identity),message));}
function applyMembers(s,messages,decisions,target,identity){return merge(s,applyLiveBatch(memberProjection(s,target,identity),messages,decisions));}
async function deliverMemberUpdate({state,target,identity,helper,socket,acknowledgements,save,now=Date.now(),sendImage=sendHelperTestGroupBoard}){
 const decision=memberDecision(state,target,identity,now);
 if(decision!=='send'){if(decision==='uncertain')throw Error('An earlier updated-board send is uncertain. Check the group; it will not be resent automatically.');return false;}
 await verifyMembership({state,target,identity,helper,socket,save});
 const live=state.memberLive,due=live.nextAt;
 const draft={board:structuredClone(live.board),meeting:structuredClone(state.meeting)};
 const image=renderBoardImage(draft),hash=createHash('sha256').update(image.png).digest('hex');
 const attempt={status:'sending',hash,board:draft.board,meeting:draft.meeting,imageSnapshot:captureImageSnapshot(draft,image)};
 live.posts[due]=attempt;await save();
 const sent=await sendImage(socket,target,image.png,'the helper — Updated role board');
 if(sent.sha256!==hash||!sent.id)throw Error('WhatsApp did not confirm the updated board image.');
 attempt.id=sent.id;await save();await acknowledgements.wait(sent.id);
 Object.assign(attempt,{status:'sent',serverAckVerified:true,postedAt:new Date(now).toISOString()});
 live.publishedBoard=structuredClone(draft.board);live.publishedHash=hash;live.dirty=false;live.nextAt=null;
 if(state.memberTest?.dueAt===due)state.memberTest.done=true;
 state.outbox.push({kind:'text',text:`Updated board posted to ${target.name}. Check every role in the image. Reply TABLE here to view the current roles.`});
 await save();return true;
}
function syncMemberSchedule(state,now=Date.now()){
 const live=state.memberLive;if(!live)return false;
 const postingTime=parseMeetingTime(state.postingTime||'8:00 PM'),cutoff=meetingCutoff(state.meeting.date,postingTime);
 if(live.updatePostingTime===postingTime&&live.windowEnd===cutoff)return false;
 const oldDue=live.nextAt;
 live.updatePostingTime=postingTime;live.windowEnd=cutoff;
 const shortTest=state.memberTest?.authorized&&!state.memberTest.done&&state.memberTest.dueAt===oldDue;
 // An existing send intent must remain pinned to its recorded time for safe recovery.
 if(live.dirty&&oldDue&&!live.posts[oldDue]&&!shortTest){
  const local=new Date(Date.parse(oldDue)+330*60000);
  let due=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate(),0,timeMinutes(postingTime))-330*60000;
  if(due<now){const next=updateTime(now,cutoff,postingTime);due=next?Date.parse(next):Infinity;}
  live.nextAt=due<=cutoff?new Date(due).toISOString():null;
 }
 return true;
}
function scheduleMemberTest(state,now=Date.now()){
 if(!state.memberTest?.authorized||state.memberTest.done||!state.memberLive?.dirty)return state;
 if(!state.memberTest.dueAt){const due=now+120000;if(due>state.memberLive.windowEnd)return state;state.memberTest.dueAt=new Date(due).toISOString();}
 state.memberLive.nextAt=state.memberTest.dueAt;return state;
}
function memberDecision(s,target,identity,now=Date.now()){if(s.groupLink?.connected!==true)return 'paused';return dailyDecision(memberProjection(s,target,identity),now);}
module.exports={activateMembers,readMember,queueMember,applyMembers,memberDecision,memberProjection,deliverMemberUpdate,scheduleMemberTest,syncMemberSchedule};
