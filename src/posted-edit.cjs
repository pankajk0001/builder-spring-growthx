const { applyApprovalMessage } = require('./approval-flow.cjs');
function applyPostedEditMessage(state, message, hash, now = Date.now()) {
 if (message?.chatId !== state.secretaryId || message.senderId !== state.secretaryId || !message.id || typeof message.text !== 'string' || state.processedIds.includes(message.id)) return {state,reply:null};
 const command=message.text.trim().toLowerCase();
 if (command === 'table') {
  const { renderTable } = require('./role-board.cjs');
  return { state: { ...state, processedIds: [...state.processedIds, message.id].slice(-300) },
   reply: 'Role board — table view\n' + renderTable(state.board) + '\n\n' +
    (state.status === 'awaiting_edit' ? 'Send your corrections together, one per line or separated by semicolons. I will return one updated image preview.' :
     'Reply EDIT to change roles. Then send corrections together, one per line or separated by semicolons; I will return one updated image preview.') +
    '\nExamples: Timer: Zara Example; Listener: Finn Example\nSpeaker 2: Remove hides its speaker/evaluator pair and renumbers the remaining pairs. Only APPROVE posts a corrected board.' };
 }

 if (!state.editSession) {
  if(state.status!=='approved' || state.groupPost?.status!=='sent' || !state.groupPost.deliveryReceiptVerified || command!=='edit') return {state,reply:null};
  const result=applyApprovalMessage({...state,status:'awaiting_approval'},message,hash,now);
  if(result.state.status!=='awaiting_edit') return result;
  const original={...state};delete original.outbox;delete original.ownIds;
  return {...result,state:{...result.state,editSession:{original}}};
 }
 if(command==='cancel') {
  return {state:{...state.editSession.original,ownIds:state.ownIds,outbox:[],startedAt:state.startedAt,
   processedIds:[...state.processedIds,message.id].slice(-300),editSession:null,pendingEdits:null},
   reply:'Corrections cancelled. The board already posted in Test_group is unchanged.'};
 }
 const result=applyApprovalMessage(state,message,hash,now);
 if(result.preview) return {...result,reply:`Updated ${result.state.lastEditedField}. Check this new preview, then reply APPROVE to post the corrected board now, EDIT for more changes, TABLE to see the roles as a table, or CANCEL.`};
 if(state.status==='awaiting_approval' && command==='approve' && result.state.status==='awaiting_time') {
  const original=state.editSession.original;
  if(hash===original.groupPost.hash){
   const unchanged={...result.state,status:'approved',approvedBoardHash:hash,approvedAt:original.approvedAt,postAt:original.postAt,
    groupPost:original.groupPost,flowVerified:original.flowVerified,finalReplyServerAckVerified:original.finalReplyServerAckVerified,
    editSession:null,pendingEdits:null};
   if(unchanged.live)unchanged.live={...unchanged.live,board:structuredClone(unchanged.board),publishedBoard:structuredClone(unchanged.board),dirty:false,nextAt:null};
   return {state:unchanged,reply:'The board is unchanged, so I kept its existing post in Test_group.'};
  }
  const corrected={...result.state,status:'approved',approvedBoardHash:hash,approvedAt:new Date(now).toISOString(),postAt:new Date(now).toISOString(),
   flowVerified:false,finalReplyServerAckVerified:false,editSession:null,postingMode:'correction',
   previousTestPosts:[...(state.previousTestPosts||[]),state.editSession.original.groupPost]};
  delete corrected.groupPost;
  return {state:corrected,reply:'Corrected board approved. I will post this exact preview to Test_group now and confirm privately once it is delivered.'};
 }
 return result;
}
module.exports={applyPostedEditMessage};
