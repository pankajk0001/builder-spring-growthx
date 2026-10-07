const {memberKey}=require('./role-uniqueness.cjs');
const {ROLES}=require('./secretary-setup.cjs');
const RETRY='[ask the secretary to try again in few minutes]';
const QUESTION='What would you like to change on the role board?';
const boardOf=s=>s?.memberEdit?.board||s?.memberLive?.board||s?.board||ROLES.map(role=>({role,member:null}));
function exactFormat(text,s){
 if(/^(START|EDIT|TABLE|APPROVE|CANCEL|HELP|OPEN|nothing to correct|give me the role board|POST (?:TEST )?BOARD|CONNECT (?:TEST )?GROUP(?:\s+.+)?)[.!]?$/i.test(text.trim()))return true;
 if(text.split(/[;\n]+/).every(line=>/^\s*[^:]+:\s*[^:]+\s*$/.test(line)))return true;
 return s&&!['roles','sample','final','complete'].includes(s.stage);
}
async function translateSecretary(s,message,interpret){
 const board=boardOf(s),context={stage:s?.stage||'new',editing:!!s?.memberEdit,previewReady:!!(s?.memberEdit?.previewAcknowledged||s?.lastPreviewServerAckVerified),postingTime:s?.postingTime||null};
 let result;
 try{result=await interpret(board,[{id:'secretary-live-'+message.id,sender:'Secretary',text:message.text}],context);}
 catch{if(exactFormat(message.text,s))return {text:message.text};return {question:RETRY};}
 // Established formats remain authoritative even if AI interpretation differs.
 if(exactFormat(message.text,s))return {text:message.text};
 const pending=s?.secretaryQuestion;
 if(pending&&/^(yes|yes please|confirm|do it)[.!]?$/i.test(message.text.trim())){
  if(pending.board!==JSON.stringify(board))return {question:'The board has changed. What would you like to change now?',clearPending:true};
  return {text:pending.text,edit:true,clearPending:true};
 }
 if(pending&&/^(no|no thanks)[.!]?$/i.test(message.text.trim()))return {question:'Okay, I kept the board as it is.',clearPending:true};
 // A combined approval/time request cannot silently become immediate APPROVE.
 const requestedTime=/\bpost\b.*\bat\s+(\d{1,2}(?::\d{2})?)/i.exec(message.text);
 if(requestedTime)return {question:/\b(?:am|pm)\b/i.test(message.text)?'Do you want to change the saved posting time?':`Do you mean ${requestedTime[1]} AM or ${requestedTime[1]} PM?`};
 const d=result?.decision;
 if(!d||!Number.isFinite(d.confidence)||d.confidence<0.9)return {question:QUESTION};
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
module.exports={translateSecretary,boardOf,exactFormat};
