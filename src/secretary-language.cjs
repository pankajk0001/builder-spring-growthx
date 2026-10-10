const {memberKey}=require('./role-uniqueness.cjs');
const {ROLES}=require('./secretary-setup.cjs');
const {editBoard}=require('./board-edit.cjs');
const RETRY='[ask the secretary to try again in few minutes]';
const QUESTION='What would you like to change on the role board?';
const boardOf=s=>s?.memberEdit?.board||s?.memberLive?.board||s?.board||ROLES.map(role=>({role,member:null}));
function exactFormat(text,s){
 if(/^(START|EDIT|TABLE|APPROVE|CANCEL|HELP|OPEN|KEEP CURRENT|USE DRAFT|nothing to correct|give me the role board|POST (?:TEST )?BOARD|CONNECT (?:TEST )?GROUP(?:\s+.+)?)[.!]?$/i.test(text.trim()))return true;
 if(text.split(/[;\n]+/).every(line=>/^\s*[^:]+:\s*[^:]+\s*$/.test(line)))return true;
 return s&&!['roles','sample','final','complete'].includes(s.stage);
}
async function translateSecretary(s,message,interpret){
 message={...message,text:message.text.trim().replace(/^([*_~`]+)([\s\S]*?)\1$/,'$2').trim()};
 if(exactFormat(message.text,s))return {text:message.text};
 const board=boardOf(s),context={stage:s?.stage||'new',editing:!!s?.memberEdit,previewReady:!!(s?.memberEdit?.previewAcknowledged||s?.lastPreviewServerAckVerified),postingTime:s?.postingTime||null};
 // Established formats remain authoritative even if AI interpretation differs.
 if(exactFormat(message.text,s))return {text:message.text};
 const pending=s?.secretaryQuestion;
 if(pending&&/^(yes|yes please|confirm|do it)[.!]?$/i.test(message.text.trim())){
  if(pending.board!==JSON.stringify(board)||(pending.liveBoard!==undefined&&pending.liveBoard!==JSON.stringify(s?.memberLive?.board||null)))return {question:'The board has changed. What would you like to change now?',clearPending:true};
  return {text:pending.text,edit:true,clearPending:true,replacements:pending.remaining||[],questionAfter:pending.questionAfter};
 }
 if(pending&&/^(no|no thanks)[.!]?$/i.test(message.text.trim()))return {question:'Okay, I kept the board as it is.',clearPending:true};
 let result;
 try{result=await interpret(board,[{id:'secretary-live-'+message.id,sender:'Secretary',text:message.text}],context);}
 catch{return {question:RETRY};}
 // A combined approval/time request cannot silently become immediate APPROVE.
 const requestedTime=/\bpost\b.*\bat\s+(\d{1,2}(?::\d{2})?)/i.exec(message.text);
 if(requestedTime)return {question:/\b(?:am|pm)\b/i.test(message.text)?'Do you want to change the saved posting time?':`Do you mean ${requestedTime[1]} AM or ${requestedTime[1]} PM?`};
 const d=result?.decision;
 if(!d||!Number.isFinite(d.confidence)||d.confidence<0.9)return {question:QUESTION};
 if(d.action==='edits'){
  if(!Array.isArray(d.edits)||!d.edits.length||d.edits.length>10)return {question:QUESTION};
  const clear=[],replacements=[],roles=new Set();
  for(const e of d.edits){
   const row=board.find(r=>r.role===e.role&&!r.removed);
   if(!row||roles.has(e.role)||!['set','remove'].includes(e.operation)||typeof e.member!=='string'||!e.member.trim()||e.member.length>120||/[\n\r;:]/.test(e.member)||!message.text.toLowerCase().includes(e.member.toLowerCase()))return {question:QUESTION};
   roles.add(e.role);
   if(e.operation==='remove'&&memberKey(row.member||'')!==memberKey(e.member))return {question:QUESTION};
   const text=e.role+': '+(e.operation==='remove'?'Open':e.member);
   if(e.operation==='set'&&row.member&&memberKey(row.member)!==memberKey(e.member))replacements.push({text,role:e.role,member:e.member});else clear.push(text);
  }
  try{editBoard({board:structuredClone(board),meeting:s?.meeting||{}},clear.concat(replacements.map(e=>e.text)).join('; '),{testOnly:false});}catch{return {question:QUESTION};}
  const questionAfter=typeof d.question==='string'&&d.question.length<=180&&d.question.endsWith('?')&&(d.question.match(/\?/g)||[]).length===1?d.question:undefined;
  if(clear.length)return {text:clear.join('; '),edit:true,replacements,questionAfter};
  return replacementQuestion(s,replacements,questionAfter);
 }
 if(d.action==='clarify')return {question:typeof d.question==='string'&&d.question.length<=180&&d.question.trim().endsWith('?')&&(d.question.match(/\?/g)||[]).length===1?d.question:QUESTION};
 if(d.action==='command'&&['START','EDIT','TABLE','HELP','CANCEL','APPROVE','POST BOARD'].includes(d.command)){
  if(['APPROVE','POST BOARD'].includes(d.command)&&(!/\b(approve|approved|looks good|post|publish|go ahead)\b/i.test(message.text)||/\b(don['’]t|do not|not|maybe|if)\b/i.test(message.text)))return {question:QUESTION};
  return {text:d.command};
 }
 if(d.action!=='edit'||!['set','remove'].includes(d.operation))return {question:QUESTION};
 const row=board.find(r=>r.role===d.role&&!r.removed);
 if(!row)return {question:'Which role would you like to change?'};
 const safeName=n=>typeof n==='string'&&n.trim().length>0&&n.length<=120&&!/[\n\r;:]/.test(n);
 if(!safeName(d.member)||!message.text.toLowerCase().includes(d.member.toLowerCase()))return {question:'Who should hold that role?'};
 if(d.operation==='remove'&&(!row.member||memberKey(row.member)!==memberKey(d.member)))return {question:`${row.role} is ${row.member?'held by '+row.member:'open'}. Which role should I clear?`};
 const text=row.role+': '+(d.operation==='remove'?'Open':d.member);
 if(d.operation==='set'&&row.member&&memberKey(row.member)!==memberKey(d.member))return {question:`Do you want ${d.member} as ${row.role}, replacing ${row.member}?`,pending:{text,board:JSON.stringify(board)}};
 return {text,edit:true,clearPending:true};
}
function replacementQuestion(s,replacements=[],questionAfter){
 const first=replacements[0];if(!first)return questionAfter?{question:questionAfter}:{};
 const row=boardOf(s).find(r=>r.role===first.role);
 return {question:`Do you want ${first.member} as ${first.role}, replacing ${row.member}?`,pending:{text:first.text,board:JSON.stringify(boardOf(s)),liveBoard:JSON.stringify(s?.memberLive?.board||null),remaining:replacements.slice(1),questionAfter}};
}
module.exports={translateSecretary,boardOf,exactFormat,replacementQuestion};
