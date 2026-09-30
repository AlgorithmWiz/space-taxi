import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const base=process.env.SPACE_TAXI_URL||'http://localhost:5188';
const dir=process.env.SPACE_TAXI_URL?'test-results/challenge-public':'test-results/challenge';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/?debug=1');await page.waitForFunction(()=>window.spaceTaxi&&!spaceTaxi.snapshot().sceneLoading);await page.click('#start-button');await page.waitForFunction(()=>!spaceTaxi.snapshot().sceneLoading);
 await page.selectOption('#debug-level','19');await page.waitForFunction(()=>!spaceTaxi.snapshot().sceneLoading);
 await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>spaceTaxi.snapshot().speedGateOpen,{},{timeout:20000});await page.keyboard.up('ArrowUp');
 const gate=await page.evaluate(()=>spaceTaxi.snapshot());assert.equal(gate.lives,3);assert(gate.y>5);await page.screenshot({path:`${dir}/speed-gate.png`});
 await page.setViewportSize({width:390,height:844});await page.selectOption('#debug-level','23');await page.waitForFunction(()=>!spaceTaxi.snapshot().sceneLoading);
 await page.screenshot({path:`${dir}/moving-mobile.png`});
 await page.goto(base+'/tests/models.html');await page.waitForFunction(()=>window.fixture);await page.evaluate(()=>{fixture.render=false;fixture.level(17);fixture.world.update(.5,0,fixture.flight,false);});
 await page.waitForFunction(()=>!Object.values(fixture.modelStatus).includes('loading'));
 const maze=await page.evaluate(()=>{const {flight:f,world:w}=fixture;Object.assign(f,{x:-16,y:-10.14,landed:1});f.service(f.level.pads[0],1);w.update(.5,0,f,false);return {outbound:w.terrainOutbound.visible,return:w.terrainReturn.visible,terrain:f.terrain.length,portals:f.level.portals.length};});
 assert.deepEqual(maze,{outbound:false,return:true,terrain:4,portals:0});await page.screenshot({path:`${dir}/maze-return-mobile.png`});
 assert.deepEqual(errors,[]);await fs.writeFile(`${dir}/checks.json`,JSON.stringify({gate,maze,errors},null,2));console.log(JSON.stringify({gateOpened:gate.speedGateOpen,maze,errors}));
}finally{await browser.close();}
