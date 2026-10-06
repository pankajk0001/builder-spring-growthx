const {createHash}=require('node:crypto');
const {sendPrivateBoardPreview}=require('./preview-delivery.cjs');
async function deliverPreviewOnce({state,item,socket,secretaryId,png,caption,acknowledgements,save}) {
 const hash=createHash('sha256').update(png).digest('hex');
 if(hash!==state.boardHash)throw Error('The preview does not match the current draft.');
 state.previewDeliveries||={};
 let entry=state.previewDeliveries[hash];
 if(!entry&&state.previewReceipt?.sha256===hash&&state.lastPreviewServerAckVerified){
  entry={status:'sent',receipt:state.previewReceipt};state.previewDeliveries[hash]=entry;
 }
 if(entry&&!entry.receipt?.id)throw Error('An earlier preview send is uncertain; check Secretary chat before retrying.');
 if(!entry){
  entry={status:'sending'};state.previewDeliveries[hash]=entry;await save();
  entry.receipt=await sendPrivateBoardPreview(socket,secretaryId,png,caption);
  state.ownIds||=[];state.ownIds.push(entry.receipt.id);
  state.previewReceipt=entry.receipt;item.sentId=entry.receipt.id;await save();
 }
 state.previewReceipt=entry.receipt;item.sentId=entry.receipt.id;
 if(entry.status!=='sent'){
  await acknowledgements.wait(entry.receipt.id);entry.status='sent';
 }
 state.lastPreviewServerAckVerified=true;await save();
 return entry.receipt.id;
}
module.exports={deliverPreviewOnce};
