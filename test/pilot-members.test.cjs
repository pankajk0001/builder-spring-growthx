const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {begin}=require('../src/secretary-setup.cjs'),{renderBoardImage}=require('../src/board-image.cjs');
const {activateMembers,readMember,queueMember,applyMembers}=require('../src/helper-members.cjs');
const identity={secretaryId:'111@s.whatsapp.net',secretaryLid:'11@lid'},target={name:'Cedar Club Test',groupId:'123@g.us',pilotMode:true,secretaryId:identity.secretaryId},now=Date.parse('2026-10-07T12:00:00Z');
function ready(){const s=begin(now,{pilotMode:true});s.meeting.date='10 October 2026';const sha=createHash('sha256').update(renderBoardImage(s).png).digest('hex');Object.assign(s,{stage:'complete',boardHash:sha,approvedHash:sha,previewReceipt:{id:'preview',sha256:sha},lastPreviewServerAckVerified:true,groupLink:{groupId:target.groupId,connected:true,approvedHash:sha},helperGroupPost:{id:'posted',status:'sent',serverAckVerified:true}});return activateMembers(s,target,identity,now);}
function event(id,text,name='Ada Finch',patch={}){return {type:'notify',message:{key:{id,remoteJid:target.groupId,fromMe:false,participant:identity.secretaryId,...patch},messageTimestamp:now/1000+1,pushName:name,message:{conversation:text}}};}
function apply(s,e,intent,role){const m=readMember(e,s,target,identity);s=queueMember(s,m,target,identity);return applyMembers(s,[m],[{messageId:m.id,intent,role}],target,identity);}
test('real-mode reader binds claims to WhatsApp account, survives display-name changes and protects against impersonation',()=>{
 let s=ready();s=apply(s,event('claim','I will take Timer'),'take','Timer');const row=s.memberLive.board.find(r=>r.role==='Timer');assert.equal(row.member,'Ada Finch');assert.ok(row.memberId);assert.ok(!JSON.stringify(s.memberLive).includes(identity.secretaryId));
 s=apply(s,event('spoof','I drop Timer','Ada Finch',{participant:'999@s.whatsapp.net'}),'drop','Timer');assert.equal(s.memberLive.board.find(r=>r.role==='Timer').member,'Ada Finch');assert.match(s.outbox.at(-1).text,/couldn’t verify/);
 s.outbox=[];s=apply(s,event('drop','I can’t make it','Changed Display',{participant:identity.secretaryLid,participantAlt:identity.secretaryId}),'clarify');assert.equal(s.memberLive.board.find(r=>r.role==='Timer').member,null);assert.equal(s.outbox.length,0);
});
test('prefilled holders cannot be withdrawn by an unverified matching display name',()=>{
 let s=ready();s.memberLive.board.find(r=>r.role==='Timer').member='Mira Vale';s=apply(s,event('drop','I drop Timer','Mira Vale'),'drop','Timer');assert.equal(s.memberLive.board.find(r=>r.role==='Timer').member,'Mira Vale');assert.match(s.outbox.at(-1).text,/EDIT/);
});
test('same-name ambiguity and one-account multiple-role claims go privately without changing holders',()=>{
 let s=ready();s=apply(s,event('claim','Timer'),'take','Timer');s.outbox=[];s=apply(s,event('other','Listener','Ada Finch',{participant:'999@s.whatsapp.net'}),'take','Listener');assert.equal(s.memberLive.board.find(r=>r.role==='Listener').member,null);assert.equal(s.outbox.length,1);
 s.outbox=[];s=apply(s,event('second','Listener'),'take','Listener');assert.equal(s.memberLive.board.find(r=>r.role==='Listener').member,null);assert.match(s.outbox[0].text,/already holds Timer/);
});
test('real mode cannot simulate someone else by putting a name at the start of a message',()=>{
 const s=ready(),m=readMember(event('prefix','Noah Example: I drop Timer','Ada Finch'),s,target,identity);assert.equal(m.sender,'Ada Finch');assert.match(m.id,/^member-live-/);assert.match(m.text,/Noah Example/);
 assert.equal(readMember(event('wrong','Timer','Ada Finch',{remoteJid:'456@g.us'}),s,target,identity),null);
 assert.throws(()=>activateMembers(s,{...target,secretaryId:'999@s.whatsapp.net'},identity));
});
