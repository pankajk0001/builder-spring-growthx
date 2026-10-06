const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseMeetingDay,meetingCutoff,nextMeetingDate,parseMeetingTime}=require('../src/meeting-cycle.cjs');
test('all seven meeting days are supported and final update is the previous day at 20:00 IST',()=>{
 const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 for(let day=0;day<7;day++){
  assert.equal(parseMeetingDay(days[day]),day);
  const date=nextMeetingDate(day,Date.parse('2026-10-05T13:30:00Z'));
  const cutoff=meetingCutoff(date);const local=new Date(cutoff+330*60000);
  assert.equal(local.getUTCDay(),(day+6)%7);assert.equal(local.getUTCHours(),20);
 }
 assert.equal(nextMeetingDate(0,Date.parse('2026-10-05T13:30:00Z')),'11 October 2026');
 assert.equal(nextMeetingDate(1,Date.parse('2026-10-05T13:30:00Z')),'12 October 2026');
});
test('meeting dates must exist and setup rejects unknown weekdays',()=>{
 assert.throws(()=>parseMeetingDay('Funday'));
 for(const date of ['31 February 2026','tomorrow','2026-99-99'])assert.throws(()=>meetingCutoff(date));
 assert.equal(new Date(meetingCutoff('11 October 2026')).toISOString(),'2026-10-10T14:30:00.000Z');
});
test('usual meeting time accepts 24-hour or AM/PM input and rejects invalid times',()=>{
 assert.equal(parseMeetingTime('14:30'),'2:30 PM');assert.equal(parseMeetingTime('7:15 pm'),'7:15 PM');
 assert.equal(parseMeetingTime('00:00'),'12:00 AM');assert.equal(parseMeetingTime('12:00'),'12:00 PM');
 for(const time of ['25:10','7','2:90 PM','13:00 AM'])assert.throws(()=>parseMeetingTime(time));
});
