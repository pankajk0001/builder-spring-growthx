const test=require('node:test'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {readFileSync,readdirSync,existsSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
test('published landing build resolves assets and navigation without exposing private project files',()=>{
 execFileSync(process.execPath,['scripts/build-landing.mjs'],{cwd:root,env:{...process.env,HELPER_PILOT_NUMBER:'15550000001'}});
 const dist=join(root,'dist'),html=readFileSync(join(dist,'index.html'),'utf8');
 const discovery=JSON.parse(readFileSync(join(dist,'.well-known','openid-configuration'),'utf8'));
 assert.equal(discovery.issuer,'https://neat-hound-892.convex.site');
 assert.equal(discovery.jwks_uri,discovery.issuer+'/api/.well-known/jwks.json');
 const files=readdirSync(dist);
 assert.equal(files.length,10);
 assert.ok(files.every(name=>/^(\.well-known|index\.html|admin\.html|admin\.[a-f0-9]{12}\.(?:js|css)|mark\.svg|InterVariable\.ttf|Inter-LICENSE\.txt|style\.[a-f0-9]{12}\.css|main\.[a-f0-9]{12}\.js)$/.test(name)));
 for(const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g))assert.ok(existsSync(join(dist,match[1])),`Missing public asset: ${match[1]}`);
 for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${match[1]}"`),`Missing link target: ${match[1]}`);
 assert.match(html,/href="https:\/\/wa\.me\/15550000001\?text=START">Join the pilot/);assert.ok(!html.includes('{{HELPER_WHATSAPP_URL}}'));
 assert.match(html,/See how it works/);assert.match(html,/Real-club onboarding is available in the pilot/);
});
