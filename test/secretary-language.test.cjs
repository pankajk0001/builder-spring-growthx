const test=require('node:test'),assert=require('node:assert/strict');
const {begin}=require('../src/secretary-setup.cjs');
const {createClubEngine}=require('../src/club-engine.cjs');
const {translateSecretary}=require('../src/secretary-language.cjs');
const {interpretSecretaryMessage}=require('../src/hermes-intent.cjs');
const {createHash}=require('node:crypto');
const now=Date.parse('2026-10-07T12:00:00Z');
function fixture(decision){
 const state=begin(now,{pilotMode:true});state.stage='complete';state.board.find(r=>r.role==='Speaker 1').member='Karan';
 const club={id:'fictional-club',identity:{secretaryId:'111@s.whatsapp.net'},target:null,state},sent=[];let calls=0;
 const interpreter=process.env.SECRETARY_LIVE_AI==='1'?interpretSecretaryMessage:async()=>{calls++;return {decision};};
 const engine=createClubEngine({registry:{version:2,clubs:[club]},club,pilotMode:true,interpretSecretary:interpreter,now:()=>now,save:async()=>{},acknowledgements:{wait:async()=>{}},socket:{sendMessage:async(jid,content)=>{sent.push({jid,content});return {key:{id:'receipt-'+sent.length,remoteJid:jid,fromMe:true}};}},sendPreview:async(_socket,jid,png)=>{sent.push({jid,image:true});return {id:'preview-'+sent.length,sha256:createHash('sha256').update(png).digest('hex')};}});
 return {club,sent,engine,calls:()=>calls};
}
const d=(action,fields)=>({action,confidence:1,...fields});
const cases=[
 ['make priya the timer',d('edit',{operation:'set',role:'Timer',member:'priya'}),s=>{assert.equal(s.memberEdit.board.find(r=>r.role==='Timer').member,'priya');assert.equal(s.board.find(r=>r.role==='Timer').member,null);assert.equal(s.memberEdit.stage,'preview');}],
 ['remove Karan from speaker 1',d('edit',{operation:'remove',role:'Speaker 1',member:'Karan'}),s=>{assert.equal(s.memberEdit.board.find(r=>r.role==='Speaker 1').member,null);assert.equal(s.memberEdit.board.find(r=>r.role==='Speaker 1').removed,undefined);assert.equal(s.board.find(r=>r.role==='Speaker 1').member,'Karan');}],
 ['show me the board',d('command',{command:'TABLE'}),(s,sent)=>{assert.ok(sent.some(r=>r.content?.text.includes('Karan')));assert.equal(s.memberEdit,undefined);}],
 ['looks good, post it at 8',d('command',{command:'APPROVE'}),(s,sent)=>{assert.match(sent.at(-1).content.text,/8 AM or 8 PM/);assert.equal(s.memberEdit,undefined);assert.equal(s.approvedHash,undefined);}],
 ['can you change the thing',d('clarify',{question:'What would you like to change on the role board?'}),(s,sent)=>{assert.match(sent.at(-1).content.text,/\?$/);assert.equal(s.memberEdit,undefined);}],
 ['Timer: Priya',d('clarify',{question:'Which role?'}),s=>{assert.equal(s.memberEdit.board.find(r=>r.role==='Timer').member,'Priya');assert.equal(s.board.find(r=>r.role==='Timer').member,null);}]
];
for(const [text,decision,check] of cases)test(text,async()=>{
 const f=fixture(decision),original=structuredClone(f.club.state.board);
 await f.engine.command({id:'proof',text});check(f.club.state,f.sent);
 assert.deepEqual(f.club.state.board,original);assert.ok(f.sent.every(r=>r.jid===f.club.identity.secretaryId));assert.equal(f.club.state.helperGroupPost,undefined);
 const count=f.sent.length;await f.engine.command({id:'proof',text});assert.equal(f.sent.length,count);
});
test('replacement asks once, survives restart and applies only after confirmation',async()=>{
 const f=fixture(d('edit',{operation:'set',role:'Timer',member:'Priya'}));f.club.state.board.find(r=>r.role==='Timer').member='Mira';
 await f.engine.command({id:'replace',text:'make Priya the timer'});assert.equal(f.club.state.memberEdit,undefined);assert.equal(f.sent.at(-1).content.text,'Do you want Priya as Timer, replacing Mira?');
 f.club.state=JSON.parse(JSON.stringify(f.club.state));await f.engine.command({id:'confirm',text:'yes'});
 assert.equal(f.club.state.memberEdit.board.find(r=>r.role==='Timer').member,'Priya');assert.equal(f.club.state.board.find(r=>r.role==='Timer').member,'Mira');assert.equal(f.club.state.memberEdit.stage,'preview');
});
test('a changed board invalidates a pending replacement',async()=>{
 const f=fixture(d('edit',{operation:'set',role:'Timer',member:'Priya'}));f.club.state.board.find(r=>r.role==='Timer').member='Mira';
 await f.engine.command({id:'replace',text:'make Priya the timer'});f.club.state.board.find(r=>r.role==='Timer').member='Ada';
 await f.engine.command({id:'confirm',text:'yes'});assert.equal(f.club.state.memberEdit,undefined);assert.match(f.sent.at(-1).content.text,/board has changed/);
});
test('a new unclear message cancels the previous replacement question',async()=>{
 const f=fixture(d('edit',{operation:'set',role:'Timer',member:'Priya'}));f.club.state.board.find(r=>r.role==='Timer').member='Mira';
 await f.engine.command({id:'replace',text:'make Priya the timer'});
 await f.engine.command({id:'other',text:'can you change the thing'});assert.equal(f.club.state.secretaryQuestion,undefined);
 await f.engine.command({id:'yes',text:'yes'});assert.equal(f.club.state.memberEdit,undefined);assert.equal(f.club.state.board.find(r=>r.role==='Timer').member,'Mira');
});
test('low confidence, invalid roles and fabricated names never edit or approve',async()=>{
 for(const decision of [d('command',{command:'APPROVE',confidence:0.5}),d('edit',{operation:'set',role:'Unknown',member:'Priya'}),d('edit',{operation:'set',role:'Timer',member:'Invented Person'})]){
  const s=begin(now,{pilotMode:true}),before=structuredClone(s);const result=await translateSecretary(s,{id:'safe',text:'make Priya the timer'},async()=>({decision}));assert.ok(result.question);assert.deepEqual(s,before);
 }
});
test('AI failure uses the shared retry text; old exact formats still work',async()=>{
 const fail=async()=>{throw Error('cap hit');},s=begin(now,{pilotMode:true});
 assert.equal((await translateSecretary(s,{id:'failure',text:'show me the board'},fail)).question,'[ask the secretary to try again in few minutes]');
 for(const text of ['START','TABLE','APPROVE','Timer: Priya'])assert.equal((await translateSecretary(s,{id:'exact',text},fail)).text,text);
});
