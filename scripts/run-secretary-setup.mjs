import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {incoming,applySetup}=require('../src/secretary-setup.cjs');
const {isSecretaryChat}=require('../src/approval-inbox.cjs');
const {renderBoardImage}=require('../src/board-image.cjs');
const {captureImageSnapshot}=require('../src/board-image-snapshot.cjs');
const {sendPrivateBoardPreview}=require('../src/preview-delivery.cjs');
const {assertPrivateSendReceipt}=require('../src/note-delivery.cjs');
const {createMessageAckTracker}=require('../src/message-ack.cjs');
const dir=join(homedir(),'.hermes','the-helper'),file=join(dir,'secretary-setup-state.json');
const config=JSON.parse(await readFile(join(dir,'helper-account.json'),'utf8'));
require('../src/test-group.cjs').assertRunnerHome(config,homedir());
if(!/^\d+@s\.whatsapp\.net$/.test(config.secretaryId))throw Error('Private Secretary destination required.');
let state=null;try{state=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const status=text=>process.stdout.write(text+'\n');console.log=console.info=console.warn=()=>{};
async function save(){await writeFile(file+'.tmp',JSON.stringify(state,null,2)+'\n',{mode:0o600});await rename(file+'.tmp',file);}
const bridge=join(homedir(),'.hermes','hermes-agent','scripts','whatsapp-bridge'),r=createRequire(join(bridge,'package.json'));
const b=await import(pathToFileURL(r.resolve('@whiskeysockets/baileys')).href);
const {default:pino}=await import(pathToFileURL(r.resolve('pino')).href);
const {state:auth,saveCreds}=await b.useMultiFileAuthState(config.sessionPath);
if(!auth.creds.me?.id||isSecretaryChat(b.jidNormalizedUser(auth.creds.me.id),config))throw Error('A separate paired helper account is required.');
const {version}=await b.fetchLatestBaileysVersion();
const sock=b.makeWASocket({auth,version,logger:pino({level:'silent'}),syncFullHistory:false,markOnlineOnConnect:false,shouldIgnoreJid:jid=>!isSecretaryChat(jid,config)});
let credentials=Promise.resolve(),queue=Promise.resolve(),accepting=false,resolveEnd;
const finished=new Promise(resolve=>resolveEnd=resolve),ack=createMessageAckTracker(sock.ev,config,30000);
sock.ev.on('creds.update',()=>{credentials=credentials.then(saveCreds);});
async function flush(){
 while(state?.outbox.length){
  const item=state.outbox[0];
  // Persist intent first. An interrupted, uncertain send pauses instead of duplicating it.
  if(item.sending&&!item.sentId)throw Error('A private send is uncertain; inspect the phone before recovery.');
  if(!item.sentId){
   item.sending=true;await save();
   if(item.kind==='preview'){
    const rendered=renderBoardImage(state);state.imageSnapshot=captureImageSnapshot(state,rendered);state.boardHash=createHash('sha256').update(rendered.png).digest('hex');await save();
    const receipt=await sendPrivateBoardPreview(sock,config.secretaryId,rendered.png,item.caption);state.previewReceipt=receipt;item.sentId=receipt.id;
   }else{
    const receipt=await sock.sendMessage(config.secretaryId,{text:item.text});assertPrivateSendReceipt(receipt,config.secretaryId);item.sentId=receipt.key.id;
   }
   await save();
  }
  await ack.wait(item.sentId);
  if(item.kind==='preview')state.lastPreviewServerAckVerified=true;
  state.outbox.shift();await save();status('Private setup reply acknowledged.');
 }
}
const start=Date.now();
function enqueue(work){queue=queue.then(work).catch(()=>{accepting=false;status('Private setup paused after an unverified send or processing error.');process.exitCode=1;resolveEnd();});}
sock.ev.on('connection.update',update=>{
 if(update.connection==='open'){accepting=true;status('Separate helper connected; private setup ready.');enqueue(flush);}
 if(update.connection==='close'){accepting=false;process.exitCode=1;resolveEnd();}
});
sock.ev.on('messages.upsert',event=>{
 if(!accepting||event.type!=='notify')return;
 for(const message of event.messages){const command=incoming(message,config,start);if(command)enqueue(async()=>{state=applySetup(state,command);await save();await flush();status(`Private setup stage: ${state.stage}.`);});}
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{accepting=false;resolveEnd();});
await finished;accepting=false;await queue;sock.end(new Error('Setup runner stopped'));await credentials;
