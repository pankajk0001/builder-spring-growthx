import {test,expect,beforeEach,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api,internal} from '../convex/_generated/api';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{projectRegistry}=require('../src/admin-snapshot.cjs');
const modules=import.meta.glob('../convex/**/*.{ts,js}');
async function controlsFixture(){
 const t=convexTest(schema,modules),id=await t.run(ctx=>ctx.db.insert('users',{email:'owner@example.com',emailVerificationTime:1})),now=Date.now();
 const club={id:'cedar',identity:{secretaryId:'15550000001@s.whatsapp.net'},state:{stage:'complete',approvedHash:'approved',outbox:[],meeting:{club:'Cedar Example'}}};
 const snapshot=projectRegistry({clubs:[club],serviceHealth:{connected:true,lastCheckAt:now,startedAt:now,controlsCheckedAt:now}},now);
 await t.mutation(internal.admin.replace,{snapshot});return {t,owner:t.withIdentity({subject:id+'|example-session'}),club,account:snapshot.accounts[0]};
}
test('only the verified owner can queue controls; stale state and duplicate clicks are safe',async()=>{
 const {t,owner,account}=await controlsFixture();const args={clubId:'cedar',kind:'pause' as const,expected:account.control.token,nonce:'request-example-0001'};
 await expect(t.mutation(api.admin.requestControl,args)).rejects.toThrow('Owner access required');
 const other=await t.run(ctx=>ctx.db.insert('users',{email:'other@example.com',emailVerificationTime:1}));
 await expect(t.withIdentity({subject:other+'|session'}).mutation(api.admin.requestControl,args)).rejects.toThrow('Owner access required');
 await expect(owner.mutation(api.admin.requestControl,{...args,expected:'old'})).rejects.toThrow('account changed');
 const id=await owner.mutation(api.admin.requestControl,args);expect(await owner.mutation(api.admin.requestControl,args)).toBe(id);
 expect(await owner.mutation(api.admin.requestControl,{...args,nonce:'request-example-0002'})).toBe(id);
 const pending=await t.query(internal.admin.pendingControls,{});expect(pending).toHaveLength(1);expect(pending[0].id).toBe(id);
 await expect(t.query(api.admin.controlHistory,{clubId:'cedar'})).rejects.toThrow('Owner access required');
 const history=await owner.query(api.admin.controlHistory,{clubId:'cedar'});expect(history[0].status).toBe('pending');expect(JSON.stringify(history)).not.toContain('owner@example.com');expect(JSON.stringify(history)).not.toContain('expected');
});
test('private control endpoints reject outsiders and durably acknowledge helper results',async()=>{
 const {t,owner,account}=await controlsFixture();
 for(const method of ['GET','POST'])expect((await t.fetch('/admin/actions',{method,headers:{authorization:'wrong'},...(method==='POST'?{body:'{}'}:{})})).status).toBe(401);
 const id=await owner.mutation(api.admin.requestControl,{clubId:'cedar',kind:'pause',expected:account.control.token,nonce:'request-example-0001'});
 const response=await t.fetch('/admin/actions',{headers:{authorization:'a'.repeat(40)}});expect(response.status).toBe(200);expect((await response.json())[0].id).toBe(id);
 const result={id,status:'succeeded',message:'Pause confirmed by the helper.',completedAt:Date.now()};
 expect((await t.fetch('/admin/actions',{method:'POST',headers:{authorization:'a'.repeat(40)},body:JSON.stringify(result)})).status).toBe(204);
 await t.mutation(internal.admin.completeControl,{...result,status:'failed',message:'Duplicate reply'});
 const history=await owner.query(api.admin.controlHistory,{clubId:'cedar'});expect(history[0].status).toBe('succeeded');expect(history[0].message).toBe(result.message);
 expect(await t.query(internal.admin.pendingControls,{})).toHaveLength(0);
});
test('a delayed acknowledgement cannot make the owner history falsely report an applied action failed',async()=>{
 const {t,owner,account}=await controlsFixture();const args={clubId:'cedar',kind:'pause' as const,expected:account.control.token,nonce:'request-example-0001'};
 const id=await owner.mutation(api.admin.requestControl,args);await t.run(ctx=>ctx.db.patch(id,{requestedAt:Date.now()-300001}));
 const next=await owner.mutation(api.admin.requestControl,{...args,nonce:'request-example-0002'});expect(next).not.toBe(id);
 expect((await owner.query(api.admin.controlHistory,{clubId:'cedar'})).find(r=>r.id===id)?.status).toBe('pending');
 await t.mutation(internal.admin.completeControl,{id,status:'succeeded',message:'Pause confirmed by the helper.',completedAt:Date.now()-300000});
 expect((await owner.query(api.admin.controlHistory,{clubId:'cedar'})).find(r=>r.id===id)?.status).toBe('succeeded');
});
test('offline helper and resume blockers cannot be bypassed with a direct owner call',async()=>{
 const {t,owner,club}=await controlsFixture(),now=Date.now();
 const snapshot=projectRegistry({clubs:[{...club,paused:{reason:'Uncertain send',at:new Date(now).toISOString()}}],serviceHealth:{connected:true,lastCheckAt:now,startedAt:now,controlsCheckedAt:now}},now+1);
 await t.mutation(internal.admin.replace,{snapshot});
 await expect(owner.mutation(api.admin.requestControl,{clubId:'cedar',kind:'resume',expected:snapshot.accounts[0].control.token,nonce:'request-example-0001'})).rejects.toThrow('problem needs review');
 snapshot.health.service.connected=false;snapshot.capturedAt++;await t.mutation(internal.admin.replace,{snapshot});
 await expect(owner.mutation(api.admin.requestControl,{clubId:'cedar',kind:'resume',expected:snapshot.accounts[0].control.token,nonce:'request-example-0002'})).rejects.toThrow('helper is unavailable');
});
beforeEach(()=>{vi.stubEnv('ADMIN_OWNER_EMAIL','owner@example.com');vi.stubEnv('ADMIN_SYNC_SECRET','a'.repeat(40));});
test('actual overview handler rejects anonymous, another verified user and an unverified owner',async()=>{const t=convexTest(schema,modules);await expect(t.query(api.admin.overview,{})).rejects.toThrow('Owner access required');for(const [email,emailVerificationTime] of [['other@example.com',1],['owner@example.com',undefined]]){const id=await t.run(ctx=>ctx.db.insert('users',{email:email as string,...(emailVerificationTime?{emailVerificationTime:emailVerificationTime as number}:{})}));await expect(t.withIdentity({subject:id+'|example-session'}).query(api.admin.overview,{})).rejects.toThrow('Owner access required');}});
test('verified owner sees the read-only snapshot; an older update cannot overwrite it',async()=>{const t=convexTest(schema,modules);const id=await t.run(ctx=>ctx.db.insert('users',{email:'owner@example.com',emailVerificationTime:1}));const snapshot=projectRegistry({clubs:[{id:'cedar',identity:{secretaryId:'15550000001@s.whatsapp.net'},state:{stage:'complete',meeting:{club:'Cedar Example'},board:[{role:'Timer',member:'Ada Example'}],memberEdit:{stage:'preview',board:[{role:'Timer',member:'Mira Example'}]}}}]},Date.now());await t.mutation(internal.admin.replace,{snapshot});const owner=t.withIdentity({subject:id+'|example-session'});const overview=await owner.query(api.admin.overview,{});expect(overview.count).toBe(1);expect(overview.accounts[0].draft?.roles[0].member).toBe('Mira Example');await t.mutation(internal.admin.replace,{snapshot:{capturedAt:snapshot.capturedAt-1,accounts:[]}});expect((await owner.query(api.admin.overview,{})).count).toBe(1);});
test('snapshot HTTP endpoint denies missing/wrong credentials and malformed uploads',async()=>{const t=convexTest(schema,modules);for(const header of [undefined,'wrong']){const response=await t.fetch('/admin/snapshot',{method:'POST',headers:header?{authorization:header}:{},body:'{}'});expect(response.status).toBe(401);}const response=await t.fetch('/admin/snapshot',{method:'POST',headers:{authorization:'a'.repeat(40)},body:'{}'});expect(response.status).toBe(400);const valid=await t.fetch('/admin/snapshot',{method:'POST',headers:{authorization:'a'.repeat(40)},body:JSON.stringify({capturedAt:Date.now(),accounts:[]})});expect(valid.status).toBe(204);});
test('owner receives bounded activity and service summaries without message events',async()=>{
 const t=convexTest(schema,modules),id=await t.run(ctx=>ctx.db.insert('users',{email:'owner@example.com',emailVerificationTime:1}));
 const {ensureActivity,recordActivity}=require('../src/admin-activity.cjs'),now=Date.now();
 const club={id:'cedar',identity:{secretaryId:'15550000001@s.whatsapp.net'},state:{stage:'complete'}};ensureActivity(club,now);recordActivity(club,'member_reply','private-message-id',now,now);
 const snapshot=projectRegistry({clubs:[club],serviceHealth:{connected:true,lastCheckAt:now,startedAt:now}},now,{aiLedger:{calls:[now/1000],reserved_usd:0.2}});
 await t.mutation(internal.admin.replace,{snapshot});const result=await t.withIdentity({subject:id+'|example-session'}).query(api.admin.overview,{});
 expect(result.accounts[0].activity?.secretaryActive).toBe(false);expect(result.accounts[0].activity?.clubActive).toBe(true);expect(result.health?.ai?.callsLastHour).toBe(1);expect(JSON.stringify(result)).not.toContain('private-message-id');expect(JSON.stringify(result)).not.toContain('"events"');
});
