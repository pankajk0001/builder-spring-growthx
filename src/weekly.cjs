const {randomUUID,createHash}=require('node:crypto');
const {createApprovalRequest,applyApprovalMessage}=require('./approval-flow.cjs');
const {applyPostedEditMessage}=require('./posted-edit.cjs');
const {renderBoardImage}=require('./board-image.cjs');
const {renderTable}=require('./role-board.cjs');
const {DAYS,parseMeetingDay,parseMeetingTime,nextMeetingDate}=require('./meeting-cycle.cjs');
const WEEK=7*86400000, OFFSET=330*60000;
function parseSchedule(text){
 const m=/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+(\d{2}):(\d{2})$/i.exec(text.trim());
 if(!m||+m[2]>23||+m[3]>59)throw Error('Send a day and 24-hour time, like Monday 19:00 (India time).');
 return {day:DAYS.findIndex(day=>day.toLowerCase()===m[1].toLowerCase()),time:m[2]+':'+m[3]};
}
function nextReminder(schedule,now=Date.now()){
 if(!Number.isInteger(schedule.day)||schedule.day<0||schedule.day>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time))throw Error('Invalid reminder schedule.');
 const local=new Date(now+OFFSET),[h,m]=schedule.time.split(':').map(Number);
 let due=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate(),h,m)-OFFSET+((schedule.day-local.getUTCDay()+7)%7)*86400000;
 if(due<=now)due+=WEEK;
 return new Date(due).toISOString();
}
function queueReminder(state,now=Date.now()){
 if(!state.weekly?.schedule||Date.parse(state.weekly.nextAt)>now)return state;
 if(!Number.isFinite(Date.parse(state.weekly.nextAt)))throw Error('Invalid saved reminder time.');
 const due=Date.parse(state.weekly.nextAt)+Math.floor((now-Date.parse(state.weekly.nextAt))/WEEK)*WEEK;
 const week=new Date(due).toISOString();
 const next={...state,weekly:{...state.weekly,nextAt:new Date(due+WEEK).toISOString(),pendingWeek:week},outbox:[...(state.outbox||[])]};
 if(state.weekly.lastReminderWeek!==week){
  next.weekly.lastReminderWeek=week;
  next.outbox.push({kind:'text',text:'It is time to prepare this week’s first role board. Reply START to open a fresh board, then add the speakers. Other roles start open. You will review and approve the image before anything is posted to Test_group.'});
 }
 return next;
}
function startWeeklyBoard(state,now=Date.now()){
 if(!Number.isInteger(state.weekly?.meetingDay))throw Error('Set your meeting day first, for example Sunday.');
 if(!state.weekly.meetingTime)throw Error('Set your usual meeting time first, for example 2:30 PM.');
 if(!state.weekly?.pendingWeek)throw Error('No weekly board is waiting.');
 if(state.weekly.activeWeek===state.weekly.pendingWeek)throw Error('This week’s board is already open. Reply TABLE or EDIT.');
 if(state.status!=='cancelled'&&(state.status!=='approved'||state.groupPost?.status!=='sent'||state.editSession))throw Error('Finish or cancel the current draft before starting the next week.');
 const previous=structuredClone(state);delete previous.weekly;delete previous.outbox;
 const board=state.board.map(row=>{const fresh={...row,member:null};delete fresh.memberId;delete fresh.memberIds;return fresh;});
 const meeting={...state.meeting};
 const due=Date.parse(state.weekly.pendingWeek);
 meeting.date=nextMeetingDate(state.weekly.meetingDay,due);
 meeting.time=parseMeetingTime(state.weekly.meetingTime);
 if(/^\d+$/.test(meeting.number))meeting.number=String(Number(meeting.number)+1);
 const boardHash=createHash('sha256').update(renderBoardImage({board,meeting}).png).digest('hex');
 return {...createApprovalRequest({secretaryId:state.secretaryId,boardHash,requestId:randomUUID(),now}),
  targetGroupId:state.targetGroupId,testOnly:state.testOnly,board,meeting,status:'awaiting_edit',postingMode:'weekly',
  weekly:{...state.weekly,activeWeek:state.weekly.pendingWeek,previousBoard:previous},
  ownIds:state.ownIds||[],processedIds:state.processedIds||[],editListenerStartedAt:state.editListenerStartedAt,
  outbox:[{kind:'text',text:'This week’s fresh board:\n'+renderTable(board)+'\n\nAdd the speakers in one message, for example:\nSpeaker 1: Ada Example\nSpeaker 2: Nora Example\n\nYou can add other pre-filled roles too. Reply PREVIEW to review a board with no speakers assigned yet. Reply CANCEL to keep the previous board.'}]};
}
function applyWeeklyMessage(state,command,now=Date.now()){
 if(command?.chatId!==state.secretaryId||command.senderId!==state.secretaryId||!command.id||typeof command.text!=='string')return {state,reply:null};
 const text=command.text.trim().toLowerCase();
 if(state.processedIds.includes(command.id))return {state,reply:null};
 if(!state.weekly?.schedule){
  try{
   const schedule=parseSchedule(command.text);
   return {state:{...state,weekly:{...state.weekly,schedule,nextAt:nextReminder(schedule,now),meetingDayPromptQueued:true},processedIds:[...state.processedIds,command.id].slice(-300)},
    reply:'Weekly reminder saved: '+command.text.trim()+' India time.\n\nWhich day of the week is your meeting? Send just the day, for example Sunday. Any day works.'};
  }catch(error){return {state:{...state,processedIds:[...state.processedIds,command.id].slice(-300)},reply:error.message};}
 }
 if(!Number.isInteger(state.weekly.meetingDay)){
  try{
   const meetingDay=parseMeetingDay(command.text);
   if(state.weekly.schedule.day===(meetingDay+6)%7&&state.weekly.schedule.time>='20:00')throw Error('That reminder is after the final update cutoff. Send an earlier reminder day and time, then your meeting day. For example Monday 19:00, then Tuesday.');
   return {state:{...state,weekly:{...state.weekly,meetingDay,meetingTimePromptQueued:true},processedIds:[...state.processedIds,command.id].slice(-300)},
    reply:'Meeting day saved: '+DAYS[meetingDay]+'.\n\nWhat time does your meeting usually start? Send a time like 14:30 or 2:30 PM (India time). I will fill the usual day and time on every new weekly board.'};
  }catch(error){
   try{const schedule=parseSchedule(command.text);return {state:{...state,weekly:{...state.weekly,schedule,nextAt:nextReminder(schedule,now)},processedIds:[...state.processedIds,command.id].slice(-300)},reply:'Reminder updated. Now send your meeting day, for example Sunday.'};}
   catch{return {state:{...state,processedIds:[...state.processedIds,command.id].slice(-300)},reply:error.message};}
  }
 }
 if(!state.weekly.meetingTime){
  try{const meetingTime=parseMeetingTime(command.text);return {state:{...state,weekly:{...state.weekly,meetingTime},processedIds:[...state.processedIds,command.id].slice(-300)},
   reply:'Usual meeting saved: '+DAYS[state.weekly.meetingDay]+' at '+meetingTime+' India time. Every new weekly board will use that day and time automatically. EDIT can change a single meeting without changing your usual schedule. Changed boards post at 20:00 through the day before the displayed meeting date; unchanged boards are skipped.'};}
  catch(error){return {state:{...state,processedIds:[...state.processedIds,command.id].slice(-300)},reply:error.message};}
 }
 if(text==='start'){
  try{const fresh=startWeeklyBoard(state,now);const item=fresh.outbox.pop();fresh.processedIds=[...fresh.processedIds,command.id].slice(-300);return {state:fresh,reply:item.text};}
  catch(error){return {state:{...state,processedIds:[...state.processedIds,command.id].slice(-300)},reply:error.message};}
 }
 if(state.postingMode==='weekly'&&!state.groupPost){
  if(text==='cancel'){
   return {state:{...state.weekly.previousBoard,weekly:{...state.weekly,activeWeek:null},ownIds:state.ownIds,processedIds:[...state.processedIds,command.id].slice(-300),outbox:[]},reply:'This weekly draft is cancelled. The previous posted board is kept. Reply START to try again.'};
  }
  if(text==='table')return {state:{...state,processedIds:[...state.processedIds,command.id].slice(-300)},reply:renderTable(state.board)};
  if(text==='preview'&&state.status==='awaiting_edit'){
   if(state.pendingEdits)return {state:{...state,processedIds:[...state.processedIds,command.id].slice(-300)},reply:'Resolve the pending corrections before requesting a preview.'};
   return {state:{...state,status:'awaiting_approval',processedIds:[...state.processedIds,command.id].slice(-300)},preview:true,reply:'Check this weekly board, then reply APPROVE, EDIT or CANCEL.'};
  }
  const result=applyApprovalMessage(state,command,createHash('sha256').update(renderBoardImage(state).png).digest('hex'),now);
  if(result.preview&&result.state.board.some(row=>row.member!==null&&!row.member.endsWith(' Example')))return {state:{...state,processedIds:[...state.processedIds,command.id].slice(-300)},reply:'Use made-up test names ending in Example, such as Speaker 1: Zara Example.'};
  return result;
 }
 return applyPostedEditMessage(state,command,createHash('sha256').update(renderBoardImage(state).png).digest('hex'),now);
}

module.exports={parseSchedule,nextReminder,queueReminder,startWeeklyBoard,applyWeeklyMessage};
