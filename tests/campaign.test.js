import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, CLASSIC_COUNT, MYSTERY_INDEX, BONUS_START } from '../src/levels.js';
import { Flight, SHIP } from '../src/physics.js';
import { EXIT, padPose, hazardPose, beamSegments, intersectsRect, environmentalForce } from '../src/environment.js';
const advance=(f,s,input={})=>{for(let i=0;i<Math.ceil(s*120);i++)f.step(1/120,input);};

test('catalog contains the 24 original levels, Mystery Screen, and three preserved bonus routes',()=>{
  assert.equal(LEVELS.length,28); assert.equal(LEVELS.filter(l=>l.original).length,24);
  assert.equal(LEVELS[0].name,'Short -n- Sweet'); assert.equal(LEVELS[8].name,'Crossfire'); assert.equal(LEVELS[16].name,'Interference'); assert.equal(LEVELS[23].name,'On The Move');
  assert.equal(LEVELS[MYSTERY_INDEX].name,'Mystery Screen'); assert.equal(LEVELS[BONUS_START].name,'The night shift');
  for(const level of LEVELS){const ids=new Set(level.pads.map(p=>p.id));assert.equal(ids.size,level.pads.length);for(const [a,b] of level.routes){assert.ok(ids.has(a),level.name);assert.ok(b===EXIT||ids.has(b),level.name);assert.notEqual(a,b);}}
});
test('every route can board, pay its fare, and complete without assuming three passengers',()=>{
  for(let index=0;index<LEVELS.length;index++){
    const f=new Flight();f.reset(index);f.time=60;
    for(const [pickup,dest] of f.routes){
      f.serviceTime=0;f.service(f.level.pads.find(p=>p.id===pickup),1);assert.equal(f.passenger,true,f.level.name);
      if(dest===EXIT){assert.equal(f.exitOpen,true);assert.equal(f.targetId,null);f.finishLevel();}
      else {f.serviceTime=0;f.service(f.level.pads.find(p=>p.id===dest),1);assert.equal(f.passenger,false,f.level.name);}
    }
    if(f.status==='playing')f.finishLevel();
    assert.equal(f.delivered,f.routes.length,f.level.name);assert.ok(f.score>250);
    assert.equal(f.status,index===24||index===27?'won':'sector-complete');
  }
});
test('every pad has clear touchdown space outside solid scenery',()=>{
  const failures=[];
  for(const level of LEVELS)for(const pad of level.pads){
    const pose=padPose(pad,60);let valid=false;
    for(let x=pose.x-pose.w/2+1.1;x<=pose.x+pose.w/2-1.1;x+=.15){
      const y=pose.y+SHIP.feet+.04;
      if(level.obstacles.some(o=>intersectsRect(x,y,o)))continue;
      if(level.pads.some(other=>{if(other===pad)return false;const q=padPose(other,60);return q.active&&intersectsRect(x,y,{x:q.x,y:q.y-(other.depth||.64)/2,w:q.w,h:other.depth||.64});}))continue;
      valid=true;break;
    }
    if(!valid)failures.push(`${level.number} ${level.name}: pad ${pad.id}`);
  }
  assert.deepEqual(failures,[]);
});
test('portal travel carries passenger and fuel, with a cooldown preventing loops',()=>{
  const f=new Flight();f.reset(6);f.landed=null;f.passenger=true;f.fuel=70;f.portalCooldown=0;f.x=-18;f.y=9;
  f.interact();assert.equal(f.x,-18);assert.equal(f.y,-4);assert.equal(f.passenger,true);assert.equal(f.fuel,70);
  f.interact();assert.equal(f.y,-4);assert.ok(f.portalCooldown>0);
});
test('puzzle switches toggle matching doors once per contact',()=>{
  const f=new Flight();f.reset(7);f.x=6;f.y=5.2;f.interact();assert.ok(f.switches.has('a'));assert.ok(f.switches.has('b'));
  f.interact();assert.ok(f.switches.has('a'));f.x=0;f.interact();f.x=6;f.interact();assert.equal(f.switches.has('a'),false);
  assert.equal(beamSegments(f.level.beams[0],0,new Set(['a'])).length,0);
});
test('magnet gravity, black-hole attraction, reversed controls and turbo thrust affect flight',()=>{
  const m=new Flight();m.reset(10);m.x=-8;m.y=1;m.landed=null;advance(m,.2);assert.ok(m.vy>0);
  const force=environmentalForce(LEVELS[11],8,2,0);assert.ok(force.x<0);assert.equal(force.y,0);
  const r=new Flight();r.reset(18);r.toggleGear();advance(r,.15,{down:true,left:true});assert.ok(r.vy>0);assert.ok(r.vx>0);
  const a=new Flight();a.reset(BONUS_START);a.x=-12;a.y=8;a.landed=null;const b=new Flight();b.reset(12);
  advance(a,.15,{up:true});advance(b,.15,{up:true});assert.ok(b.vy>a.vy);
});
test('electrical gaps move, laser cycles open, and curtains reset',()=>{
  const beam=LEVELS[14].beams[0];assert.notDeepEqual(beamSegments(beam,0),beamSegments(beam,4));
  const laser=LEVELS[22].beams[0];assert.equal(beamSegments(laser,0).length,1);assert.equal(beamSegments(laser,5).length,0);
  const f=new Flight();f.reset(19);assert.ok(beamSegments(f.level.beams[0],20).length);f.time=20;f.x=0;f.y=-1;f.interact();assert.equal(beamSegments(f.level.beams[0],20,f.switches,f.resetTime).length,0);
});
test('beanstalk grows nine pads and rewards the quick first pickup',()=>{
  assert.equal(LEVELS[4].pads.filter(p=>padPose(p,0).active).length,1);assert.equal(LEVELS[4].pads.filter(p=>padPose(p,40).active).length,9);
  const f=new Flight();f.reset(4);f.time=5;f.service(f.level.pads[0],1);assert.equal(f.route[1],EXIT);assert.equal(f.exitOpen,true);
});
test('moving pads carry a docked taxi and use relative touchdown speed',()=>{
  const f=new Flight();f.reset(23);const start=f.x;advance(f,.5);assert.notEqual(f.x,start);assert.equal(f.landed,1);
  const q=padPose(f.level.pads[0],f.time);assert.ok(Math.abs(f.x-q.x)<.001);
  f.landed=null;f.serviceTime=0;f.x=q.x;f.y=q.y+SHIP.feet+.01;f.vx=q.vx;f.vy=-1;advance(f,.05);assert.equal(f.landed,1);assert.equal(f.lives,3);
});
test('rebound orbs deflect the taxi without taking a life; bombs can hit docked taxis',()=>{
  const f=new Flight();f.reset(20);f.invulnerable=0;const h=hazardPose(f.level.hazards[0],0);f.x=h.x;f.y=h.y;f.vx=3;f.checkDanger();assert.equal(f.lives,3);assert.ok(f.vx<0);assert.ok(f.bounceCooldown>0);
  const g=new Flight();g.reset(8);g.invulnerable=0;g.x=-22;g.y=-11;assert.equal(g.checkDanger(),true);assert.equal(g.lives,2);
});
test('exit passenger returns to pickup after a crash and can reopen the gate',()=>{
  const f=new Flight();f.service(f.level.pads[0],1);assert.equal(f.exitOpen,true);f.crash('test');assert.equal(f.exitOpen,false);assert.equal(f.passenger,false);assert.equal(f.targetId,1);
});

test('the first classic level is completable using continuous thrust, landing, and exit flight',()=>{
  const f=new Flight();
  function pilot(x,y,done,landing=false){
    for(let i=0;i<120*45;i++){
      const deploy=landing&&Math.abs(x-f.x)<.3&&Math.abs(f.vx)<.25;
      if(f.landed===null&&f.gear!==deploy)f.toggleGear();
      const vx=Math.max(-3,Math.min(3,(x-f.x)*1.25));
      const vy=Math.max(-1.7,Math.min(3.5,(y-f.y)*1.4));
      f.step(1/120,{up:f.vy<vy,right:f.vx<vx-.035,left:f.vx>vx+.035});
      assert.equal(f.lives,3,'The continuous flight must not crash');
      if(done())return;
    }
    assert.fail(`Could not reach ${x},${y}`);
  }
  pilot(-5,-9.4,()=>f.landed===1,true); advance(f,1);
  assert.equal(f.passenger,true); assert.equal(f.exitOpen,true);
  pilot(0,16,()=>f.status==='sector-complete');
  assert.equal(f.delivered,1); assert.ok(f.score>600); assert.ok(f.fuel>0);
});

test('bonus delivery observers see an open exit before the final route disappears',()=>{
  let f;
  f=new Flight(event=>{
    if(event.type==='delivery')assert.ok(f.route || f.exitOpen,'HUD must have a route or an exit');
  });
  f.reset(BONUS_START);
  for(const [from,to] of f.routes){f.serviceTime=0;f.service(f.level.pads.find(p=>p.id===from),1);f.serviceTime=0;f.service(f.level.pads.find(p=>p.id===to),1);}
  assert.equal(f.exitOpen,true);assert.equal(f.passenger,false);
});
