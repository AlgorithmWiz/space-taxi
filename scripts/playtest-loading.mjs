import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const dir='test-results/loading';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const failure of [false,true]){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('net::ERR_FAILED'))errors.push(m.text());});
  await page.route('**/assets/models/*.glb*',async route=>{if(failure)return route.abort();await new Promise(r=>setTimeout(r,600));await route.continue();});
  const started=Date.now();await page.goto('http://localhost:5188/?debug=1');await page.waitForFunction(()=>window.spaceTaxi);
  assert(await page.locator('#scene-loading').isVisible());
  await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>spaceTaxi.snapshot().time),0);
  await page.waitForFunction(()=>!spaceTaxi.snapshot().sceneLoading,{},{timeout:45000});
  const initialMs=Date.now()-started;
  await page.click('#start-button');await page.waitForFunction(()=>!spaceTaxi.snapshot().sceneLoading);
  const ready=await page.evaluate(()=>spaceTaxi.snapshot());assert.equal(ready.importedTaxi,!failure);if(!failure)assert(ready.importedPassengers.length);
  await page.selectOption('#debug-level','19');
  const loading=await page.evaluate(()=>spaceTaxi.snapshot());
  await page.waitForFunction(()=>!spaceTaxi.snapshot().sceneLoading);
  const prepared=await page.evaluate(()=>spaceTaxi.snapshot());
  assert.equal(prepared.sector,19);assert.equal(prepared.lives,3);assert(prepared.fuel>99.5);
  // Start multiple transitions while preparation is outstanding; the last wins.
  await page.evaluate(()=>{for(const index of [1,6,17]){const select=document.getElementById('debug-level');select.value=String(index);select.dispatchEvent(new Event('change'));}});
  await page.waitForFunction(()=>!spaceTaxi.snapshot().sceneLoading);
  const final=await page.evaluate(()=>spaceTaxi.snapshot());assert.equal(final.sector,17);assert.equal(final.lives,3);
  await page.screenshot({path:`${dir}/${failure?'fallback':'ready'}.png`});
  assert.deepEqual(errors,[]);results.push({failure,initialMs,loadingTime:loading.time,ready:prepared,finalSector:final.sector,errors});await page.close();
 }
 await fs.writeFile(`${dir}/checks.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({failure,initialMs,loadingTime,finalSector,errors})=>({failure,initialMs,loadingTime,finalSector,errors}))));
}finally{await browser.close();}
