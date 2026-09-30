import {chromium} from '/home/pirate/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/home/pirate/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1000,height:700}});await page.goto('http://localhost:5188/');await page.waitForFunction(()=>window.spaceTaxi?.snapshot().importedTaxi);await page.click('#start-button');
const result=await page.evaluate(()=>new Promise(resolve=>{
 const held=new Set();let phase='landing',lastGear=0;const began=performance.now();
 function key(code,on){if(on===held.has(code))return;on?held.add(code):held.delete(code);window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));}
 function tick(){const s=spaceTaxi.snapshot();
  if(s.lives<3||s.status==='sector-complete'||performance.now()-began>110000){for(const code of held)key(code,false);return resolve(s);}
  if(phase==='landing'&&s.passenger)phase='exit';
  const gear=phase==='landing';if(s.gear!==gear&&(s.landed===null)&&performance.now()-lastGear>200){key('Space',true);key('Space',false);lastGear=performance.now();}
  const targetY=phase==='landing'?-9.5:17;
  const vy=phase==='landing'?Math.max(-1.6,Math.min(2,(targetY-s.y)*1.5)):3.6;
  key('ArrowUp',phase==='exit'?(s.landed!==null||s.vy<vy):(s.landed===null&&s.vy<vy));
  const vx=phase==='exit'?Math.max(-2,Math.min(2,-s.x*1.2)):0;
  key('ArrowRight',phase==='exit'&&s.vx<vx-.05);key('ArrowLeft',phase==='exit'&&s.vx>vx+.05);
  requestAnimationFrame(tick);
 }tick();
}));
await fs.writeFile('test-results/models/flight.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.equal(result.status,'sector-complete');assert.equal(result.lives,3);
await page.click('#continue-button');
await page.waitForFunction(()=>spaceTaxi.snapshot().sector===1);
// Pause/resume responds after the first completed fare.
await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>spaceTaxi.snapshot().mode),'paused');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>spaceTaxi.snapshot().mode),'playing');
await browser.close();
