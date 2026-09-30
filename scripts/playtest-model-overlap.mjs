import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const dir='test-results/model-overlap';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
 for(const mode of ['imported','classic','failed']){
  const page=await browser.newPage({viewport:{width:960,height:640}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  if(mode==='failed')await page.route('**/assets/models/*.glb',route=>route.abort());
  await page.goto(`http://localhost:5188/tests/models.html${mode==='classic'?'?models=classic':''}`);
  await page.waitForFunction(()=>window.fixture);await page.evaluate(()=>fixture.render=false);
  for(const level of [0,1,5,6]){
   await page.evaluate(i=>{fixture.level(i);fixture.flight.time=60;fixture.world.update(.5,60,fixture.flight,false);},level);
   await page.waitForFunction(()=>!Object.values(fixture.modelStatus).includes('loading'),{},{timeout:60000});
   await page.evaluate(()=>fixture.world.update(.016,60,fixture.flight,false));
   const state=await page.evaluate(()=>({
    props:fixture.props(),
    legacyPads:fixture.world.padObjects.map(p=>p.group.getObjectByName('legacy-pad-decorations').visible),
    obstacles:fixture.world.obstacleObjects.map(({group,obstacle})=>({material:obstacle.material,visible:group.visible})),
    wallCount:fixture.world.levelGroup.children.filter(o=>o.name==='solid-jagged-cave'&&o.visible).length,
   }));
   assert(state.legacyPads.every(visible=>visible===(mode!=='imported')));
   if(level===1)assert.equal(state.obstacles.find(o=>o.material==='wood').visible,mode!=='imported');
   if(level===5)assert.equal(state.obstacles.find(o=>o.material==='table').visible,mode!=='imported');
   if(level===6){assert(!state.props.includes('teleportTerrain'));assert.equal(state.wallCount,4);assert(state.obstacles.every(o=>o.visible));}
   if(mode==='imported')await page.screenshot({path:`${dir}/level-${level+1}.png`});
   report.push({mode,level,...state});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 await fs.writeFile(`${dir}/checks.json`,JSON.stringify(report,null,2));console.log('PASS: duplicate visuals hidden after successful loads; classic and failed-load fallbacks retained; all four teleport collision walls visible.');
}finally{await browser.close();}
