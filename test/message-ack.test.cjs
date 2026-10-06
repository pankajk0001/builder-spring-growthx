const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createMessageAckTracker } = require('../src/message-ack.cjs');
const secretaryId = '15550000001@s.whatsapp.net';
function update(events, status, id = 'fictional-reply', remoteJid = secretaryId) {
  events.emit('messages.update', [{ key: { id, fromMe: true, remoteJid }, update: { status } }]);
}
test('a local send is not verified until a server acknowledgement arrives', async () => {
  const events = new EventEmitter();
  const tracker = createMessageAckTracker(events, { secretaryId }, 1000);
  let done = false;
  const waiting = tracker.wait('fictional-reply').then(() => { done = true; });
  update(events, 1);
  await Promise.resolve();
  assert.equal(done, false);
  update(events, 2);
  await waiting;
  assert.equal(done, true);
});
test('a receipt arriving before the wait is preserved', async () => {
  const events = new EventEmitter();
  const tracker = createMessageAckTracker(events, { secretaryId }, 1000);
  update(events, 3);
  await tracker.wait('fictional-reply');
});
test('an unrelated receipt cannot verify the reply and a missing receipt times out', async () => {
  const events = new EventEmitter();
  const tracker = createMessageAckTracker(events, { secretaryId }, 15);
  update(events, 2, 'fictional-other');
  update(events, 2, 'fictional-reply', '15550000002@s.whatsapp.net');
  await assert.rejects(tracker.wait('fictional-reply'), /not acknowledged/);
});
test('only the explicitly configured test group can acknowledge a board post',async()=>{
 const events=new EventEmitter();
 const targetGroupId='15550000001-123@g.us';
 const tracker=createMessageAckTracker(events,{secretaryId,targetGroupId},1000);
 update(events,2,'fictional-group-image',targetGroupId);
 await tracker.wait('fictional-group-image');
});
test('group delivery uses participant receipts instead of private-chat status events',async()=>{
 const events=new EventEmitter(); const targetGroupId='15550000001-123@g.us';
 const tracker=createMessageAckTracker(events,{secretaryId,targetGroupId},1000);
 events.emit('message-receipt.update',[{key:{id:'fictional-board',fromMe:true,remoteJid:targetGroupId},receipt:{receiptTimestamp:123,userJid:'15550000002@s.whatsapp.net'}}]);
 await tracker.wait('fictional-board');
});
