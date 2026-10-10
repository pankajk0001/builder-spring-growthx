const {test}=require('node:test'),assert=require('node:assert/strict');
test('login discovery upload replaces only its public asset with JSON content type',async()=>{
 const {publishDiscovery}=await import('../scripts/publish-auth-discovery.mjs');
 const calls=[],requests=[];
 const run=(name,args)=>{calls.push({name,args});return name==='lib:getByPath'?{deploymentId:'fictional-deployment'}:name==='lib:generateUploadUrl'?'https://example.com/upload':null;};
 await publishDiscovery(run,async(url,options)=>{requests.push({url,options});return options?Response.json({storageId:'fictional-new-storage'}):Response.json(JSON.parse(requests[0].options.body));});
 assert.deepEqual(calls[2],{name:'lib:recordAsset',args:{path:'/.well-known/openid-configuration',storageId:'fictional-new-storage',contentType:'application/json',deploymentId:'fictional-deployment'}});
 assert.equal(calls.length,3);
});
