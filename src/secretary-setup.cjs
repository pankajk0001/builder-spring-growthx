const {editBoard}=require('./board-edit.cjs');
const {renderTable}=require('./role-board.cjs');
const {parseMeetingDay,parseMeetingTime,nextMeetingDate}=require('./meeting-cycle.cjs');
const {parseSchedule}=require('./weekly.cjs');
const {isSecretaryChat}=require('./approval-inbox.cjs');
const copy=require('./chat-copy.cjs');
const ROLES=['TMOD','Word & Idiom Master','Movie-Master','Speaker 1','Evaluator 1','Speaker 2','Evaluator 2','Speaker 3','Evaluator 3','Table Topic Master','General Evaluator','Timer','Grammarian','Ah Counter','Listener'];
function incoming(message,identity,start){
 const key=message?.key;
 const timestamp=Number(message?.messageTimestamp)*1000;
 if(!key?.id||key.fromMe!==false||!isSecretaryChat(key.remoteJid,identity)||!Number.isFinite(timestamp)||timestamp<start)return null;
 const content=message.message;
 const text=content?.conversation||content?.extendedTextMessage?.text;
 if(typeof text!=='string'||!text.trim()||text.length>5000)return null;
 return {id:key.id,text:text.trim(),replyTo:content.extendedTextMessage?.contextInfo?.stanzaId};
}
function begin(now,options={}){return {version:1,testOnly:!options.pilotMode,...(options.pilotMode?{pilotMode:true,chatVersion:2}:{}),stage:'roles',seen:[],outbox:[],board:ROLES.map(role=>({role,member:null})),meeting:{club:options.pilotMode?'Your club':'Example Speakers Club',number:'1',date:nextMeetingDate((new Date(now+330*60000).getUTCDay()+5)%7,now),time:'2:30 PM',badge:options.pilotMode?'CL':'ES'}};}
const ask=s=>s.outbox.push({kind:'text',text:s.pilotMode?copy.setupQuestion(s):s.stage==='roles'?'Which roles are already filled? Use made-up names for this test, for example Speaker 1: Ada Example. Send OPEN for an empty board.':s.stage==='club'?'What is the club name? Include Example for this test.':s.stage==='number'?'What is the meeting number?':s.stage==='day'?'What day does the club usually meet? For example Sunday.':s.stage==='time'?'What time does it usually meet? For example 2:30 PM (India time).':s.stage==='reminder'?'When should I remind you each week? For example Monday 19:00 (India time).':'What time should the first approved board be posted? For example 19:00 (India time).'});
function preview(s,stage){s.setupEditing=false;s.stage=stage;s.lastPreviewServerAckVerified=false;s.previewReceipt=null;s.outbox.push({kind:'preview',caption:s.pilotMode?`${stage==='sample'?'Sample board — meeting details come next.':'Final board — check every role and the venue.'}\nAPPROVE to continue · EDIT to change · TABLE to view roles · CANCEL to pause`:stage==='sample'?'Sample board. Check every role. Reply APPROVE to continue, or send corrections like Timer: Mira Example.':'Check the final board and settings. Reply APPROVE to save, or send board corrections. No group will receive this test.'});if(stage==='final')s.outbox.push({kind:'text',text:s.pilotMode?copy.settings(s):`Meeting: ${s.meetingDay}, ${s.meeting.time}\nWeekly reminder: ${s.reminderInput}\nFirst board: ${s.postingTime} India time\nChanged boards: ${s.postingTime} India time until the day before the meeting.`});}
function applyRoleEdits(s,text){
 const replacements=text.split(/[\r\n;]+/).map(line=>line.trim()).filter(Boolean);
 const pending=s.pendingEdits;
 const combined=pending?[...pending.validCorrections,...replacements,...pending.invalidCorrections.slice(replacements.length).map(item=>item.line)].join('\n'):text;
 const edited=editBoard(s,combined,{testOnly:s.testOnly===true&&!s.pilotMode});
 s.board=edited.board;s.meeting=edited.meeting;s.pendingEdits=null;
}
const isApproval=text=>/^(APPROVE|nothing to correct)[.!]?$/i.test(text.trim());
function applySetup(state,command,now=Date.now(),options={}){
 if(state?.seen.includes(command.id))return state;
 let s=state?JSON.parse(JSON.stringify(state)):null;
 if(!s&&!/^(give me the role board|START)$/i.test(command.text))return null;
 if(!s){s=begin(now,options);s.seen.push(command.id);ask(s);return s;}
 if(options.pilotMode){s.pilotMode=true;s.chatVersion=2;}
 s.seen.push(command.id);
 const text=command.text.trim();
 try{
 if(s.pilotMode){
  if(/^HELP$/i.test(text)){s.outbox.push({kind:'text',text:copy.help(s)});return s;}
  if(/^CANCEL$/i.test(text)&&s.stage!=='complete'){s.setupPaused=true;s.lastPreviewServerAckVerified=false;s.outbox.push({kind:'text',text:'Setup paused. Your answers are saved. Send START when you’re ready to continue.'});return s;}
  if(s.setupPaused&&!/^START$/i.test(text)){s.outbox.push({kind:'text',text:copy.help(s)});return s;}
  if(/^START$/i.test(text)&&s.stage!=='complete'){s.setupPaused=false;if(['sample','final'].includes(s.stage))preview(s,s.stage);else ask(s);return s;}
  if(/^EDIT$/i.test(text)&&['sample','final'].includes(s.stage)){s.setupEditing=true;s.lastPreviewServerAckVerified=false;s.outbox.push({kind:'text',text:copy.editInstructions(s)});return s;}
 }
 if(/^TABLE$/i.test(text)){s.outbox.push({kind:'text',text:renderTable(s.memberLive?.board||s.board)+(s.pilotMode?`\nVenue: ${s.meeting.venue||'Not set'}`:'')});if(s.pilotMode&&['sample','final'].includes(s.stage))preview(s,s.stage);return s;}
 if(s.stage==='complete'){s.outbox.push({kind:'text',text:s.pilotMode?copy.status(s):s.groupLink?.connected?`Your group is connected. Reply TABLE to view roles or EDIT to make corrections.`:'Your private setup is saved. Group connection is the next step; no group posts are enabled.'});return s;}
 if(['sample','final'].includes(s.stage)){
  if(isApproval(text)){
   const pending=s.pendingEdits;
   if(pending&&!pending.validCorrections.length&&pending.invalidCorrections.length&&pending.invalidCorrections.every(item=>isApproval(item.line)))s.pendingEdits=null;
   if(s.pendingEdits)throw Error('Correct the pending lines before approving; your valid entries are saved.');
   if(!s.lastPreviewServerAckVerified||!s.previewReceipt?.id)throw Error('Wait for the board image before approving.');
   if(command.replyTo&&command.replyTo!==s.previewReceipt.id)throw Error('Approve the latest board image.');
   s.pendingEdits=null;
   if(s.stage==='sample'){s.stage='club';ask(s);}else{s.stage='complete';s.approvedHash=s.boardHash;s.outbox.push({kind:'text',text:s.pilotMode?'Your setup is saved. Add the helper to your club’s group, then send CONNECT GROUP followed by its name. I’ll ask you to confirm before the first post.':'Private setup saved. No group posts are enabled yet. Next we will connect the helper to your test group.'});}
  }else{applyRoleEdits(s,text);preview(s,s.stage);}
 }else if(s.stage==='roles'){
  if(/^OPEN$/i.test(text)&&s.pendingEdits)throw Error('Correct the pending lines; your valid entries are saved.');
  if(!/^OPEN$/i.test(text)){applyRoleEdits(s,text);}preview(s,'sample');
 }else if(s.stage==='club'){
  if(text.length>100)throw Error('Send a club name of at most 100 characters.');if(!s.pilotMode&&! /\bExample\b/i.test(text))throw Error('Use a club name containing Example for this test.');s.meeting.club=text;if(s.pilotMode)s.meeting.badge=text.split(/\s+/).map(word=>Array.from(word)[0]).join('').slice(0,3).toUpperCase();s.stage='number';ask(s);
 }else if(s.stage==='number'){
  if(!/^\d{1,6}$/.test(text))throw Error('Send a meeting number using digits.');s.meeting.number=text;s.stage='day';ask(s);
 }else if(s.stage==='day'){
  s.meetingDay=text;s.meetingDayIndex=parseMeetingDay(text);s.meeting.date=nextMeetingDate(s.meetingDayIndex,now);s.stage='time';ask(s);
 }else if(s.stage==='time'){
  s.meeting.time=parseMeetingTime(text);s.stage=s.pilotMode&&!s.meeting.venue?'venue':'reminder';ask(s);
 }else if(s.stage==='venue'){
  if(text.length>240)throw Error('Send a venue of at most 240 characters.');s.meeting.venue=text;s.stage='reminder';ask(s);
 }else if(s.stage==='reminder'){
  s.reminder=parseSchedule(text);s.reminderInput=text;s.stage='post';ask(s);
 }else if(s.stage==='post'){
  s.postingTime=parseMeetingTime(text);preview(s,'final');
 }
 }catch(error){
 if(error.invalidCorrections){
  s.pendingEdits={validCorrections:error.validCorrections,invalidCorrections:error.invalidCorrections};
  s.outbox.push({kind:'text',text:'Please correct these lines:\n'+error.invalidCorrections.map(item=>item.line+'\n'+item.reason).join('\n\n')+'\n\nYour valid entries are saved. Resend only the corrected lines, in the order shown.'});
 }else{s.outbox.push({kind:'text',text:error.message});}
}
 return s;
}
module.exports={incoming,begin,applySetup,applyRoleEdits,ROLES};
