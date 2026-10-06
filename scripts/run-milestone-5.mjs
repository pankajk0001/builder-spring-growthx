import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { renderBoardImage } = require('../src/board-image.cjs');
const { postingDecision } = require('../src/group-posting.cjs');
const { sendTestGroupBoard } = require('../src/preview-delivery.cjs');
const { createMessageAckTracker } = require('../src/message-ack.cjs');
const { isSecretaryChat } = require('../src/approval-inbox.cjs');
const { assertPrivateSendReceipt } = require('../src/note-delivery.cjs');
const stateDir = join(homedir(), '.hermes', 'the-helper');
const statePath = join(stateDir, 'approval-state.json');
const lockPath = join(stateDir, 'group-post.lock');
const target = JSON.parse(await readFile(join(stateDir, 'test-group.json'), 'utf8'));
const status = text => process.stdout.write(text + '\n');
console.log = console.info = console.warn = () => {};
let lock;
try { lock = await open(lockPath, 'wx', 0o600); await lock.writeFile(String(process.pid)); }
catch (error) {
 if(error.code !== 'EEXIST') throw error;
 const pid = Number(await readFile(lockPath,'utf8'));
 try { process.kill(pid,0); } catch (e) {
  if(e.code !== 'ESRCH') throw e;
  await unlink(lockPath); lock = await open(lockPath,'wx',0o600); await lock.writeFile(String(process.pid));
 }
 if(!lock) { status('A posting runner is already active; no second sender started.'); process.exit(0); }
}
let sock, credentialWrites = Promise.resolve();
async function save(state) {
 await writeFile(statePath+'.tmp',JSON.stringify(state,null,2)+'\n',{mode:0o600});
 await rename(statePath+'.tmp',statePath);
}
try {
 let state, rendered, hash, decision;
 if (process.argv.includes('--post-now-test')) {
  state = JSON.parse(await readFile(statePath,'utf8'));
  const current = renderBoardImage(state);
  const currentHash = createHash('sha256').update(current.png).digest('hex');
  const existing = postingDecision(state,target,currentHash);
  if (existing === 'wait') {
   state.immediateTestPost = { previousPostAt: state.postAt, authorizedAt: new Date().toISOString() };
   state.postAt = new Date().toISOString();
   await save(state);
  }
 }
 while(true) {
  state = JSON.parse(await readFile(statePath,'utf8'));
  assert.ok(state.board.every(row => row.member === null || row.member.endsWith(' Example')));
  assert.match(state.meeting.club,/\bExample\b/i);
  rendered = renderBoardImage(state);
  hash = createHash('sha256').update(rendered.png).digest('hex');
  decision = postingDecision(state,target,hash);
  if(decision !== 'wait') break;
  if(!process.argv.includes('--watch')) { status('Approved board is scheduled for '+state.postAt+'; nothing sent early.'); break; }
  if(!state.scheduleRegistered) { state.scheduleRegistered = true; await save(state); status('Posting runner is waiting for the approved time. Keep this laptop awake and connected.'); }
  await new Promise(resolve => setTimeout(resolve,Math.min(30000,Date.parse(state.postAt)-Date.now())));
 }
 if(decision === 'complete') status('The approved board was already posted; no duplicate sent.');
 if(decision === 'uncertain' && !state.groupPost?.id) throw new Error('An earlier send is uncertain. Check Test_group before retrying; no automatic duplicate was sent.');
 if(decision === 'send' || (decision === 'uncertain' && state.groupPost?.id)) {
  const bridgeDir = join(homedir(),'.hermes','hermes-agent','scripts','whatsapp-bridge');
  const requireBridge = createRequire(join(bridgeDir,'package.json'));
  const baileys = await import(pathToFileURL(requireBridge.resolve('@whiskeysockets/baileys')).href);
  const { default:pino } = await import(pathToFileURL(requireBridge.resolve('pino')).href);
  const { state:auth, saveCreds } = await baileys.useMultiFileAuthState(target.sessionPath);
  const secretaryId = baileys.jidNormalizedUser(auth.creds.me?.id || '');
  const secretaryLid = auth.creds.me?.lid ? baileys.jidNormalizedUser(auth.creds.me.lid) : null;
  assert.equal(state.secretaryId,secretaryId);
  const { version } = await baileys.fetchLatestBaileysVersion();
  sock = baileys.makeWASocket({auth,version,logger:pino({level:'silent'}),syncFullHistory:false,markOnlineOnConnect:false,emitOwnEvents:true,
   shouldIgnoreJid:jid => jid !== target.groupId && !isSecretaryChat(jid,{secretaryId,secretaryLid})});
  sock.ev.on('creds.update',()=>{ credentialWrites = credentialWrites.then(saveCreds); });
  const acknowledgements = createMessageAckTracker(sock.ev,{secretaryId,secretaryLid,targetGroupId:target.groupId},30000);
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('WhatsApp connection timed out.')),45000);
   sock.ev.on('connection.update',({connection})=>{
    if(connection==='open'){clearTimeout(timer);resolve();}
    if(connection==='close'){clearTimeout(timer);reject(new Error('WhatsApp connection closed.'));}
   });
  });
  // Re-read approval just before sending, so an edit or cancellation cannot use stale data.
  state = JSON.parse(await readFile(statePath,'utf8'));
  const recovering = decision === 'uncertain';
  assert.equal(postingDecision(state,target,hash),recovering ? 'uncertain' : 'send');
  if (!recovering) {
   state.groupPost={status:'sending',hash,startedAt:new Date().toISOString()};
   await save(state);
  } else status('Checking the existing image receipt; no second image will be sent.');
  try {
   const sent = recovering ? state.groupPost : await sendTestGroupBoard(sock,target,rendered.png,'the helper — Role board\n'+state.meeting.club+' · Meeting '+state.meeting.number);
   state.groupPost={...state.groupPost,...sent}; await save(state);
   await acknowledgements.wait(sent.id);
   state.groupPost={...state.groupPost,status:'sent',deliveryReceiptVerified:true,postedAt:new Date().toISOString()};
   await save(state);
   status('The exact approved square image was posted to Test_group and acknowledged by WhatsApp.');
  } catch(error) {
   if (recovering) throw error;
   const sent=await sock.sendMessage(secretaryId,{text:'the helper — Board posting could not be confirmed. Please check Test_group before posting manually; I will not automatically send a duplicate.'});
   assertPrivateSendReceipt(sent,secretaryId); await acknowledgements.wait(sent.key.id);
   throw error;
  }
 }
} catch(error) { status(error.message); process.exitCode=1; }
finally {
 if(sock) sock.end(undefined);
 await credentialWrites;
 await lock.close(); await unlink(lockPath);
}
process.exit(process.exitCode || 0);
