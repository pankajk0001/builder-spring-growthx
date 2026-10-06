const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseSchedule,nextReminder,queueReminder,startWeeklyBoard,applyWeeklyMessage}=require('../src/weekly.cjs');
const fixture=require('./fixtures/milestone-3.cjs');
const monday=Date.parse('2026-10-05T13:00:00Z');
test('setup accepts a named day and valid 24-hour India time',()=>{
 assert.deepEqual(parseSchedule('Monday 19:00'),{day:1,time:'19:00'});
 for(const text of ['Monday','Monday 25:10','Funday 19:00','Monday 7 pm'])assert.throws(()=>parseSchedule(text));
 assert.equal(nextReminder({day:1,time:'19:00'},monday),'2026-10-05T13:30:00.000Z');
});
test('missed reminders catch up once for the latest week and survive restart',()=>{
 const state={weekly:{schedule:{day:1,time:'19:00'},nextAt:'2026-10-05T13:30:00.000Z'},outbox:[]};
 const result=queueReminder(state,Date.parse('2026-10-20T00:00:00Z'));
 assert.equal(result.weekly.pendingWeek,'2026-10-19T13:30:00.000Z');assert.equal(result.outbox.length,1);
 assert.equal(queueReminder(JSON.parse(JSON.stringify(result)),Date.parse('2026-10-20T01:00:00Z')).outbox.length,1);
 assert.equal(result.weekly.nextAt,'2026-10-26T13:30:00.000Z');
});
test('a new week clears assignments and approval while retaining the prior posted board',()=>{
 const old={...structuredClone(fixture),secretaryId:'10000000001@s.whatsapp.net',targetGroupId:'10000000002@g.us',testOnly:true,status:'approved',groupPost:{status:'sent'},outbox:[],weekly:{schedule:{day:1,time:'19:00'},meetingDay:6,pendingWeek:'2026-10-19T13:30:00.000Z'}};
 const fresh=startWeeklyBoard(old);
 assert.ok(fresh.board.every(row=>row.member===null));assert.equal(fresh.status,'awaiting_edit');assert.equal(fresh.groupPost,undefined);
 assert.equal(fresh.weekly.previousBoard.board[0].member,'Noel Example');assert.equal(fresh.weekly.previousBoard.groupPost.status,'sent');
 assert.equal(old.board[0].member,'Noel Example');assert.equal(fresh.meeting.date,'24 October 2026');
});
test('a reminder never replaces an unapproved draft or posts a group message',()=>{
 const state={...fixture,status:'awaiting_edit',weekly:{schedule:{day:1,time:'19:00'},meetingDay:6,nextAt:'2026-10-05T13:30:00.000Z'},outbox:[]};
 const reminded=queueReminder(state,Date.parse('2026-10-05T14:00:00Z'));
 assert.deepEqual(reminded.board,state.board);assert.equal(reminded.status,'awaiting_edit');assert.equal(reminded.outbox[0].kind,'text');
 assert.throws(()=>startWeeklyBoard(reminded),/Finish/);
});
const identity={secretaryId:'10000000001@s.whatsapp.net',targetGroupId:'10000000002@g.us',testOnly:true};
function saved(){return {...structuredClone(fixture),...identity,status:'approved',groupPost:{status:'sent',deliveryReceiptVerified:true},outbox:[],processedIds:[],weekly:{schedule:{day:1,time:'19:00'},meetingDay:6,pendingWeek:'2026-10-19T13:30:00.000Z'}};}
let event=0;
function send(s,text){return applyWeeklyMessage(s,{chatId:identity.secretaryId,senderId:identity.secretaryId,id:'fictional-weekly-'+(++event),text},Date.parse('2026-10-19T14:00:00Z'));}
test('weekly speakers, preview, approval and selected posting time preserve the reminder',()=>{
 let s=send(saved(),'START').state;
 const corrected=send(s,'Speaker 1: Zara Example; Speaker 2: Finn Example');assert.equal(corrected.preview,true);s=corrected.state;
 assert.equal(s.board.find(r=>r.role==='Timer').member,null);
 assert.equal(s.board.find(r=>r.role==='Speaker 1').member,'Zara Example');
 s=send(s,'APPROVE').state;assert.equal(s.status,'awaiting_time');
 s=send(s,'2026-10-19 20:00').state;s=send(s,'CONFIRM').state;
 assert.equal(s.status,'approved');assert.equal(s.weekly.schedule.time,'19:00');assert.equal(s.groupPost,undefined);
 assert.equal(send(s,'START').state.boardHash,s.boardHash);
});
test('weekly CANCEL restores the posted board; invalid corrections cannot bypass retry with PREVIEW',()=>{
 const old=saved();let s=send(old,'START').state;
 s=send(s,'Speaker 1: Zara Example; Meeting time: 25:10').state;
 assert.equal(send(s,'PREVIEW').preview,undefined);
 const cancelled=send(s,'CANCEL');assert.deepEqual(cancelled.state.board,old.board);assert.deepEqual(cancelled.state.groupPost,old.groupPost);
 assert.equal(cancelled.state.weekly.schedule.time,'19:00');assert.equal(send(cancelled.state,'START').state.status,'awaiting_edit');
});
test('setup rejects an invalid time, saves valid weekly settings, and ignores repeated events',()=>{
 let s={...saved(),weekly:{setupPromptQueued:true}};
 assert.match(send(s,'Monday 25:10').reply,/24-hour/);
 const message={chatId:identity.secretaryId,senderId:identity.secretaryId,id:'fictional-setup',text:'Monday 19:00'};
 const result=applyWeeklyMessage(s,message,monday);assert.equal(result.state.weekly.nextAt,'2026-10-05T13:30:00.000Z');
 assert.equal(applyWeeklyMessage(result.state,message,monday).reply,null);
});
test('weekly setup and draft commands reject other people and group messages',()=>{
 for(const change of [{senderId:'10000000003@s.whatsapp.net'},{chatId:identity.targetGroupId}]){
  const s=saved();const result=applyWeeklyMessage(s,{chatId:identity.secretaryId,senderId:identity.secretaryId,id:'fictional-other',text:'START',...change});
  assert.equal(result.reply,null);assert.deepEqual(result.state,s);
 }
});
test('first setup asks reminder day/time before meeting day and supports a Sunday weekly board',()=>{
 let s={...saved(),weekly:undefined};const reminder=send(s,'Monday 19:00');s=reminder.state;
 assert.match(reminder.reply,/Which day of the week/);assert.equal(s.weekly.meetingDay,undefined);
 const day=send(s,'Sunday');s=day.state;assert.equal(s.weekly.meetingDay,0);assert.match(day.reply,/Unchanged boards are not reposted/);
 s.weekly.pendingWeek='2026-10-19T13:30:00.000Z';const fresh=send(s,'START');assert.equal(fresh.state.meeting.date,'25 October 2026');
});
test('an after-cutoff reminder can be corrected without losing the meeting-day setup',()=>{
 let s={...saved(),weekly:{schedule:{day:1,time:'21:00'}}};assert.match(send(s,'Tuesday').reply,/earlier reminder/);
 s=send(s,'Monday 19:00').state;s=send(s,'Tuesday').state;assert.equal(s.weekly.meetingDay,2);
});
