import { BONUS_LEVELS } from './bonus-levels.js';
import { EXIT } from './environment.js';
import { shootingStarsTerrain, caveWallOutline, snowGround, umbrellaHull } from './terrain-layouts.js';
import { crossfireShots } from './crossfire.js';
export const CLASSIC_COUNT = 24, MYSTERY_INDEX = 24, BONUS_START = 25;
export const SHIFTS = [
  { name: 'Morning shift', label: '01–08 · FIND YOUR WINGS', start: 0, end: 7 },
  { name: 'Day shift', label: '09–16 · EXPECT THE UNEXPECTED', start: 8, end: 15 },
  { name: 'Night shift', label: '17–24 · EARN YOUR STRIPES', start: 16, end: 23 },
];
const p = (id, x, y, w = 6, extra = {}) => ({ id, x, y, w, name: `Pad ${id}`, kind: 'platform', ...extra });
const f = (x, y, w = 5) => p('F', x, y, w, { name: 'Fuel cache' });
const w = (x, y, width, h, extra = {}) => ({ x, y, w: width, h, kind: 'wall', ...extra });
const circuit = ids => ids.map((id, i) => [id, ids[i + 1] ?? EXIT]);
const towers = () => [p(1,-17,5,12,{kind:'tower',depth:.64}),p(2,-13,-6,7,{kind:'tower',depth:6}),p(3,10,-6,8,{kind:'tower',depth:6}),p(4,-2,-9,10,{kind:'tower',depth:3}),p(5,18,5,10,{kind:'tower',depth:17})];
const classic = (name,theme,hint,pads,extra={}) => ({ name,theme,hint,district:name.toUpperCase(),subtitle:hint,color:'#b9f768',gravity:3.4,wind:0,fuelRate:.72,pads,obstacles:[],hazards:[],beams:[],portals:[],switches:[],fields:[],routes:circuit(pads.filter(p=>p.id!=='F').map(p=>p.id)),...extra });
const originals = [
  classic('Short -n- Sweet','candy','Land at Pad 1. Your first passenger wants to go up.',[p(1,-5,-10,15)],{
    color:'#f7a7d2',spawn:{x:-5,y:1.5},obstacles:[w(14,-3.7,1.3,17,{angle:-.64,material:'candy'})],
  }),
  classic('The Beach','beach','Cloud, lounger, parasol. Three stops with a sea view.',[p(1,-17,10,10,{style:'cloud',depth:1.55}),p(2,-8,-8,20,{style:'lounger',depth:.28}),p(3,12,6,9,{style:'parasol',depth:.18})],{
    color:'#79e3e0',spawn:{x:0,y:7},obstacles:[w(12,-3,.5,17,{material:'pole'}),w(-19.5,-5.7,.7,7,{angle:.48,material:'wood'})],
  }),
  classic('Skyscrapers','city','Five rooftops. Brake before dropping between the towers.',towers(),{color:'#97cbff',spawn:{x:0,y:10}}),
  classic('Taxi Trainer','training','Nine landing tests. Pad F has one +35 fuel canister.',[
    p(1,-18,3,5),p(2,15,-10,6),p(3,-6,11,6),p(4,-1,-5,6),p(5,12,10,6),p(6,20,5,5),p(7,-14,-3,5),p(8,15,-1,8),p(9,-20,-8,6),f(20,-6),
  ],{color:'#80dff2'}),
  classic('Beanstalk','garden','Leaves unfurl alternately up the stalk. A quick pickup finds a shortcut.',
    Array.from({length:9},(_,i)=>p(i+1,(i%2?1:-1)*4.75,-10.5+i*2.8,8.4,{kind:'leaf',depth:.35,...(i?{growAt:8+(i-1)*3.2}:{})})),
  {color:'#b8ef77',spawn:{x:-14,y:9},obstacles:[w(0,0,.8,26,{material:'stem',grows:true})],growing:true,fuelRate:.48}),
  classic('Taxi Pong','pong','The ball crosses the table. Pick your moment to land.',[p(1,-16,-4,7),p(2,15,-4,7),p(3,18,11,10)],{
    color:'#80e6c0',obstacles:[w(0,-5,40,.55,{material:'table'}),w(0,-2.7,.35,3.7,{material:'net'})],
    hazards:[{kind:'pong',path:'bounce',x:0,y:3,range:20,rangeY:5.5,speed:.65,radius:.52}],
  }),
  classic('Teleports','teleport','Matching portals connect the chambers. Fly into a ring.',[p(1,-15,3,8),p(2,-15,-10,8),p(3,16,-10,8),p(4,17,5,8),p(5,13,-2.5,7)],{
    color:'#ba9bff',obstacles:[w(-1,0,1.2,28),w(-13,-.4,21,.9),w(12,-5.6,24,.9),w(12,1.5,24,.9)],
    portals:[{x:-18,y:9,to:1,color:'#b497ff'},{x:-18,y:-4,to:0,color:'#b497ff'},{x:-7,y:-4,to:3,color:'#78e3e6'},{x:7,y:-8,to:2,color:'#78e3e6'},{x:20,y:-8,to:5,color:'#ffb773'},{x:19,y:-.5,to:4,color:'#ffb773'},{x:7,y:-.5,to:7,color:'#f994d0'},{x:8,y:8,to:6,color:'#f994d0'}],
  }),
  classic('Puzzler','puzzle','Touch the glowing switches. Matching doors toggle together.',[p(1,18,6,8),p(2,17,-9,8),p(3,0,-10,8),p(4,-17,-9,8),p(5,-18,6,8)],{
    color:'#dfb5fc',spawn:{x:0,y:7},obstacles:[w(-10.5,8.5,.8,6),w(10.5,8.5,.8,6),w(-17,2.6,14,.8),w(17,2.6,14,.8),w(-10.5,-9,.8,6),w(10.5,-9,.8,6)],
    beams:[{gate:'a',x:10.5,y:4,w:.22,h:4},{gate:'b',x:10.5,y:-3.2,w:.22,h:5.5},{gate:'c',x:0,y:-6,w:20.2,h:.22},{gate:'d',x:-10.5,y:-3.2,w:.22,h:5.5},{gate:'e',x:-10.5,y:4,w:.22,h:4}],
    switches:[{x:6,y:5.5,toggles:['a','b'],label:'A+B'},{x:6,y:-.2,toggles:['b','c'],label:'B+C'},{x:0,y:-2.5,toggles:['c','d'],label:'C+D'},{x:-6,y:-.2,toggles:['d','e'],label:'D+E'},{x:-6,y:5.5,toggles:['e'],label:'E'}],
  }),
  classic('Crossfire','cannon','Watch both cannons. Pads 2 and 6 are exposed to incoming fire.',[
    p(1,-20.2,9.8,7.6,{style:'bastion'}),p(2,-20.2,2.8,7.6,{style:'bastion'}),p(3,-20.2,-5.4,7.6,{style:'bastion'}),
    p(4,0,-9.6,12.6,{style:'bastion'}),p(5,20.2,-5.4,7.6,{style:'bastion'}),p(6,20.2,2.8,7.6,{style:'bastion'}),p(7,20.2,9.8,7.6,{style:'bastion'}),
  ],{
    color:'#d3a79f',spawn:{x:0,y:13},hazards:crossfireShots(),
    obstacles:[w(-26,2.25,4,31.5,{material:'cannon'}),w(26,2.25,4,31.5,{material:'cannon'}),
      w(0,-12.02,1.6,3.56,{material:'cannon'}),w(0,-14.5,56,2,{material:'cannon'})],
  }),
  classic('Shooting Stars','meteors','Thread the rock passages. The lower-left cache holds one +35 fuel canister.',[p(1,-19,0,6,{kind:'terrain',depth:.18}),p(2,-7,-6,8,{kind:'terrain',depth:.18}),p(3,5.5,-12.5,7,{kind:'terrain',depth:.18}),p(4,-3,-12.5,6,{kind:'terrain',depth:.18}),p(5,13.25,-7.3,6.5,{kind:'terrain',depth:.18}),{...f(-19.25,-12.5,6.5),kind:'terrain',depth:.18}],{
    color:'#ffd987',terrain:shootingStarsTerrain,
    hazards:[-18,-8,4,14,21].map((x,i)=>({kind:'star',path:'fall',x,radius:.42,speed:2.2+i*.2,drift:2.5,phase:i*7})),
  }),
  classic('Magnets','magnet','Gravity pulls upward. Hold S or ↓ to descend onto a pad.',[p(1,-19,-5),p(2,-9,-6),p(3,1,-9),p(4,11,-6),p(5,20,-5)],{
    color:'#cdb0ff',gravity:-1.2,downPower:5.6,spawn:{x:-7,y:3},obstacles:[w(4,0,.65,12,{angle:.65}),w(0,6.5,.65,3),...[-16,-1,14].map(x=>w(x,13,6.5,1,{material:'magnet'}))],
  }),
  classic('Black Hole','blackhole','Orbit the singularity. Thrust away before it pulls you close.',[p(1,-9,-10,9),p(2,10,-10,9),p(3,19,8,8),p(4,19,-1,8),p(5,-19,-1,8),f(-19,8,8)],{
    color:'#baacff',fields:[{kind:'gravity',x:0,y:2,strength:190,max:6.5,radius:1.25}],
  }),
  classic('Turbo-Charged Taxi','turbo','Double the thrust. Use short taps and watch the fuel gauge.',[p(1,3,-2,7,{kind:'tower',depth:10}),p(2,10,-8,7),p(3,-9,-8,7),p(4,-4,-2,7,{kind:'tower',depth:10}),p(5,20,-3),p(6,20,4),p(7,20,11),p(8,-20,11),p(9,-20,4),f(-20,-3,6)],{
    color:'#ffcc6f',thrustScale:1.8,fuelRate:1.05,speedLimit:13,spawn:{x:-12,y:8},
  }),
  classic('Space Mines','mines','Matching mines are linked. The faint lines are live tripwires.',[p(1,-16,10,7),p(2,-19,0,7),p(3,-17,-10,7),p(4,0,-11,7),p(5,4,-1,7),p(6,19,2,7),p(7,3,10,7),f(19,-10,6)],{
    color:'#b1e68f',beams:[{ax:-12,ay:5.8,bx:-5,by:5.8,kind:'mine',color:'#83ffb3'},{ax:-6,ay:13,bx:-6,by:5.8,kind:'mine',color:'#83ffb3'},{ax:10,ay:5,bx:20,by:8,kind:'mine',color:'#ffbd72'},{ax:-9,ay:-6,bx:7,by:-6,kind:'mine',color:'#d193ff'},{ax:10.5,ay:-9,bx:10.5,by:-2,kind:'mine',color:'#7eaaff'}],
  }),
  classic('Electroids','electric','Four electrical bands. Follow the moving gaps, one at a time.',[p(1,-17,-11,8)],{
    color:'#a2f6d0',spawn:{x:12,y:13},beams:[-6,-.5,5,10].map((y,i)=>({y,gap:10,range:12,center:0,speed:.34+i*.04,phase:i*1.7,kind:'electric'})),
  }),
  classic('Blizzard','snow','Land on the snow clearings. Gusts bend the trees; fly low for shelter.',[p(1,-9,-10,16,{style:'snow',kind:'terrain',depth:.12}),p(2,9,-10,12,{style:'snow',kind:'terrain',depth:.12}),p(3,20,-10,7,{style:'snow',kind:'terrain',depth:.12})],{
    color:'#bdefff',weather:true,terrain:snowGround,spawn:{x:0,y:6},obstacles:[w(-16,-3.5,.7,13,{material:'tree'}),w(5,-3.5,.7,13,{material:'tree'}),w(17,-7,.55,6,{material:'tree'})],
    hazards:[-21,-8,0,11,20].map((x,i)=>({kind:'snow',path:'fall',x,radius:.3,drift:3.2,speed:1.45+i*.09,phase:i*6.3})),
  }),
  classic('Interference','radio','The radio band disrupts steering. Stay clear of the towers.',[p(1,-8,-5),p(2,1,-11,7),p(3,-17,-3),p(4,5,-2),p(5,18,-4),p(6,19,-11,5),p(7,13,5,7),f(-13,-11)],{
    color:'#ffd099',fields:[{kind:'radio',x:0,y:1,h:8}],obstacles:[w(-23,-1.7,2,8,{material:'brick'}),w(-4,-.5,2,7,{material:'brick'}),w(11,0,2.5,10,{material:'brick'}),w(23,-2,2,8,{material:'brick'}),w(-2,-8,17,.65,{kind:'rock'}),w(18,-7.6,10,.65,{kind:'rock'})],
  }),
  classic('Taxi Maze','maze','Follow the blue corridor. Two portals connect the dead ends.',[p(1,-15,9,8)],{
    color:'#84dffa',spawn:{x:1,y:13},fuelRate:.45,obstacles:[w(-10,13,.7,5),w(6,9.3,22,.7),w(17,6,.7,6.6),w(3,3,27,.7),w(-10.5,6.2,.7,6.4),w(-17,-.6,.7,9),w(-7,-5,20,.7),w(3,-7.8,.7,5.5),w(13,-10.5,20,.7),w(22.5,-2.3,.7,16.4),w(12,-1,12,.7)],
    portals:[{x:11,y:-7.5,to:1,color:'#b599ff'},{x:-19,y:13,to:0,color:'#b599ff'}],
  }),
  classic('The Switch','reverse','Controls reversed: S rises, W descends, A goes right, D goes left.',towers(),{color:'#ffb878',controls:'reverse',spawn:{x:0,y:10}}),
  classic('Fast Break','barrier','Touch the center diamond to retract the curtains. Move before they close.',[p(1,-15,11,7),p(2,15,-10,7),p(3,-6,11,7),p(4,-12,-2,7),p(5,7,11,7),p(6,12,-2,7),p(7,-15,-10,7),f(18,11,6)],{
    color:'#ffa9d5',spawn:{x:0,y:6},beams:[{x:-17.8,w:.55,curtain:true,resettable:true,kind:'curtain'},{x:17.8,w:.55,curtain:true,resettable:true,kind:'curtain'}],switches:[{x:0,y:-1,reset:true,label:'RESET'}],
  }),
  classic('Rebound','rebound','The gold orbs bounce you away. Slow down near the diagonal walls.',[p(1,-9,9,7),p(2,-19,-6,7),p(3,-4,-10,7),p(4,15,-10,8),p(5,17,9,7)],{
    color:'#ffd276',spawn:{x:0,y:11},obstacles:[w(-16,5,.7,15,{angle:.67}),w(-6,6,.7,11,{angle:.68}),w(12,4,.7,18,{angle:.7}),w(2,-5,.7,15,{angle:-.72})],
    hazards:[{kind:'rebound',path:'bounce',x:0,y:2,range:20,rangeY:8,speed:.4,radius:.47},{kind:'rebound',path:'bounce',x:0,y:2,range:19,rangeY:7,speed:.52,phase:2,radius:.47}],
  }),
  classic('Shift-o-Rama','shifting','Colored bulkheads slide in opposite directions. Thread their gaps.',[p(1,-20,11),p(2,-19,-11),p(3,-8,11),p(4,0,-11,7),p(5,8,11),p(6,19,-11),p(7,20,11)],{
    color:'#c79eff',beams:[6.5,1.5,-3.5,-7.8].map((y,i)=>({y,gap:10,range:12,speed:.24,phase:i%2?Math.PI:0,h:.85,kind:'shutter',color:['#ffa783','#ffdc78','#99ef86','#bd8aff'][i]})),
  }),
  classic('Lasers','laser','Red is live. Wait for a beam to go dark, then cross cleanly.',[p(1,-19,-7,7),p(2,0,3,10),p(3,0,-11,10)],{
    color:'#7bbdff',spawn:{x:-19,y:9},obstacles:[w(-16,1.2,16,1.1),w(17,1.2,14,1.1)],
    beams:[{x:-15,y:9,w:.18,h:9,period:7,onFor:4,phase:0},{x:16,y:9,w:.18,h:9,period:7,onFor:4,phase:2.5},{x:-8,y:-4,w:.18,h:10,period:6,onFor:3.4,phase:1},{x:8,y:-6,w:.18,h:9,period:6,onFor:3.4,phase:3.5}],
  }),
  classic('On The Move','moving','Match the pads. Check the chain gaps before changing floors.',[
    p(1,-11,9,6.5,{motion:{x:5,speed:.3}}),p(2,-12,2,6.5,{motion:{x:5,speed:.3,phase:Math.PI}}),p(3,-11,-5,6.5,{motion:{x:5,speed:.3}}),p(4,-11,-11,6.5,{motion:{x:5,speed:.3,phase:Math.PI}}),p(5,11,9,6.5,{motion:{x:5,speed:.3}}),p(6,12,2,6.5,{motion:{x:5,speed:.3,phase:Math.PI}}),p(7,11,-11,6.5,{motion:{x:5,speed:.3,phase:Math.PI}}),{...f(11,-5,6.5),motion:{x:5,speed:.3}},
  ],{color:'#ffbca0',fuelRate:.5,beams:[6,-1,-8].map((y,i)=>({y,gap:10,range:14,speed:.3,phase:i*Math.PI,h:.22,kind:'chain'}))}),
];
const mystery = classic('Mystery Screen','museum','Welcome to the archive. One last round for a legendary cabbie.',[p(1,-14,0,16),p(2,15,0,16),p(3,0,-10,16)],{color:'#f7dd83',bonus:true,district:'MUSEWORLD · THE ARCHIVE',hazards:[{kind:'rebound',x:15,y:2,range:4,radius:.4,speed:.6}]});
export const LEVELS = [
  ...originals.map((level,index)=>({...level,number:index+1,shift:Math.floor(index/8),original:true})),
  {...mystery,number:25,shift:3},
  ...BONUS_LEVELS.map((level,index)=>({...level,number:index+26,shift:3,theme:['orbital','crystal','refinery'][index],hint:level.subtitle,bonus:true,pads:level.pads.map(p=>({...p,kind:'island'}))})),
];

// Supply is deliberately sparse. A canister is consumed once per level attempt,
// including across lost taxis. No pad provides an unlimited fuel service.
for(const [index,level]of LEVELS.entries()){
  for(const pad of level.pads)delete pad.fuel;
  const cache=[3,9,12,16,23].includes(index)?'F':index===27?1:null;
  if(cache===null)level.pads=level.pads.filter(p=>p.id!=='F');
  level.fuelCanisters=cache===null?[]:[{id:'reserve',padId:cache,amount:index===12?45:35}];
  if(level.theme==='beach')level.terrain=[umbrellaHull(level.pads[2])];
  if(['teleport','maze'].includes(level.theme)){
    level.terrain=level.obstacles.map(caveWallOutline);level.obstacles=[];
  }
}


