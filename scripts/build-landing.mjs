import {mkdir,rm,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {homedir} from 'node:os';
import {join} from 'node:path';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),web=new URL('web/',root);
let number=process.env.HELPER_PILOT_NUMBER;
if(!number){
 try{number=JSON.parse(await readFile(join(homedir(),'.hermes','the-helper','pilot-link.json'),'utf8')).number;}
 catch{throw Error('Configure the helper pilot contact privately before building the public page.');}
}
if(typeof number!=='string'||! /^[1-9]\d{7,14}$/.test(number))throw Error('The pilot contact must be a valid international WhatsApp number.');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
let html=await readFile(new URL('index.html',web),'utf8');
if(!html.includes('{{HELPER_WHATSAPP_URL}}'))throw Error('The pilot link placeholder is missing.');
html=html.replaceAll('{{HELPER_WHATSAPP_URL}}',`https://wa.me/${number}?text=START`);
for(const asset of ['style.css','main.js']){
 const data=await readFile(new URL(asset,web));const hash=createHash('sha256').update(data).digest('hex').slice(0,12);
 const name=asset.replace('.',`.${hash}.`);await writeFile(new URL(name,dist),data);html=html.replace(`./${asset}`,`./${name}`);
}
await writeFile(new URL('index.html',dist),html);
await copyFile(new URL('mark.svg',web),new URL('mark.svg',dist));
await copyFile(new URL('assets/fonts/InterVariable.ttf',root),new URL('InterVariable.ttf',dist));
await copyFile(new URL('assets/fonts/Inter-LICENSE.txt',root),new URL('Inter-LICENSE.txt',dist));
console.log('Built the public information page. Only explicit web assets were copied.');

const convexUrl=process.env.VITE_CONVEX_URL||'https://neat-hound-892.convex.cloud';
if(!/^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(convexUrl))throw Error('Expected a public Convex deployment URL.');
const compiled=await build({entryPoints:[new URL('admin.jsx',web).pathname],bundle:true,write:false,minify:true,format:'esm',define:{__ADMIN_CONVEX_URL__:JSON.stringify(convexUrl),'process.env.NODE_ENV':'"production"'}});
const js=compiled.outputFiles[0].contents,css=await readFile(new URL('admin.css',web));
const jsName='admin.'+createHash('sha256').update(js).digest('hex').slice(0,12)+'.js',cssName='admin.'+createHash('sha256').update(css).digest('hex').slice(0,12)+'.css';
const adminHtml=(await readFile(new URL('admin.html',web),'utf8')).replace('./admin.js','./'+jsName).replace('./admin.css','./'+cssName);
await writeFile(new URL(jsName,dist),js);await writeFile(new URL(cssName,dist),css);await writeFile(new URL('admin.html',dist),adminHtml);

// Public discovery bridges root hosting to the mounted authentication routes.
const siteUrl=convexUrl.replace('.convex.cloud','.convex.site');
await mkdir(new URL('.well-known/',dist),{recursive:true});
await writeFile(new URL('.well-known/openid-configuration',dist),JSON.stringify({issuer:siteUrl,jwks_uri:siteUrl+'/api/.well-known/jwks.json',authorization_endpoint:siteUrl+'/oauth/authorize'}));
