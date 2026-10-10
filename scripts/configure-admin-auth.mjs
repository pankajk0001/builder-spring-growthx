// Run locally after saving Google settings in ignored .env.admin.local.
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {generateKeyPair,exportPKCS8,exportJWK} from 'jose';
const config=JSON.parse(await readFile('.env.admin.local','utf8'));
if(!config.ownerEmail||!config.googleClientId?.endsWith('.apps.googleusercontent.com')||!config.googleClientSecret)throw Error('Complete the private Google configuration first.');
const {privateKey,publicKey}=await generateKeyPair('RS256',{extractable:true});
const values={ADMIN_OWNER_EMAIL:config.ownerEmail,AUTH_GOOGLE_ID:config.googleClientId,AUTH_GOOGLE_SECRET:config.googleClientSecret,SITE_URL:'https://neat-hound-892.convex.site',CUSTOM_AUTH_SITE_URL:'https://neat-hound-892.convex.site/api',JWT_PRIVATE_KEY:(await exportPKCS8(privateKey)).trimEnd().replace(/\n/g,' '),JWKS:JSON.stringify({keys:[{use:'sig',...(await exportJWK(publicKey))}]})};
for(const [name,value] of Object.entries(values)){try{execFileSync('npx',['convex','env','set','--prod',name+'='+value],{stdio:['ignore','ignore','pipe']});}catch{throw Error('Could not configure '+name+'. No secret values were printed.');}}
console.log('Private owner login settings configured. No secrets were printed.');
