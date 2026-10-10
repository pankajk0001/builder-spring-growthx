// A read-only, explicit projection. Never export raw chats, queues or credentials.
function text(value,max=240){return typeof value==='string'?value.slice(0,max):null;}
function board(value){return Array.isArray(value)?value.filter(r=>!r.removed).slice(0,30).map(r=>({role:text(r.role,80)||'Unknown role',member:text(r.member,120)})):[];}
function meeting(value={}){return {club:text(value.club),number:text(value.number,40),date:text(value.date,80),time:text(value.time,40),venue:text(value.venue)};}
function projectRegistry(registry,now=Date.now()){
 if(!Array.isArray(registry.clubs)||registry.clubs.length>250)throw Error('Unsupported account count.');
 const accounts=registry.clubs.map(c=>{const s=c.state||{},live=s.memberLive,draft=s.memberEdit;
 const deliveries=[...(s.helperGroupPost?[s.helperGroupPost]:[]),...Object.values(live?.posts||{})].slice(-20).map(p=>({status:text(p.status,40)||'unknown',postedAt:text(p.postedAt,80),acknowledged:p.serverAckVerified===true||p.phoneDeliveryVerified===true}));
 return {id:c.id,club:text(s.meeting?.club)||text(c.target?.name)||'Setup in progress',secretary:text(c.identity?.secretaryId?.split('@')[0],32)||'Unknown',group:text(c.target?.name),connected:s.groupLink?.connected===true,paused:!!c.paused,stage:text(s.stage,40)||'not_started',postingTime:text(s.postingTime,40),nextUpdate:text(live?.nextAt,80),meeting:meeting(s.meeting),approved:board(s.approvedHash?s.board:[]),current:board(live?.board||s.board),draft:draft?{stage:text(draft.stage,40)||'editing',meeting:meeting(draft.meeting),roles:board(draft.board)}:null,deliveries,needsAttention:!!c.paused||!!s.memberDeliveryFailureNotified||!!live?.failureNotified||!!draft?.pendingEdits};});
 return {capturedAt:now,accounts};
}
module.exports={projectRegistry};
