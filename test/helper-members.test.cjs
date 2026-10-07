const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {begin}=require('../src/secretary-setup.cjs'),{renderBoardImage}=require('../src/board-image.cjs');
const {activateMembers,readMember,queueMember,applyMembers,memberDecision,memberProjection}=require('../src/helper-members.cjs');
const target={name:'Example Test',groupId:'123@g.us',testOnly:true},identity={secretaryId:'111@s.whatsapp.net',secretaryLid:'11@lid'};
const now=Date.parse('2026-10-07T12:00:00Z');
function ready(){const s=begin(now);s.board.find(r=>r.role==='Timer').member='Mira Example';s.meeting.date='10 October 2026';const hash=crypto.createHash('sha256').update(renderBoardImage(s).png).digest('hex');Object.assign(s,{stage:'complete',boardHash:hash,approvedHash:hash,previewReceipt:{id:'preview',sha256:hash},lastPreviewServerAckVerified:true,groupLink:{connected:true,groupId:target.groupId,approvedHash:hash},helperGroupPost:{id:'posted',status:'sent',serverAckVerified:true}});return activateMembers(s,target,identity,now);}
function event(id,text,patch={}){return {type:'notify',message:{key:{id,fromMe:false,remoteJid:target.groupId,participant:identity.secretaryId,...patch},messageTimestamp:now/1000+1,message:{conversation:text}}};}
test('separate helper reads only fresh approved-group replies and ignores helper echoes',()=>{
 const s=ready(),m=readMember(event('a','Noah Example: I will take Grammarian'),s,target,identity);assert.equal(m.sender,'Noah Example');assert.equal(m.text,'I will take Grammarian');
 for(const patch of [{fromMe:true},{remoteJid:'999@g.us'},{participant:undefined}])assert.equal(readMember(event('b','take Timer',patch),s,target,identity),null);
 const old=event('c','take Timer');old.message.messageTimestamp=now/1000-1;assert.equal(readMember(old,s,target,identity),null);
 const outsider=readMember(event('d','Noah Example: take Timer',{participant:'999@s.whatsapp.net'}),s,target,identity);assert.notEqual(outsider.sender,'Noah Example');
 assert.throws(()=>activateMembers({...s,helperGroupPost:{status:'sending'}},target,identity,now));
});
test('claims protect holders, one role per member, withdrawals and private-only clarification',()=>{
 let s=ready();
 const apply=(id,text,intent,role)=>{const m=readMember(event(id,text),s,target,identity);s=queueMember(s,m,target,identity);s=applyMembers(s,[m],[{messageId:m.id,intent,role}],target,identity);};
 apply('a','Noah Example: take Grammarian','take','Grammarian');assert.equal(s.memberLive.board.find(r=>r.role==='Grammarian').member,'Noah Example');
 apply('b','Zara Example: take Timer','take','Timer');assert.equal(s.memberLive.board.find(r=>r.role==='Timer').member,'Mira Example');assert.equal(s.outbox.length,0);
 apply('c','Noah Example: take Listener','take','Listener');assert.equal(s.memberLive.board.find(r=>r.role==='Listener').member,null);assert.match(s.outbox[0].text,/Secretary/);
 s.outbox=[];apply('d','Noah Example: drop Grammarian','drop','Grammarian');assert.equal(s.memberLive.board.find(r=>r.role==='Grammarian').member,null);assert.equal(memberDecision(s,target,identity,now),'unchanged');
});
test('saved pending claims survive restart, use 20:00 India time and freeze before meeting',()=>{
 let s=ready(),m=readMember(event('a','Noah Example: take Grammarian'),s,target,identity);s=queueMember(s,m,target,identity);s=JSON.parse(JSON.stringify(s));assert.equal(queueMember(s,m,target,identity).memberLive.inbox.length,1);
 s=applyMembers(s,[m],[{messageId:m.id,intent:'take',role:'Grammarian'}],target,identity);
 assert.equal(memberDecision(s,target,identity,Date.parse('2026-10-07T14:29:59Z')),'wait');assert.equal(memberDecision(s,target,identity,Date.parse('2026-10-07T14:30:00Z')),'send');
 s.memberLive.posts[s.memberLive.nextAt]={status:'sending'};assert.equal(memberDecision(s,target,identity,Date.parse('2026-10-07T14:30:01Z')),'uncertain');
 assert.equal(memberProjection(s,target,identity).groupPost.deliveryReceiptVerified,true);
});
test('authorized short test waits two minutes, posts once and restores normal future scheduling',async()=>{
 const {scheduleMemberTest,deliverMemberUpdate}=require('../src/helper-members.cjs');
 let s=ready(),m=readMember(event('a','Noah Example: take Grammarian'),s,target,identity);s=queueMember(s,m,target,identity);s=applyMembers(s,[m],[{messageId:m.id,intent:'take',role:'Grammarian'}],target,identity);
 s.memberTest={authorized:true};scheduleMemberTest(s,now);assert.equal(memberDecision(s,target,identity,now+119999),'wait');
 let sends=0;const helper={secretaryId:'222@s.whatsapp.net'};
 const options={state:s,target,identity,helper,socket:{groupMetadata:async()=>({id:target.groupId,subject:target.name,participants:[{id:identity.secretaryId},{id:helper.secretaryId}]})},save:async()=>{},acknowledgements:{wait:async()=>{}},sendImage:async(_s,_t,png)=>{sends++;return {id:'updated',sha256:crypto.createHash('sha256').update(png).digest('hex')};}};
 assert.equal(await deliverMemberUpdate({...options,now:now+119999}),false);
 assert.equal(await deliverMemberUpdate({...options,now:now+120000}),true);assert.equal(s.memberTest.done,true);assert.equal(s.outbox.length,1);
 assert.equal(await deliverMemberUpdate({...options,now:now+130000}),false);assert.equal(sends,1);
 const later=readMember(event('b','Zara Example: take Listener'),s,target,identity);s=queueMember(s,later,target,identity);s=applyMembers(s,[later],[{messageId:later.id,intent:'take',role:'Listener'}],target,identity);scheduleMemberTest(s,now+130000);assert.equal(s.memberLive.nextAt,'2026-10-07T14:30:00.000Z');
});

test('formatted and plain withdrawals recognize the trusted test secretary, including alternate phone identity',()=>{
 const s=ready();
 for(const text of ['*Noah Example: I can’t make it*','Noah Example: I can’t make it']){
  for(const patch of [{},{participant:'new-address@lid',participantAlt:identity.secretaryId}]){
   const m=readMember(event('withdraw',text,patch),s,target,identity);
   assert.equal(m.sender,'Noah Example');assert.equal(m.text,'I can’t make it');
  }
  const outsider=readMember(event('outside',text,{participant:'999@lid',participantAlt:'999@s.whatsapp.net'}),s,target,identity);
  assert.notEqual(outsider.sender,'Noah Example');
 }
});
