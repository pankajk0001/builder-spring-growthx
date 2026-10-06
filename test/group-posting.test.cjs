const { test } = require('node:test');
const assert = require('node:assert/strict');
const { postingDecision } = require('../src/group-posting.cjs');
const target = { name: 'Test_group', groupId: '15550000001-123@g.us' };
const state = { testOnly: true, targetGroupId: target.groupId, status: 'approved', flowVerified: true, finalReplyServerAckVerified: true, boardHash: 'abc', approvedBoardHash: 'abc', postAt: '2026-10-08T14:41:00Z' };
test('waits until the approved time and posts only once', () => {
 assert.equal(postingDecision(state,target,'abc',Date.parse('2026-10-08T14:40:00Z')), 'wait');
 assert.equal(postingDecision(state,target,'abc',Date.parse(state.postAt)), 'send');
 assert.equal(postingDecision({...state,groupPost:{status:'sent'}},target,'abc',Date.parse(state.postAt)), 'complete');
 assert.equal(postingDecision({...state,groupPost:{status:'sending'}},target,'abc',Date.parse(state.postAt)), 'uncertain');
});
test('blocks changed boards, unapproved requests and other destinations', () => {
 for(const altered of [{status:'awaiting_approval'},{approvedBoardHash:'other'},{targetGroupId:'other'},{flowVerified:false},{postAt:'invalid'},{testOnly:false}]) {
 assert.throws(()=>postingDecision({...state,...altered},target,'abc',Date.parse(state.postAt)));
 }
 assert.throws(()=>postingDecision(state,{...target,name:'Other_group'},'abc',Date.parse(state.postAt)));
 assert.throws(()=>postingDecision(state,target,'changed',Date.parse(state.postAt)));
});
test('even an approved duplicate-holder board cannot be sent',()=>{
 const board=[{role:'Timer',member:'Zara Example'},{role:'Listener',member:'zara example'}];
 assert.throws(()=>postingDecision({...state,board},target,'abc',Date.parse(state.postAt)),/only one role/);
});
