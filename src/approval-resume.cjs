function assertApprovalSource({saved,currentHash,secretaryId,targetGroupId,receipt}) {
  if (saved) {
    const sameIdentity=saved.secretaryId===secretaryId && saved.targetGroupId===targetGroupId;
    const approved=saved.status==='approved' && saved.approvedBoardHash===currentHash &&
      saved.flowVerified===true && saved.finalReplyServerAckVerified===true;
    const previewed=saved.previewReceipt?.sha256===currentHash && saved.lastPreviewServerAckVerified===true;
    if (sameIdentity && saved.boardHash===currentHash && (approved || previewed)) return;
    throw new Error('The saved board does not have a matching verified preview or approval for this Secretary and group.');
  }
  if (receipt?.phoneConfirmed===true && receipt.sha256===currentHash && receipt.secretaryId===secretaryId) return;
  throw new Error('Confirm the current board preview on the phone before requesting approval.');
}
module.exports={assertApprovalSource};
