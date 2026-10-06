const {test}=require('node:test');const assert=require('node:assert/strict');const {createHash}=require('node:crypto');
const {applyPostedEditMessage}=require('../src/posted-edit.cjs');const {renderBoardImage}=require('../src/board-image.cjs');const fixture=require('./fixtures/milestone-3.cjs');
const secretaryId='15550000001@s.whatsapp.net';const now=Date.parse('2026-10-07T00:00:00Z');
function start(){const s={...structuredClone(fixture),secretaryId,status:'approved',processedIds:[],testOnly:true,outbox:[],ownIds:[],groupPost:{status:'sent',deliveryReceiptVerified:true,id:'fictional-old-post'},postAt:'2026-10-06T14:30:00Z',flowVerified:true,finalReplyServerAckVerified:true};s.boardHash=createHash('sha256').update(renderBoardImage(s).png).digest('hex');s.approvedBoardHash=s.boardHash;return s;}
const send=(s,text,id='fictional-'+text)=>applyPostedEditMessage(s,{text,id,chatId:secretaryId,senderId:secretaryId},s.boardHash,now);
test('posted board corrections need a new preview approval and post immediately',()=>{
 let s=start();s=send(s,'EDIT').state;assert.equal(s.status,'awaiting_edit');
 const edited=send(s,'Timer: Zara Example\nListener: Finn Example');assert.equal(edited.preview,true);s=edited.state;
 assert.equal(s.status,'awaiting_approval');assert.equal(s.groupPost.id,'fictional-old-post');
 s.previewReceipt={id:'fictional-new-preview'};
 const approved=send(s,'APPROVE');assert.equal(approved.state.status,'approved');assert.equal(approved.state.postAt,new Date(now).toISOString());
 assert.equal(approved.state.groupPost,undefined);assert.equal(approved.state.approvedBoardHash,s.boardHash);assert.equal(approved.state.previousTestPosts.at(-1).id,'fictional-old-post');
 assert.equal(approved.state.finalReplyServerAckVerified,false);
});
test('cancel after corrections restores the original published board and receipt',()=>{
 const original=start();let s=send(original,'EDIT').state;s=send(s,'Timer: Zara Example').state;
 const cancelled=send(s,'CANCEL');assert.deepEqual(cancelled.state.board,original.board);assert.equal(cancelled.state.boardHash,original.boardHash);assert.deepEqual(cancelled.state.groupPost,original.groupPost);assert.equal(cancelled.state.status,'approved');
});
test('invalid batches keep valid corrections, and an old quoted preview cannot approve',()=>{
 let s=send(start(),'EDIT').state;s=send(s,'Timer: Zara Example\nMeeting time: 25:10').state;assert.equal(s.status,'awaiting_edit');
 const corrected=send(s,'Meeting time: 15:45');assert.equal(corrected.preview,true);s=corrected.state;s.previewReceipt={id:'fictional-current-preview'};
 const stale=applyPostedEditMessage(s,{id:'fictional-stale',chatId:secretaryId,senderId:secretaryId,text:'APPROVE',replyTo:'fictional-old-preview'},s.boardHash,now);
 assert.equal(stale.state.status,'awaiting_approval');assert.match(stale.reply,/latest board preview/);
});
test('other chats, duplicate events and undelivered boards cannot start corrections',()=>{
 const s=start();const other=applyPostedEditMessage(s,{id:'fictional-other',chatId:'15550000002@s.whatsapp.net',senderId:secretaryId,text:'EDIT'},s.boardHash,now);assert.equal(other.reply,null);
 assert.equal(send({...s,groupPost:{status:'sending'}},'EDIT').reply,null);
 const edited=send(s,'EDIT','fictional-edit');assert.equal(send(edited.state,'EDIT','fictional-edit').reply,null);
});
test('a duplicate-holder preview saved by an older version cannot be approved',()=>{
 let s=start();s=send(s,'EDIT').state;s.board.find(r=>r.role==='Timer').member='Noel Example';
 s.status='awaiting_approval';s.boardHash=createHash('sha256').update(renderBoardImage(s).png).digest('hex');
 const result=send(s,'APPROVE');assert.equal(result.state.status,'awaiting_edit');assert.equal(result.state.approvedBoardHash,null);assert.match(result.reply,/TMOD and Timer/);
 assert.equal(result.state.groupPost.id,'fictional-old-post');
});
test('removed speaker pair survives preview approval without becoming Open',()=>{
 let s=send(start(),'EDIT').state;const result=send(s,'Speaker 2: Remove');assert.equal(result.preview,true);s=result.state;
 assert.ok(!renderBoardImage(s).cells.some(c=>['Speaker 3','Evaluator 3'].includes(c.role)));
 const approved=send(s,'APPROVE');assert.equal(approved.state.status,'approved');assert.equal(approved.state.board.find(r=>r.role==='Speaker 3').removed,true);
 const cancelled=send(s,'CANCEL');assert.equal(cancelled.state.board.find(r=>r.role==='Speaker 2').removed,undefined);
});
