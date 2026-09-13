import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Flight} from '../src/physics.js';
import {LEVELS} from '../src/levels.js';
import {EXIT} from '../src/environment.js';
import {debugEnabled,adjacentDebugLevel} from '../src/debug.js';
import {entryFromFlight} from '../src/highscores.js';
import {checkpoint} from '../src/progress.js';
import {FareWallet} from '../src/wallet.js';

test('debug tools require an explicit debug=1 URL opt-in',()=>{
  for(const search of ['', '?debug', '?debug=0', '?debug=false', '?notdebug=1']) assert.equal(debugEnabled(search),false);
  assert.equal(debugEnabled('?debug=1'),true);
  assert.equal(debugEnabled('?view=scene&debug=1'),true);
});

test('debug navigation can visit every stage, wrap at both ends, and reset transient flight state',()=>{
  const f=new Flight(()=>{},{debug:true});
  assert.equal(f.debugJump(adjacentDebugLevel(0,-1,LEVELS.length)),true);
  assert.equal(f.sector,27);
  assert.equal(f.debugJump(adjacentDebugLevel(f.sector,1,LEVELS.length)),true);
  assert.equal(f.sector,0);
  for(let i=0;i<LEVELS.length;i++){
    Object.assign(f,{crashTime:1,passenger:true,exitOpen:true,status:'won',fuel:0});f.switches.add('a');
    assert.equal(f.debugJump(i),true);assert.equal(f.sector,i);assert.equal(f.level,LEVELS[i]);
    assert.equal(f.status,'playing');assert.equal(f.crashTime,0);assert.equal(f.passenger,false);
    assert.equal(f.exitOpen,false);assert.equal(f.fuel,100);assert.equal(f.switches.size,0);assert.equal(f.debug,true);
  }
});

test('normal play cannot use debug jumps and invalid destinations leave a debug flight unchanged',()=>{
  const normal=new Flight();assert.equal(normal.debugJump(20),false);assert.equal(normal.sector,0);assert.equal(normal.debug,false);
  const f=new Flight(()=>{},{debug:true});f.debugJump(6);const id=f.runId;
  for(const target of [-1,28,NaN,1.5,'4',undefined]){assert.equal(f.debugJump(target),false);assert.equal(f.sector,6);assert.equal(f.runId,id);}
});

test('debug crashes always respawn without game over, including after resets and level changes',()=>{
  const events=[],f=new Flight(e=>events.push(e),{debug:true});
  for(const level of [0,11,24,27]){
    f.debugJump(level);
    for(let crash=0;crash<7;crash++){
      f.crash('Debug collision check');assert.equal(f.lives,3);assert.ok(f.crashTime>0);
      for(let frame=0;f.crashTime>0&&frame<200;frame++)f.step(1/120);
      assert.equal(f.crashTime,0);assert.equal(f.status,'playing');assert.equal(f.debug,true);
    }
  }
  assert.equal(events.filter(e=>e.type==='crash').length,28);
  assert.equal(events.filter(e=>e.type==='respawn').length,28);
  assert.equal(events.some(e=>e.type==='gameover'),false);
  const normal=new Flight();
  for(let i=0;i<3;i++){normal.crash('Normal collision');for(let frame=0;normal.crashTime>0&&frame<200;frame++)normal.step(1/120);}
  assert.equal(normal.lives,0);assert.equal(normal.status,'over');
});

test('debug fares from all 28 stages cannot bank credits, write scores or create campaign checkpoints',()=>{
  let writes=0,fares=0;
  const wallet=new FareWallet({storage:{getItem:()=>null,setItem:()=>writes++}});
  const f=new Flight(e=>{if(e.type==='fare-earned'){fares++;assert.equal(e.debug,true);assert.equal(wallet.credit(e),0);}},{debug:true});
  for(let i=0;i<LEVELS.length;i++){
    f.debugJump(i);f.time=60;
    for(const [pickup,destination] of f.routes){
      f.serviceTime=0;f.service(f.level.pads.find(p=>p.id===pickup),1);
      if(destination===EXIT)f.finishLevel();else{f.serviceTime=0;f.service(f.level.pads.find(p=>p.id===destination),1);}
    }
    if(f.status==='playing')f.finishLevel();
    assert.ok(f.score>0);assert.equal(entryFromFlight(f,'DBG'),null);assert.equal(checkpoint(f),null);
  }
  assert.ok(fares>28);assert.equal(wallet.state.balance,0);assert.equal(wallet.state.receipts.length,0);assert.equal(writes,0);
});
