import * as THREE from 'three';
import {surfaceMaterial} from './surface-materials.js';

// A lightweight, self-contained prop. The existing exit trigger owns gameplay.
export function createExitGate(){
  const gate=new THREE.Group();gate.name='departure-gate';gate.position.set(0,15.4,0);
  const shell=surfaceMaterial('metal','#697579'),enamel=surfaceMaterial('enamel','#bba35c');
  const recess=new THREE.MeshStandardMaterial({color:'#20292d',roughness:.85,metalness:.35});
  const bolts=new THREE.MeshStandardMaterial({color:'#a1aba9',roughness:.48,metalness:.65});
  const signal=new THREE.MeshStandardMaterial({color:'#b9e5d4',emissive:'#90d8bc',emissiveIntensity:.75,roughness:.38});
  function part(geometry,material,x,y,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);gate.add(m);return m;}
  function panel(x,y,w,h,d,material,z=0){
    const cut=Math.min(.15,w*.2,h*.2),shape=new THREE.Shape();
    const points=[[-w/2+cut,-h/2],[w/2-cut,-h/2],[w/2,-h/2+cut],[w/2,h/2-cut],[w/2-cut,h/2],[-w/2+cut,h/2],[-w/2,h/2-cut],[-w/2,-h/2+cut]];
    points.forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:2,steps:1});geometry.translate(0,0,-d/2);
    return part(geometry,material,x,y,z);
  }
  const lamps=[];
  for(const side of [-1,1]){
    const x=side*5.7;
    panel(x,.05,.8,3.1,.75,shell);
    panel(x,-1.35,1.05,.55,.9,recess);
    panel(x,.95,.94,.8,.85,enamel);
    panel(x,-.35,.55,1.65,.06,recess,.42);
    for(let i=0;i<5;i++){
      const fin=part(new THREE.BoxGeometry(.4,.08,.09),shell,x,-.92+i*.24,.5);fin.rotation.z=side*.12;
    }
    for(const y of [-1.2,1.18])for(const dx of [-.24,.24]){
      const bolt=part(new THREE.CylinderGeometry(.065,.065,.05,8),bolts,x+dx,y,.49);bolt.rotation.x=Math.PI/2;
    }
    for(let i=0;i<3;i++){
      const lamp=part(new THREE.BoxGeometry(.07,.23,.08),signal.clone(),side*5.23,-.7+i*.58,.4);
      lamps.push({lamp,phase:i});
    }
    // Inset upward chevrons remain legible even with bloom disabled.
    for(const y of [.78,1.07])for(const slope of [-1,1]){
      const stripe=part(new THREE.BoxGeometry(.2,.055,.025),recess,x+slope*.07,y,.52);stripe.rotation.z=-slope*.6;
    }
  }
  panel(0,1.92,12.25,.72,.85,shell);
  panel(0,1.92,4.9,.95,.12,recess,.49);
  for(const side of [-1,1]){
    panel(side*4.15,1.92,2.65,.32,.06,enamel,.47);
    for(let i=0;i<4;i++){
      const stripe=part(new THREE.BoxGeometry(.12,.3,.02),recess,side*(3.35+i*.48),1.92,.58);stripe.rotation.z=-.45;
    }
  }
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#cbe6d8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 100px monospace';ctx.fillText('EXIT ↑',256,67);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  part(new THREE.PlaneGeometry(4.4,.81),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}),0,1.92,.67);
  gate.userData.guideLamps=lamps;gate.visible=false;
  return gate;
}
export function updateExitGate(gate,time,reducedMotion=false){
  if(!gate.visible)return;
  for(const {lamp,phase} of gate.userData.guideLamps){
    lamp.material.emissiveIntensity=reducedMotion ? .75 : .65+.45*(.5+.5*Math.sin(time*2.4-phase*1.1));
  }
}
