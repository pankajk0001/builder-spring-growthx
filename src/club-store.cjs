const {readFile,writeFile,rename,mkdir,chmod}=require('node:fs/promises');
const {dirname}=require('node:path');
const {validateRegistry,migrateLegacy}=require('./multi-club.cjs');
async function loadClubStore(file,config,legacyFile){
 let registry;
 try{registry=validateRegistry(JSON.parse(await readFile(file,'utf8')));}
 catch(error){
  if(error.code!=='ENOENT')throw error;
  let legacy=null;try{legacy=JSON.parse(await readFile(legacyFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  registry=migrateLegacy(config,legacy);
 }
 let pending=Promise.resolve();
 function save(){
  validateRegistry(registry);const snapshot=JSON.stringify(registry,null,2)+'\n';
  const next=pending.then(async()=>{await mkdir(dirname(file),{recursive:true,mode:0o700});await writeFile(file+'.tmp',snapshot,{mode:0o600});await chmod(file+'.tmp',0o600);await rename(file+'.tmp',file);});
  pending=next.catch(()=>{});return next;
 }
 await save();return {registry,save};
}
module.exports={loadClubStore};
