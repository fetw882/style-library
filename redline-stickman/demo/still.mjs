import { chromium } from 'playwright-core';import path from 'path';import fs from 'fs';
const dir=path.dirname(new URL(import.meta.url).pathname);const exe=process.env.CHROME||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].find(f=>fs.existsSync(f));
const b=await chromium.launch({executablePath:exe});const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.error('ERR',e.message));
await p.goto('file://'+path.join(dir,'index.html'));await p.waitForFunction(()=>window.READY);
const out=process.argv[2]||'chk';fs.mkdirSync(path.join(dir,out),{recursive:true});
for(const t of process.argv.slice(3).map(Number)){await p.evaluate(t=>window.render(t),t);await p.screenshot({path:path.join(dir,out,`f_${t}.jpg`),type:'jpeg',quality:90})}
await b.close();
