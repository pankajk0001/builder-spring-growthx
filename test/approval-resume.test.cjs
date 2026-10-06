const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assertApprovalSource}=require('../src/approval-resume.cjs');
const current='a'.repeat(64), old='b'.repeat(64);
const identity={secretaryId:'10000000001@s.whatsapp.net',targetGroupId:'10000000002@g.us'};
const saved={...identity,boardHash:current,approvedBoardHash:current,status:'approved',flowVerified:true,finalReplyServerAckVerified:true};
test('a confirmed saved board can start a fresh request despite an outdated sample receipt',()=>{
 assert.doesNotThrow(()=>assertApprovalSource({saved,currentHash:current,...identity,receipt:{sha256:old,phoneConfirmed:true}}));
});
test('a changed saved image or different account or group cannot reuse approval',()=>{
 for(const change of [{boardHash:old},{secretaryId:'10000000003@s.whatsapp.net'},{targetGroupId:'10000000004@g.us'},{approvedBoardHash:old},{finalReplyServerAckVerified:false}]){
  assert.throws(()=>assertApprovalSource({saved:{...saved,...change},currentHash:current,...identity,receipt:{sha256:old,phoneConfirmed:true}}));
 }
});
test('initial sample requires its own matching phone-confirmed preview',()=>{
 const receipt={secretaryId:identity.secretaryId,sha256:current,phoneConfirmed:true};
 assert.doesNotThrow(()=>assertApprovalSource({currentHash:current,...identity,receipt}));
 for(const change of [{phoneConfirmed:false},{sha256:old},{secretaryId:'10000000003@s.whatsapp.net'}])assert.throws(()=>assertApprovalSource({currentHash:current,...identity,receipt:{...receipt,...change}}));
});
