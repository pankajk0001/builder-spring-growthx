// Recognize explicit assignments only. Uncertain wording remains a correction to clarify.
function sentenceCorrections(board, text) {
 if(text.includes(':')) return [text];
 if(/\b(not|maybe|perhaps|might|could|either|or)\b/i.test(text)) throw Error('That assignment is unclear. Please name one confirmed holder for each role.');
 const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const roles=board.map(row=>row.role).sort((a,b)=>b.length-a.length).map(escape).join('|');
 const role=`(?:${roles})`, verb='(?:(?:is|are)\\s+)?(?:taken by|assigned to|filled by)';
 const boundary=new RegExp(`\\s*(?:,|\\band\\b)\\s*(?=(?:the\\s+)?${role}(?:\\s+roles?)?\\s+${verb}\\s+)`,'i');
 const cleaned=text.trim().replace(/[.!]$/,'');
 const shared=new RegExp(`^(?:the\\s+)?${role}(?:\\s+and\\s+${role})+(?:\\s+roles?)?\\s+${verb}\\s+[^:]+$`,'i').test(cleaned);
 const parts=shared?[cleaned]:cleaned.split(boundary);
 const result=[];
 for(const part of parts){
  const forward=new RegExp(`^(?:the\\s+)?(${role}(?:\\s+and\\s+${role})*)(?:\\s+roles?)?\\s+${verb}\\s+(.+)$`,'i').exec(part.trim());
  const reverse=new RegExp(`^(.+?)\\s+(?:has taken|will take|is taking)\\s+(?:the\\s+)?(${role})(?:\\s+role)?$`,'i').exec(part.trim());
  if(!forward&&!reverse) throw Error('Please name the role and its confirmed holder, like Timer is taken by Noel Example, or Timer: Noel Example.');
  const holder=(forward?forward[2]:reverse[1]).trim();
  if(!/^[\p{L}\p{M}\d'’ .-]+$/u.test(holder)||/\b(and|taken|assigned|filled|by|role)\b/i.test(holder)) throw Error('Please name one confirmed holder for each role, without extra instructions.');
  const selected=forward?forward[1].split(/\s+and\s+/i):[reverse[2]];
  for(const selectedRole of selected){
   const exact=board.find(row=>row.role.toLowerCase()===selectedRole.toLowerCase());
   result.push(`${exact.role}: ${holder}`);
  }
 }
 return result;
}
module.exports={sentenceCorrections};
