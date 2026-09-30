import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='test-results/models';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],results={};
page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url())});
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://localhost:5188/tests/models.html');await page.waitForFunction(()=>window.fixture);
results.passengers=[];
for(let i=0;i<6;i++){
 await page.evaluate(i=>{const {flight}=fixture;flight.routeIndex=i;flight.routes=Array.from({length:6},()=>[1,2]);},i);
 await page.waitForFunction(()=>{const p=fixture.world.padObjects.find(p=>p.person.visible)?.person;return p?.userData.modelObject&&p.userData.modelName===fixture.expected()},{},{timeout:60000});
 const sample=await page.evaluate(()=>({name:fixture.expected(),ground:fixture.ground()}));assert(Math.abs(sample.ground)<.001);results.passengers.push(sample);
 await page.evaluate(()=>{const f=fixture.flight;f.landed=1;f.serviceTime=.4;f.time=.4});await page.waitForTimeout(100);
 const walk=await page.evaluate(()=>fixture.ground());assert(Math.abs(walk)<.001);
 await page.evaluate(()=>{fixture.flight.landed=null;fixture.flight.serviceTime=0});
}
for(const [level,names,label] of [[0,['enamel','candy','lollipop'],'candy'],[1,['cloud','lounger','parasol'],'beach'],[16,['radar'],'radio']]){
 await page.evaluate(i=>fixture.level(i),level);
 await page.waitForFunction(names=>names.every(n=>fixture.props().includes(n)),names,{timeout:60000});
 await page.waitForTimeout(200);await page.screenshot({path:`${dir}/${label}.png`});results[label]=await page.evaluate(()=>({props:fixture.props(),render:fixture.world.renderer.info.render}));
}
// Rapid navigation while cached assets attach; shared geometry must remain usable.
await page.evaluate(()=>{for(let i=0;i<8;i++)fixture.level(i%2);fixture.level(0)});
await page.waitForFunction(()=>fixture.props().includes('candy'));
results.afterRestart=await page.evaluate(()=>({props:fixture.props(),render:fixture.world.renderer.info.render}));
await page.goto('http://localhost:5188/?debug=1');await page.waitForFunction(()=>window.spaceTaxi);await page.click('#start-button');
await page.waitForFunction(()=>spaceTaxi.snapshot().importedTaxi&&spaceTaxi.snapshot().importedPassengers.length);
await page.selectOption('#debug-level','1');await page.waitForFunction(()=>spaceTaxi.snapshot().importedProps.includes('lounger'));
await page.screenshot({path:`${dir}/game-beach.png`});results.liveGame=await page.evaluate(()=>spaceTaxi.snapshot());
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.screenshot({path:`${dir}/mobile.png`});
await page.goto('http://localhost:5188/?models=classic');await page.waitForFunction(()=>window.spaceTaxi);await page.click('#start-button');await page.waitForTimeout(200);
results.classic=await page.evaluate(()=>spaceTaxi.snapshot());assert(!results.classic.importedTaxi);assert.equal(results.classic.importedProps.length,0);
results.errors=errors;await fs.writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify(results));await browser.close();
