const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {migrateLegacy,registerSecretary,bindTarget,findSecretary,findGroup}=require('../src/multi-club.cjs');
const {createClubEngine}=require('../src/club-engine.cjs');
const {begin,incoming}=require('../src/secretary-setup.cjs');
const {renderBoardImage}=require('../src/board-image.cjs');
const now=Date.parse('2026-10-07T12:00:00Z'),a={secretaryId:'111@s.whatsapp.net',secretaryLid:'11@lid'},b={secretaryId:'222@s.whatsapp.net',secretaryLid:'22@lid'},helper={secretaryId:'333@s.whatsapp.net'};
const tA={name:'Example A',groupId:'123@g.us',testOnly:true},tB={name:'Example B',groupId:'456@g.us',testOnly:true};
const hash=png=>createHash('sha256').update(png).digest('hex');
function ready(name){const s=begin(now);s.meeting.club=name;s.meeting.date='10 October 2026';s.stage='complete';const sha=hash(renderBoardImage(s).png);Object.assign(s,{approvedHash:sha,boardHash:sha,previewReceipt:{id:name+'-preview',sha256:sha},lastPreviewServerAckVerified:true});return s;}
function fixture(){
 const registry=migrateLegacy({...a,targetGroupId:tA.groupId,targetGroupName:tA.name},ready(tA.name)),A=registry.clubs[0],B=registerSecretary(registry,b);bindTarget(registry,B,tB);B.state=ready(tB.name);
 const sent=[],calls=[],socket={sendMessage:async(jid,content)=>{sent.push({jid,content});return {key:{remoteJid:jid,fromMe:true,id:'send-'+sent.length}};},groupFetchAllParticipating:async()=>({[tA.groupId]:{subject:tA.name},[tB.groupId]:{subject:tB.name}}),groupMetadata:async jid=>({id:jid,subject:jid===tA.groupId?tA.name:tB.name,participants:[{id:jid===tA.groupId?a.secretaryId:b.secretaryId},{id:helper.secretaryId}]})};
 const sendImage=async(_socket,target,png)=>{sent.push({jid:target.groupId,png,board:target.name});return {id:'image-'+sent.length,sha256:hash(png)};};
 const sendPreview=async(_socket,jid,png)=>{sent.push({jid,png});return {id:'preview-'+sent.length,sha256:hash(png)};};
 const interpret=async(board,messages)=>{calls.push(messages);return {decisions:messages.map(m=>({messageId:m.id,intent:m.text.includes('unclear')?'clarify':'take',role:'Grammarian'}))};};
 const create=(club,extra={})=>createClubEngine({registry,club,socket,helper,acknowledgements:{wait:async()=>{}},save:async()=>{},interpret,now:()=>now,sendPreview,sendImage,...extra});
 return {registry,A,B,sent,calls,create,socket};
}
const command=(id,text,replyTo)=>({id,text,replyTo});
function groupMessage(target,who,id,text){return {type:'notify',message:{key:{id,fromMe:false,remoteJid:target.groupId,participant:who.secretaryId},messageTimestamp:now/1000+1,message:{conversation:text}}};}
test('two club setups, private tables, initial approved images and role replies stay isolated',async()=>{
 const f=fixture(),eA=f.create(f.A),eB=f.create(f.B);
 for(const e of [eA,eB]){await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));}
 assert.equal(f.sent.filter(s=>s.png&&s.jid.endsWith('@g.us')).length,2);
 const initialA=structuredClone(f.A.state.board),initialB=structuredClone(f.B.state.board);
 await eA.group(groupMessage(tB,b,'wrong','Noah Example: take Grammarian'));assert.equal(f.A.state.memberLive.inbox.length,0);
 await eA.group(groupMessage(tA,a,'claim','Noah Example: take Grammarian'));await eB.group(groupMessage(tB,b,'claim','Zara Example: take Grammarian'));
 await eA.tick();await eB.tick();assert.equal(f.A.state.memberLive.board.find(r=>r.role==='Grammarian').member,'Noah Example');assert.equal(f.B.state.memberLive.board.find(r=>r.role==='Grammarian').member,'Zara Example');
 assert.deepEqual(f.A.state.board,initialA);assert.deepEqual(f.B.state.board,initialB);
 f.sent.length=0;await eA.command(command('table','TABLE'));await eB.command(command('table','TABLE'));assert.match(f.sent.find(s=>s.jid===a.secretaryId).content.text,/Noah Example/);assert.doesNotMatch(f.sent.find(s=>s.jid===a.secretaryId).content.text,/Zara Example/);assert.match(f.sent.find(s=>s.jid===b.secretaryId).content.text,/Zara Example/);
 assert.equal(f.A.state.memberLive.nextAt,'2026-10-07T14:30:00.000Z');assert.equal(f.B.state.memberLive.nextAt,'2026-10-07T14:30:00.000Z');
});
test('another club preview cannot approve a correction; clarification stays private to its Secretary',async()=>{
 const f=fixture(),eA=f.create(f.A),eB=f.create(f.B);for(const e of [eA,eB]){await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));}
 await eA.command(command('edit','EDIT'));await eA.command(command('change','Timer: Mira Example'));const previewA=f.A.state.memberEdit.previewReceipt.id;
 await eB.command(command('edit','EDIT'));await eB.command(command('change','Timer: Kira Example'));const before=JSON.stringify(f.B.state);
 await eA.command(command('approve','APPROVE',f.B.state.memberEdit.previewReceipt.id));assert.equal(f.A.state.memberEdit.stage,'preview');assert.equal(JSON.stringify(f.B.state),before);assert.ok(previewA);
 await eA.command(command('cancel','CANCEL'));f.sent.length=0;await eA.group(groupMessage(tA,a,'unclear','Noah Example: unclear'));await eA.tick();assert.equal(f.sent.length,1);assert.equal(f.sent[0].jid,a.secretaryId);assert.match(f.sent[0].content.text,/clarify/);
});
test('membership and group ownership are checked before a new Secretary can bind a destination',async()=>{
 const f=fixture(),third=registerSecretary(f.registry,{secretaryId:'444@s.whatsapp.net',secretaryLid:'44@lid'});third.state=ready('Example C');const e=f.create(third);
 await e.command(command('steal','CONNECT TEST GROUP Example A'));assert.equal(third.target,null);assert.ok(f.sent.some(m=>/Secretary must be a member/.test(m.content?.text||'')));
 f.socket.groupMetadata=async()=>({id:tA.groupId,subject:tA.name,participants:[{id:third.identity.secretaryId},{id:helper.secretaryId}]});
 await e.command(command('duplicate','CONNECT TEST GROUP Example A'));assert.equal(third.target,null);assert.match(f.sent.at(-1).content.text,/another Secretary/);
});
test('an AI failure in one club does not consume or block another club batch; restart preserves isolation',async()=>{
 const f=fixture(),eA=f.create(f.A,{interpret:async()=>{throw Error('AI unavailable');}}),eB=f.create(f.B);for(const e of [eA,eB]){await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));}
 await eA.group(groupMessage(tA,a,'first','Noah Example: take Grammarian'));await eB.group(groupMessage(tB,b,'second','Zara Example: take Grammarian'));await eA.tick();await eB.tick();assert.equal(f.A.state.memberLive.inbox.length,1);assert.equal(f.B.state.memberLive.inbox.length,0);assert.equal(f.B.state.memberLive.board.find(r=>r.role==='Grammarian').member,'Zara Example');
 const restored=JSON.parse(JSON.stringify(f.registry));assert.equal(findSecretary(restored,a.secretaryLid).state.memberLive.inbox.length,1);assert.equal(findGroup(restored,tB.groupId).state.memberLive.board.find(r=>r.role==='Grammarian').member,'Zara Example');
});
test('private incoming messages select only their sender club and cannot use another Secretary identity',()=>{
 const f=fixture();const message={key:{id:'private',remoteJid:a.secretaryLid,fromMe:false},messageTimestamp:now/1000+1,message:{conversation:'TABLE'}};
 assert.ok(incoming(message,findSecretary(f.registry,message.key.remoteJid).identity,now));assert.equal(incoming(message,f.B.identity,now),null);assert.equal(findSecretary(f.registry,'999@lid'),null);
});
test('a new Secretary completes private setup without modifying the existing club, then selects and posts only their group',async()=>{
 const f=fixture(),original=JSON.stringify(f.A),second=f.B;second.state=null;second.target=null;const e=f.create(second);
 let i=0;const send=text=>e.command(command('setup-'+(++i),text));
 await send('START');assert.equal(second.state.stage,'roles');
 await send('Speaker 1: Zara Example; Timer: Kira Example');assert.equal(second.state.stage,'sample');assert.equal(second.state.lastPreviewServerAckVerified,true);
 for(const answer of ['APPROVE','Example B','42','Saturday','2:30 PM','Monday 19:00','19:00','APPROVE'])await send(answer);
 assert.equal(second.state.stage,'complete');assert.equal(second.state.outbox.length,0);assert.equal(second.target,null);assert.equal(JSON.stringify(f.A),original);
 await send('CONNECT TEST GROUP Example B');assert.equal(second.target.groupId,tB.groupId);await send('POST TEST BOARD');assert.equal(second.state.helperGroupPost.status,'sent');assert.equal(second.state.memberLive.board.find(r=>r.role==='Timer').member,'Kira Example');assert.equal(JSON.stringify(f.A),original);
 const images=f.sent.filter(s=>s.png&&s.jid.endsWith('@g.us'));assert.equal(images.length,1);assert.equal(images[0].jid,tB.groupId);
});
test('two due changed boards deliver to their own groups and never duplicate after reconstruction',async()=>{
 const f=fixture();let clock=now;const eA=f.create(f.A,{now:()=>clock}),eB=f.create(f.B,{now:()=>clock});
 for(const e of [eA,eB]){await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));}
 await eA.group(groupMessage(tA,a,'claim','Noah Example: take Grammarian'));await eB.group(groupMessage(tB,b,'claim','Zara Example: take Grammarian'));await eA.tick();await eB.tick();
 clock=Date.parse('2026-10-07T14:30:00Z');f.sent.length=0;await eA.tick();await eB.tick();const images=f.sent.filter(s=>s.png);assert.deepEqual(images.map(s=>s.jid),[tA.groupId,tB.groupId]);
 for(const club of [f.A,f.B])assert.equal(club.state.memberLive.dirty,false);
 f.A.state=JSON.parse(JSON.stringify(f.A.state));f.B.state=JSON.parse(JSON.stringify(f.B.state));await eA.tick();await eB.tick();assert.equal(f.sent.filter(s=>s.png).length,2);
});
test('each club waits for its own saved posting time and sends only its changed board once',async()=>{
 const f=fixture();f.A.state.postingTime='8:00 PM';f.B.state.postingTime='8:10 PM';let clock=now;
 const eA=f.create(f.A,{now:()=>clock}),eB=f.create(f.B,{now:()=>clock});
 for(const e of [eA,eB]){await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));}
 await eA.group(groupMessage(tA,a,'claim','Noah Example: take Grammarian'));await eB.group(groupMessage(tB,b,'claim','Zara Example: take Grammarian'));await eA.tick();await eB.tick();
 assert.equal(f.A.state.memberLive.nextAt,'2026-10-07T14:30:00.000Z');assert.equal(f.B.state.memberLive.nextAt,'2026-10-07T14:40:00.000Z');
 f.sent.length=0;clock=Date.parse('2026-10-07T14:30:00Z');await eA.tick();await eB.tick();assert.deepEqual(f.sent.filter(s=>s.png).map(s=>s.jid),[tA.groupId]);
 clock=Date.parse('2026-10-07T14:40:00Z');await eA.tick();await eB.tick();assert.deepEqual(f.sent.filter(s=>s.png).map(s=>s.jid),[tA.groupId,tB.groupId]);await eA.tick();await eB.tick();assert.equal(f.sent.filter(s=>s.png).length,2);
});
test('START prepares a fresh private draft without resetting the approved board or duplicating the club',async()=>{
 const f=fixture(),e=f.create(f.A);await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));
 const before=structuredClone(f.A.state),count=f.registry.clubs.length;f.sent.length=0;await e.command(command('join-again','START'));
 assert.equal(f.registry.clubs.length,count);assert.deepEqual(f.A.state.board,before.board);assert.deepEqual(f.A.state.meeting,before.meeting);assert.deepEqual(f.A.state.groupLink,before.groupLink);assert.deepEqual(f.A.state.helperGroupPost,before.helperGroupPost);assert.deepEqual(f.A.state.memberLive,before.memberLive);
 assert.equal(f.sent.length,2);assert.ok(f.sent.every(s=>s.jid===a.secretaryId));assert.ok(f.sent.some(s=>s.png));assert.equal(f.A.state.memberEdit.kind,'new_meeting');assert.ok(f.A.state.memberEdit.board.every(r=>r.member===null));assert.equal(f.A.state.memberEdit.previewAcknowledged,true);
});
test('real pilot completes venue setup and explicit group posting with natural commands on its own group',async()=>{
 const f=fixture();f.B.state=null;f.B.target=null;const e=f.create(f.B,{pilotMode:true});let id=0;const send=text=>e.command(command('real-'+(++id),text));
 for(const text of ['START','Speaker 1: Zara Finch','APPROVE','Cedar Speakers Club','42','Sunday','11:00 AM','Cedar Hall','Monday 19:00','8:10 PM','APPROVE'])await send(text);
 assert.equal(f.B.state.stage,'complete');assert.equal(f.B.state.meeting.venue,'Cedar Hall');await send('CONNECT GROUP Example B');assert.equal(f.B.target.pilotMode,true);assert.equal(f.B.target.secretaryId,b.secretaryId);await send('POST BOARD');assert.equal(f.B.state.helperGroupPost.status,'sent');assert.equal(f.B.state.outbox.length,0);
 assert.ok(f.sent.some(s=>s.jid===tB.groupId&&s.png));assert.equal(f.A.state.meeting.venue,undefined);
});
test('open draft gets a private preview one hour before posting; only member changes reach the group',async()=>{
 const f=fixture();let clock=now;const e=f.create(f.A,{now:()=>clock});
 await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));
 await e.command(command('edit','EDIT'));await e.command(command('draft','Timer: Mira Example'));
 await e.group(groupMessage(tA,a,'claim','Noah Example: take Grammarian'));await e.tick();
 assert.equal(f.A.state.memberLive.board.find(r=>r.role==='Grammarian').member,'Noah Example');
 const other=JSON.stringify(f.B);f.sent.length=0;
 clock=Date.parse('2026-10-07T13:29:59Z');await e.tick();assert.equal(f.sent.length,0);
 clock=Date.parse('2026-10-07T13:30:00Z');await e.tick();
 assert.ok(f.sent.some(s=>s.content?.text.includes('unfinished draft')));assert.ok(f.sent.some(s=>s.png));assert.ok(f.sent.every(s=>s.jid===a.secretaryId));
 assert.equal(f.A.state.memberEdit.board.find(r=>r.role==='Grammarian').member,'Noah Example');
 const count=f.sent.length;f.A.state=JSON.parse(JSON.stringify(f.A.state));await f.create(f.A,{now:()=>clock}).tick();assert.equal(f.sent.length,count);
 clock=Date.parse('2026-10-07T14:30:00Z');await e.tick();
 const images=f.sent.filter(s=>s.jid===tA.groupId&&s.png);assert.equal(images.length,1);
 const live=f.A.state.memberLive;assert.equal(live.publishedBoard.find(r=>r.role==='Timer').member,null);assert.equal(live.publishedBoard.find(r=>r.role==='Grammarian').member,'Noah Example');
 assert.equal(hash(images[0].png),hash(renderBoardImage({board:live.publishedBoard,meeting:f.A.state.meeting}).png));
 assert.equal(f.A.state.memberEdit.board.find(r=>r.role==='Timer').member,'Mira Example');await e.tick();assert.equal(f.sent.filter(s=>s.jid===tA.groupId&&s.png).length,1);assert.equal(JSON.stringify(f.B),other);
});
test('an unchanged board still reminds about its draft without repeating a group image',async()=>{
 const f=fixture();let clock=now;const e=f.create(f.A,{now:()=>clock});await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));await e.command(command('edit','EDIT'));f.sent.length=0;
 clock=Date.parse('2026-10-07T13:30:00Z');await e.tick();assert.ok(f.sent.some(s=>s.png&&s.jid===a.secretaryId));clock=Date.parse('2026-10-07T14:30:00Z');await e.tick();assert.equal(f.sent.filter(s=>s.jid===tA.groupId).length,0);
});
test('same-role draft conflict asks privately and requires a fresh delivered preview after choosing',async()=>{
 const f=fixture();let clock=now;const e=f.create(f.A,{now:()=>clock});await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));await e.command(command('edit','EDIT'));await e.command(command('draft','Grammarian: Mira Example'));
 await e.group(groupMessage(tA,a,'claim','Noah Example: take Grammarian'));f.sent.length=0;await e.command(command('approve','APPROVE'));
 assert.equal(f.A.state.memberLive.board.find(r=>r.role==='Grammarian').member,'Noah Example');assert.match(f.sent.at(-1).content.text,/KEEP CURRENT/);assert.ok(f.sent.every(s=>s.jid===a.secretaryId));
 await e.command(command('choose','USE DRAFT'));assert.equal(f.A.state.memberEdit.previewAcknowledged,true);assert.equal(f.A.state.memberEdit.stage,'preview');assert.equal(f.sent.filter(s=>s.jid===tA.groupId).length,0);
 await e.command(command('fresh-approve','APPROVE'));assert.equal(f.A.state.memberEdit,null);assert.equal(f.A.state.memberLive.publishedBoard.find(r=>r.role==='Grammarian').member,'Mira Example');assert.equal(f.sent.filter(s=>s.jid===tA.groupId&&s.png).length,1);
});
test('analytics separates verified Secretary commands from member requests and acknowledged boards across restart',async()=>{
 const {summarizeActivity}=require('../src/admin-activity.cjs');
 const f=fixture();let clock=now;let e=f.create(f.A,{now:()=>clock});
 await e.command(command('connect','CONNECT TEST GROUP'));await e.command(command('post','POST TEST BOARD'));
 let summary=summarizeActivity(f.A,clock);assert.equal(summary.secretaryMessages,2);assert.equal(summary.boardsPosted,1);assert.equal(summary.boardsApproved,0);
 await e.group(groupMessage(tA,a,'member-only','Noah Example: take Grammarian'));
 clock+=2000;await e.tick();summary=summarizeActivity(f.A,clock);
 assert.equal(summary.secretaryMessages,2);assert.equal(summary.memberReplies,1);assert.equal(summary.roleUpdates,1);
 f.A.state=structuredClone(f.A.state);f.A.activity=structuredClone(f.A.activity);e=f.create(f.A,{now:()=>clock});
 await e.command(command('post','POST TEST BOARD'));await e.group(groupMessage(tA,a,'member-only','Noah Example: take Grammarian'));await e.tick();
 summary=summarizeActivity(f.A,clock);assert.equal(summary.secretaryMessages,2);assert.equal(summary.memberReplies,1);assert.equal(summary.boardsPosted,1);
 assert.equal(summarizeActivity(f.B,clock),null);
});
test('two confirmed role changes count separately even when the final board returns to its original state',async()=>{
 const {summarizeActivity}=require('../src/admin-activity.cjs');const f=fixture();let clock=now;
 const e=f.create(f.A,{now:()=>clock,interpret:async(_board,messages)=>({decisions:messages.map(m=>({messageId:m.id,intent:m.text.includes('drop')?'drop':'take',role:'Grammarian'}))})});
 await e.command(command('connect-net','CONNECT TEST GROUP'));await e.command(command('post-net','POST TEST BOARD'));
 await e.group(groupMessage(tA,a,'take-net','Noah Example: take Grammarian'));await e.group(groupMessage(tA,a,'drop-net','Noah Example: drop Grammarian'));clock+=2000;await e.tick();
 const summary=summarizeActivity(f.A,clock);assert.equal(summary.memberReplies,2);assert.equal(summary.roleUpdates,2);assert.equal(summary.boardsPosted,1);assert.equal(f.A.state.memberLive.dirty,false);
});
