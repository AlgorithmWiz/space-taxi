import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Flight } from '../src/physics.js';
import { LEVELS } from '../src/levels.js';

const step=(f,input)=>{for(let i=0;i<36;i++)f.step(1/120,input);};
test('all normal and debug starts and respawns deploy gear only when docked on a pad',()=>{
  for(const debug of [false,true])for(let i=0;i<LEVELS.length;i++){
    const f=new Flight(()=>{},{debug});f.reset(i);
    const airborne=!!LEVELS[i].spawn;
    assert.equal(f.gear,!airborne,`${i+1} initial gear`);
    assert.equal(f.landed===null,airborne,`${i+1} initial docking`);
    if(airborne){f.step(1/120,{right:true});assert.notEqual(f.horizontal,0,`${i+1} side thrust available`);}
    f.gear=airborne;f.time=60;f.respawn();
    assert.equal(f.gear,!airborne,`${i+1} respawn gear`);
    assert.equal(f.landed===null,airborne,`${i+1} respawn docking`);
  }
});
test('gear locks left and right thrusters without burning side-thrust fuel in normal, turbo and reversed levels',()=>{
  for(const level of [0,12,18])for(const input of [{left:true},{right:true}]){
    const a=new Flight(),b=new Flight();a.reset(level);b.reset(level);
    for(const f of [a,b])Object.assign(f,{x:-8,y:12,landed:null,vx:0,vy:0,gear:true});
    step(a,input);step(b,{});
    assert.equal(a.vx,b.vx);assert.equal(a.x,b.x);assert.equal(a.fuel,b.fuel);assert.equal(a.horizontal,0);
    a.toggleGear();step(a,input);assert.ok(Math.abs(a.vx)>0);assert.notEqual(a.horizontal,0);
  }
});
test('deploying gear cuts the active side jet immediately while existing drift slows naturally',()=>{
  const f=new Flight();step(f,{right:true});assert.ok(f.vx>0);
  const speed=f.vx;f.toggleGear();assert.equal(f.horizontal,0);
  step(f,{right:true});assert.ok(f.vx>0&&f.vx<speed);
});
test('vertical takeoff remains available with landing gear down',()=>{
  const f=new Flight();f.reset(3);const y=f.y;step(f,{up:true,right:true});
  assert.equal(f.gear,true);assert.equal(f.landed,null);assert.ok(f.y>y);assert.equal(f.horizontal,0);
});
