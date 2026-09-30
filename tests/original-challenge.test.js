import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Flight,SHIP} from '../src/physics.js';
import {LEVELS} from '../src/levels.js';
import {intersectsPolygon,environmentalForce,padPose} from '../src/environment.js';

test('Fast Break rejects a slow approach, arrests a fast crossing, and resets via the side',()=>{
  for(const speed of [2,6]){
    const f=new Flight();f.reset(19);Object.assign(f,{x:0,y:5-SHIP.roof-.015,vy:speed,vx:0,gear:false,landed:null});
    f.step(1/120,{up:true});
    assert.equal(f.lives,3);assert.equal(f.speedGateOpen,speed===6);
    if(speed===2)assert(f.vy<0);else{assert.equal(f.vy,0);assert.equal(f.vx,0);assert(f.y>5);}
    f.x=22;f.y=2;f.step(1/120);assert.equal(f.speedGateOpen,false);
  }
});
test('Fast Break side returns cannot bypass the speed challenge from below',()=>{
  const f=new Flight();f.reset(19);Object.assign(f,{x:22,y:5-SHIP.roof-.015,vy:6,gear:false,landed:null});
  f.step(1/120,{up:true});assert.equal(f.speedGateOpen,false);assert(f.vy<0);assert.equal(f.lives,3);
});
test('Taxi Maze changes its collision passages on pickup and restores them after a crash',()=>{
  const f=new Flight();f.reset(17);const before=f.terrain;
  Object.assign(f,{landed:1,x:-16,y:-11+SHIP.feet});f.service(f.level.pads[0],1);
  assert(f.passenger);assert.notDeepEqual(f.terrain,before);
  assert(!f.terrain.some(t=>intersectsPolygon(f.x,f.y,t)),'pickup cannot grow a wall through the taxi');
  f.crash('test');assert.equal(f.terrain,before);
  assert.equal(f.level.portals.length,0,'return trip must navigate the reconfigured maze');
});
test('Black Hole has radial gravity and Rebound drifts down and right',()=>{
  assert.equal(LEVELS[11].gravity,0);
  const force=environmentalForce(LEVELS[11],8,2,0);assert(force.x<0);assert.equal(force.y,0);
  const f=new Flight();f.reset(20);Object.assign(f,{x:0,y:11,landed:null,gear:false});
  for(let i=0;i<24;i++)f.step(1/120);
  assert(f.vx>0);assert(f.vy<0);assert.equal(f.lives,3);
});
test('a Puzzler delivery changes doors and leaves switches able to change them again',()=>{
  const f=new Flight();f.reset(7);f.service(f.level.pads[0],1);f.service(f.level.pads[1],1);
  assert.equal(f.routeIndex,1);assert(f.switches.size>0);
  const before=[...f.switches];f.x=6;f.y=-.2;f.interact();assert.notDeepEqual([...f.switches],before);
});

test('On The Move alternates stationary docking windows and shared eased chain steps',()=>{
  const pad=LEVELS[23].pads[0];
  assert.equal(padPose(pad,.1).x,padPose(pad,.2).x);
  assert.equal(padPose(pad,.2).vx,0);
  assert.notEqual(padPose(pad,.2).x,padPose(pad,.5).x);
  const t=.42,eps=1e-5,pose=padPose(pad,t);
  const derivative=(padPose(pad,t+eps).x-padPose(pad,t-eps).x)/(2*eps);
  assert(Math.abs(derivative-pose.vx)<1e-5);
});

test('Taxi Maze supports a complete outbound and reconfigured return flight without a crash',()=>{
const f=new Flight();f.reset(17);
function pilot(x,y,landing=false){
 for(let i=0;i<120*60;i++){
  const deploy=landing&&Math.abs(x-f.x)<.3&&Math.abs(f.vx)<.25;
  if(f.landed===null&&f.gear!==deploy)f.toggleGear();
  const vx=Math.max(-3.5,Math.min(3.5,(x-f.x)*1.25)),vy=Math.max(-2.5,Math.min(3.5,(y-f.y)*1.4));
  f.step(1/120,{up:f.vy<vy,right:f.vx<vx-.035,left:f.vx>vx+.035});
  if(f.lives<3)throw Error(`Crash ${x},${y} at ${f.x},${f.y}`);
  if(landing?f.landed===1:Math.abs(f.x-x)<.4&&Math.abs(f.y-y)<.35&&Math.abs(f.vx)<.8&&Math.abs(f.vy)<.8)return;
  if(f.status==='sector-complete')return;
 }
 throw Error(`Timeout ${x},${y}: ${f.x},${f.y}, fuel ${f.fuel}`);
}
for(const [x,y] of [[20,14],[20,7],[-20,7],[-20,1],[20,1],[20,-5],[-20,-5],[-20,-10]])pilot(x,y);
pilot(-16,-9.7);pilot(-16,-10.4,true);for(let i=0;i<120;i++)f.step(1/120);
if(!f.passenger)throw Error('No pickup');
for(const [x,y] of [[20,-10],[20,-5],[-20,-5],[-20,1],[20,1],[20,7],[-20,7],[-20,14],[0,14],[0,16]])pilot(x,y);
assert.equal(f.status,'sector-complete');assert.equal(f.lives,3);assert.equal(f.delivered,1);assert(f.fuel>0);
});
