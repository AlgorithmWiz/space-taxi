import * as THREE from 'three';
import { riderFor } from './riders.js';

export const PASSENGER_SCALE=1.35;
function roundedGeometry(w,h,d,r=.03){
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:5});g.translate(0,0,-d/2);return g;
}
function fabricMap(){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#d9dcda';ctx.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=2){ctx.fillStyle=i%4?'#929a9b22':'#ffffff18';ctx.fillRect(i,0,1,128);ctx.fillRect(0,i,128,1);}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(3,3);return map;
}
function badgeMap(){
  const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#26353c';ctx.fillRect(0,0,256,128);
  ctx.fillStyle='#bfc8bd';ctx.font='600 28px sans-serif';ctx.fillText('ORBITAL',18,38);ctx.font='19px monospace';ctx.fillText('CREW / 84',18,70);
  for(let i=0;i<22;i++)ctx.fillRect(18+i*9,86,2+i%3,24);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return map;
}
export function createPassenger(parent,homeX=0,seed=0){
  const root=new THREE.Group();root.name='passenger';parent.add(root);root.position.set(homeX,0,.8);root.scale.setScalar(PASSENGER_SCALE);
  const mat=(color,roughness=.75,metalness=.08)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const fabric=fabricMap(),suit=mat(riderFor(seed).color),white=mat('#cbd1c9'),dark=mat('#29383e',.76,.16),rubber=mat('#172126',.92,0);
  suit.map=fabric;
  const skin=mat('#bd8663',.88,0),hair=mat('#493328',.98,0),silver=mat('#929f9f',.48,.65),eyesMat=mat('#1a2123',.45,0);
  const lamp=new THREE.MeshBasicMaterial({color:'#b5d4c7'}),green=mat('#638570');
  function part(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;}
  const box=(g,m,w,h,d,x=0,y=0,z=0)=>part(g,roundedGeometry(w,h,d,Math.min(.025,w/4,h/4)),m,x,y,z);
  const ball=(g,m,r,x=0,y=0,z=0)=>part(g,new THREE.SphereGeometry(r,20,14),m,x,y,z);
  const cylinder=(g,m,r,h,x=0,y=0,z=0)=>part(g,new THREE.CylinderGeometry(r,r,h,14),m,x,y,z);
  function tube(g,m,points,r=.013){return part(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,6,false),m);}
  const body=new THREE.Group();root.add(body);
  // Longer legs, a tapered torso and a smaller helmet give the crew adult proportions.
  const profile=[[.16,.7],[.15,.77],[.175,.94],[.21,1.13],[.19,1.22],[.12,1.265]].map(([r,y])=>new THREE.Vector2(r,y));
  const torso=part(body,new THREE.LatheGeometry(profile,24),suit);torso.scale.z=.72;
  box(body,dark,.33,.16,.255,0,.695);
  box(body,white,.32,.06,.055,0,1.175,.139);
  box(body,dark,.036,.41,.026,0,.968,.146);
  for(let i=0;i<12;i++)box(body,silver,.015,.01,.009,.001,.785+i*.028,.165);
  for(const side of [-1,1]){
    box(body,dark,.034,.4,.025,side*.142,.992,.145).rotation.z=side*-.09;
    box(body,suit,.092,.105,.032,side*.1,.872,.158);
    box(body,white,.091,.025,.035,side*.1,.911,.176);
    for(let i=0;i<3;i++)box(body,dark,.043,.009,.012,side*.19,1.055+i*.055,.05).rotation.z=side*.17;
  }
  const badge=part(body,new THREE.PlaneGeometry(.145,.073),new THREE.MeshBasicMaterial({map:badgeMap()}),-.089,1.087,.183);
  box(body,dark,.07,.11,.05,.105,1.104,.163);box(body,lamp,.032,.009,.01,.103,1.125,.193);
  box(body,rubber,.36,.062,.278,0,.738);box(body,silver,.075,.052,.02,0,.74,.15);
  for(const x of [-.125,.125])box(body,suit,.07,.083,.042,x,.695,.155);
  // Life-support pack with straps, a pressure gauge, valves and one flexible hose.
  box(body,dark,.3,.39,.18,0,1.035,-.18);box(body,suit,.25,.3,.07,0,1.04,-.295);
  for(const side of [-1,1]){
    cylinder(body,silver,.05,.3,side*.166,1.03,-.205);cylinder(body,rubber,.056,.03,side*.166,.955,-.205);
    cylinder(body,dark,.03,.055,side*.166,1.207,-.205);box(body,white,.04,.32,.026,side*.132,1.04,-.34);
  }
  tube(body,rubber,[[-.155,1.295,-.04],[-.28,1.17,.01],[-.265,.895,.035],[-.1,.81,.153]],.016);
  cylinder(body,dark,.105,.083,0,1.29);
  cylinder(body,silver,.115,.027,0,1.325);
  const head=new THREE.Group();head.name='helmet-and-face';head.position.y=1.455;head.scale.setScalar(.62);body.add(head);
  const helmet=ball(head,white,.285);helmet.scale.set(1,1.04,.91);
  box(head,dark,.464,.357,.09,0,-.011,.228);
  // Sculpted jaw, cheek planes and a small nose bridge behind clear curved glass.
  const faceGeometry=(start=0,length=Math.PI)=>{
    const geo=new THREE.SphereGeometry(.196,32,24,0,Math.PI*2,start,length),v=geo.attributes.position;
    for(let i=0;i<v.count;i++){const y=v.getY(i);if(y<-.01)v.setX(i,v.getX(i)*(.82+(y+.196)/.186*.18));}geo.computeVertexNormals();return geo;
  };
  const face=part(head,faceGeometry(),skin,0,-.005,.26);face.scale.set(.96,1.13,.46);
  const cap=ball(head,hair,.199,0,.119,.243);cap.scale.set(1,.55,.67);
  const swept=box(head,hair,.18,.049,.035,-.04,.153,.318);swept.rotation.z=-.2;
  const temples=[];
  for(const side of [-1,1]){
    const lock=ball(head,hair,.06,side*.139,.073,.277);lock.scale.set(.45,1.1,.5);temples.push(lock);
  }
  const eyes=[],brows=[];
  for(const side of [-1,1]){
    const eye=new THREE.Group();eye.position.set(side*.072,.017,.35);head.add(eye);
    ball(eye,white,.025).scale.set(1,.57,.32);ball(eye,eyesMat,.0145,0,0,.009).scale.set(.8,.95,.4);eyes.push(eye);
    const brow=box(head,hair,.065,.012,.018,side*.073,.067,.348);brow.rotation.z=side*-.05;brows.push(brow);
  }
  ball(head,skin,.026,0,-.013,.354).scale.set(.65,1.45,.52);
  ball(head,skin,.026,0,-.04,.372).scale.set(.87,.55,.67);
  tube(head,mat('#68453b',.97,0),[[-.038,-.095,.344],[0,-.097,.35],[.038,-.095,.344]],.004);
  const beard=part(head,faceGeometry(Math.PI*.62,Math.PI*.38),hair,0,-.005,.263);beard.scale.set(.963,1.133,.463);beard.visible=false;
  const visorMaterial=new THREE.MeshPhysicalMaterial({color:'#b4cacb',transparent:true,opacity:.12,roughness:.18,metalness:.08,clearcoat:.8,depthWrite:false});
  const visorGeo=new THREE.SphereGeometry(.285,32,22,0,Math.PI*2,0,Math.PI);
  const visor=part(head,visorGeo,visorMaterial,0,-.01,.231);visor.scale.set(.77,.59,.58);visor.renderOrder=2;
  tube(head,silver,[[-.227,.15,.28],[-.14,.186,.30],[.14,.186,.30],[.227,.15,.28]],.01);
  tube(head,dark,[[-.22,-.18,.27],[0,-.207,.31],[.22,-.18,.27]],.014);
  for(const side of [-1,1]){
    cylinder(head,dark,.073,.035,side*.283,-.013,0).rotation.z=Math.PI/2;
    cylinder(head,silver,.048,.04,side*.293,-.013,0).rotation.z=Math.PI/2;
  }
  tube(head,dark,[[.29,-.03,.02],[.3,-.11,.22],[.16,-.14,.37]],.012);
  box(head,dark,.048,.022,.025,.14,-.14,.369);box(head,suit,.08,.08,.018,0,.26,.1);

  const limbs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.224,1.17,0);body.add(arm);
    ball(arm,white,.074);part(arm,new THREE.CapsuleGeometry(.058,.16,5,12),suit,0,-.14).scale.z=.91;
    for(let i=0;i<3;i++)cylinder(arm,dark,.059,.008,0,-.215+i*.018);
    const elbow=new THREE.Group();elbow.position.y=-.275;arm.add(elbow);ball(elbow,rubber,.052);
    part(elbow,new THREE.CapsuleGeometry(.051,.13,5,12),suit,0,-.115);
    cylinder(elbow,white,.057,.038,0,-.206);box(elbow,dark,.078,.09,.036,0,-.12,.041);
    const hand=new THREE.Group();hand.position.y=-.251;elbow.add(hand);
    box(hand,white,.079,.078,.071);const fingers=[];
    for(let f=0;f<4;f++){const finger=box(hand,white,.017,.071-(f===3?.012:0),.035,(f-1.5)*.021,-.058,.013);finger.rotation.x=.14;fingers.push(finger);}
    box(hand,white,.025,.055,.047,side*.052,-.012,.025).rotation.z=side*.48;
    const leg=new THREE.Group();leg.position.set(side*.108,.652,0);body.add(leg);
    part(leg,new THREE.CapsuleGeometry(.072,.2,5,12),suit,0,-.145).scale.z=.94;
    box(leg,suit,.097,.12,.028,side*.04,-.105,.067);
    const knee=new THREE.Group();knee.position.y=-.292;leg.add(knee);ball(knee,rubber,.063);
    box(knee,dark,.11,.086,.045,0,0,.06);box(knee,white,.09,.025,.022,0,.025,.087);
    part(knee,new THREE.CapsuleGeometry(.061,.17,5,12),suit,0,-.137);
    for(let i=0;i<3;i++)cylinder(knee,dark,.062,.009,0,-.218+i*.015);
    const foot=new THREE.Group();foot.position.y=-.289;knee.add(foot);
    box(foot,rubber,.137,.12,.23,0,0,.043);box(foot,silver,.137,.024,.235,0,-.057,.045);
    box(foot,dark,.126,.057,.115,0,.015,.122);
    for(let i=0;i<3;i++)box(foot,white,.09,.007,.011,0,.063,-.012+i*.028);
    limbs.push({side,arm,elbow,hand,fingers,leg,knee,foot});
  }
  const kits={};for(const key of ['botanist','courier','engineer','tourist','cook','medic']){kits[key]=new THREE.Group();body.add(kits[key]);}
  const plant=kits.botanist;cylinder(plant,silver,.07,.24,.245,.82,-.065);
  cylinder(plant,new THREE.MeshPhysicalMaterial({color:'#9dbfa9',transparent:true,opacity:.23,depthWrite:false,roughness:.25}),.074,.23,.245,.87,-.065);
  cylinder(plant,green,.012,.16,.245,.875,-.065);for(const side of [-1,1]){const leaf=ball(plant,green,.043,.245+side*.03,.92,-.065);leaf.scale.set(.8,.25,1);}
  const parcel=box(kits.courier,mat('#997e5c'),.24,.29,.21,-.255,.91,-.055);parcel.rotation.z=-.08;
  box(kits.courier,white,.04,.28,.015,-.255,.91,.058);box(kits.courier,dark,.21,.022,.017,-.255,.99,.068);
  tube(kits.courier,dark,[[-.18,1.21,.14],[0,.99,.185],[.19,.77,.12]],.017);
  const tool=new THREE.Group();tool.position.set(.223,.81,.015);tool.rotation.z=-.2;kits.engineer.add(tool);
  box(tool,silver,.035,.25,.045);const wrench=part(tool,new THREE.TorusGeometry(.058,.019,6,18,Math.PI*1.45),silver,0,.15);wrench.rotation.z=-.7;
  box(kits.engineer,dark,.11,.095,.07,-.21,.757,.04);
  box(kits.tourist,dark,.21,.135,.095,0,.9,.196);cylinder(kits.tourist,silver,.05,.061,0,.9,.267).rotation.x=Math.PI/2;
  cylinder(kits.tourist,eyesMat,.039,.068,0,.9,.279).rotation.x=Math.PI/2;
  tube(kits.tourist,rubber,[[-.13,1.23,.17],[-.1,.98,.22],[.1,.98,.22],[.13,1.23,.17]],.009);
  box(kits.cook,white,.27,.29,.026,0,.95,.171);for(const side of [-1,1])for(const y of [.86,.94,1.02])ball(kits.cook,dark,.009,side*.055,y,.19);
  box(kits.cook,dark,.09,.06,.02,.077,1.085,.178);
  box(kits.medic,white,.22,.19,.11,-.22,.78,.046);box(kits.medic,green,.105,.025,.012,-.22,.78,.11);box(kits.medic,green,.025,.105,.013,-.22,.78,.111);
  root.userData={homeX,body,head,eyes,brows,limbs,suit,skin,hair,kits,beard,swept,identity:null};return root;
}
export function posePassenger(root,{time,profile,x=root.userData.homeX,walk=0,boarding=0,departing=false,look=0}){
  const d=root.userData;
  if(d.identity!==profile.name){
    d.suit.color.set(profile.color);d.skin.color.set(profile.skin||'#bd8663');d.hair.color.set(profile.hair||'#493328');d.identity=profile.name;
    for(const [key,kit]of Object.entries(d.kits))kit.visible=key===(profile.kit||'botanist');
    d.body.scale.x=profile.build||1;d.beard.visible=['engineer','cook'].includes(profile.kit);
    d.swept.visible=['botanist','courier','medic'].includes(profile.kit);
    d.brows.forEach((b,i)=>b.rotation.z=(i?1:-1)*(profile.kit==='engineer'?.1:.03));
  }
  root.position.x=x;root.scale.setScalar(PASSENGER_SCALE*(1-boarding*.45));
  const phase=time*7.6,step=Math.sin(phase)*walk,identityPhase=(profile.pitch||1)*3.7;
  const cycle=(time+identityPhase)%4.9,blink=cycle<.12?Math.max(.06,Math.abs(cycle-.06)/.06):1;
  for(const eye of d.eyes)eye.scale.y=blink;
  d.body.position.y=walk?Math.abs(step)*.018:Math.sin(time*1.8+identityPhase)*.008;
  d.body.rotation.z=walk?step*.012:Math.sin(time*.65+identityPhase)*.016;
  d.body.rotation.y=walk?step*.035:Math.sin(time*.4+identityPhase)*.05;
  d.head.rotation.y=THREE.MathUtils.clamp(look,-.45,.45)+Math.sin(time*.8+identityPhase)*.045;d.head.rotation.z=Math.sin(time*.57)*.025;
  const waveCycle=(time+identityPhase)%6.5;
  const wave=departing?Math.max(0,Math.sin(Math.min(1,waveCycle/2.8)*Math.PI)):waveCycle<2.8?Math.sin(waveCycle/2.8*Math.PI):0;
  for(const limb of d.limbs){
    const stride=limb.side*step;
    limb.arm.rotation.set(walk?-stride*.38:.04,0,limb.side*(.08+Math.sin(time*.9)*.015));
    limb.elbow.rotation.set(walk?-.12:0,0,limb.side*.09);limb.hand.rotation.z=0;
    if(!walk&&limb.side===1){limb.arm.rotation.z=.08+wave*2.18;limb.elbow.rotation.z=.12+wave*(.48+Math.sin(time*4)*.2);limb.hand.rotation.z=wave*Math.sin(time*5)*.13;}
    limb.fingers.forEach((finger,i)=>finger.rotation.x=.14+(1-wave)*.17+Math.sin(time*1.8+i)*.025);
    limb.leg.rotation.x=stride*.39;limb.knee.rotation.x=Math.max(0,-stride)*.58;limb.foot.rotation.x=-Math.max(0,stride)*.13;
  }
}
export function createPassengerPortraits(){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(144,144);renderer.setClearColor(0,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.43,.43,.43,-.43,.1,10);camera.position.set(.12,1.87,4);camera.lookAt(0,1.87,0);
  scene.add(new THREE.HemisphereLight(0xd6e3e5,0x394047,2));const key=new THREE.DirectionalLight(0xffedce,2.6);key.position.set(-2,3,4);scene.add(key);
  const character=createPassenger(scene),portraits={};character.position.z=0;
  for(let i=0;i<6;i++){const profile=riderFor(0,i);posePassenger(character,{time:4,profile,x:0});renderer.render(scene,camera);portraits[profile.name]=renderer.domElement.toDataURL('image/png');}
  const geometries=new Set(),materials=new Set(),textures=new Set();
  scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){materials.add(o.material);if(o.material.map)textures.add(o.material.map);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();return portraits;
}
