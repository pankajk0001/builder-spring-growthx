const {isDeepStrictEqual:equal}=require('node:util');
const {updateTime}=require('./live-roles.cjs');
const {meetingCutoff}=require('./meeting-cycle.cjs');
const clone=value=>value===undefined?undefined:structuredClone(value);
function syncDraft(state){
 const draft=state.memberEdit,live=state.memberLive;
 if(!draft||!live||draft.send||draft.kind==='new_meeting')return {changed:false,conflicts:[]};
 // Older drafts have no recorded starting board: use their saved approved source
 // conservatively, so an uncertain replacement requires a private choice.
 draft.baseBoard||=clone(state.board);
 const before=clone(draft.board),conflicts=[];
 const roles=new Set([...draft.baseBoard,...draft.board,...live.board].map(r=>r.role));
 for(const role of roles){
  const base=draft.baseBoard.find(r=>r.role===role),wanted=draft.board.find(r=>r.role===role),current=live.board.find(r=>r.role===role);
  if(equal(base,current))continue;
  if(equal(wanted,base)||equal(wanted,current)){
   draft.board=draft.board.filter(r=>r.role!==role);
   if(current)draft.board.push(clone(current));
   draft.baseBoard=draft.baseBoard.filter(r=>r.role!==role);
   if(current)draft.baseBoard.push(clone(current));
  }else conflicts.push({role,current:clone(current),wanted:clone(wanted)});
 }
 // Keep layout order stable after replacing rows.
 const order=[...new Set([...before,...live.board].map(r=>r.role))];
 draft.board.sort((a,b)=>order.indexOf(a.role)-order.indexOf(b.role));
 const changed=!equal(before,draft.board);
 const conflictChanged=!equal(draft.conflicts||[],conflicts);
 draft.conflicts=conflicts;
 if(changed||conflictChanged&&conflicts.length){draft.previewAcknowledged=false;draft.previewReceipt=null;if(draft.stage==='post_ready')draft.stage='preview';}
 return {changed,conflicts};
}
function conflictQuestion(state){
 const c=state.memberEdit?.conflicts?.[0];if(!c)return null;
 const label=r=>!r||r.removed?'removed':r.member||'Open';
 return `${c.role}: your draft says ${label(c.wanted)}, but the current board says ${label(c.current)}. Keep the current role or use your draft? Reply KEEP CURRENT or USE DRAFT. APPROVE after checking the fresh preview; EDIT or CANCEL also work.`;
}
function resolveConflict(state,text){
 const draft=state.memberEdit,c=draft?.conflicts?.[0];
 if(!c||! /^(KEEP CURRENT|USE DRAFT)$/i.test(text.trim()))return false;
 if(/^KEEP CURRENT$/i.test(text.trim())){
  draft.board=draft.board.filter(r=>r.role!==c.role);if(c.current)draft.board.push(clone(c.current));
 }
 draft.baseBoard=draft.baseBoard.filter(r=>r.role!==c.role);if(c.current)draft.baseBoard.push(clone(c.current));
 draft.previewAcknowledged=false;draft.previewReceipt=null;syncDraft(state);return true;
}
function draftReminderDue(state,now){
 const draft=state?.memberEdit,live=state?.memberLive;
 if(!draft||draft.send||draft.stage==='post_ready'||!live||!state.groupLink?.connected)return null;
 const cutoff=draft.kind==='new_meeting'?meetingCutoff(draft.meeting.date,state.postingTime):live.windowEnd;
 const due=updateTime(now,cutoff,state.postingTime);
 if(!due||now<Date.parse(due)-3600000||draft.remindedAt===due)return null;
 return due;
}
module.exports={syncDraft,conflictQuestion,resolveConflict,draftReminderDue};
