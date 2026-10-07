const test=require('node:test'),assert=require('node:assert/strict');
const {queueClubReminder}=require('../src/club-reminders.cjs');
test('each saved club reminder queues one private review message, catches up once and retains its venue',()=>{
 const s={pilotMode:true,stage:'complete',reminder:{day:1,time:'19:00'},meeting:{club:'Cedar Club',venue:'Cedar Hall'},outbox:[]};
 assert.equal(queueClubReminder(s,Date.parse('2026-10-07T12:00:00Z')),true);assert.equal(s.reminderDelivery.nextAt,'2026-10-12T13:30:00.000Z');assert.equal(s.outbox.length,0);
 s.memberEdit={};assert.equal(queueClubReminder(s,Date.parse('2026-10-12T13:30:00Z')),false);s.memberEdit=null;
 assert.equal(queueClubReminder(s,Date.parse('2026-10-12T13:30:00Z')),true);assert.equal(s.outbox.length,1);assert.match(s.outbox[0].text,/Cedar Hall/);assert.equal(queueClubReminder(s,Date.parse('2026-10-12T13:30:01Z')),false);
 s.outbox=[];const restored=JSON.parse(JSON.stringify(s));queueClubReminder(restored,Date.parse('2026-11-02T13:30:00Z'));assert.equal(restored.outbox.length,1);assert.equal(restored.reminderDelivery.nextAt,'2026-11-09T13:30:00.000Z');
});
