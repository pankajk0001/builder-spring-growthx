const {applyControl}=require('./admin-controls.cjs');
const {projectRegistry}=require('./admin-snapshot.cjs');
function createAdminControlClient({config,registry,save,fetch:request=globalThis.fetch,now=Date.now}){
 const snapshotUrl=new URL(config.url);
 if(snapshotUrl.protocol!=='https:'||!snapshotUrl.hostname.endsWith('.convex.site')||!snapshotUrl.pathname.endsWith('/admin/snapshot')||typeof config.secret!=='string'||config.secret.length<32)throw Error('Invalid private admin configuration.');
 const actionsUrl=new URL(snapshotUrl);actionsUrl.pathname=actionsUrl.pathname.replace(/snapshot$/,'actions');
 async function call(url,method,body){const response=await request(url,{method,headers:{authorization:config.secret,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Admin control connection failed.');return response;}
 return {poll:async()=>{
  const response=await call(actionsUrl,'GET');const actions=await response.json();
  if(!Array.isArray(actions)||actions.length>20)throw Error('Invalid admin actions.');
  registry.serviceHealth.controlsCheckedAt=now();try{await save();}catch(error){error.code='ADMIN_STORAGE_FAILED';throw error;}
  for(const action of actions){
   const result=applyControl(registry,action,now());
   try{await save();}catch(error){error.code='ADMIN_STORAGE_FAILED';throw error;}
   // Publish the confirmed state before recording success in the web interface.
   await call(snapshotUrl,'POST',projectRegistry(registry,now()));
   await call(actionsUrl,'POST',{id:result.id,status:result.status,message:result.message,completedAt:result.at});
  }
 }};
}
module.exports={createAdminControlClient};
