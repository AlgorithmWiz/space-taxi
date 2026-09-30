import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:480,height:480}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://localhost:5188/tests/local-assets.html');await page.waitForFunction(()=>window.ready);
const manifest=JSON.parse(await fs.readFile('assets/models/manifest.json'));const reports=[];
for(const asset of manifest.filter(x=>x.optimizer)){const audit=await page.evaluate(id=>loadLocal(id),asset.id);await page.screenshot({path:'test-results/local-upgrade/'+asset.id+'.png'});reports.push({id:asset.id,...audit});}
await fs.writeFile('test-results/local-upgrade/assets.json',JSON.stringify({reports,errors},null,2));console.log(JSON.stringify({reviewed:reports.length,errors}));await browser.close();
