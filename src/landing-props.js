import * as THREE from 'three';
import {surfaceMaterial} from './surface-materials.js';
const mat=(color,roughness=.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function part(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;}
function rod(g,a,b,r,m){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const o=part(g,new THREE.CylinderGeometry(r,r,d.length(),10),m);o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function fabric(){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#d2c5a6';ctx.fillRect(0,0,256,256);
  for(let x=0;x<256;x+=64){ctx.fillStyle='#576c6a';ctx.fillRect(x,0,28,256);ctx.fillStyle='#263d3b';ctx.fillRect(x+3,0,2,256);}
  for(let y=0;y<256;y+=3){ctx.fillStyle='#ffffff16';ctx.fillRect(0,y,256,1);}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(5,1);
  return new THREE.MeshStandardMaterial({map,roughness:1,side:THREE.DoubleSide});
}

export function buildLandingObject(g,pad){
  if(pad.style==='bastion'){
    const stone=surfaceMaterial('stone','#84615e'),cap=surfaceMaterial('stone','#b49b87');
    part(g,new THREE.BoxGeometry(pad.w,.46,3.5),stone,0,-.41,0);
    part(g,new THREE.BoxGeometry(pad.w,.18,3.5),cap,0,-.09,0);
    for(let x=-pad.w/2+.9;x<pad.w/2;x+=1.3)
      part(g,new THREE.BoxGeometry(.035,.43,.02),mat('#514342'),x,-.41,1.76);
    return true;
  }
  if(pad.style==='cloud'){
    const cloud=mat('#d4d7cf',1),shade=mat('#b3bdba',1);
    // Broad billows share a level upper landing surface; the volume hangs below it.
    const core=part(g,new THREE.SphereGeometry(1,40,24),cloud,0,-.65,-.1);core.scale.set(pad.w/2,.65,2);
    for(let row=0;row<2;row++)for(let i=0;i<9;i++){
      const x=-pad.w/2+.9+i*(pad.w-1.8)/8,r=.82+.38*(.5+.5*Math.sin(i*2.7+row*3));
      const puff=part(g,new THREE.SphereGeometry(1,32,20),row?cloud:shade,x,-.25-r*.7-row*.18,row*.9-.2);puff.scale.set(r,r*.65,1.1);
    }
    return true;
  }
  if(pad.style==='lounger'){
    const frame=mat('#9c9d91',.5,.65),joints=mat('#444d4b',.8,.3),canvas=fabric();
    part(g,new THREE.BoxGeometry(pad.w,.13,3.3),canvas,0,-.08,0);
    const back=part(g,new THREE.BoxGeometry(.12,6.3,3.3),canvas,-11.3,2.55,0);back.rotation.z=.48;
    for(const z of [-1.75,1.75]){
      rod(g,[-10,-.2,z],[10,-.2,z],.12,frame);rod(g,[-10,-.2,z],[-12.8,5.4,z],.13,frame);
      for(const side of [-1,1]){
        rod(g,[side*6,-.25,z],[side*8,-4.5,z],.14,frame);rod(g,[side*8,-.25,z],[side*5,-4.5,z],.13,frame);
        part(g,new THREE.SphereGeometry(.19,14,10),joints,side*6.8,-2,z);
      }
    }
    for(const x of [-8,8])rod(g,[x,-.22,-1.75],[x,-.22,1.75],.12,frame);
    const pillow=part(g,new THREE.SphereGeometry(1,32,16),mat('#b4a184',1),-8.4,-.02,-.9);pillow.scale.set(.75,.17,.65);
    return true;
  }
  if(pad.style==='parasol'){
    const vertices=[],colors=[],uvs=[],cream=new THREE.Color('#cfc0a0'),stripe=new THREE.Color('#697b78');
    const rings=18,sectors=96,radius=9.1,flat=pad.w/2;
    const at=(r,a)=>[Math.cos(a)*r,r<=flat?-.035:-.035-3.2*((r-flat)/(radius-flat))**1.3,Math.sin(a)*r*.37];
    const add=(r,a,c)=>{vertices.push(...at(r,a));colors.push(c.r,c.g,c.b);uvs.push(r/radius,a/(Math.PI*2));};
    for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++){
      const a=i/sectors*Math.PI*2,b=(i+1)/sectors*Math.PI*2,r=j/rings*radius,s=(j+1)/rings*radius,c=Math.floor(i/8)%2?cream:stripe;
      add(r,a,c);add(s,a,c);add(s,b,c);add(r,a,c);add(s,b,c);add(r,b,c);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();
    part(g,geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}));
    const iron=mat('#77766a',.65,.4);
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2,pts=Array.from({length:20},(_,j)=>{const p=at(j/19*radius,a);p[1]-=.06;return new THREE.Vector3(...p);});
      part(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),30,.045,6,false),iron);
      const tip=at(radius,a);part(g,new THREE.SphereGeometry(.09,12,8),iron,...tip);
    }
    part(g,new THREE.CylinderGeometry(.27,.4,.4,16),iron,0,-.24,0);
    return true;
  }
  if(pad.kind==='terrain')return true;
  return false;
}

export function buildFuelCanister(parent,item){
  const g=new THREE.Group();g.name=`fuel-canister-${item.id}`;parent.add(g);
  const olive=surfaceMaterial('metal','#8e8868'),dark=mat('#303939',.65,.45),label=mat('#dfd4ab');
  part(g,new THREE.CylinderGeometry(.35,.4,1.05,8),olive,0,-.08,0);
  for(const y of [-.55,.38])part(g,new THREE.TorusGeometry(.35,.05,8,16),dark,0,y,0).rotation.x=Math.PI/2;
  part(g,new THREE.CylinderGeometry(.14,.14,.18,12),dark,0,.53,0);
  rod(g,[-.25,.4,0],[-.25,.72,0],.045,dark);rod(g,[.25,.4,0],[.25,.72,0],.045,dark);rod(g,[-.25,.72,0],[.25,.72,0],.045,dark);
  part(g,new THREE.BoxGeometry(.47,.35,.035),label,0,-.04,.375);
  const c=document.createElement('canvas');c.width=192;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#222e2f';ctx.textAlign='center';ctx.font='bold 42px sans-serif';ctx.fillText(`+${item.amount}`,96,51);ctx.font='bold 24px sans-serif';ctx.fillText('FUEL',96,90);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  part(g,new THREE.PlaneGeometry(.43,.3),new THREE.MeshBasicMaterial({map,transparent:true}),0,-.04,.398);
  return g;
}
