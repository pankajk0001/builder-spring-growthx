const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {respondToRoles}=require('./role-availability.cjs');
const {memberKey,assertUniqueRoleHolders}=require('./role-uniqueness.cjs');
const {renderBoardImage}=require('./board-image.cjs');
const {meetingCutoff,timeMinutes}=require('./meeting-cycle.cjs');
const OFFSET=330*60000;
const hashBoard=s=>createHash('sha256').update(renderBoardImage(s).png).digest('hex');
function updateTime(timestamp,cutoff=Infinity,postingTime){
 const d=new Date(timestamp+OFFSET);
 let due=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),0,timeMinutes(postingTime))-OFFSET;
 if(timestamp>=due)due+=86400000;
 if(due>cutoff)return null;
 return new Date(due).toISOString();
}
function ensureLive(state){
 if(state.groupPost?.status!=='sent'||!state.groupPost.deliveryReceiptVerified)return state;
 const cutoff=meetingCutoff(state.meeting.date,state.postingTime);
 if(state.live?.basePostId===state.groupPost.id){
  if(state.live.windowEnd===cutoff)return state;
  const live={...state.live,windowEnd:cutoff};
  if(live.nextAt&&Date.parse(live.nextAt)>cutoff)live.nextAt=null;
  return {...state,live};
 }
 const old=state.live;
 const start=Date.parse(state.groupPost.postedAt);
 if(!Number.isFinite(start))throw Error('A dated group delivery receipt is required before listening to members.');
 const sameWeek=old&&old.authorization.requestId===state.requestId;
 return {...state,live:{basePostId:state.groupPost.id,authorization:{requestId:state.requestId,initialApprovedHash:state.approvedBoardHash,groupId:state.targetGroupId},
  startedAt:sameWeek?old.startedAt:start,windowEnd:cutoff,board:structuredClone(state.board),publishedBoard:structuredClone(state.board),
  seen:sameWeek?old.seen:[],inbox:sameWeek?old.inbox:[],posts:sameWeek?old.posts:{},dirty:false,nextAt:null}};
}
function groupRoleMessage(event,state,target){
 if(!((state.testOnly===true&&(target.name==='Test_group'||target.testOnly===true))||(state.pilotMode===true&&target.pilotMode===true&&target.secretaryId===state.secretaryId))||target.groupId!==state.targetGroupId||!state.live||!['notify','append'].includes(event.type))return null;
 const message=event.message,key=message?.key;
 if(key?.remoteJid!==target.groupId||!key.id||state.ownIds?.includes(key.id))return null;
 const timestamp=Number(message.messageTimestamp)*1000;
 if(!Number.isFinite(timestamp)||timestamp<state.live.startedAt||timestamp>=state.live.windowEnd)return null;
 let text=event.content?.conversation??event.content?.extendedTextMessage?.text;
 if(typeof text!=='string'||!text.trim()||text.length>5000||text.startsWith('the helper —'))return null;
 const normalize=id=>typeof id==='string'?id.replace(/:\d+(?=@)/,''):null;
 const actor=normalize(key.participant||state.secretaryId);
 const secretaryActors=[normalize(state.secretaryId),normalize(state.secretaryLid)].filter(Boolean);
 const trustedSecretary=[actor,normalize(key.participantAlt)].some(id=>id&&secretaryActors.includes(id));
 let testAlias=text.trim();while(testAlias.length>2&&['*','_','~'].includes(testAlias[0])&&testAlias.at(-1)===testAlias[0])testAlias=testAlias.slice(1,-1).trim();
 const simulated=target.testOnly===true&&trustedSecretary&&/^([\p{L}\p{N} .'-]{1,80} Example):\s*([\s\S]+)$/u.test(testAlias);
 if(state.pilotMode===true&&!simulated){
  if(!key.participant)return null;
  const actors=[actor,normalize(key.participantAlt)].filter(Boolean);
  const account=actors.find(id=>id.endsWith('@s.whatsapp.net'))||actor;
  const actorKey=createHash('sha256').update(account).digest('hex');
  const actorKeys=[...new Set(actors.map(id=>createHash('sha256').update(id).digest('hex')))];
  const held=state.live.board.find(row=>row.member&&(row.memberId===actorKey||row.memberIds?.some(id=>actorKeys.includes(id))));
  const display=typeof message.pushName==='string'?message.pushName.trim().replace(/\s+/g,' ').slice(0,120):'';
  return {id:'member-live-'+createHash('sha256').update(key.id+'|'+account).digest('hex'),actorKey,actorKeys,sender:held?.member||display||'Member',identityUnclear:!held&&!display,text:text.trim(),timestamp};
 }

 let sender='Member '+createHash('sha256').update(actor).digest('hex').slice(0,8)+' Example';
 // The paired test phone can act out fictional members; other members cannot impersonate them.
 let aliasText=text.trim();
 // WhatsApp bold, italic and strike-through can wrap the whole test reply.
 while(aliasText.length>2&&['*','_','~'].includes(aliasText[0])&&aliasText.at(-1)===aliasText[0])aliasText=aliasText.slice(1,-1).trim();
 const pretend=/^([\p{L}\p{N} .'-]{1,80} Example):\s*([\s\S]+)$/u.exec(aliasText);
 if(pretend&&(key.fromMe===true||trustedSecretary)){sender=pretend[1];text=pretend[2];}
 return {id:'fictional-live-'+createHash('sha256').update(key.id+'|'+actor).digest('hex'),sender,text:text.trim(),timestamp};
}
function enqueueGroupMessage(state,message){
 state=ensureLive(state);const live=state.live;
 if(!live||message.timestamp<live.startedAt||message.timestamp>=live.windowEnd||!updateTime(message.timestamp,live.windowEnd,state.postingTime)||live.seen.includes(message.id))return state;
 if(live.inbox.length>=300){
  if(live.overflowNotified)return state;
  return {...state,live:{...live,overflowNotified:true},outbox:[...(state.outbox||[]),{kind:'text',text:'[ask the secretary to try again in few minutes]'}]};
 }
 return {...state,live:{...live,seen:[...live.seen,message.id],inbox:[...live.inbox,message]}};
}
function applyLiveBatch(state,messages,decisions){
 const live=state.live;
 if(!live||state.status!=='approved'||state.editSession)throw Error('Member updates are paused while the Secretary edits or approves a board.');
 if(messages.length>10||!messages.length||!isDeepStrictEqual(messages,live.inbox.slice(0,messages.length)))throw Error('The saved member batch changed.');
 if(!Array.isArray(decisions)||decisions.length!==messages.length)throw Error('Every message requires one role decision.');
 let board=structuredClone(live.board);const notes=[];let changedAt=null;
 for(let i=0;i<messages.length;i++){
  const source=messages[i];let decision=decisions[i];
  if(decision?.messageId!==source.id||!['check','take','drop','ignore','clarify'].includes(decision.intent))throw Error('Invalid or reordered member decisions.');
  const matchesActor=row=>source.actorKey&&(row.memberId===source.actorKey||row.memberIds?.some(id=>source.actorKeys?.includes(id)));
  const nameMatch=board.find(row=>row.member&&memberKey(row.member)===memberKey(source.sender));
  const existing=source.actorKey?board.find(row=>row.member&&matchesActor(row)):nameMatch;
  if(source.identityUnclear&&decision.intent!=='ignore')decision={messageId:source.id,intent:'clarify'};
  // Resolve this explicit, role-free withdrawal from saved ownership, not an AI guess.
  const explicitAbsence=/^i (?:can['’]t|cannot|can not) make it[.!]?$/i.test(source.text.trim());
  if(explicitAbsence){
   const held=board.filter(row=>!row.removed&&row.member&&(source.actorKey?matchesActor(row):memberKey(row.member)===memberKey(source.sender)));
   if(held.length===1)decision={messageId:source.id,intent:'drop',role:held[0].role};
   else if(held.length===0&&live.publishedBoard.some(row=>!row.removed&&row.member&&(source.actorKey?matchesActor(row):memberKey(row.member)===memberKey(source.sender))))decision={messageId:source.id,intent:'ignore'};
   else decision={messageId:source.id,intent:'clarify'};
  }
  const message={...source,sender:existing?.member||source.sender};
  const role=board.find(row=>row.role===decision.role&&!row.removed);
  if(source.actorKey&&((decision.intent==='drop'&&role?.member&&!matchesActor(role))||(decision.intent==='take'&&role?.member===null&&nameMatch&&!existing))){
   notes.push(`I couldn’t verify ${source.sender}’s account against the saved role holder. Please check their message and use EDIT to make the correction.\nMessage: ${source.text}`);continue;
  }
  if(decision.intent==='take'&&role?.member===null&&existing&&existing.role!==role.role){
   notes.push('Secretary: '+message.sender+' already holds '+existing.role+'. Please clarify their request for '+role.role+'. No assignment was changed.');continue;
  }
  const result=respondToRoles(board,[message],[decision]);
  for(const note of result.notes)if(note.kind==='clarify')notes.push(state.pilotMode?`I need your help with ${source.sender}’s reply.\nMessage: ${source.text}\nNo role changed. Please use EDIT to confirm the correction.`:note.text+'\nMessage: '+source.text);
  if(!isDeepStrictEqual(board,result.board)){board=result.board;
   if(source.actorKey&&decision.intent==='take'){const changed=board.find(row=>row.role===decision.role);changed.memberId=source.actorKey;changed.memberIds=source.actorKeys||[source.actorKey];}
   if(source.actorKey&&decision.intent==='drop'){const changed=board.find(row=>row.role===decision.role);delete changed.memberId;delete changed.memberIds;}
   changedAt=source.timestamp;}
 }
 assertUniqueRoleHolders(board);
 const dirty=!isDeepStrictEqual(board,live.publishedBoard);
 let nextAt=dirty?(changedAt!==null?updateTime(changedAt,live.windowEnd,state.postingTime):live.nextAt):null;
 if(nextAt&&live.posts[nextAt]?.status==='sent')nextAt=updateTime(Date.parse(nextAt)+1000,live.windowEnd,state.postingTime);
 return {...state,live:{...live,board,dirty,nextAt,inbox:live.inbox.slice(messages.length),pendingBatch:null,retryAt:null,failureNotified:false,overflowNotified:false},
  outbox:[...(state.outbox||[]),...notes.map(text=>({kind:'text',text}))]};
}
function dailyDecision(state,now=Date.now()){
 const live=state.live;
 if(!live?.dirty||!live.nextAt||isDeepStrictEqual(live.board,live.publishedBoard))return 'unchanged';
 if(state.status!=='approved'||state.editSession||state.groupPost?.status!=='sent')return 'paused';
 if((state.testOnly!==true&&state.pilotMode!==true)||live.authorization.groupId!==state.targetGroupId||!live.authorization.initialApprovedHash)throw Error('Automatic changes require initial board approval for this test group.');
 const attempt=live.posts[live.nextAt];
 if(attempt?.status==='sent')return 'complete';
 if(attempt)return 'uncertain';
 if(now<Date.parse(live.nextAt))return 'wait';
 if(now>live.windowEnd)return 'closed';
 assertUniqueRoleHolders(live.board);
 return 'send';
}
function privateBoardState(state,command){
 if(!state.live?.dirty||state.editSession||!['table','edit'].includes(command.trim().toLowerCase()))return state;
 const current={...state,board:structuredClone(state.live.board)};
 // Initial approval authorizes these validated member changes; keep its source separately.
 const hash=hashBoard(current);
 return {...current,boardHash:hash,approvedBoardHash:hash,automaticAuthorization:state.live.authorization};
}
module.exports={ensureLive,groupRoleMessage,enqueueGroupMessage,applyLiveBatch,dailyDecision,updateTime,privateBoardState,hashBoard};
