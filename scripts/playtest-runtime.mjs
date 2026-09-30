import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={quality:{},memory:[]},errors=[];
for(const quality of ['high','low']){
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://localhost:5188/tests/models.html?quality='+quality);await page.waitForFunction(()=>window.fixture?.world.padObjects[0].person.userData.modelObject);
 report.quality[quality]=await page.evaluate(async()=>{
  const times=[];let previous=performance.now();for(let i=0;i<70;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>=10)times.push(now-previous);previous=now;}times.sort((a,b)=>a-b);
  return {frameMedian:times[30],frameP95:times[57],bloom:fixture.world.bloom.enabled,pixelRatio:fixture.world.renderer.getPixelRatio(),buffer:[fixture.world.composer.readBuffer.width,fixture.world.composer.readBuffer.height],render:{...fixture.world.renderer.info.render}};
 });await page.close();
}
const p=await browser.newPage({viewport:{width:960,height:640}});p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://localhost:5188/tests/models.html');await p.waitForFunction(()=>window.fixture);await p.evaluate(()=>fixture.render=false);
for(let cycle=0;cycle<3;cycle++){
 for(const level of [7,15,5,0]){
  await p.evaluate(i=>{fixture.level(i);fixture.world.update(.1,20,fixture.flight,false)},level);
  await p.waitForFunction(()=>!Object.values(fixture.modelStatus).includes('loading'));
  await p.evaluate(()=>fixture.world.update(.016,20,fixture.flight,false));
 }
 report.memory.push(await p.evaluate(()=>({cache:fixture.modelCacheInfo(),gpu:{...fixture.world.renderer.info.memory}})));
}
assert(report.memory[2].gpu.geometries<=report.memory[1].gpu.geometries+2);assert(report.memory[2].gpu.textures<=report.memory[1].gpu.textures+2);assert(report.memory.every(m=>m.cache.unused<=6));
await p.emulateMedia({reducedMotion:'reduce'});
report.reducedMotion=await p.evaluate(async()=>{
 const T=await import('/vendor/three/build/three.module.js');fixture.flight.time=1;fixture.world.update(.016,1,fixture.flight,false);const character=fixture.world.padObjects[0].person.userData.modelObject;const hand=character.getObjectByName('LeftHand');const a=character.worldToLocal(hand.getWorldPosition(new T.Vector3()));fixture.flight.time=2;fixture.world.update(.016,2,fixture.flight,false);return a.distanceTo(character.worldToLocal(hand.getWorldPosition(new T.Vector3())));
});assert(report.reducedMotion<.00001);
// Switch levels while uncached GLBs are still downloading.
await p.route('**/assets/models/*.glb*',async r=>{await new Promise(resolve=>setTimeout(resolve,100));await r.continue();});
await p.evaluate(()=>{fixture.level(3);fixture.level(6);fixture.level(1);fixture.world.update(.1,0,fixture.flight,false)});
await p.waitForFunction(()=>!Object.values(fixture.modelStatus).includes('loading'));report.race=await p.evaluate(()=>({level:fixture.world.index,props:fixture.props(),cache:fixture.modelCacheInfo()}));assert.equal(report.race.level,1);assert(report.race.props.includes('lounger'));
await p.close();
const failed=await browser.newPage();await failed.route('**/assets/models/*.glb*',r=>r.abort());await failed.goto('http://localhost:5188/?debug=1');await failed.waitForFunction(()=>window.spaceTaxi?.snapshot().models.taxi==='fallback');await failed.click('#start-button');await failed.selectOption('#debug-level','7');await failed.waitForFunction(()=>spaceTaxi.snapshot().models.crystalSwitch==='fallback');report.fallback=await failed.evaluate(()=>spaceTaxi.snapshot());assert.equal(report.fallback.mode,'playing');assert.equal(report.fallback.importedProps.length,0);
report.errors=errors;assert.deepEqual(errors,[]);await fs.writeFile('test-results/local-upgrade/runtime.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
