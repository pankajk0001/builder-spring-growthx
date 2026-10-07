const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtemp,writeFile,readFile,stat,rm}=require('node:fs/promises'),{tmpdir}=require('node:os'),{join}=require('node:path');
const {loadClubStore}=require('../src/club-store.cjs'),{registerSecretary}=require('../src/multi-club.cjs');
const config={secretaryId:'111@s.whatsapp.net',secretaryLid:'11@lid',targetGroupId:'123@g.us',targetGroupName:'Example A'};
test('private migration persists atomically and subsequent restarts do not reimport stale legacy data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'helper-clubs-'));
 try{
  const file=join(dir,'multi.json'),legacy=join(dir,'old.json'),original={testOnly:true,stage:'complete',seen:[],outbox:[],board:[{role:'Timer',member:'Mira Example'}]};await writeFile(legacy,JSON.stringify(original));
  const store=await loadClubStore(file,config,legacy);registerSecretary(store.registry,{secretaryId:'222@s.whatsapp.net',secretaryLid:'22@lid'});store.registry.clubs[0].state.board[0].member=null;await Promise.all([store.save(),store.save()]);
  const restored=await loadClubStore(file,config,legacy);assert.equal(restored.registry.clubs.length,2);assert.equal(restored.registry.clubs[0].state.board[0].member,null);assert.deepEqual(JSON.parse(await readFile(legacy,'utf8')),original);assert.equal((await stat(file)).mode&0o777,0o600);
  await writeFile(file,'broken');await assert.rejects(loadClubStore(file,config,legacy));assert.equal(await readFile(file,'utf8'),'broken');
 }finally{await rm(dir,{recursive:true,force:true});}
});
