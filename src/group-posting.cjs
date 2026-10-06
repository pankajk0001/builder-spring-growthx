function postingDecision(state, target, hash, now = Date.now()) {
 if(target.name !== 'Test_group' || !/^\d+(?:-\d+)?@g\.us$/.test(target.groupId) || state.targetGroupId !== target.groupId || state.testOnly !== true) throw new Error('Only the configured Test_group is allowed.');
 if(state.status !== 'approved' || !state.flowVerified || !state.finalReplyServerAckVerified || state.approvedBoardHash !== hash || state.boardHash !== hash || !Number.isFinite(Date.parse(state.postAt))) throw new Error('The exact board needs completed approval and a valid posting time.');
 if(state.groupPost?.status === 'sent') return 'complete';
 if(state.board) require('./role-uniqueness.cjs').assertUniqueRoleHolders(state.board);
 if(state.groupPost) return 'uncertain';
 return now < Date.parse(state.postAt) ? 'wait' : 'send';
}
module.exports = { postingDecision };
