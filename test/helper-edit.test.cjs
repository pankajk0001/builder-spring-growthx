const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {begin}=require('../src/secretary-setup.cjs'),{renderBoardImage}=require('../src/board-image.cjs');
const {handleHelperEdit,deliverHelperCorrection}=require('../src/helper-edit.cjs');
const target={name:'Example Test',groupId:'123@g.us',testOnly:true};
function ready(){const s=begin(Date.UTC(2026,9,7));s.stage='complete';s.board.find(r=>r.role==='Timer').member='Mira Example';s.helperGroupPost={status:'sent',id:'original'};s.groupLink={connected:true,groupId:target.groupId};s.memberLive={board:structuredClone(s.board),publishedBoard:structuredClone(s.board),posts:{},inbox:[],seen:[]};s.memberLive.board.find(r=>r.role==='Grammarian').member='Noah Example';s.approvedHash='initial';return s;}
test('EDIT opens the latest live roles table without returning stale setup instructions',()=>{
 const s=ready(),r=handleHelperEdit(s,{id:'edit',text:'edit'},target);assert.equal(r.handled,true);assert.equal(r.state.memberEdit.stage,'editing');assert.match(r.state.outbox[0].text,/Noah Example/);assert.doesNotMatch(r.state.outbox[0].text,/no group posts/);assert.deepEqual(r.state.memberLive,s.memberLive);
});
test('correction requires delivered latest preview, preserves valid lines and can be cancelled',()=>{
 let s=handleHelperEdit(ready(),{id:'edit',text:'EDIT'},target).state;s.outbox=[];
 s=handleHelperEdit(s,{id:'mixed',text:'Listener: Lena Example; Timer: Mira example'},target).state;
 s=handleHelperEdit(s,{id:'fix',text:'Timer: Mira Example'},target).state;assert.equal(s.memberEdit.stage,'preview');assert.equal(s.memberEdit.board.find(r=>r.role==='Listener').member,'Lena Example');
 s=handleHelperEdit(s,{id:'early',text:'APPROVE'},target).state;assert.equal(s.memberEdit.stage,'preview');
 s.memberEdit.previewAcknowledged=true;s.memberEdit.previewReceipt={id:'current'};
 s=handleHelperEdit(s,{id:'old',text:'APPROVE',replyTo:'old'},target).state;assert.equal(s.memberEdit.stage,'preview');
 s=handleHelperEdit(s,{id:'cancel',text:'CANCEL'},target).state;assert.equal(s.memberEdit,null);assert.equal(s.helperGroupPost.id,'original');
});
test('approved correction posts the exact preview once and keeps pending member messages',async()=>{
 let s=handleHelperEdit(ready(),{id:'edit',text:'EDIT'},target).state;s.outbox=[];
 s=handleHelperEdit(s,{id:'change',text:'Listener: Lena Example'},target).state;
 s.memberEdit.previewAcknowledged=true;s.memberEdit.previewReceipt={id:'preview',sha256:s.memberEdit.boardHash};s=handleHelperEdit(s,{id:'approve',text:'APPROVE'},target).state;
 s.memberLive.inbox=[{id:'pending'}];let sends=0;const identity={secretaryId:'111@s.whatsapp.net'},helper={secretaryId:'222@s.whatsapp.net'};
 const options={state:s,target,identity,helper,socket:{groupMetadata:async()=>({id:target.groupId,subject:target.name,participants:[{id:identity.secretaryId},{id:helper.secretaryId}]})},save:async()=>{},acknowledgements:{wait:async()=>{}},sendImage:async(_s,_t,png)=>{sends++;return {id:'corrected',sha256:crypto.createHash('sha256').update(png).digest('hex')};}};
 assert.equal(await deliverHelperCorrection(options),true);assert.equal(s.memberEdit,null);assert.equal(s.memberLive.board.find(r=>r.role==='Grammarian').member,'Noah Example');assert.equal(s.memberLive.inbox.length,1);assert.equal(s.helperGroupPost.id,'corrected');assert.equal(await deliverHelperCorrection(options),false);assert.equal(sends,1);
});
test('preview offers EDIT and reopening it preserves the current correction draft',()=>{
 let s=handleHelperEdit(ready(),{id:'edit',text:'EDIT'},target).state;s.outbox=[];
 s=handleHelperEdit(s,{id:'change',text:'Listener: Lena Example'},target).state;
 assert.match(s.outbox.find(i=>i.kind==='edit-preview').caption,/EDIT/);
 const draftBoard=structuredClone(s.memberEdit.board);
 s.outbox=[];s=handleHelperEdit(s,{id:'again',text:'EDIT'},target).state;
 assert.equal(s.memberEdit.stage,'editing');assert.deepEqual(s.memberEdit.board,draftBoard);assert.match(s.outbox[0].text,/Lena Example/);
});
test('TABLE shows the current draft and matching approval preview with all four options',()=>{
 let s=handleHelperEdit(ready(),{id:'edit',text:'EDIT'},target).state;s.outbox=[];
 s=handleHelperEdit(s,{id:'change',text:'Listener: Lena Example'},target).state;s.outbox=[];
 s=handleHelperEdit(s,{id:'table',text:'TABLE'},target).state;
 assert.match(s.outbox.find(i=>i.kind==='text').text,/Lena Example/);
 for(const option of ['APPROVE','EDIT','CANCEL'])assert.match(s.outbox.find(i=>i.kind==='text').text,new RegExp(option));
 const preview=s.outbox.find(i=>i.kind==='edit-preview');assert.ok(preview);assert.match(preview.caption,/TABLE/);
 assert.equal(s.memberEdit.stage,'preview');assert.equal(s.memberEdit.previewAcknowledged,false);
});
