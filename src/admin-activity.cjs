const {createHash}=require('node:crypto');
const DAY=86400000,MAX_EVENTS=20000;
const kinds=['secretary_message','member_reply','role_update','board_approved','board_posted','delivery_failure','setup_complete'];
const digest=value=>createHash('sha256').update(String(value)).digest('hex');
function ensureActivity(club,now=Date.now()){
 if(!club.activity)club.activity={version:1,trackingSince:now,events:[],lastSecretary:{},lastClubAt:null,truncatedAt:null};
 return club.activity;
}
function recordActivity(club,kind,key,at,now=Date.now(),count=1){
 if(!kinds.includes(kind)||!Number.isFinite(at)||at>now+60000||!Number.isInteger(count)||count<1)return false;
 at=Math.min(at,now);
 const a=ensureActivity(club,Math.min(now,at));
 if(at<a.trackingSince||at<=now-8*DAY)return false;
 const id=digest(kind+'|'+key);
 if(a.events.some(e=>e.id===id))return false;
 a.events=a.events.filter(e=>e.at>now-8*DAY);
 const actor=digest(club.identity.secretaryId);
 if(kind==='secretary_message'){a.lastSecretary??={};a.lastSecretary[actor]=Math.max(a.lastSecretary[actor]||0,at);}
 else if(['member_reply','role_update','board_approved','board_posted','setup_complete'].includes(kind))a.lastClubAt=Math.max(a.lastClubAt||0,at);
 a.events.push({id,kind,at,count,...(kind==='secretary_message'?{actor}:{})});
 if(a.events.length>MAX_EVENTS){a.events.splice(0,a.events.length-MAX_EVENTS);a.truncatedAt=now;}
 return true;
}
function summarizeActivity(club,now=Date.now()){
 const a=club.activity;if(!a)return null;
 const actor=digest(club.identity.secretaryId),events=a.events.filter(e=>e.at>now-7*DAY&&e.at<=now);
 const secretary=events.filter(e=>e.kind==='secretary_message'&&e.actor===actor);
 const total=kind=>events.filter(e=>e.kind===kind).reduce((sum,e)=>sum+e.count,0);
 const last=list=>list.length?Math.max(...list.map(e=>e.at)):null;
 const lastSecretaryAt=a.lastSecretary?.[actor]??last(a.events.filter(e=>e.kind==='secretary_message'&&e.actor===actor));
 const lastClubAt=a.lastClubAt??last(a.events.filter(e=>['member_reply','role_update','board_approved','board_posted','setup_complete'].includes(e.kind)));
 return {trackingSince:a.trackingSince,complete:!a.truncatedAt||a.truncatedAt<=now-7*DAY,secretaryActive:lastSecretaryAt!==null&&lastSecretaryAt>now-7*DAY&&lastSecretaryAt<=now,clubActive:lastClubAt!==null&&lastClubAt>now-7*DAY&&lastClubAt<=now,lastSecretaryAt,lastClubAt,secretaryMessages:secretary.reduce((n,e)=>n+e.count,0),memberReplies:total('member_reply'),roleUpdates:total('role_update'),boardsApproved:total('board_approved'),boardsPosted:total('board_posted'),deliveryFailures:total('delivery_failure'),setupsCompleted:total('setup_complete')};
}
function activityMarkers(club){
 const s=club.state||{},posts=[s.helperGroupPost,...Object.values(s.memberLive?.posts||{})].filter(p=>p?.status==='sent'&&(p.serverAckVerified||p.phoneDeliveryVerified));
 return {stage:s.stage,approved:s.approvedHash||null,draftApproved:s.memberEdit?.stage==='post_ready'?s.memberEdit.boardHash:null,posts:posts.map(p=>p.id).filter(Boolean)};
}
function observeActivity(club,previous,now=Date.now()){
 const current=activityMarkers(club);
 if(current.stage==='complete'&&previous.stage!=='complete')recordActivity(club,'setup_complete',current.approved+'|'+now,now,now);
 const hash=current.draftApproved!==previous.draftApproved&&current.draftApproved||current.approved!==previous.approved&&current.approved;
 if(hash&&hash!==previous.draftApproved)recordActivity(club,'board_approved',hash+'|'+now,now,now);
 for(const id of current.posts)if(!previous.posts.includes(id))recordActivity(club,'board_posted',id,now,now);
 return current;
}
module.exports={ensureActivity,recordActivity,summarizeActivity,activityMarkers,observeActivity};
