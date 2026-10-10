const test=require('node:test'),assert=require('node:assert/strict');
const {controlToken,resumeBlocker,applyControl,acceptMessage,rebaseResumeSchedule}=require('../src/admin-controls.cjs');
const now=Date.parse('2026-10-07T12:00:00Z');
function fixture(){return {clubs:[{id:'cedar',identity:{secretaryId:'111@s.whatsapp.net'},state:{stage:'complete',approvedHash:'approved',board:[{role:'Timer',member:'Ada Example'}],outbox:[],memberEdit:{stage:'preview',board:[{role:'Timer',member:'Mira Example'}]},memberLive:{dirty:true,windowEnd:now+3*86400000,nextAt:new Date(now+1000).toISOString(),posts:{}}}},{id:'birch',state:{board:[]}}]};}
const request=(club,id,kind,at=now)=>({id,clubId:club.id,kind,expected:controlToken(club),requestedAt:at});
test('pause is isolated, durable and duplicate actions cannot undo later resume',()=>{
 const registry=fixture(),club=registry.clubs[0],before=structuredClone(club.state),other=JSON.stringify(registry.clubs[1]);
 const pause=request(club,'pause-1','pause');assert.equal(applyControl(registry,pause,now).status,'succeeded');
 assert.deepEqual(club.state,before);assert.equal(acceptMessage(club,now+1000),false);
 assert.equal(applyControl(registry,request(club,'resume-1','resume',now+2000),now+2000).status,'succeeded');
 assert.equal(club.paused,null);assert.equal(acceptMessage(club,now+1000),false);assert.equal(acceptMessage(club,now+3000),true);
 const restored=JSON.parse(JSON.stringify(registry));assert.equal(applyControl(restored,pause,now+4000).status,'succeeded');assert.equal(restored.clubs[0].paused,null);
 assert.equal(JSON.stringify(registry.clubs[1]),other);assert.deepEqual(club.state.board,before.board);assert.deepEqual(club.state.memberEdit,before.memberEdit);
 assert.ok(Date.parse(club.state.memberLive.nextAt)>now+2000);
});
test('stale, expired and wrong-club requests cannot change saved state',()=>{
 for(const change of [r=>r.expected='stale',r=>r.clubId='unknown',r=>r.requestedAt=now-300001]){const registry=fixture(),r=request(registry.clubs[0],'invalid','pause');change(r);const before=JSON.stringify(registry.clubs);assert.equal(applyControl(registry,r,now).status,'failed');assert.equal(JSON.stringify(registry.clubs),before);}
});
test('a pre-pause queued reply processed on resume cannot schedule a missed-time catch-up post',()=>{
 const registry=fixture(),club=registry.clubs[0];applyControl(registry,request(club,'pause','pause'),now);applyControl(registry,request(club,'resume','resume',now+2000),now+2000);
 club.state.memberLive.nextAt=new Date(now+1000).toISOString();assert.equal(rebaseResumeSchedule(club,now+3000),true);assert.ok(Date.parse(club.state.memberLive.nextAt)>now+3000);assert.equal(rebaseResumeSchedule(club,now+4000),false);
 club.state.memberLive.nextAt=new Date(now+1000).toISOString();club.state.memberLive.posts[club.state.memberLive.nextAt]={status:'sending'};assert.equal(rebaseResumeSchedule(club,now+4000),false);
});
test('resume cannot bypass automatic error pauses, reset approval or uncertain sends',()=>{
 const registry=fixture(),club=registry.clubs[0];club.paused={kind:'admin',at:new Date(now).toISOString()};assert.equal(resumeBlocker(club),null);
 for(const change of [()=>club.paused={reason:'delivery error'},()=>club.requiresFreshApproval=true,()=>club.state.outbox=[{sending:true}],()=>club.state.helperGroupPost={status:'sending'},()=>club.state.memberLive.posts={due:{status:'sending'}},()=>club.state.memberEdit.send={status:'sending'}]){
  const fresh=fixture().clubs[0];Object.assign(club,fresh,{paused:{kind:'admin',at:new Date(now).toISOString()},requiresFreshApproval:false});change();assert.ok(resumeBlocker(club));assert.equal(applyControl(registry,request(club,'blocked-'+Math.random(),'resume'),now).status,'failed');assert.ok(club.paused);
 }
});
test('lost acknowledgement retries a saved receipt after restart without repeating the action',async()=>{
 const {createAdminControlClient}=require('../src/admin-control-client.cjs');let registry=fixture();registry.serviceHealth={connected:true,lastCheckAt:now,startedAt:now};const club=registry.clubs[0],action=request(club,'pause-1','pause');let durable,failAck=true;
 const calls=[],fetch=async(url,options)=>{calls.push({path:url.pathname,method:options.method,body:options.body&&JSON.parse(options.body)});if(options.method==='GET')return {ok:true,json:async()=>[action]};if(url.pathname.endsWith('actions')&&failAck)throw Error('Network lost');return {ok:true};};
 const config={url:'https://example.convex.site/api/admin/snapshot',secret:'a'.repeat(40)},save=async()=>{durable=structuredClone(registry);};
 await assert.rejects(createAdminControlClient({config,registry,save,fetch,now:()=>now}).poll(),/Network lost/);assert.ok(durable.clubs[0].paused);assert.equal(durable.adminReceipts.length,1);
 registry=durable;failAck=false;await createAdminControlClient({config,registry,save,fetch,now:()=>now+1000}).poll();assert.equal(registry.clubs[0].controlVersion,1);assert.equal(registry.adminReceipts.length,1);
 assert.equal(calls.at(-1).body.status,'succeeded');assert.equal(calls.at(-2).body.accounts[0].paused,true);
});
test('failed private storage never publishes or acknowledges success',async()=>{
 const {createAdminControlClient}=require('../src/admin-control-client.cjs');const registry=fixture();registry.serviceHealth={connected:true,lastCheckAt:now,startedAt:now};const action=request(registry.clubs[0],'pause-1','pause');let saves=0,posts=0;
 const client=createAdminControlClient({config:{url:'https://example.convex.site/api/admin/snapshot',secret:'a'.repeat(40)},registry,now:()=>now,save:async()=>{if(++saves===2)throw Error('Disk full');},fetch:async(_url,options)=>{if(options.method==='POST')posts++;return {ok:true,json:async()=>[action]};}});
 await assert.rejects(client.poll(),error=>error.code==='ADMIN_STORAGE_FAILED');assert.equal(posts,0);
});
