const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {renderBoardImage}=require('./board-image.cjs');
const {assertUniqueRoleHolders}=require('./role-uniqueness.cjs');
function restartSnapshot(state){
 // Match the JSON stored on disk, including omitted fields before a first post.
 return JSON.parse(JSON.stringify({board:state.board,meeting:state.meeting,boardHash:state.boardHash,approvedBoardHash:state.approvedBoardHash,
 status:state.status,postAt:state.postAt,groupPost:state.groupPost,previewReceipt:state.previewReceipt,
 pendingEdits:state.pendingEdits??null,editSession:state.editSession??null,ownIds:state.ownIds}));
}
function verifyRestart(before,state){
 if(!isDeepStrictEqual(before,restartSnapshot(state)))throw Error('The saved board or delivery record changed during restart.');
 assertUniqueRoleHolders(state.board);
 const hash=createHash('sha256').update(renderBoardImage(state).png).digest('hex');
 if(hash!==state.boardHash)throw Error('The restored board image does not match the saved preview.');
 return {boardVerified:true,imageVerified:true,deliveryRecordsUnchanged:true};
}
module.exports={restartSnapshot,verifyRestart};
