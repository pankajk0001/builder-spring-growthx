const {createHash}=require('node:crypto');
const {updateTime}=require('./live-roles.cjs');
function resumeBlocker(club){
 if(!club.paused)return null;
 if(club.paused.kind!=='admin')return 'A delivery or processing problem needs review before this account can resume.';
 if(club.requiresFreshApproval||club.state?.requiresFreshApproval)return 'Fresh Secretary approval is required before resuming.';
 const s=club.state||{},posts=[s.helperGroupPost,...Object.values(s.memberLive?.posts||{})].filter(Boolean);
 if(s.outbox?.some(p=>p.sending)||s.memberEdit?.send||posts.some(p=>p.status!=='sent'||!(p.serverAckVerified||p.phoneDeliveryVerified)))return 'A previous send is not confirmed. Check its delivery before resuming.';
 return null;
}
function controlToken(club){return createHash('sha256').update(JSON.stringify({id:club.id,identity:club.identity,target:club.target,paused:club.paused||null,version:club.controlVersion||0,approval:club.state?.approvedHash,blocker:resumeBlocker(club)})).digest('hex');}
function acceptMessage(club,timestamp){return !club.paused&&Number.isFinite(timestamp)&&(!club.ignoreMessagesThrough||timestamp>club.ignoreMessagesThrough);}
function rebaseResumeSchedule(club,now=Date.now()){
 const s=club.state,live=s?.memberLive,due=live?.nextAt;
 if(!club.ignoreMessagesThrough||!live?.dirty||!due||Date.parse(due)>club.ignoreMessagesThrough||live.posts[due])return false;
 live.nextAt=updateTime(now,live.windowEnd,s.postingTime);return true;
}
// Called only inside the helper's existing serial queue. Persist before acknowledging.
function applyControl(registry,request,now=Date.now()){
 registry.adminReceipts||=[];
 const prior=registry.adminReceipts.find(r=>r.id===request.id);if(prior)return prior;
 const club=registry.clubs.find(c=>c.id===request.clubId);
 let message=null;
 if(!club)message='This club no longer exists.';
 else if(!['pause','resume'].includes(request.kind)||!Number.isFinite(request.requestedAt)||now-request.requestedAt>300000||request.requestedAt>now+60000)message='This request expired or is invalid. Refresh and try again.';
 else if(controlToken(club)!==request.expected)message='The account changed. Refresh and confirm again.';
 else if(request.kind==='pause'&&club.paused||request.kind==='resume'&&!club.paused)message='The account status changed. Refresh and confirm again.';
 else if(request.kind==='resume')message=resumeBlocker(club);
 if(!message){
  club.controlVersion=(club.controlVersion||0)+1;
  if(request.kind==='pause')club.paused={kind:'admin',reason:'Paused by the owner.',at:new Date(now).toISOString()};
  else{
   club.paused=null;club.ignoreMessagesThrough=now;
   const s=club.state,live=s?.memberLive;
   // Missed automatic posts wait for the next regular time, never a catch-up burst.
   if(live?.dirty&&(!live.nextAt||Date.parse(live.nextAt)<=now))live.nextAt=updateTime(now,live.windowEnd,s.postingTime);
   if(s?.memberTest?.authorized&&!s.memberTest.done){s.memberTest.done=true;if(live?.dirty)live.nextAt=updateTime(now,live.windowEnd,s.postingTime);}
  }
 }
 const result={id:request.id,clubId:request.clubId,kind:request.kind,at:now,status:message?'failed':'succeeded',message:message||(request.kind==='pause'?'Pause confirmed by the helper.':'Resume confirmed. Messages received during the pause will not be replayed.')};
 registry.adminReceipts.push(result);registry.adminReceipts=registry.adminReceipts.filter(r=>now-r.at<86400000).slice(-1000);
 return result;
}
module.exports={controlToken,resumeBlocker,acceptMessage,applyControl,rebaseResumeSchedule};
