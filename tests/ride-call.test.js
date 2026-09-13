import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approachingPickup,rideCallObstructs} from '../src/ride-call.js';
import {padPose} from '../src/environment.js';
test('pickup radio clears the whole descent corridor even with gear retracted',()=>{
  const pose={x:5,y:-5,w:12};
  assert.equal(approachingPickup({x:11,y:1,gear:false},pose),true);
  assert.equal(approachingPickup({x:5,y:-4,landed:1},pose),true);
  assert.equal(approachingPickup({x:20,y:1},pose),false);
  assert.equal(approachingPickup({x:5,y:5},pose),false);
});
test('radio respects taxi clearance and nearby landing decks',()=>{
  const radio={left:30,right:300,top:300,bottom:370};
  const away={left:600,right:650,top:200,bottom:240};
  assert.equal(rideCallObstructs(radio,away,[]),false);
  assert.equal(rideCallObstructs(radio,{left:310,right:350,top:320,bottom:350},[]),true);
  assert.equal(rideCallObstructs(radio,away,[{left:240,right:360,top:360,bottom:430}]),true);
});
test('approach clearance follows the current moving and growing pad pose',()=>{
  const pad={x:0,y:0,w:8,motion:{x:12,speed:1}};
  const pose=padPose(pad,Math.PI/2);
  assert.equal(approachingPickup({x:pose.x,y:pose.y+3},pose),true);
  assert.equal(approachingPickup({x:pose.x+pose.w/2+5,y:pose.y+3},pose),false);
});
