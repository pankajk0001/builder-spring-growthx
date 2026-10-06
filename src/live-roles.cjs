const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {respondToRoles}=require('./role-availability.cjs');
const {memberKey,assertUniqueRoleHolders}=require('./role-uniqueness.cjs');
const {renderBoardImage}=require('./board-image.cjs');
const OFFSET=330*60000;
const hashBoard=s=>createHash('sha256').update(renderBoardImage(s).png).digest('hex');
function endOfWeek(timestamp){
 const d=new Date(timestamp+OFFSET);
 return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+5-(d.getUTCDay()||7),20)-OFFSET;
}
function updateTime(timestamp){
 const d=new Date(timestamp+OFFSET),day=d.getUTCDay();
 if(day===0||day===6)return null;
 let due=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),20)-OFFSET;
 if(timestamp>=due){if(day===5)return null;due+=86400000;}
 return new Date(due).toISOString();
}
function ensureLive(state){
 if(state.groupPost?.status!=='sent'||!state.groupPost.deliveryReceiptVerified)return state;
 if(state.live?.basePostId===state.groupPost.id)return state;
 const old=state.live;
 const start=Date.parse(state.groupPost.postedAt);
 if(!Number.isFinite(start))throw Error('A dated group delivery receipt is required before listening to members.');
 const sameWeek=old&&start<old.windowEnd;
 return {...state,live:{basePostId:state.groupPost.id,authorization:{requestId:state.requestId,initialApprovedHash:state.approvedBoardHash,groupId:state.targetGroupId},
  startedAt:sameWeek?old.startedAt:start,windowEnd:sameWeek?old.windowEnd:endOfWeek(start),board:structuredClone(state.board),publishedBoard:structuredClone(state.board),
  seen:sameWeek?old.seen:[],inbox:sameWeek?old.inbox:[],posts:sameWeek?old.posts:{},dirty:false,nextAt:null}};
}
function groupRoleMessage(event,state,target){
 if(state.testOnly!==true||target.name!=='Test_group'||target.groupId!==state.targetGroupId||!state.live||!['notify','append'].includes(event.type))return null;
 const message=event.message,key=message?.key;
 if(key?.remoteJid!==target.groupId||!key.id||state.ownIds?.includes(key.id))return null;
 const timestamp=Number(message.messageTimestamp)*1000;
 if(!Number.isFinite(timestamp)||timestamp<state.live.startedAt||timestamp>=state.live.windowEnd)return null;
 let text=event.content?.conversation??event.content?.extendedTextMessage?.text;
 if(typeof text!=='string'||!text.trim()||text.length>5000||text.startsWith('the helper —'))return null;
 const actor=(key.participant||state.secretaryId).replace(/:\d+(?=@)/,'');
 let sender='Member '+createHash('sha256').update(actor).digest('hex').slice(0,8)+' Example';
 // The paired test phone can act out fictional members; other members cannot impersonate them.
 const pretend=/^([\p{L}\p{N} .'-]{1,80} Example):\s*([\s\S]+)$/u.exec(text.trim());
 if(pretend&&(key.fromMe===true||actor===state.secretaryId||actor===state.secretaryLid)){sender=pretend[1];text=pretend[2];}
 return {id:'fictional-live-'+createHash('sha256').update(key.id+'|'+actor).digest('hex'),sender,text:text.trim(),timestamp};
}
function enqueueGroupMessage(state,message){
 state=ensureLive(state);const live=state.live;
 if(!live||message.timestamp<live.startedAt||message.timestamp>=live.windowEnd||!updateTime(message.timestamp)||live.seen.includes(message.id))return state;
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
  const source=messages[i],decision=decisions[i];
  if(decision?.messageId!==source.id||!['check','take','drop','ignore','clarify'].includes(decision.intent))throw Error('Invalid or reordered member decisions.');
  const existing=board.find(row=>row.member&&memberKey(row.member)===memberKey(source.sender));
  const message={...source,sender:existing?.member||source.sender};
  const role=board.find(row=>row.role===decision.role&&!row.removed);
  if(decision.intent==='take'&&role?.member===null&&existing&&existing.role!==role.role){
   notes.push('Secretary: '+message.sender+' already holds '+existing.role+'. Please clarify their request for '+role.role+'. No assignment was changed.');continue;
  }
  const result=respondToRoles(board,[message],[decision]);
  for(const note of result.notes)if(note.kind==='clarify')notes.push(note.text+'\nMessage: '+source.text);
  if(!isDeepStrictEqual(board,result.board)){board=result.board;changedAt=source.timestamp;}
 }
 assertUniqueRoleHolders(board);
 const dirty=!isDeepStrictEqual(board,live.publishedBoard);
 let nextAt=dirty?(changedAt!==null?updateTime(changedAt):live.nextAt):null;
 if(nextAt&&live.posts[nextAt]?.status==='sent')nextAt=updateTime(Date.parse(nextAt)+1000);
 return {...state,live:{...live,board,dirty,nextAt,inbox:live.inbox.slice(messages.length),pendingBatch:null,retryAt:null,failureNotified:false,overflowNotified:false},
  outbox:[...(state.outbox||[]),...notes.map(text=>({kind:'text',text}))]};
}
function dailyDecision(state,now=Date.now()){
 const live=state.live;
 if(!live?.dirty||!live.nextAt)return 'unchanged';
 if(state.status!=='approved'||state.editSession||state.groupPost?.status!=='sent')return 'paused';
 if(state.testOnly!==true||live.authorization.groupId!==state.targetGroupId||!live.authorization.initialApprovedHash)throw Error('Automatic changes require initial board approval for this test group.');
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
