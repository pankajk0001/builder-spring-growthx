const {isSecretaryChat}=require('./approval-inbox.cjs');
const {renderBoardImage}=require('./board-image.cjs');
const {createHash}=require('node:crypto');
const {sendTestGroupBoard}=require('./preview-delivery.cjs');
function acceptHelperChat(jid,identity){return isSecretaryChat(jid,identity)||(/^\d+(?:-\d+)?@g\.us$/.test(identity.targetGroupId||'')&&jid===identity.targetGroupId);}
function checkGroup(metadata,target,identity,helper){
 if(target.name!=='Test_group'||!/^\d+(?:-\d+)?@g\.us$/.test(target.groupId)||metadata?.id!==target.groupId||metadata.subject!=='Test_group')throw Error('Only the configured Test_group can be connected.');
 const participants=metadata.participants||[];
 const includes=who=>participants.some(p=>[p.id,p.phoneNumber,p.lid].some(id=>isSecretaryChat(id,who)));
 if(!includes(identity))throw Error('The Secretary must be a member of Test_group.');
 if(!includes(helper))throw Error('Add the spare helper number to Test_group first.');
}
function approvedImage(state){
 if(state.stage!=='complete'||state.testOnly!==true||state.pendingEdits||!state.lastPreviewServerAckVerified)throw Error('Finish private setup and approve the final image first.');
 const image=renderBoardImage(state);
 const hash=createHash('sha256').update(image.png).digest('hex');
 if(hash!==state.approvedHash||hash!==state.boardHash||hash!==state.previewReceipt?.sha256)throw Error('The board differs from the approved preview.');
 return {image,hash};
}
async function connectGroup({state,target,identity,helper,socket,save}){
 const {hash}=approvedImage(state);
 checkGroup(await socket.groupMetadata(target.groupId),target,identity,helper);
 if(state.groupLink){if(state.groupLink.groupId!==target.groupId||state.groupLink.approvedHash!==hash)throw Error('The saved group connection does not match this board.');return false;}
 state.groupLink={groupId:target.groupId,approvedHash:hash,connected:true};
 state.outbox.push({kind:'text',text:'The spare helper is connected to Test_group. Your approved board is ready. Reply POST TEST BOARD to send it once now.'});await save();return true;
}
async function postGroup({state,target,identity,helper,socket,acknowledgements,save,sendImage=sendTestGroupBoard}){
 const {image,hash}=approvedImage(state);
 if(state.groupLink?.groupId!==target.groupId||state.groupLink.approvedHash!==hash)throw Error('Reply CONNECT TEST GROUP before posting.');
 if(state.helperGroupPost?.status==='sent')return false;
 if(state.helperGroupPost)throw Error('An earlier group send is uncertain. Check Test_group before recovery; the helper will not resend it.');
 checkGroup(await socket.groupMetadata(target.groupId),target,identity,helper);
 state.helperGroupPost={status:'sending',sha256:hash};await save();
 const receipt=await sendImage(socket,target,image.png,'Role board — approved by the Secretary');
 if(receipt.sha256!==hash||!receipt.id)throw Error('WhatsApp did not confirm the approved image.');
 state.helperGroupPost={...state.helperGroupPost,id:receipt.id};await save();
 await acknowledgements.wait(receipt.id);
 state.helperGroupPost={...state.helperGroupPost,status:'sent',serverAckVerified:true};
 state.outbox.push({kind:'text',text:'Your approved board was posted to Test_group. Check every role in the group image. Reply TABLE here to check the saved roles.'});await save();return true;
}
module.exports={acceptHelperChat,checkGroup,approvedImage,connectGroup,postGroup};
