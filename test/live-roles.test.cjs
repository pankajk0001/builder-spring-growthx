const {test}=require('node:test');const assert=require('node:assert/strict');
const {ensureLive,groupRoleMessage,enqueueGroupMessage,applyLiveBatch,dailyDecision,updateTime,privateBoardState}=require('../src/live-roles.cjs');
const fixture=require('./fixtures/milestone-3.cjs');
const wed=Date.parse('2026-10-07T12:00:00Z');
function saved(){return {...structuredClone(fixture),meeting:{...fixture.meeting,date:'10 October 2026'},testOnly:true,secretaryId:'10000000001@s.whatsapp.net',targetGroupId:'10000000002@g.us',status:'approved',approvedBoardHash:'a'.repeat(64),groupPost:{id:'fictional-first-post',status:'sent',deliveryReceiptVerified:true,postedAt:'2026-10-07T10:00:00Z'},outbox:[],ownIds:[],processedIds:[]};}
const target={name:'Test_group',groupId:'10000000002@g.us'};
function msg(id,sender,text,at=wed){return {id:'fictional-'+id,sender,text,timestamp:at};}
function apply(state,messages,decisions){state=ensureLive(state);for(const m of messages)state=enqueueGroupMessage(state,m);return applyLiveBatch(state,messages,decisions);}
test('open roles change silently, occupied roles and multiple-role claims preserve their holders',()=>{
 const s=saved(),messages=[msg('1','Zara Example','Grammarian'),msg('2','Finn Example','Word & Idiom Master'),msg('3','Finn Example','Speaker 3')];
 const result=apply(s,messages,messages.map((m,i)=>({messageId:m.id,intent:'take',role:['Grammarian','Word & Idiom Master','Speaker 3'][i]})));
 assert.equal(result.live.board.find(r=>r.role==='Grammarian').member,'Iris Example');assert.equal(result.live.board.find(r=>r.role==='Word & Idiom Master').member,'Finn Example');assert.equal(result.live.board.find(r=>r.role==='Speaker 3').member,null);
 assert.deepEqual(result.board,s.board);assert.equal(result.live.inbox.length,0);assert.equal(result.outbox.length,1);assert.equal(result.outbox[0].kind,'text');assert.equal(result.live.nextAt,'2026-10-07T14:30:00.000Z');
});
test('chatter and availability questions do not dirty the board; unclear replies remain private',()=>{
 const messages=[msg('1','Zara Example','is Timer free?'),msg('2','Finn Example','tea tomorrow?'),msg('3','Remy Example','that one')];
 const result=apply(saved(),messages,[{messageId:messages[0].id,intent:'check',role:'Timer'},{messageId:messages[1].id,intent:'ignore'},{messageId:messages[2].id,intent:'clarify'}]);
 assert.equal(result.live.dirty,false);assert.equal(result.outbox.length,1);assert.match(result.outbox[0].text,/Secretary/);
});
test('withdrawals require the current holder, and duplicate events are ignored after restart',()=>{
 let s=ensureLive(saved());const m=msg('drop','Mira Example','drop Timer');s=enqueueGroupMessage(s,m);s=enqueueGroupMessage(JSON.parse(JSON.stringify(s)),m);assert.equal(s.live.inbox.length,1);
 s=applyLiveBatch(s,[m],[{messageId:m.id,intent:'drop',role:'Timer'}]);assert.equal(s.live.board.find(r=>r.role==='Timer').member,null);
 assert.equal(enqueueGroupMessage(s,m).live.inbox.length,0);
});
test('automatic delivery waits until 20:00 India time, only on changed weekdays, and protects uncertain sends',()=>{
 const messages=[msg('1','Finn Example','Word & Idiom Master')];let s=apply(saved(),messages,[{messageId:messages[0].id,intent:'take',role:'Word & Idiom Master'}]);
 assert.equal(dailyDecision(s,Date.parse('2026-10-07T14:29:59Z')),'wait');assert.equal(dailyDecision(s,Date.parse('2026-10-07T14:30:00Z')),'send');
 s.live.posts[s.live.nextAt]={status:'sending'};assert.equal(dailyDecision(s,Date.parse('2026-10-07T14:31:00Z')),'uncertain');
 assert.equal(dailyDecision({...s,status:'awaiting_edit'},Date.parse('2026-10-07T14:31:00Z')),'paused');
 assert.equal(updateTime(Date.parse('2026-10-07T15:00:00Z')),'2026-10-08T14:30:00.000Z');
 assert.equal(updateTime(Date.parse('2026-10-09T15:00:00Z'),s.live.windowEnd),null);
});
test('live inbox is bounded and rejects stale, weekend and out-of-order interpretations',()=>{
 let s=ensureLive(saved());assert.equal(enqueueGroupMessage(s,msg('old','Finn Example','Timer',Date.parse('2026-10-06T12:00:00Z'))).live.inbox.length,0);
 assert.equal(enqueueGroupMessage(s,msg('sat','Finn Example','Timer',Date.parse('2026-10-10T12:00:00Z'))).live.inbox.length,0);
 for(let i=0;i<300;i++)s=enqueueGroupMessage(s,msg(String(i),'Finn Example','hello'));
 assert.equal(enqueueGroupMessage(s,msg('overflow','Finn Example','Timer')).live.inbox.length,300);
 assert.throws(()=>applyLiveBatch(s,[s.live.inbox[0]],[{messageId:'fictional-wrong',intent:'take',role:'Timer'}]));
});
test('only fresh Test_group text reaches AI, with made-up test identities and no helper echoes',()=>{
 const s=ensureLive(saved());const event={type:'notify',message:{key:{remoteJid:target.groupId,id:'fictional-phone-event',fromMe:true},messageTimestamp:Math.floor(wed/1000)},content:{conversation:'Finn Example: I will take Word & Idiom Master'}};
 const m=groupRoleMessage(event,s,target);assert.equal(m.sender,'Finn Example');assert.equal(m.text,'I will take Word & Idiom Master');assert.match(m.id,/^fictional-/);
 for(const change of [{remoteJid:'10000000003@g.us'},{id:'fictional-helper'}]){const other=structuredClone(event);Object.assign(other.message.key,change);if(change.id)s.ownIds.push(change.id);assert.equal(groupRoleMessage(other,s,target),null);}
 event.content.conversation='the helper — auto board';assert.equal(groupRoleMessage(event,s,target),null);
});
test('private TABLE and EDIT use the latest pending assignments without silently posting',()=>{
 const messages=[msg('1','Finn Example','Word & Idiom Master')];const s=apply(saved(),messages,[{messageId:messages[0].id,intent:'take',role:'Word & Idiom Master'}]);
 const view=privateBoardState(s,'TABLE');assert.equal(view.board.find(r=>r.role==='Word & Idiom Master').member,'Finn Example');assert.equal(view.groupPost.id,s.groupPost.id);
 assert.equal(privateBoardState(s,'EDIT').live.dirty,true);
 const view2=privateBoardState(s,'TABLE');const later=msg('chatter','Lena Example','see you soon');
 const checked=apply(enqueueGroupMessage(view2,later),[later],[{messageId:later.id,intent:'ignore'}]);
 assert.equal(checked.live.dirty,true);assert.equal(checked.live.nextAt,s.live.nextAt);
});
test('the previous board cannot accept new-week or weekend assignments after Friday cutoff',()=>{
 const s=ensureLive(saved());assert.equal(enqueueGroupMessage(s,msg('next-week','Lena Example','Listener',Date.parse('2026-10-12T12:00:00Z'))).live.inbox.length,0);
 const saturday=saved();saturday.groupPost.postedAt='2026-10-10T12:00:00Z';const closed=ensureLive(saturday);
 assert.ok(closed.live.windowEnd<Date.parse(saturday.groupPost.postedAt));
});
test('Sunday and Monday meetings allow changed boards on Saturday and Sunday',()=>{
 for(const [date,messageTime,due] of [['11 October 2026','2026-10-10T12:00:00Z','2026-10-10T14:30:00.000Z'],['12 October 2026','2026-10-11T12:00:00Z','2026-10-11T14:30:00.000Z']]){
  const s=saved();s.meeting.date=date;
  const m=msg('weekend','Finn Example','Word & Idiom Master',Date.parse(messageTime));
  const changed=apply(s,[m],[{messageId:m.id,intent:'take',role:'Word & Idiom Master'}]);
  assert.equal(changed.live.nextAt,due);assert.equal(dailyDecision(changed,Date.parse(due)),'send');
 }
});
test('no repost for an unchanged board, including drop followed by the same person reclaiming it',()=>{
 let s=ensureLive(saved());assert.equal(dailyDecision(s,Date.parse('2026-10-09T14:30:00Z')),'unchanged');
 const messages=[msg('drop-again','Lena Example','drop Listener'),msg('take-again','Lena Example','take Listener')];
 s=apply(s,messages,[{messageId:messages[0].id,intent:'drop',role:'Listener'},{messageId:messages[1].id,intent:'take',role:'Listener'}]);
 assert.equal(s.live.dirty,false);assert.equal(s.live.nextAt,null);assert.equal(dailyDecision(s,Date.parse('2026-10-08T14:30:00Z')),'unchanged');
 s.live.dirty=true;s.live.nextAt='2026-10-08T14:30:00.000Z';assert.equal(dailyDecision(s,Date.parse(s.live.nextAt)),'unchanged');
});
