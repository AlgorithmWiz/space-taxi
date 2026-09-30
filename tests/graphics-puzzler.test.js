import {Flight} from '../src/physics.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveQuality} from '../src/graphics-quality.js';
import {HIGH_DETAIL_ASSETS} from '../src/high-detail-assets.js';
import {puzzleLayout,PUZZLE_SWITCHES,puzzleSolvable,shiftPuzzleDoors} from '../src/puzzler.js';

test('quality respects saved preferences, URL overrides, and legacy high links',()=>{
  assert.equal(resolveQuality('','highest'),'highest');assert.equal(resolveQuality('?quality=low','highest'),'low');
  assert.equal(resolveQuality('?quality=high'),'highest');assert.equal(resolveQuality('?quality=typo'),'balanced');
  assert.equal(resolveQuality(),'balanced');
});
test('highest has real source assets for all 36 models and preserves animated passengers',()=>{
  assert.equal(Object.keys(HIGH_DETAIL_ASSETS).length,36);
  for(const [id,path] of Object.entries(HIGH_DETAIL_ASSETS)){
    const fd=fs.openSync(path,'r'),header=Buffer.alloc(20);fs.readSync(fd,header,0,20,0);
    assert.equal(header.toString('ascii',0,4),'glTF',path+' must not be an LFS pointer');
    if(id.startsWith('passenger-')){
      const raw=Buffer.alloc(header.readUInt32LE(12));fs.readSync(fd,raw,0,raw.length,20);
      const model=JSON.parse(raw.toString());assert(model.skins?.length);assert(model.animations?.length);
    }
    fs.closeSync(fd);
  }
});
test('Puzzler has the original eleven doors and five documented switch combinations',()=>{
  const level=puzzleLayout();assert.equal(level.beams.length,11);
  assert.deepEqual(PUZZLE_SWITCHES.map(s=>s.toggles),[
    ['3-left','1-left','1-bottom'],['4-top','1-left','1-bottom'],['1-bottom','2-top','5-right'],
    ['4-right','5-bottom','3-right'],['3-top','3-right','2-left','1-bottom'],
  ]);
  assert.deepEqual(PUZZLE_SWITCHES.map(s=>s.room),[0,0,1,5,3]);
  assert(puzzleSolvable(new Set(),0));
  assert(!puzzleSolvable(new Set(),2),'no internal switch in chamber 2');
  assert(!puzzleSolvable(new Set(),4),'no internal switch in chamber 4');
});
test('delivery reshuffles remain solvable from the occupied chamber across deterministic random trials',()=>{
  let seed=1984;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  const all=new Set(puzzleLayout().beams.map(b=>b.gate));
  for(let room=1;room<=5;room++){
    let flags=all;
    for(let i=0;i<50;i++){
      const next=shiftPuzzleDoors(flags,room,random);assert(puzzleSolvable(next,room));flags=next;
    }
  }
});

test('Puzzler first fare can be flown through the switches and doors without crashing',()=>{
const f=new Flight();f.reset(7);
function pilot(x,y,landing=false,pad=1){
 for(let i=0;i<120*60;i++){
  const deploy=landing&&Math.abs(x-f.x)<.25&&Math.abs(f.vx)<.2;
  if(f.landed===null&&f.gear!==deploy)f.toggleGear();
  const vx=Math.max(-2.5,Math.min(2.5,(x-f.x)*1.25)),vy=Math.max(-2,Math.min(2.5,(y-f.y)*1.4));
  f.step(1/120,{up:f.vy<vy,right:f.vx<vx-.035,left:f.vx>vx+.035});
  if(f.lives<3)throw Error(`Crash target ${x},${y}: ${f.x},${f.y}`);
  if(landing?f.landed===pad:Math.abs(f.x-x)<.2&&Math.abs(f.y-y)<.18&&Math.abs(f.vx)<.4&&Math.abs(f.vy)<.4)return;
 }
 throw Error(`Timeout ${x},${y}: ${f.x},${f.y}`);
}
for(const [x,y] of [[-5,3],[-5,.2],[-5,8],[7,9],[13,9.4],[17,10]])pilot(x,y);
pilot(17,8.6,true);for(let i=0;i<125;i++)f.step(1/120);assert(f.passenger);
for(const [x,y]of [[17,10.2],[22,10.2],[22,5],[17,4.7],[13,5.6],[8,5.6],[8,.3],[17,.3],[17,-7]])pilot(x,y);
pilot(17,-9.9,true,2);for(let i=0;i<125;i++)f.step(1/120);assert.equal(f.delivered,1);assert.equal(f.lives,3);assert(f.fuel>70);

});
