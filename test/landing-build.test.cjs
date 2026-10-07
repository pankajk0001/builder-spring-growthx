const test=require('node:test'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {readFileSync,readdirSync,existsSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
test('published landing build resolves assets and navigation without exposing private project files',()=>{
 execFileSync(process.execPath,['scripts/build-landing.mjs'],{cwd:root});
 const dist=join(root,'dist'),html=readFileSync(join(dist,'index.html'),'utf8');
 const files=readdirSync(dist);
 assert.equal(files.length,6);
 assert.ok(files.every(name=>/^(index\.html|mark\.svg|InterVariable\.ttf|Inter-LICENSE\.txt|style\.[a-f0-9]{12}\.css|main\.[a-f0-9]{12}\.js)$/.test(name)));
 for(const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g))assert.ok(existsSync(join(dist,match[1])),`Missing public asset: ${match[1]}`);
 for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${match[1]}"`),`Missing link target: ${match[1]}`);
 assert.match(html,/See how it works/);assert.match(html,/public onboarding is not open yet/);
});
