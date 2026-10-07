const {nextReminder}=require('./weekly.cjs');
const WEEK=7*86400000;
function queueClubReminder(state,now=Date.now()){
 if(!state?.pilotMode||state.stage!=='complete'||!state.reminder)return false;
 if(!state.reminderDelivery){state.reminderDelivery={nextAt:nextReminder(state.reminder,now)};return true;}
 const due=Date.parse(state.reminderDelivery.nextAt);
 if(!Number.isFinite(due))throw Error('Invalid saved reminder time.');
 if(now<due||state.memberEdit)return false;
 const latest=due+Math.floor((now-due)/WEEK)*WEEK,week=new Date(latest).toISOString();
 state.reminderDelivery.nextAt=new Date(latest+WEEK).toISOString();
 if(state.reminderDelivery.lastWeek!==week){
  state.reminderDelivery.lastWeek=week;
  state.outbox.push({kind:'text',text:`Time to review ${state.meeting.club}’s role board.\nSend TABLE to check it or EDIT to update roles and meeting details.\nSaved venue: ${state.meeting.venue||'Not set — use EDIT to add it'}.\nI’ll show a preview for approval before changing the group board.`});
 }
 return true;
}
module.exports={queueClubReminder};
