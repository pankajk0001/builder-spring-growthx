import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {renderBoardImage}=require('../src/board-image.cjs');
const {sendTestGroupBoard}=require('../src/preview-delivery.cjs');
const {deliverPreviewOnce}=require('../src/preview-outbox.cjs');
const {assertPrivateSendReceipt}=require('../src/note-delivery.cjs');
const {createMessageAckTracker}=require('../src/message-ack.cjs');
const {secretaryCommand,isSecretaryChat}=require('../src/approval-inbox.cjs');
const {applyPostedEditMessage}=require('../src/posted-edit.cjs');
const {postingDecision}=require('../src/group-posting.cjs');
const {sendPostConfirmation}=require('../src/post-confirmation.cjs');
const {verifyRestart}=require('../src/restart-check.cjs');
const {renderTable}=require('../src/role-board.cjs');
const {queueReminder,applyWeeklyMessage}=require('../src/weekly.cjs');
const {ensureLive,groupRoleMessage,enqueueGroupMessage,applyLiveBatch,dailyDecision,privateBoardState,hashBoard}=require('../src/live-roles.cjs');
const {interpretFictionalMessages}=require('../src/hermes-intent.cjs');
const weeklyMode=process.argv.includes('--weekly');
const dir=join(homedir(),'.hermes','the-helper'),file=join(dir,'approval-state.json'),lockPath=join(dir,'group-post.lock');
const target=JSON.parse(await readFile(join(dir,'test-group.json'),'utf8'));
assert.equal(target.name,'Test_group');
let state=JSON.parse(await readFile(file,'utf8'));
assert.equal(state.targetGroupId,target.groupId);
assert.equal(state.testOnly,true);
assert.ok(state.board.every(row=>row.member===null||row.member.endsWith(' Example')));
assert.match(state.meeting.club,/\bExample\b/i);
const status=text=>process.stdout.write(text+'\n');console.log=console.info=console.warn=()=>{};
let lock;
try {lock=await open(lockPath,'wx',0o600);await lock.writeFile(String(process.pid));}
catch(error){if(error.code!=='EEXIST')throw error;const pid=Number(await readFile(lockPath,'utf8'));try{process.kill(pid,0);}catch(e){if(e.code!=='ESRCH')throw e;await unlink(lockPath);lock=await open(lockPath,'wx',0o600);await lock.writeFile(String(process.pid));}if(!lock){status('Another posting or editing runner is active.');process.exit(0);}}
async function save(){await writeFile(file+'.tmp',JSON.stringify(state,null,2)+'\n',{mode:0o600});await rename(file+'.tmp',file);}
const hashOf=()=>createHash('sha256').update(renderBoardImage(state).png).digest('hex');
const bridge=join(homedir(),'.hermes','hermes-agent','scripts','whatsapp-bridge'),requireBridge=createRequire(join(bridge,'package.json'));
const baileys=await import(pathToFileURL(requireBridge.resolve('@whiskeysockets/baileys')).href);
const {default:pino}=await import(pathToFileURL(requireBridge.resolve('pino')).href);
const {state:auth,saveCreds}=await baileys.useMultiFileAuthState(target.sessionPath);
const secretaryId=baileys.jidNormalizedUser(auth.creds.me?.id||'');
const secretaryLid=auth.creds.me?.lid?baileys.jidNormalizedUser(auth.creds.me.lid):null;
assert.equal(state.secretaryId,secretaryId);
const {version}=await baileys.fetchLatestBaileysVersion();
const sock=baileys.makeWASocket({auth,version,logger:pino({level:'silent'}),syncFullHistory:false,markOnlineOnConnect:false,emitOwnEvents:true,shouldIgnoreJid:jid=>jid!==target.groupId&&!isSecretaryChat(jid,{secretaryId,secretaryLid})});
let credentialWrites=Promise.resolve();sock.ev.on('creds.update',()=>{credentialWrites=credentialWrites.then(saveCreds);});
const ack=createMessageAckTracker(sock.ev,{secretaryId,secretaryLid,targetGroupId:target.groupId},30000);
let accepting=false,queue=Promise.resolve(),finish,timer,weeklyTimer;
const finished=new Promise(resolve=>{finish=resolve;});
async function flush(){
 while(state.outbox?.length){
  const item=state.outbox[0];let id=item.sentId;
  if(item.kind==='preview'){
   id=await deliverPreviewOnce({state,item,socket:sock,secretaryId,png:renderBoardImage(state).png,
    caption:'the helper — CORRECTED BOARD PREVIEW\n'+item.text,acknowledgements:ack,save});
  }else{
   if(!id){
    const text='the helper — BOARD EDIT\n'+item.text;
    const sent=await sock.sendMessage(secretaryId,{text});assertPrivateSendReceipt(sent,secretaryId);
    assert.equal(sent.message?.conversation??sent.message?.extendedTextMessage?.text,text);id=sent.key.id;
    item.sentId=id;state.ownIds.push(id);await save();
   }
   await ack.wait(id);
  }
  state.lastReplyMessageId=id;
  if(state.status==='approved'&&['correction','weekly'].includes(state.postingMode))state.finalReplyServerAckVerified=true;
  state.outbox.shift();await save();
 }
}
async function deliverCorrection(){
 if(state.status!=='approved'||!['correction','weekly'].includes(state.postingMode))return;
 assert.ok(state.board.every(row=>row.member===null||row.member.endsWith(' Example')));
 assert.equal(state.approvedBoardHash,hashOf());
 state.flowVerified=true;await save();
 const decision=postingDecision(state,target,hashOf());
 if(decision==='wait')return;
 if(decision==='complete'){await sendPostConfirmation({state,secretaryId,socket:sock,acknowledgements:ack,save});return;}
 if(decision==='uncertain'&&!state.groupPost.id)throw Error('Previous correction send is uncertain; check Test_group before retrying.');
 assert.ok(decision==='send'||decision==='uncertain');
 if(decision==='send'){
  state.groupPost={status:'sending',hash:hashOf(),startedAt:new Date().toISOString()};await save();
  const sent=await sendTestGroupBoard(sock,target,renderBoardImage(state).png,'the helper — Corrected role board\n'+state.meeting.club+' · Meeting '+state.meeting.number);
  state.groupPost={...state.groupPost,...sent};await save();
 }
 await ack.wait(state.groupPost.id);
 state.groupPost={...state.groupPost,status:'sent',deliveryReceiptVerified:true,postedAt:new Date().toISOString()};await save();
 await sendPostConfirmation({state,secretaryId,socket:sock,acknowledgements:ack,save});
 status('Approved board delivered to Test_group; private confirmation acknowledged.');
}
async function processMembers(){
 state=ensureLive(state);
 const live=state.live;
 if(!live?.inbox.length||state.status!=='approved'||state.editSession||live.retryAt>Date.now()||Object.values(live.posts).some(post=>post.status==='sending'))return;
 try{
  if(!live.pendingBatch){
   const messages=live.inbox.slice(0,10);
   const reply=await interpretFictionalMessages(live.board,messages,'availability');
   live.pendingBatch={messages,decisions:reply.decisions};await save();
  }
  state=applyLiveBatch(state,live.pendingBatch.messages,live.pendingBatch.decisions);await save();await flush();
  status('Member messages checked; '+(state.live.dirty?'board changes saved for '+state.live.nextAt:'no new board changes')+'.');
 }catch{
  state.live.retryAt=Date.now()+180000;
  if(!state.live.failureNotified){state.live.failureNotified=true;state.outbox.push({kind:'text',text:'[ask the secretary to try again in few minutes]'});}
  await save();await flush();status('Role reading paused briefly; saved messages retained.');
 }
}
async function deliverDailyUpdate(){
 const decision=dailyDecision(state);
 if(!['send','uncertain'].includes(decision))return;
 const due=state.live.nextAt;
 let attempt=state.live.posts[due];
 if(decision==='uncertain'&&!attempt.id)throw Error('An automatic board send is uncertain. Check Test_group before retrying; no duplicate will be sent.');
 if(decision==='send'){
  assert.ok(state.live.board.every(row=>row.member===null||row.member.endsWith(' Example')));
  const draft={board:structuredClone(state.live.board),meeting:structuredClone(state.meeting)};
  attempt={status:'sending',hash:hashBoard(draft),board:draft.board,meeting:draft.meeting,startedAt:new Date().toISOString()};
  state.live.posts[due]=attempt;await save();
  const sent=await sendTestGroupBoard(sock,target,renderBoardImage(draft).png,'the helper — Updated role board\n'+draft.meeting.club+' · Meeting '+draft.meeting.number);
  Object.assign(attempt,sent);state.ownIds.push(sent.id);await save();
 }
 await ack.wait(attempt.id);
 attempt.status='sent';attempt.deliveryReceiptVerified=true;attempt.postedAt=new Date().toISOString();
 state.board=structuredClone(attempt.board);state.boardHash=attempt.hash;state.approvedBoardHash=attempt.hash;
 state.automaticAuthorization=state.live.authorization;
 const {board,meeting,...receipt}=attempt;state.groupPost=receipt;
 state.live.basePostId=receipt.id;state.live.publishedBoard=structuredClone(board);state.live.board=structuredClone(board);state.live.dirty=false;state.live.nextAt=null;
 await save();await sendPostConfirmation({state,secretaryId,socket:sock,acknowledgements:ack,save});
 status('Automatic changed-board image delivered to Test_group; private success acknowledged.');
}
sock.ev.on('messages.upsert',({type,messages})=>{
 if(!accepting)return;
 for(const message of messages){
  if(weeklyMode&&message.key?.remoteJid===target.groupId){
   queue=queue.then(async()=>{
    state=ensureLive(state);
    const member=groupRoleMessage({type,message,content:baileys.extractMessageContent(message.message)},state,target);
    if(!member)return;
    state=enqueueGroupMessage(state,member);await save();await flush();
   }).catch(error=>{status(error.message);process.exitCode=1;finish();});
   continue;
  }
  const command=secretaryCommand({type,message,content:baileys.extractMessageContent(message.message)},{secretaryId,secretaryLid,startedAt:state.editListenerStartedAt,ownIds:new Set(state.ownIds||[])});
  if(!command)continue;
  queue=queue.then(async()=>{
   const before=state;
   const current=weeklyMode?privateBoardState(state,command.text):state;
   const result=weeklyMode?applyWeeklyMessage(current,command):applyPostedEditMessage(state,command,hashOf());if(!result.reply)return;
   if(result.state.live&&before.live){result.state.live={...result.state.live,inbox:before.live.inbox,seen:before.live.seen,pendingBatch:before.live.pendingBatch};}
   state={...result.state,outbox:[...(result.state.outbox||[]),{kind:result.preview?'preview':'text',text:result.reply}]};await save();await flush();
   await deliverCorrection();state=ensureLive(state);await save();status('Private edit processed; stage: '+state.status+'.');
  }).catch(()=>{status('Editing or delivery could not be verified; saved state retained. Check Test_group before posting manually.');process.exitCode=1;finish();});
 }
});
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('WhatsApp connection timed out.')),45000);sock.ev.on('connection.update',({connection})=>{if(connection==='open'){clearTimeout(timeout);resolve();}if(connection==='close'){clearTimeout(timeout);reject(Error('WhatsApp connection closed.'));if(accepting){process.exitCode=1;finish();}}});});
 state.ownIds||=[];state.outbox||=[];state.editListenerStartedAt||=Date.now();await save();
 if(weeklyMode&&!state.weekly?.setupPromptQueued&&!state.weekly?.schedule){
  state.weekly={setupPromptQueued:true};state.editListenerStartedAt=Date.now();
  state.outbox.push({kind:'text',text:'Which day and time should I remind you each week to prepare the first role board? Send a day and 24-hour time, for example Monday 19:00 (India time).'});await save();
 }
 if(weeklyMode&&state.weekly?.schedule&&!Number.isInteger(state.weekly.meetingDay)&&!state.weekly.meetingDayPromptQueued){
  state.weekly.meetingDayPromptQueued=true;
  state.outbox.push({kind:'text',text:'Which day of the week is your meeting? Send just the day, for example Sunday. Any day works. Your saved reminder day and time stay the same.'});await save();
 }
 if(weeklyMode&&Number.isInteger(state.weekly?.meetingDay)&&!state.weekly.meetingTime&&!state.weekly.meetingTimePromptQueued){
  state.weekly.meetingTimePromptQueued=true;
  state.outbox.push({kind:'text',text:'What time does your meeting usually start? Send a time like 14:30 or 2:30 PM (India time). I will fill your saved meeting day and this time on every new weekly board.'});await save();
 }
 await flush();await deliverCorrection();
 if(weeklyMode){const metadata=await sock.groupMetadata(target.groupId);assert.equal(metadata.subject,'Test_group');state=ensureLive(state);await save();}
 if(process.argv.includes('--restart-check')){
  const before=JSON.parse(await readFile(join(dir,'restart-before.json'),'utf8'));
  const verified=verifyRestart(before,state);
  state.outbox.push({kind:'text',text:'Restart check passed. Your saved board, edits, removed speaker slots and numbering are still here. Nothing was reposted to the group.\n\n'+renderTable(state.board)+'\n\nReply TABLE to view this board again, or EDIT to make changes.'});
  await save();await flush();
  await writeFile(join(dir,'restart-receipt.json'),JSON.stringify({...verified,privateTableAcknowledged:true,checkedAt:new Date().toISOString()},null,2)+'\n',{mode:0o600});
  status('Restart verified: saved board and delivery records unchanged; restored table acknowledged privately.');
 }
 if(!weeklyMode&&!state.postEditGuideSent){
  state.outbox.push({text:'Your board is posted in Test_group. Reply TABLE to view the roles as a table, or EDIT if changes are required. Send several corrections together; I will show one new preview and post it only after you reply APPROVE. Reply CANCEL to keep the current posted board.'});await save();await flush();state.postEditGuideSent=true;await save();
 }
 accepting=true;status(weeklyMode?'Weekly helper is running. Setup, reminders and drafts stay private; only approved boards go to Test_group.':'Listening for private EDIT. Only Test_group can receive an approved correction.');
 if(weeklyMode){
  const tick=()=>{queue=queue.then(async()=>{state=queueReminder(state);await save();await flush();await deliverCorrection();state=ensureLive(state);await deliverDailyUpdate();await processMembers();await deliverDailyUpdate();}).catch(error=>{status(error.message);process.exitCode=1;finish();});};
  tick();weeklyTimer=setInterval(tick,15000);
 }else timer=setTimeout(()=>{status('Edit listener paused after 15 minutes; rerun to resume.');finish();},15*60000);
 await finished;accepting=false;await queue;
}catch(error){status(error.message);process.exitCode=1;}
finally{clearTimeout(timer);clearInterval(weeklyTimer);accepting=false;sock.end(undefined);await credentialWrites;await lock.close();await unlink(lockPath);}
process.exit(process.exitCode||0);
