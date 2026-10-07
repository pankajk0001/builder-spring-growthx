const {isSecretaryChat}=require('./approval-inbox.cjs');
const {renderBoardImage}=require('./board-image.cjs');
const {createHash}=require('node:crypto');
const {sendHelperTestGroupBoard}=require('./preview-delivery.cjs');
function acceptHelperChat(jid,identity){return isSecretaryChat(jid,identity)||(/^\d+(?:-\d+)?@g\.us$/.test(identity.targetGroupId||'')&&jid===identity.targetGroupId);}
function checkGroup(metadata,target,identity,helper){
 if(!(target.testOnly===true||target.pilotMode===true&&target.secretaryId===identity.secretaryId)||typeof target.name!=='string'||!target.name.trim()||!/^\d+(?:-\d+)?@g\.us$/.test(target.groupId)||metadata?.id!==target.groupId||metadata.subject!==target.name)throw Error('Only the privately configured test group can be connected.');
 const participants=metadata.participants||[];
 const includes=who=>participants.some(p=>[p.id,p.phoneNumber,p.lid].some(id=>isSecretaryChat(id,who)));
 if(!includes(helper))throw Error(`Add the ${target.pilotMode?'':'spare '}helper number to ${target.name} first.`);
 if(!includes(identity))throw Error(`The Secretary must be a member of ${target.name}.`);
}
const missingHelper=(name,pilotMode)=>pilotMode?`Add the helper to ${name}, then send CONNECT GROUP privately. Your board is saved and no new board was posted.`:`Add the spare helper number to ${name} first, then reply CONNECT TEST GROUP privately. Your board and settings are saved; no new board was posted.`;
async function verifyMembership({state,target,identity,helper,socket,save}){
 try{checkGroup(await socket.groupMetadata(target.groupId),target,identity,helper);}
 catch(error){
  const code=Number(error.output?.statusCode??error.data?.statusCode??error.statusCode);
  const missing=/^Add the (?:spare )?helper number/.test(error.message)||[403,404].includes(code);
  if(state.groupLink){state.groupLink.connected=false;state.groupLink.issue=missing?'helper_missing':'membership_unverified';await save();}
  if(missing)throw Error(missingHelper(target.name,state.pilotMode));
  if(code>=500||['ETIMEDOUT','ECONNRESET'].includes(error.code))throw Error(`I could not check ${target.name} right now. Your board is saved. Try ${state.pilotMode?'CONNECT GROUP':'CONNECT TEST GROUP'} again in a few minutes.`);
  throw error;
 }
}
function approvedImage(state){
 if(state.stage!=='complete'||(state.testOnly!==true&&state.pilotMode!==true)||state.pendingEdits||!state.lastPreviewServerAckVerified)throw Error('Finish private setup and approve the final image first.');
 const image=renderBoardImage(state);
 const hash=createHash('sha256').update(image.png).digest('hex');
 if(hash!==state.approvedHash||hash!==state.boardHash||hash!==state.previewReceipt?.sha256)throw Error('The board differs from the approved preview.');
 return {image,hash};
}
async function connectGroup({state,target,identity,helper,socket,save}){
 const {hash}=approvedImage(state);
 await verifyMembership({state,target,identity,helper,socket,save});
 if(state.groupLink){if(state.groupLink.groupId!==target.groupId||state.groupLink.approvedHash!==hash)throw Error('The saved group connection does not match this board.');if(state.groupLink.connected)return false;}
 state.groupLink={groupId:target.groupId,approvedHash:hash,connected:true};
 state.outbox.push({kind:'text',text:state.pilotMode?`Connected to ${target.name}. Your approved board is ready. Send POST BOARD to confirm its first post. Member replies will update the board at ${state.postingTime||'8:00 PM'} India time; unclear requests come here privately.`:`The spare helper is connected to ${target.name}. Your approved board is ready. Reply POST TEST BOARD to send it once now.`});await save();return true;
}
async function postGroup({state,target,identity,helper,socket,acknowledgements,save,sendImage=sendHelperTestGroupBoard}){
 const {image,hash}=approvedImage(state);
 if(state.groupLink?.groupId!==target.groupId||state.groupLink.approvedHash!==hash)throw Error(state.pilotMode?'Connect your group first: CONNECT GROUP followed by its name.':'Reply CONNECT TEST GROUP before posting.');
 await verifyMembership({state,target,identity,helper,socket,save});
 if(state.groupLink.connected!==true)throw Error(state.pilotMode?'Send CONNECT GROUP to restore the connection first.':'Reply CONNECT TEST GROUP to restore the group connection first.');
 if(state.helperGroupPost?.status==='sent')return false;
 if(state.helperGroupPost)throw Error('An earlier group send is uncertain. Check your group before recovery; the helper will not resend it.');
 state.helperGroupPost={status:'sending',sha256:hash};await save();
 const receipt=await sendImage(socket,target,image.png,'Role board — approved by the Secretary');
 if(receipt.sha256!==hash||!receipt.id)throw Error('WhatsApp did not confirm the approved image.');
 state.helperGroupPost={...state.helperGroupPost,id:receipt.id};await save();
 await acknowledgements.wait(receipt.id);
 state.helperGroupPost={...state.helperGroupPost,status:'sent',serverAckVerified:true};
 state.outbox.push({kind:'text',text:`Your approved board was posted to ${target.name}. Check every role in the group image. Reply TABLE here to check the saved roles.`});await save();return true;
}
module.exports={acceptHelperChat,checkGroup,verifyMembership,approvedImage,connectGroup,postGroup};
