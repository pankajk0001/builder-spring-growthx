import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {loadClubStore}=require('../src/club-store.cjs');
const {findSecretary,findGroup,registerSecretary,normalize}=require('../src/multi-club.cjs');
const {createClubEngine}=require('../src/club-engine.cjs');
const {incoming}=require('../src/secretary-setup.cjs');
const {isSecretaryChat}=require('../src/approval-inbox.cjs');
const {createMessageAckTracker}=require('../src/message-ack.cjs');
const {interpretFictionalMessages,interpretSecretaryMessage}=require('../src/hermes-intent.cjs');
const dir=join(homedir(),'.hermes','the-helper');
const config=JSON.parse(await readFile(join(dir,'helper-account.json'),'utf8'));
require('../src/test-group.cjs').assertRunnerHome(config,homedir());
const store=await loadClubStore(join(dir,'multi-club-state.json'),config,join(dir,'secretary-setup-state.json'));
const {registry,save}=store;
const status=text=>process.stdout.write(text+'\n');console.log=console.info=console.warn=()=>{};
const bridge=join(homedir(),'.hermes','hermes-agent','scripts','whatsapp-bridge'),r=createRequire(join(bridge,'package.json'));
const b=await import(pathToFileURL(r.resolve('@whiskeysockets/baileys')).href);
const {default:pino}=await import(pathToFileURL(r.resolve('pino')).href);
const {state:auth,saveCreds}=await b.useMultiFileAuthState(config.sessionPath);
if(!auth.creds.me?.id||isSecretaryChat(b.jidNormalizedUser(auth.creds.me.id),config))throw Error('A separate paired helper account is required.');
const helper={secretaryId:b.jidNormalizedUser(auth.creds.me.id),secretaryLid:auth.creds.me.lid?b.jidNormalizedUser(auth.creds.me.lid):null};
const {version}=await b.fetchLatestBaileysVersion();
const sock=b.makeWASocket({auth,version,logger:pino({level:'silent'}),syncFullHistory:false,markOnlineOnConnect:false,
 shouldIgnoreJid:jid=>!/^\d+@(s\.whatsapp\.net|lid)$/.test(normalize(jid)||'')&&!findGroup(registry,jid)});
const engines=new Map();
function engine(club){
 if(!engines.has(club.id)){
  const acknowledgementIdentity={get secretaryId(){return club.identity.secretaryId;},get secretaryLid(){return club.identity.secretaryLid;},get targetGroupId(){return club.target?.groupId;}};
  engines.set(club.id,createClubEngine({registry,club,socket:sock,helper,acknowledgements:createMessageAckTracker(sock.ev,acknowledgementIdentity,30000),save,interpret:interpretFictionalMessages,interpretSecretary:interpretSecretaryMessage,status,enableMembers:config.enableMemberReplies!==false,pilotMode:true}));
 }
 return engines.get(club.id);
}
let queue=Promise.resolve(),credentials=Promise.resolve(),accepting=false,timer,resolveEnd;
const finished=new Promise(resolve=>resolveEnd=resolve),start=Math.floor(Date.now()/1000)*1000;
function enqueue(club,work){
 queue=queue.then(async()=>{
  if(club?.paused)return;
  try{await work();}
  catch(error){
   if(club){club.paused={reason:'Unverified delivery or processing error; inspect this club before recovery.',at:new Date().toISOString()};await save();status('One club paused; other clubs remain active.');}
   else{status('Private message could not be verified; no club was changed.');}
  }
 }).catch(()=>{accepting=false;process.exitCode=1;resolveEnd();status('Club storage could not be saved; helper stopped.');});
}
async function resolveSecretary(message){
 const jid=normalize(message.key.remoteJid),alternate=normalize(message.key.remoteJidAlt);
 let club=findSecretary(registry,jid);
 if(club)return club;
 if(!/^\d+@(s\.whatsapp\.net|lid)$/.test(jid||''))return null;
 let phone=jid.endsWith('@s.whatsapp.net')?jid:alternate?.endsWith('@s.whatsapp.net')?alternate:null;
 if(!phone&&jid.endsWith('@lid'))phone=normalize(await sock.signalRepository.lidMapping.getPNForLID(jid));
 if(!/^\d+@s\.whatsapp\.net$/.test(phone||'')||isSecretaryChat(phone,helper))return null;
 const lid=jid.endsWith('@lid')?jid:alternate?.endsWith('@lid')?alternate:null;
 club=findSecretary(registry,phone);
 if(club){
  if(lid){const owner=findSecretary(registry,lid);if(owner&&owner!==club)throw Error('Identity belongs to another Secretary.');if(club.identity.secretaryLid&&club.identity.secretaryLid!==lid)throw Error('Secretary identity changed.');club.identity.secretaryLid=lid;await save();}
  return club;
 }
 const text=message.message?.conversation??message.message?.extendedTextMessage?.text;
 if(typeof text!=='string'||! /^(START|give me the role board)$/i.test(text.trim()))return null;
 club=registerSecretary(registry,{secretaryId:phone,secretaryLid:lid});await save();return club;
}
sock.ev.on('creds.update',()=>{credentials=credentials.then(saveCreds);});
sock.ev.on('messages.upsert',event=>{
 if(!accepting||!['notify','append'].includes(event.type))return;
 for(const original of event.messages){
  const message={...original,message:b.extractMessageContent(original.message)};
  const group=findGroup(registry,message.key?.remoteJid);
  if(group){enqueue(group,()=>engine(group).group({type:event.type,message}));continue;}
  const timestamp=Number(message.messageTimestamp)*1000;
  if(event.type!=='notify'||message.key?.fromMe!==false||!message.key.id||!Number.isFinite(timestamp)||timestamp<start)continue;
  enqueue(null,async()=>{
   const club=await resolveSecretary(message);if(!club||club.paused)return;
   const command=incoming(message,club.identity,start);if(!command)return;
   // Keep all club work in the same serial queue; failures pause only its owner.
   try{await engine(club).command(command);}
   catch(error){club.paused={reason:'Unverified private delivery; inspect this club before recovery.',at:new Date().toISOString()};await save();status('One club paused; other clubs remain active.');}
  });
 }
});
sock.ev.on('connection.update',update=>{
 if(update.connection==='open'){
  accepting=true;status('Shared helper connected; isolated clubs ready.');
  for(const club of registry.clubs)enqueue(club,()=>engine(club).tick());
  clearInterval(timer);timer=setInterval(()=>{for(const club of registry.clubs)enqueue(club,()=>engine(club).tick());},15000);
 }
 if(update.connection==='close'){accepting=false;process.exitCode=1;resolveEnd();}
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{accepting=false;clearInterval(timer);resolveEnd();});
await finished;accepting=false;clearInterval(timer);await queue;sock.end(new Error('Shared helper stopped'));await credentials;
