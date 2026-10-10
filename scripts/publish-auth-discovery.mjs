// Static hosting treats extensionless files as binary. Correct only this public
// discovery asset after deployment; never change routing or signing keys.
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export async function publishDiscovery(run,request=fetch){
 const path='/.well-known/openid-configuration';
 const asset=run('lib:getByPath',{path});
 if(!asset?.deploymentId)throw Error('Publish the static site before its login discovery.');
 const site='https://neat-hound-892.convex.site';
 const body=JSON.stringify({issuer:site,jwks_uri:site+'/api/.well-known/jwks.json',authorization_endpoint:site+'/oauth/authorize'});
 const url=run('lib:generateUploadUrl',{});
 const upload=await request(url,{method:'POST',headers:{'Content-Type':'application/json'},body});
 if(!upload.ok)throw Error('Could not upload public login discovery.');
 const {storageId}=await upload.json();
 if(!storageId)throw Error('Missing public discovery upload.');
 run('lib:recordAsset',{path,storageId,contentType:'application/json',deploymentId:asset.deploymentId});
 const response=await request(site+path);
 if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Public login discovery is not served as JSON.');
 const discovery=await response.json();
 if(discovery.issuer!==site||discovery.jwks_uri!==site+'/api/.well-known/jwks.json')throw Error('Public login discovery does not match this deployment.');
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const run=(name,args)=>{const output=execFileSync('npx',['convex','run','--prod','--component','staticHosting',name,JSON.stringify(args)],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();return output?JSON.parse(output):null;};
 await publishDiscovery(run);
 console.log('Public login discovery published and verified as JSON.');
}
