const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {checkGroup,connectGroup,postGroup}=require('../src/helper-group-connection.cjs');
const {begin}=require('../src/secretary-setup.cjs'),{renderBoardImage}=require('../src/board-image.cjs');
const target={name:'Test_group',groupId:'123@g.us'},identity={secretaryId:'111@s.whatsapp.net',secretaryLid:'11@lid'},helper={secretaryId:'222@s.whatsapp.net',secretaryLid:'22@lid'};
const metadata={id:target.groupId,subject:'Test_group',participants:[{id:'11@lid'},{id:'22@lid'}]};
function options(){const state=begin(Date.UTC(2026,9,7));const hash=crypto.createHash('sha256').update(renderBoardImage(state).png).digest('hex');Object.assign(state,{stage:'complete',pendingEdits:null,lastPreviewServerAckVerified:true,approvedHash:hash,boardHash:hash,previewReceipt:{sha256:hash,id:'preview'}});return {state,target,identity,helper,socket:{groupMetadata:async()=>metadata},save:async()=>{}};}
test('only exact Test_group with both helper and Secretary memberships is accepted',()=>{
 checkGroup(metadata,target,identity,helper);
 for(const change of [{subject:'Real club'},{id:'456@g.us'},{participants:[{id:'11@lid'}]},{participants:[{id:'22@lid'}]}])assert.throws(()=>checkGroup({...metadata,...change},target,identity,helper));
});
test('connection and exact approved board post are saved once across restart',async()=>{
 const o=options();let sends=0;assert.equal(await connectGroup(o),true);assert.equal(await connectGroup(o),false);
 o.sendImage=async(_sock,_target,png)=>{sends++;return {id:'post',sha256:crypto.createHash('sha256').update(png).digest('hex')};};o.acknowledgements={wait:async id=>assert.equal(id,'post')};
 assert.equal(await postGroup(o),true);o.state=JSON.parse(JSON.stringify(o.state));assert.equal(await postGroup(o),false);assert.equal(sends,1);assert.equal(o.state.helperGroupPost.serverAckVerified,true);
});
test('changed boards, unconnected groups and uncertain sends are refused',async()=>{
 const o=options();await assert.rejects(postGroup(o),/CONNECT/);await connectGroup(o);
 o.state.board[0].member='Ada Example';await assert.rejects(postGroup(o),/differs/);o.state.board[0].member=null;
 o.state.helperGroupPost={status:'sending'};await assert.rejects(postGroup(o),/uncertain/);
});
test('group receipts remain available while unrelated chats stay ignored',()=>{
 const {acceptHelperChat}=require('../src/helper-group-connection.cjs');
 assert.equal(acceptHelperChat(target.groupId,{...identity,targetGroupId:target.groupId}),true);
 assert.equal(acceptHelperChat(identity.secretaryId,identity),true);
 assert.equal(acceptHelperChat('999@g.us',{...identity,targetGroupId:target.groupId}),false);
 assert.equal(acceptHelperChat('999@s.whatsapp.net',identity),false);
});
