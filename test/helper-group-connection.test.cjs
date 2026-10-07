const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {checkGroup,connectGroup,postGroup}=require('../src/helper-group-connection.cjs');
const {begin}=require('../src/secretary-setup.cjs'),{renderBoardImage}=require('../src/board-image.cjs');
const target={name:'Test_group',groupId:'123@g.us',testOnly:true},identity={secretaryId:'111@s.whatsapp.net',secretaryLid:'11@lid'},helper={secretaryId:'222@s.whatsapp.net',secretaryLid:'22@lid'};
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
test('removal is checked even after a successful post and preserves the board and posted receipt',async()=>{
 const o=options();await connectGroup(o);o.state.outbox=[];
 o.state.helperGroupPost={status:'sent',id:'already-delivered',sha256:o.state.approvedHash};
 const before=JSON.stringify({board:o.state.board,meeting:o.state.meeting,post:o.state.helperGroupPost});
 o.socket.groupMetadata=async()=>({...metadata,participants:[{id:'11@lid'}]});
 await assert.rejects(postGroup(o),/Add the spare helper number/);
 assert.equal(o.state.groupLink.connected,false);
 assert.equal(JSON.stringify({board:o.state.board,meeting:o.state.meeting,post:o.state.helperGroupPost}),before);
});
test('WhatsApp forbidden response gives a private recovery instruction rather than a raw error',async()=>{
 const o=options();o.socket.groupMetadata=async()=>{throw Object.assign(Error('forbidden'),{output:{statusCode:403}});};
 await assert.rejects(connectGroup(o),/Add the spare helper number to Test_group/);
 assert.equal(o.state.groupLink,undefined);assert.equal(o.state.helperGroupPost,undefined);
});
test('empty membership returned to a removed helper asks to add the helper first',()=>{
 assert.throws(()=>checkGroup({...metadata,participants:[]},target,identity,helper),/Add the spare helper number/);
});

test('a differently named test group still requires the exact private ID and name',()=>{
 const selected={name:'Example Test',groupId:'456@g.us',testOnly:true};
 checkGroup({...metadata,id:selected.groupId,subject:selected.name},selected,identity,helper);
 assert.throws(()=>checkGroup(metadata,selected,identity,helper));
 assert.throws(()=>checkGroup({...metadata,id:selected.groupId,subject:selected.name},{...selected,testOnly:false},identity,helper));
});
