const {renderTable}=require('./role-board.cjs');
const choices='APPROVE · EDIT · TABLE · CANCEL';
function setupQuestion(s){
 return {roles:'Hi! I’ll help prepare and update your club’s role board.\n\nWhich roles are already filled?\nFor example: Speaker 1: Ada Finch; Timer: Mira Vale.\nSend OPEN to start with all roles open.',club:'What is your club’s name?',number:'What is the meeting number? For example: 42.',day:'What day does your club usually meet? For example: Sunday.',time:'What time does the meeting start? For example: 11:00 AM (India time).',venue:'Where does your club meet? Send the venue or online meeting location.\nI’ll save it for future boards; you can change it later through EDIT.',reminder:'When should I remind you each week? For example: Monday 19:00 (India time).',post:'What time should I post board updates? For example: 8:10 PM (India time).'}[s.stage];
}
function settings(s){return `Club: ${s.meeting.club}\nMeeting: ${s.meetingDay||s.meeting.date}, ${s.meeting.time}\nVenue: ${s.meeting.venue||'Not set — change it through EDIT'}\nWeekly reminder: ${s.reminderInput||'Not set'}\nBoard updates: ${s.postingTime||'8:00 PM'} India time, through the day before the meeting.`;}
function status(s){return `${s.meeting.club}\n${s.groupLink?.connected?'Group connected.':'Your setup is saved. Connect your group when ready.'}\nVenue: ${s.meeting.venue||'Not set'}\nBoard updates: ${s.postingTime||'8:00 PM'} India time.\n\nTABLE · EDIT · HELP`;}
function help(s){
 if(s.setupPaused)return 'Your setup is paused and saved. Send START to continue.';
 if(['sample','final'].includes(s.stage))return `Check the latest preview. APPROVE continues, EDIT makes corrections, TABLE shows the roles, and CANCEL pauses setup.\n\n${choices}`;
 if(s.stage!=='complete')return `${setupQuestion(s)}\n\nCANCEL pauses setup. START resumes your saved answers.`;
 return 'START — prepare a fresh meeting board with all roles open\nTABLE — view current roles\nEDIT — change roles or Venue, then approve the new preview\nCONNECT GROUP Group name — connect your club group\nPOST BOARD — confirm the first approved board post\n\nMember replies update your board at your saved posting time. Unclear requests come here privately.';
}
function editInstructions(s){return 'Current role board\n'+renderTable(s.memberLive?.board||s.board)+`\n\nVenue: ${s.meeting.venue||'Not set'}\nSend corrections, for example Timer: Mira Vale or Venue: Cedar Hall.\nI’ll show a new preview before changing the group board.\n\n${choices}`;}
module.exports={choices,setupQuestion,settings,status,help,editInstructions};
