import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Flight,SHIP} from '../src/physics.js';
import {LEVELS} from '../src/levels.js';
import {padPose,levelHazardPose,intersectsPolygon,obstaclePose,windAngle} from '../src/environment.js';
const advance=(f,s,input={})=>{for(let i=0;i<s*120;i++)f.step(1/120,input);};

test('shots are absorbed by pad undersides and do not reappear behind the pad',()=>{
  const shot={path:'shot',kind:'cannon',x:0,y:-8,vx:0,vy:8,radius:.2,period:5,duration:4};
  const level={pads:[{id:1,x:0,y:0,w:6}],obstacles:[],hazards:[shot]};
  assert.equal(levelHazardPose(shot,.5,level).active,true);
  for(const time of [1,1.2,2,3.9])assert.equal(levelHazardPose(shot,time,level).active,false);
  assert.equal(levelHazardPose(shot,5.5,level).active,true,'a new firing cycle launches a new shell');
  const f=new Flight();f.level={...f.level,...level};Object.assign(f,{x:0,y:SHIP.feet,landed:1,invulnerable:0});
  advance(f,16);assert.equal(f.lives,3);assert.equal(f.landed,1);
});
test('shots strike pad edges and angled obstacles but an unobstructed shell is still dangerous',()=>{
  const shot={path:'shot',kind:'cannon',x:-10,y:0,vx:10,vy:0,radius:.3,period:5,duration:4};
  const shield={pads:[],obstacles:[{x:0,y:0,w:.4,h:5,angle:.5}]};
  assert.equal(levelHazardPose(shot,.5,shield).active,true);assert.equal(levelHazardPose(shot,1.5,shield).active,false);
  const f=new Flight();f.level={...f.level,pads:[],obstacles:[],hazards:[shot]};Object.assign(f,{time:.5,x:-5,y:-.2,invulnerable:0,landed:null});
  assert.equal(f.checkDanger(),true);assert.equal(f.lives,2);
});
test('each mature beanstalk leaf keeps its position and permits departure while others grow',()=>{
  const level=LEVELS[4];
  for(const pad of level.pads){
    const time=(pad.growAt||0)+2.01,pose=padPose(pad,time),later=padPose(pad,time+15);
    assert.equal(pose.x,later.x);assert.equal(pose.y,later.y);assert.equal(pose.w,later.w);
    const f=new Flight();f.reset(4);Object.assign(f,{time,x:pose.x,y:pose.y+SHIP.feet,landed:pad.id,gear:true,dockOffset:0});
    advance(f,.6,{up:true});assert.equal(f.lives,3,`leaf ${pad.id} takeoff`);assert.equal(f.landed,null);
    f.toggleGear();const targetX=Math.sign(pad.x)*12,targetY=pad.y+2;
    for(let i=0;i<120*4&&Math.abs(f.x)<10.5;i++){
      const vx=Math.max(-3,Math.min(3,targetX-f.x)),vy=Math.max(-1.4,Math.min(2,(targetY-f.y)*1.4));
      f.step(1/120,{up:f.vy<vy,left:f.vx>vx+.03,right:f.vx<vx-.03});
    }
    assert.equal(f.lives,3,`leaf ${pad.id} escape`);assert.ok(Math.abs(f.x)>10.5,`leaf ${pad.id} not trapped`);
  }
});
test('leaves grow out from a fixed stem attachment, with staggered heights',()=>{
  const pads=LEVELS[4].pads;
  for(const pad of pads.slice(1))for(const age of [.1,.8,1.5,2]){
    const pose=padPose(pad,pad.growAt+age);assert.ok(Math.abs(pose.x-Math.sign(pad.x)*pose.w/2-Math.sign(pad.x)*.55)<1e-8);
  }
  for(let i=2;i<pads.length;i++)assert.ok(pads[i].y-pads[i-2].y>=5.5);
  assert.ok(obstaclePose(LEVELS[4].obstacles[0],0).h<obstaclePose(LEVELS[4].obstacles[0],40).h);
});
test('fuel canisters supply one exact refill and stay consumed across crashes',()=>{
  for(const [index,level]of LEVELS.entries())for(const item of level.fuelCanisters){
    const events=[],f=new Flight(e=>events.push(e));f.reset(index);f.landed=item.padId;f.fuel=20;f.score=100;
    f.interact();assert.equal(f.fuel,20+item.amount);assert.equal(f.score,100);assert.ok(f.fuelUsed.has(item.id));
    f.fuel=5;f.interact();assert.equal(f.fuel,5);
    f.crash('test');f.respawn();f.fuel=5;f.landed=item.padId;f.interact();assert.equal(f.fuel,5);
    assert.equal(events.filter(e=>e.type==='fuel-collected').length,1);
    f.loadSector(index);assert.equal(f.fuelUsed.size,0);
  }
});
test('canisters are not wasted on nearly full tanks or collected from remote positions',()=>{
  const f=new Flight();f.reset(3);f.landed='F';f.fuel=99;f.interact();assert.equal(f.fuelUsed.size,0);
  f.landed=null;f.fuel=20;f.x=0;f.y=15;f.interact();assert.equal(f.fuelUsed.size,0);
  assert.ok(LEVELS.filter(l=>l.fuelCanisters.length).length<LEVELS.length/3);
  assert.ok(LEVELS.every(l=>l.pads.every(p=>!p.fuel)));
});
test('Shooting Stars has connected jagged solid terrain, including actual landing ledges',()=>{
  const level=LEVELS[9],rock=level.terrain[0];assert.ok(rock.points.length>60);
  assert.equal(intersectsPolygon(0,0,rock,.1,.1,.1),true,'central rock is solid');
  assert.equal(intersectsPolygon(-19,4,rock,.1,.1,.1),false,'upper left flight space is open');
  assert.equal(intersectsPolygon(-19,-12.9,rock,.1,.1,.1),true,'fuel ledge is solid');
  const f=new Flight();f.reset(9);Object.assign(f,{x:0,y:0,landed:null});f.step(1/120);assert.equal(f.lives,2);
  for(const pad of level.pads){const f=new Flight();f.reset(9);Object.assign(f,{x:pad.x,y:pad.y+SHIP.feet+.03,vy:-.8,gear:true,landed:null,invulnerable:5});advance(f,.1);assert.equal(f.landed,pad.id);assert.equal(f.lives,3);}
});
test('Blizzard uses continuous ground and tree collision follows wind direction',()=>{
  const level=LEVELS[15];assert.ok(level.pads.every(p=>p.kind==='terrain'));assert.equal(level.terrain.length,1);
  const o=level.obstacles[0],a=obstaclePose(o,0),b=obstaclePose(o,2);assert.notEqual(a.x,b.x);assert.equal(b.angle,windAngle(2));
  const base=o.y-o.h/2;assert.ok(Math.abs(b.y-Math.cos(b.angle)*o.h/2-base)<1e-8);
});
