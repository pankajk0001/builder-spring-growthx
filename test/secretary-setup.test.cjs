const test=require('node:test');const assert=require('node:assert/strict');const {incoming,applySetup}=require('../src/secretary-setup.cjs');
const identity={secretaryId:'123@s.whatsapp.net',secretaryLid:'456@lid'};
test('setup accepts only fresh incoming Secretary private messages',()=>{
 const message={key:{id:'a',fromMe:false,remoteJid:identity.secretaryId},messageTimestamp:10,message:{conversation:'start'}};
 assert.ok(incoming(message,identity,9000));
 for(const patch of [{fromMe:true},{remoteJid:'123@g.us'},{remoteJid:'999@s.whatsapp.net'}])assert.equal(incoming({...message,key:{...message.key,...patch}},identity,9000),null);
 assert.equal(incoming(message,identity,11000),null);
 assert.equal(incoming({...message,messageTimestamp:undefined},identity,0),null);
});
test('sample comes before settings, final approval saves privately and duplicates do nothing',()=>{
 let s=null,i=0;const send=text=>{s=applySetup(s,{id:String(++i),text},Date.UTC(2026,9,7));s.outbox=[];};
 send('give me the role board');assert.equal(s.stage,'roles');send('Speaker 1: Ada Example');assert.equal(s.stage,'sample');
 send('APPROVE');assert.equal(s.stage,'sample');s.lastPreviewServerAckVerified=true;s.previewReceipt={id:'sample'};send('APPROVE');assert.equal(s.stage,'club');
 for(const text of ['Example Club','42','Sunday','14:30','Monday 19:00','19:00'])send(text);
 assert.equal(s.stage,'final');assert.equal(s.meeting.date,'11 October 2026');assert.equal(s.board[3].member,'Ada Example');
 s.lastPreviewServerAckVerified=true;s.previewReceipt={id:'final'};s.boardHash='hash';send('APPROVE');assert.equal(s.stage,'complete');assert.equal(s.approvedHash,'hash');assert.equal(s.targetGroupId,undefined);
 assert.deepEqual(applySetup(s,{id:String(i),text:'APPROVE'}),s);
});
test('invalid role edits preserve holders and settings; corrected previews need fresh approval',()=>{
 let s=applySetup(null,{id:'1',text:'START'});s.outbox=[];
 s=applySetup(s,{id:'2',text:'Speaker 1: Ada Example; Timer: Ada Example'});assert.equal(s.stage,'roles');assert.ok(s.board.every(r=>r.member===null));
 s=applySetup(s,{id:'3',text:'Speaker 1: Ada Example; Timer: Zara Example'});s.lastPreviewServerAckVerified=true;s.previewReceipt={id:'old'};
 s=applySetup(s,{id:'4',text:'Timer: Mira Example'});assert.equal(s.lastPreviewServerAckVerified,false);
 s.lastPreviewServerAckVerified=true;s.previewReceipt={id:'new'};s=applySetup(s,{id:'5',text:'APPROVE',replyTo:'old'});assert.equal(s.stage,'sample');
});
test('correcting only the invalid line retains valid roles across a saved restart',()=>{
 let s=applySetup(null,{id:'start',text:'START'});s.outbox=[];
 s=applySetup(s,{id:'mixed',text:'Speaker 1: Ada Example; Timer: Mira example; Listener: Lena Example'});
 assert.equal(s.stage,'roles');assert.ok(s.board.every(row=>row.member===null));
 s=JSON.parse(JSON.stringify(s));s.outbox=[];
 s=applySetup(s,{id:'correction',text:'Timer: Mira Example'});
 assert.equal(s.stage,'sample');
 for(const [role,name] of [['Speaker 1','Ada Example'],['Timer','Mira Example'],['Listener','Lena Example']])assert.equal(s.board.find(row=>row.role===role).member,name);
 assert.equal(s.pendingEdits,null);
});
test('nothing to correct approves a delivered sample without changing the board',()=>{
 let s=applySetup(null,{id:'start',text:'START'});s=applySetup(s,{id:'roles',text:'Speaker 1: Ada Example'});
 s.outbox=[];s.lastPreviewServerAckVerified=true;s.previewReceipt={id:'latest'};
 const board=structuredClone(s.board);
 s=applySetup(s,{id:'confirm',text:'Nothing to correct'});
 assert.equal(s.stage,'club');assert.deepEqual(s.board,board);assert.equal(s.pendingEdits,null);
 assert.match(s.outbox[0].text,/club name/);
});
test('natural approval requires delivery and respects outstanding real edits and quoted previews',()=>{
 let s=applySetup(null,{id:'start',text:'START'});s=applySetup(s,{id:'roles',text:'OPEN'});s.outbox=[];
 s=applySetup(s,{id:'early',text:'Nothing to correct'});assert.equal(s.stage,'sample');assert.equal(s.pendingEdits,undefined);
 s.lastPreviewServerAckVerified=true;s.previewReceipt={id:'latest'};
 s=applySetup(s,{id:'stale',text:'Nothing to correct',replyTo:'old'});assert.equal(s.stage,'sample');
 s=applySetup(s,{id:'invalid',text:'Timer: Mira example'});
 assert.equal(s.lastPreviewServerAckVerified,true);
 s=applySetup(s,{id:'confirm',text:'Nothing to correct'});assert.equal(s.stage,'sample');assert.ok(s.pendingEdits);
});
test('natural approval clears only a legacy false error for that approval phrase',()=>{
 let s=applySetup(null,{id:'start',text:'START'});s=applySetup(s,{id:'roles',text:'OPEN'});
 s.outbox=[];s.lastPreviewServerAckVerified=true;s.previewReceipt={id:'latest'};
 s.pendingEdits={validCorrections:[],invalidCorrections:[{line:'Nothing to correct',reason:'old parser error'}]};
 s=applySetup(s,{id:'confirm',text:'Nothing to correct'});assert.equal(s.stage,'club');assert.equal(s.pendingEdits,null);
});
