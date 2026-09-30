import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const dir='test-results/local-upgrade';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:640}}),errors=[],report={levels:[]};page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://localhost:5188/tests/models.html');await page.waitForFunction(()=>window.fixture);await page.evaluate(()=>fixture.render=false);
for(let level=0;level<28;level++){
 await page.evaluate(i=>{fixture.level(i);fixture.flight.time=60;fixture.world.update(.5,60,fixture.flight,false)},level);
 await page.waitForFunction(()=>!Object.values(fixture.modelStatus).includes('loading'),{},{timeout:60000});
 await page.evaluate(()=>fixture.world.update(.016,60,fixture.flight,false));
 const result=await page.evaluate(()=>({level:fixture.flight.sector,props:fixture.props(),ground:fixture.ground(),cache:fixture.modelCacheInfo(),render:{...fixture.world.renderer.info.render},memory:{...fixture.world.renderer.info.memory}}));
 if(result.ground!==null)assert(Math.abs(result.ground)<.001,JSON.stringify(result));
 assert(result.cache.unused<=6,JSON.stringify(result.cache));
 report.levels.push(result);await page.screenshot({path:`${dir}/level-${String(level+1).padStart(2,'0')}.png`});console.log('LEVEL',level+1,result.props.join(','));
}
report.motions=[];
for(let i=0;i<6;i++){
 await page.evaluate(i=>{fixture.level(0);fixture.flight.routes=Array.from({length:6},()=>[1,2]);fixture.flight.routeIndex=i;fixture.world.update(.016,0,fixture.flight,false)},i);
 await page.waitForFunction(()=>!Object.values(fixture.modelStatus).includes('loading'),{},{timeout:60000});
 const audit=await page.evaluate(async()=>{
  const T=await import('/vendor/three/build/three.module.js');const {updateModelPassenger}=await import('/src/model-assets.js');const {riderFor}=await import('/src/riders.js');const {world,flight}=fixture;world.update(.016,0,flight,false);const person=world.padObjects[0].person,profile=riderFor(0,flight.routeIndex);let worst=0;
  for(let i=0;i<90;i++){updateModelPassenger(person,profile,i/30,i>=30&&i<60?1:0,i/300);person.updateWorldMatrix(true,true);person.userData.modelObject.updateMatrixWorld(true);worst=Math.max(worst,Math.abs(fixture.ground()));}
  updateModelPassenger(person,profile,7,0,0);const pose=()=>{const hand=person.userData.modelObject.getObjectByName('LeftHand');hand.updateWorldMatrix(true,false);return hand.getWorldPosition(new T.Vector3()).toArray();};
  for(let t=7;t<=8.4;t+=1/60)updateModelPassenger(person,profile,t,0,0);
  const waved=pose();for(let t=8.4;t<14;t+=1/60)updateModelPassenger(person,profile,t,0,0);const rested=pose();
  const held=JSON.stringify(rested);for(let n=0;n<8;n++)updateModelPassenger(person,profile,14,0,0);const paused=pose();
  const focus=()=>{const box=new T.Box3().setFromObject(person.userData.modelObject,true),center=box.getCenter(new T.Vector3());const camera=new T.PerspectiveCamera(32,960/640,.01,100);camera.position.copy(center).add(new T.Vector3(0,.1,5));camera.lookAt(center);world.renderer.render(world.scene,camera);};
  for(let t=14;t<15.4;t+=1/60)updateModelPassenger(person,profile,t,0,0);person.updateMatrixWorld(true);focus();
  return {name:profile.name,worstGroundOffset:worst,waveDistance:new T.Vector3(...waved).distanceTo(new T.Vector3(...rested)),pausedDrift:new T.Vector3(...paused).distanceTo(new T.Vector3(...rested))};
 });
 assert(audit.worstGroundOffset<.001,JSON.stringify(audit));assert(audit.waveDistance>.1,JSON.stringify(audit));assert(audit.pausedDrift<.03,JSON.stringify(audit));report.motions.push(audit);await page.screenshot({path:`${dir}/wave-${audit.name}.png`});
}
report.gear=await page.evaluate(async()=>{
 const T=await import('/vendor/three/build/three.module.js');const {updateModelTaxi}=await import('/src/model-assets.js');const w=fixture.world;w.gearGroup.scale.y=1;updateModelTaxi(w);let box=new T.Box3().setFromObject(w.importedTaxi,true);const deployed=box.min.y;w.gearGroup.scale.y=.15;updateModelTaxi(w);box.setFromObject(w.importedTaxi,true);return {deployed,retracted:box.min.y};
});assert(report.gear.retracted-report.gear.deployed>.1);
await page.goto('http://localhost:5188/');await page.waitForFunction(()=>window.spaceTaxi?.snapshot().importedTaxi);await page.click('#garage-button');assert(await page.locator('#garage-dialog').isVisible());assert.equal(await page.locator('.skin-card img').count(),6);await page.screenshot({path:`${dir}/garage.png`});await page.click('#close-garage');
report.errors=errors;await fs.writeFile(`${dir}/checks.json`,JSON.stringify(report,null,2));assert.deepEqual(errors,[]);console.log('MOTIONS',JSON.stringify(report.motions),'GEAR',JSON.stringify(report.gear));await browser.close();
