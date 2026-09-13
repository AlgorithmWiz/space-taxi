import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels.js';
import {Flight,SHIP} from '../src/physics.js';
import {hazardPose,levelHazardPose,intersectsRect} from '../src/environment.js';
import {CROSSFIRE_GUNS,crossfireGunPose} from '../src/crossfire.js';

const level=LEVELS[8];
test('Crossfire enters airborne between mirrored three-ledge buildings and a central pedestal',()=>{
  const flight=new Flight();flight.reset(8);
  assert.equal(flight.landed,null);assert.equal(flight.gear,false);
  assert.equal(flight.x,0);assert.ok(flight.y>level.pads[0].y+SHIP.roof);
  for(const [a,b]of[[1,7],[2,6],[3,5]]){
    const left=level.pads.find(p=>p.id===a),right=level.pads.find(p=>p.id===b);
    assert.equal(left.x,-right.x);assert.equal(left.y,right.y);assert.equal(left.w,right.w);
    assert.equal(left.x-left.w/2,-24);assert.equal(right.x+right.w/2,24);
  }
  assert.ok(level.pads.find(p=>p.id===4).w>12);
});

test('both guns fire across the actual central flight zone at six directions and three speeds',()=>{
  const directions=new Set(),speeds=new Set();
  for(const shot of level.hazards){
    directions.add(Math.atan2(shot.vy,shot.vx).toFixed(5));speeds.add(Math.hypot(shot.vx,shot.vy).toFixed(5));
    const crossing=-shot.x/shot.vx;
    assert.ok(crossing>0);const pos=levelHazardPose(shot,shot.startsAt+crossing,level);
    assert.ok(pos.active,'Shots must reach the center instead of being swallowed beneath their own pads');
    assert.ok(Math.abs(pos.x)<1e-8);assert.ok(pos.y>-9&&pos.y<7);
    assert.equal(level.obstacles.some(o=>intersectsRect(pos.x,pos.y,o,shot.radius,shot.radius,shot.radius)),false);
  }
  assert.equal(directions.size,6);assert.equal(speeds.size,3);
});

test('shots start at their visible muzzle, repeat on schedule, and never predate their first launch',()=>{
  for(const shot of level.hazards){
    const gun=CROSSFIRE_GUNS[shot.gun],pose=crossfireGunPose(gun,shot.startsAt+1e-7);
    assert.equal(hazardPose(shot,shot.startsAt-.001).active,false);
    assert.equal(levelHazardPose(shot,shot.startsAt,level).active,true);
    assert.ok(Math.abs(gun.x-Math.sin(pose.angle)*1.8-shot.x)<1e-8);
    assert.ok(Math.abs(gun.y+Math.cos(pose.angle)*1.8-shot.y)<1e-8);
    assert.equal(pose.flash,true);
    const again=hazardPose(shot,shot.startsAt+shot.period+.25),first=hazardPose(shot,shot.startsAt+.25);
    assert.ok(Math.hypot(first.x-again.x,first.y-again.y)<1e-8);
  }
  assert.ok(level.hazards.every(h=>!hazardPose(h,0).active));
});

test('incoming shallow rounds can strike a docked taxi on the exposed ends of pads 2 and 6',()=>{
  for(const padId of [2,6]){
    const pad=level.pads.find(p=>p.id===padId),x=pad.x-Math.sign(pad.x)*2.3;
    const shot=level.hazards.find(h=>Math.sign(h.vx)===Math.sign(pad.x));
    const arrival=shot.startsAt+(x-shot.x)/shot.vx;
    const flight=new Flight();flight.reset(8);flight.invulnerable=0;
    flight.x=x;flight.y=pad.y+SHIP.feet;flight.landed=padId;flight.gear=true;
    flight.dockOffset=x-pad.x;flight.time=arrival-.12;
    for(let frame=0;frame<30&&!flight.crashTime;frame++)flight.step(1/120,{});
    assert.equal(flight.lives,2,`Pad ${padId} must remain exposed from the side`);
    assert.ok(flight.crashTime>0);
  }
});

test('real Crossfire rounds hitting an upper ledge are absorbed for the rest of their cycle',()=>{
  for(const gun of [0,1]){
    const shot=level.hazards.filter(h=>h.gun===gun)[1];
    const x=Math.sign(shot.vx)*15.5,approach=shot.startsAt+(x-shot.x)/shot.vx;
    assert.equal(levelHazardPose(shot,approach,level).active,true);
    const behind=shot.startsAt+(Math.sign(shot.vx)*18-shot.x)/shot.vx;
    assert.equal(hazardPose(shot,behind).active,true);
    for(let time=behind;time<shot.startsAt+shot.period-.01;time+=.025)
      assert.equal(levelHazardPose(shot,time,level).active,false,'An absorbed round cannot emerge through a pad');
  }
});

test('lower ledges and the pedestal provide waiting positions through a complete firing pattern',()=>{
  for(const padId of [3,4,5]){
    const pad=level.pads.find(p=>p.id===padId),flight=new Flight();flight.reset(8);
    flight.x=pad.x;flight.y=pad.y+SHIP.feet;flight.landed=padId;flight.gear=true;flight.invulnerable=0;
    for(let frame=0;frame<120*44;frame++)flight.step(1/120,{});
    assert.equal(flight.lives,3,`Pad ${padId} should offer shelter`);assert.equal(flight.landed,padId);
  }
});

test('a first Crossfire fare is reachable with continuous flight through a gap in the live firing pattern',()=>{
  const flight=new Flight();flight.reset(8);
  const step=(input={})=>{flight.step(1/120,input);assert.equal(flight.lives,3,'The timed route must not crash');};
  function pilot(x,y,done,landing=false){
    for(let frame=0;frame<120*45;frame++){
      const deploy=landing&&Math.abs(x-flight.x)<.3&&Math.abs(flight.vx)<.25;
      if(flight.landed===null&&flight.gear!==deploy)flight.toggleGear();
      const vx=Math.max(-3,Math.min(3,(x-flight.x)*1.25));
      const vy=Math.max(-1.7,Math.min(3.5,(y-flight.y)*1.4));
      step({up:flight.vy<vy,right:flight.vx<vx-.035,left:flight.vx>vx+.035});
      if(done())return;
    }
    assert.fail(`Could not reach ${x}, ${y}`);
  }
  pilot(-21,12,()=>Math.abs(flight.x+21)<.15&&Math.abs(flight.vx)<.2);
  pilot(-21,10.4,()=>flight.landed===1,true);
  // Board, then wait half a second for a clear descent between the ledges.
  for(let frame=0;frame<180;frame++)step();
  assert.equal(flight.passenger,true);
  pilot(-21,12,()=>flight.y>11.8);
  pilot(-13,12,()=>Math.abs(flight.x+13)<.15&&Math.abs(flight.vx)<.2);
  pilot(-13,5,()=>flight.y<5.2&&Math.abs(flight.vy)<.4);
  pilot(-21,4.9,()=>Math.abs(flight.x+21)<.15&&Math.abs(flight.vx)<.2);
  pilot(-21,3.4,()=>flight.landed===2,true);
  for(let frame=0;frame<121;frame++)step();
  assert.equal(flight.delivered,1);assert.ok(flight.fuel>80);
});
