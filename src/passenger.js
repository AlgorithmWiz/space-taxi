import * as THREE from 'three';
import { riderFor } from './riders.js';

function roundedGeometry(w,h,d,r=.03){
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:5});g.translate(0,0,-d/2);return g;
}
export function createPassenger(parent,homeX=0,seed=0){
  const root=new THREE.Group();parent.add(root);root.position.set(homeX,0,.8);root.scale.setScalar(1.45);
  const mat=(color,roughness=.48,metalness=.15)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const suit=mat(riderFor(seed).color),dark=mat('#1d3445',.35,.4),white=mat('#e0e9e5'),skin=mat('#bd8663',.85,0),hair=mat('#493328',.85,0),black=mat('#15212d',.35,0);
  const silver=mat('#9eafb7',.3,.7),lamp=new THREE.MeshBasicMaterial({color:'#b9f5fa'}),green=mat('#63bb78');
  function part(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;}
  const box=(g,m,w,h,d,x,y,z=0)=>part(g,roundedGeometry(w,h,d,Math.min(.035,w/4,h/4)),m,x,y,z);
  const ball=(g,m,r,x,y,z=0)=>part(g,new THREE.SphereGeometry(r,16,12),m,x,y,z);
  const cylinder=(g,m,r,h,x,y,z=0)=>part(g,new THREE.CylinderGeometry(r,r,h,14),m,x,y,z);
  const body=new THREE.Group();root.add(body);
  const hips=box(body,dark,.36,.18,.29,0,.5);
  part(body,new THREE.CapsuleGeometry(.21,.22,5,14),suit,0,.78).scale.z=.79;
  box(body,white,.37,.11,.075,0,.92,.14);box(body,dark,.065,.34,.036,-.15,.77,.172);box(body,dark,.065,.34,.036,.15,.77,.172);
  box(body,silver,.39,.055,.31,0,.56);box(body,white,.09,.07,.035,0,.56,.175);
  box(body,white,.23,.18,.06,0,.8,.193);box(body,dark,.18,.13,.035,0,.8,.24);
  box(body,lamp,.085,.024,.01,-.025,.82,.262);
  for(const x of [-.045,0,.045])ball(body,x===0?green:lamp,.016,x,.775,.265);
  // Backpack, oxygen tanks, straps and a flexible breathing hose.
  box(body,dark,.34,.37,.24,0,.82,-.2);box(body,suit,.28,.29,.12,0,.82,-.36);
  for(const x of [-.18,.18]){cylinder(body,silver,.065,.3,x,.78,-.27);cylinder(body,dark,.07,.05,x,.7,-.27);}
  const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(-.23,1.14,-.02),new THREE.Vector3(-.34,.92,.02),new THREE.Vector3(-.27,.63,.04),new THREE.Vector3(-.13,.69,.17)]);
  part(body,new THREE.TubeGeometry(hose,16,.018,6,false),dark);
  const neck=cylinder(body,dark,.17,.085,0,1.055);
  const head=new THREE.Group();head.position.y=1.255;body.add(head);
  const helmet=ball(head,white,.285,0,0);helmet.scale.set(1,1.02,.87);
  // A clean, rounded face aperture avoids overlapping spherical visor edges.
  box(head,dark,.45,.31,.09,0,.005,.225);
  const face=ball(head,skin,.193,0,-.012,.258);face.scale.set(1,1.05,.5);
  const cap=ball(head,hair,.193,0,.105,.24);cap.scale.set(1,.55,.62);
  for(const x of [-.115,.11]){const lock=ball(head,hair,.065,x,.102,.301);lock.scale.set(.7,1.2,.3);}
  const eyes=[];
  for(const x of [-.07,.07]){
    const eye=new THREE.Group();eye.position.set(x,.014,.35);head.add(eye);
    ball(eye,white,.037,0,0).scale.set(1,.87,.35);ball(eye,black,.021,.004,0,.011).scale.z=.4;
    ball(eye,lamp,.007,-.002,.009,.022);eyes.push(eye);
    const brow=box(head,hair,.069,.015,.018,x,.074,.35);brow.rotation.z=x<0?.12:-.12;
  }
  ball(head,skin,.033,0,-.032,.359).scale.set(.65,1,.55);
  const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.051,-.081,.345),new THREE.Vector3(0,-.099,.36),new THREE.Vector3(.051,-.081,.345)]);
  part(head,new THREE.TubeGeometry(smile,10,.007,5,false),hair);
  const visor=box(head,new THREE.MeshPhysicalMaterial({color:'#79c9e5',transparent:true,opacity:.16,roughness:.12,metalness:.16,clearcoat:1,depthWrite:false}),.437,.293,.012,0,.008,.393);
  visor.renderOrder=2;
  const glint=box(head,lamp,.103,.014,.008,-.13,.122,.405);glint.rotation.z=.18;
  for(const x of [-.282,.282]){const ear=cylinder(head,dark,.082,.035,x,-.01,0);ear.rotation.z=Math.PI/2;const plate=cylinder(head,silver,.054,.045,x,-.01,0);plate.rotation.z=Math.PI/2;}
  box(head,suit,.086,.105,.024,0,.247,.12);ball(head,lamp,.022,.291,.045,.03);
  const limbs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.25,.92,0);body.add(arm);
    ball(arm,white,.09,0,0);part(arm,new THREE.CapsuleGeometry(.07,.12,4,10),suit,0,-.13);
    const elbow=new THREE.Group();elbow.position.y=-.245;arm.add(elbow);ball(elbow,dark,.066,0,0);
    part(elbow,new THREE.CapsuleGeometry(.065,.09,4,10),suit,0,-.11);cylinder(elbow,white,.071,.055,0,-.203);
    const hand=new THREE.Group();hand.position.y=-.25;elbow.add(hand);box(hand,white,.112,.1,.083,0,0);
    for(let finger=0;finger<3;finger++)box(hand,white,.027,.065,.065,(finger-1)*.032,-.07,.004);
    const thumb=box(hand,white,.04,.074,.07,side*.073,-.02,0);thumb.rotation.z=side*.4;
    const leg=new THREE.Group();leg.position.set(side*.112,.45,0);body.add(leg);
    part(leg,new THREE.CapsuleGeometry(.083,.08,4,10),suit,0,-.105);
    const knee=new THREE.Group();knee.position.y=-.205;leg.add(knee);ball(knee,dark,.077,0,0);
    box(knee,white,.11,.07,.037,0,0,.063);part(knee,new THREE.CapsuleGeometry(.072,.065,4,10),suit,0,-.09);
    box(knee,dark,.165,.105,.27,0,-.188,.055);box(knee,silver,.172,.036,.278,0,-.235,.055);
    box(knee,suit,.117,.044,.08,0,-.161,.185);
    limbs.push({side,arm,elbow,hand,leg,knee});
  }
  // Job-specific silhouettes, switched without rebuilding the character.
  const kits={};for(const key of ['botanist','courier','engineer','tourist','cook','medic']){kits[key]=new THREE.Group();body.add(kits[key]);}
  const plant=kits.botanist;cylinder(plant,silver,.09,.27,.36,.7,.02);
  cylinder(plant,new THREE.MeshPhysicalMaterial({color:'#96e4c7',transparent:true,opacity:.3,depthWrite:false,roughness:.15}),.096,.3,.36,.8,.02);
  cylinder(plant,green,.016,.22,.36,.83,.02);for(const s of [-1,1]){const leaf=ball(plant,green,.07,.36+s*.045,.88,.02);leaf.scale.set(.8,.3,1);leaf.rotation.z=s*.7;}
  const parcel=box(kits.courier,mat('#bd8a57'),.29,.27,.24,-.31,.62,.075);parcel.rotation.z=-.14;
  box(kits.courier,white,.047,.27,.02,-.31,.62,.201);box(kits.courier,white,.27,.044,.022,-.31,.62,.204);
  const tool=new THREE.Group();tool.position.set(.31,.77,-.05);tool.rotation.z=-.32;kits.engineer.add(tool);
  box(tool,silver,.045,.36,.06,0,0);const wrench=part(tool,new THREE.TorusGeometry(.085,.025,6,16,Math.PI*1.45),silver,0,.2);wrench.rotation.z=-.7;
  box(kits.engineer,dark,.11,.1,.095,-.23,.58,.12);box(kits.engineer,silver,.025,.14,.035,-.23,.66,.13);
  const camera=box(kits.tourist,dark,.26,.17,.12,0,.67,.26);const lens=cylinder(kits.tourist,silver,.068,.07,0,.67,.36);lens.rotation.x=Math.PI/2;const glass=cylinder(kits.tourist,black,.049,.08,0,.67,.37);glass.rotation.x=Math.PI/2;
  const hat=cylinder(kits.cook,white,.15,.12,0,1.58);for(let i=0;i<5;i++)ball(kits.cook,white,.094,Math.sin(i*1.256)*.105,1.66,Math.cos(i*1.256)*.085);
  box(kits.cook,white,.23,.27,.035,0,.7,.21);for(const y of [.65,.73,.81])ball(kits.cook,dark,.015,0,y,.24);
  const medical=box(kits.medic,white,.25,.23,.13,-.29,.62,.035);box(kits.medic,green,.13,.035,.016,-.29,.62,.11);box(kits.medic,green,.035,.13,.018,-.29,.62,.111);
  root.userData={homeX,body,head,eyes,limbs,suit,skin,hair,kits,identity:null};return root;
}
export function posePassenger(root,{time,profile,x=root.userData.homeX,walk=0,boarding=0,departing=false,look=0}){
  const d=root.userData;
  if(d.identity!==profile.name){
    d.suit.color.set(profile.color);d.skin.color.set(profile.skin||'#bd8663');d.hair.color.set(profile.hair||'#493328');d.identity=profile.name;
    for(const [key,kit]of Object.entries(d.kits))kit.visible=key===(profile.kit||'botanist');
    d.body.scale.x=profile.build||1;
  }
  root.position.x=x;root.scale.setScalar(1.45*(1-boarding*.45));
  const phase=time*9,step=Math.sin(phase)*walk,cycle=(time+(profile.pitch||1)*3)%4.7,blink=cycle<.13?Math.max(.08,Math.abs(cycle-.065)/.065):1;
  for(const eye of d.eyes)eye.scale.y=blink;
  d.body.position.y=walk?Math.abs(step)*.028:Math.sin(time*2.5)*.012;
  d.body.rotation.z=walk?step*.028:Math.sin(time*1.8)*.025;
  d.body.rotation.y=walk?step*.05:Math.sin(time*.7)*.07;
  d.head.rotation.y=THREE.MathUtils.clamp(look,-.4,.4)+Math.sin(time*1.1)*.08;d.head.rotation.z=Math.sin(time*.9)*.055;
  for(const limb of d.limbs){
    const stride=limb.side*step;
    limb.arm.rotation.set(walk?-stride*.52:0,0,limb.side*.12);
    limb.elbow.rotation.z=limb.side*.14;limb.hand.rotation.z=0;
    if(!walk&&limb.side===1){limb.arm.rotation.z=departing?1.9:2.2;limb.elbow.rotation.z=.4+Math.sin(time*5.2)*.35;limb.hand.rotation.z=Math.sin(time*8)*.16;}
    limb.leg.rotation.x=stride*.48;limb.knee.rotation.x=Math.max(0,-stride)*.52;
  }
}

export function createPassengerPortraits(){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(112,112);renderer.setClearColor(0,0);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.57,.57,.57,-.57,.1,10);camera.position.set(0,1.82,4);camera.lookAt(0,1.82,0);
  scene.add(new THREE.HemisphereLight(0xc4e2ff,0x354355,2.6));const key=new THREE.DirectionalLight(0xffedce,3);key.position.set(-2,3,4);scene.add(key);
  const character=createPassenger(scene),portraits={};character.position.z=0;
  for(let i=0;i<6;i++){const profile=riderFor(0,i);posePassenger(character,{time:2,profile,x:0});renderer.render(scene,camera);portraits[profile.name]=renderer.domElement.toDataURL('image/png');}
  const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();return portraits;
}
