const {createHash}=require('node:crypto');
const {isSecretaryChat}=require('./approval-inbox.cjs');
const normalize=id=>typeof id==='string'?id.replace(/:\d+(?=@)/,''):null;
function validateIdentity(identity){
 if(!/^\d+@s\.whatsapp\.net$/.test(identity?.secretaryId)||identity.secretaryLid&&!/^\d+@lid$/.test(identity.secretaryLid))throw Error('A verified private WhatsApp identity is required.');
}
function validateRegistry(registry){
 if(registry?.version!==2||!Array.isArray(registry.clubs))throw Error('Invalid saved club records.');
 const ids=new Set(),people=new Set(),groups=new Set();
 for(const club of registry.clubs){
  validateIdentity(club.identity);
  if(typeof club.id!=='string'||!club.id||ids.has(club.id))throw Error('Duplicate club record.');ids.add(club.id);
  for(const person of [club.identity.secretaryId,club.identity.secretaryLid].filter(Boolean)){if(people.has(person))throw Error('A Secretary identity belongs to more than one club.');people.add(person);}
  if(club.target){
   if(!(club.target.testOnly===true||club.target.pilotMode===true&&club.target.secretaryId===club.identity.secretaryId)||!/^\d+(?:-\d+)?@g\.us$/.test(club.target.groupId)||typeof club.target.name!=='string'||!club.target.name.trim())throw Error('A verified test-group destination is required.');
   if(groups.has(club.target.groupId))throw Error('That group already belongs to another Secretary.');groups.add(club.target.groupId);
  }
 }
 return registry;
}
function findSecretary(registry,jid){return registry.clubs.find(club=>isSecretaryChat(jid,club.identity))||null;}
function findGroup(registry,jid){return registry.clubs.find(club=>club.target?.groupId===jid)||null;}
function registerSecretary(registry,identity){
 identity={secretaryId:normalize(identity.secretaryId),secretaryLid:normalize(identity.secretaryLid)};validateIdentity(identity);
 const existing=findSecretary(registry,identity.secretaryId);
 if(existing){if(identity.secretaryLid&&existing.identity.secretaryLid&&identity.secretaryLid!==existing.identity.secretaryLid)throw Error('Secretary identity changed; verify it before continuing.');return existing;}
 if(identity.secretaryLid&&findSecretary(registry,identity.secretaryLid))throw Error('This identity already belongs to another Secretary.');
 const club={id:createHash('sha256').update(identity.secretaryId).digest('hex'),identity,target:null,state:null};registry.clubs.push(club);validateRegistry(registry);return club;
}
function bindTarget(registry,club,target){
 const owner=findGroup(registry,target.groupId);if(owner&&owner!==club)throw Error('That group already belongs to another Secretary. Choose your own test group.');
 if(club.target&&club.target.groupId!==target.groupId)throw Error('This Secretary already has a club group. Changing groups is not enabled in this pilot.');
 const previous=club.target;club.target=structuredClone(target);try{validateRegistry(registry);}catch(e){club.target=previous;throw e;}
}
function migrateLegacy(config,state){const registry={version:2,clubs:[]},club=registerSecretary(registry,config);if(config.targetGroupId)bindTarget(registry,club,{name:config.targetGroupName||'Test_group',groupId:config.targetGroupId,testOnly:true});club.state=state?structuredClone(state):null;return registry;}
module.exports={normalize,validateRegistry,findSecretary,findGroup,registerSecretary,bindTarget,migrateLegacy};
