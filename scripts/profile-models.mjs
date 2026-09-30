import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>console.log('ERROR',String(e)));await page.goto('http://localhost:5188/tests/models.html');await page.waitForFunction(()=>window.fixture?.world.padObjects[0].person.userData.modelObject);
const result=await page.evaluate(async()=>{
 const {updateModelPassenger}=await import('/src/model-assets.js');const {riderFor}=await import('/src/riders.js');const {world,flight}=fixture,p=world.padObjects[0].person,r=riderFor(0,0);
 const measure=walk=>{const times=[];for(let i=0;i<150;i++){const a=performance.now();updateModelPassenger(p,r,i/60,walk,i/600);times.push(performance.now()-a);}times.sort((a,b)=>a-b);return {median:times[75],p95:times[142]}};
 const idle=measure(0),walking=measure(1);world.renderer.info.autoReset=false;world.renderer.info.reset();world.update(.016,1,flight,false);const render={...world.renderer.info.render},memory={...world.renderer.info.memory};world.renderer.info.autoReset=true;
 return {viewport:[innerWidth,innerHeight],pixelRatio:world.renderer.getPixelRatio(),idle,walking,render,memory};
});console.log(JSON.stringify(result));await fs.mkdir('test-results/local-upgrade',{recursive:true});await fs.writeFile('test-results/local-upgrade/'+(process.argv[2]||'profile')+'.json',JSON.stringify(result,null,2));await browser.close();
