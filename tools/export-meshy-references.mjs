import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();page.on('pageerror',e=>console.error(e));
await page.goto('http://127.0.0.1:5174/tools/meshy-reference-renderer.html');await page.waitForFunction(()=>window.ready,{timeout:60000});
const catalog=await page.evaluate(()=>window.catalog);await fs.writeFile('output/meshy-references/catalog.json',JSON.stringify(catalog,null,2));console.log(catalog.map(a=>a.id).join('\n'));
for(let i=0;i<catalog.length;i++){
 const a=catalog[i];await fs.mkdir('output/meshy-references/'+a.id,{recursive:true});
 for(const view of ['three-quarter']){const url=await page.evaluate(({i,view})=>window.renderAsset(i,view),{i,view});await fs.writeFile(`output/meshy-references/${a.id}/${view}.png`,Buffer.from(url.split(',')[1],'base64'));}
 console.log('Rendered',a.id);
}
await browser.close();
