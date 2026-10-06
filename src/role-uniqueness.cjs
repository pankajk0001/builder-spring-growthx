const memberKey = name => name.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
function duplicateRoleHolders(board) {
 const holders=new Map();
 for(const row of board){if(!row.member)continue;const key=memberKey(row.member);const entry=holders.get(key)||{member:row.member,roles:[]};entry.roles.push(row.role);holders.set(key,entry);}
 return [...holders.values()].filter(entry=>entry.roles.length>1);
}
function assertUniqueRoleHolders(board) {
 const conflicts=duplicateRoleHolders(board);
 if(conflicts.length) throw Error(conflicts.map(entry=>`${entry.member} is assigned to ${entry.roles.join(' and ')}. Each person can hold only one role; choose a different person or reopen their other role.`).join('\n'));
}
module.exports={duplicateRoleHolders,assertUniqueRoleHolders};
