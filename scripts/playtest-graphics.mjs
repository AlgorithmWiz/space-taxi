import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base=process.env.SPACE_TAXI_URL||'http://localhost:5188';
const dir='test-results/graphics';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],requests=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>{if(r.url().includes('.glb'))requests.push(r.url())});
try{
 await page.goto(base+'/?debug=1&quality=low');await page.waitForFunction(()=>window.spaceTaxi&&!spaceTaxi.snapshot().sceneLoading,{},{timeout:120000});
 const low=await page.evaluate(()=>spaceTaxi.snapshot());assert.equal(low.graphics.samples,0);assert(low.graphics.fxaa);assert(requests.every(url=>url.includes('/assets/models/')));
 await page.click('#graphics-button');await page.selectOption('#graphics-quality','highest');
 requests.length=0;await page.click('#apply-graphics');
 await page.waitForURL('**quality=highest');await page.waitForFunction(()=>window.spaceTaxi&&!spaceTaxi.snapshot().sceneLoading,{},{timeout:240000});
 const highest=await page.evaluate(()=>spaceTaxi.snapshot());assert.equal(highest.graphics.quality,'highest');assert.equal(highest.graphics.samples,4);assert(highest.graphics.fxaa);assert(highest.renderer.triangles>low.renderer.triangles*10);assert(requests.some(url=>url.includes('/meshy_output/')&&url.endsWith('taxi-classic.glb')));assert(!Object.values(highest.models).includes('fallback'));
 await page.screenshot({path:`${dir}/highest-menu.png`});console.log('Highest loaded',highest.renderer.triangles,'triangles');
 // The source taxi still retracts its gear, and its original rigged rider walks.
 await page.click('#start-button');await page.waitForFunction(()=>!spaceTaxi.snapshot().sceneLoading,{},{timeout:120000});await page.keyboard.press('Space');await page.waitForFunction(()=>spaceTaxi.snapshot().landingGearExtension<.1,{},{timeout:30000});
 await page.click('#graphics-button');await page.selectOption('#graphics-quality','balanced');requests.length=0;await page.click('#apply-graphics');await page.waitForURL('**quality=balanced');await page.waitForFunction(()=>window.spaceTaxi&&!spaceTaxi.snapshot().sceneLoading,{},{timeout:120000});
 const balanced=await page.evaluate(()=>spaceTaxi.snapshot());assert.equal(balanced.graphics.samples,2);assert(balanced.graphics.fxaa);assert(requests.every(url=>url.includes('/assets/models/')));assert(balanced.renderer.triangles<highest.renderer.triangles/10);
 await page.setViewportSize({width:390,height:844});await page.click('#graphics-button');await page.screenshot({path:`${dir}/settings-mobile.png`});
 assert.deepEqual(errors,[]);await fs.writeFile(`${dir}/quality-checks.json`,JSON.stringify({low,highest,balanced,errors},null,2));console.log(JSON.stringify({low:low.graphics,highest:highest.graphics,balanced:balanced.graphics,triangles:[low.renderer.triangles,highest.renderer.triangles,balanced.renderer.triangles],errors}));
}finally{await browser.close();}
