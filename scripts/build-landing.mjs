import {mkdir,rm,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),web=new URL('web/',root);
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
let html=await readFile(new URL('index.html',web),'utf8');
for(const asset of ['style.css','main.js']){
 const data=await readFile(new URL(asset,web));const hash=createHash('sha256').update(data).digest('hex').slice(0,12);
 const name=asset.replace('.',`.${hash}.`);await writeFile(new URL(name,dist),data);html=html.replace(`./${asset}`,`./${name}`);
}
await writeFile(new URL('index.html',dist),html);
await copyFile(new URL('mark.svg',web),new URL('mark.svg',dist));
await copyFile(new URL('assets/fonts/InterVariable.ttf',root),new URL('InterVariable.ttf',dist));
await copyFile(new URL('assets/fonts/Inter-LICENSE.txt',root),new URL('Inter-LICENSE.txt',dist));
console.log('Built the public information page. Only explicit web assets were copied.');
