const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sendPostConfirmation,POSTED_MESSAGE}=require('../src/post-confirmation.cjs');
const secretaryId='15550000001@s.whatsapp.net';
function setup(){
 const state={secretaryId,groupPost:{status:'sent',deliveryReceiptVerified:true}};
 const sends=[],saves=[];
 const socket={sendMessage:async(destination,payload)=>{sends.push({destination,payload});return {key:{id:'fictional-confirmation',remoteJid:destination,fromMe:true},message:{conversation:payload.text}};}};
 const acknowledgements={wait:async id=>assert.equal(id,'fictional-confirmation')};
 const save=async s=>saves.push(JSON.parse(JSON.stringify(s)));
 return {state,secretaryId,socket,acknowledgements,save,sends,saves};
}
test('confirmed posting sends one private review request and completed reruns send nothing',async()=>{
 const input=setup();await sendPostConfirmation(input);
 assert.deepEqual(input.sends,[{destination:secretaryId,payload:{text:POSTED_MESSAGE}}]);
 assert.match(POSTED_MESSAGE,/edits are required/);
 assert.equal(input.state.groupPost.secretaryConfirmation.serverAckVerified,true);
 await sendPostConfirmation(input);assert.equal(input.sends.length,1);
});
test('unverified group delivery and a different Secretary cannot get a success message',async()=>{
 for(const fault of ['delivery','identity']){
  const input=setup();if(fault==='delivery')input.state.groupPost.deliveryReceiptVerified=false;else input.secretaryId='15550000002@s.whatsapp.net';
  await assert.rejects(sendPostConfirmation(input),/verified group post/);assert.equal(input.sends.length,0);
 }
});
test('a saved confirmation receipt can be checked again without resending',async()=>{
 const input=setup();input.acknowledgements.wait=async()=>{throw Error('Missing receipt');};
 await assert.rejects(sendPostConfirmation(input),/Missing receipt/);
 assert.equal(input.state.groupPost.secretaryConfirmation.status,'sending');
 input.acknowledgements.wait=async()=>{};await sendPostConfirmation(input);
 assert.equal(input.sends.length,1);assert.equal(input.state.groupPost.secretaryConfirmation.status,'sent');
});
test('an uncertain send without a receipt is not automatically duplicated',async()=>{
 const input=setup();input.state.groupPost.secretaryConfirmation={status:'sending'};
 await assert.rejects(sendPostConfirmation(input),/uncertain/);assert.equal(input.sends.length,0);
});
