import * as THREE from 'three';

function candyMap(color,spiral=false){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);
  const dye=new THREE.Color(color),cream=new THREE.Color('#e5d7b5');
  // Canvas pixels are sRGB; Color stores linear channels.
  dye.convertLinearToSRGB();cream.convertLinearToSRGB();
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const u=x/512,v=y/512,dx=u-.5,dy=v-.5;
    const turns=spiral?Math.atan2(dy,dx)/Math.PI*2+Math.hypot(dx,dy)*9:u-v;
    const phase=((turns%1)+1)%1,edge=Math.min(1,Math.max(0,(phase-.4)/.035));
    const grain=.97+Math.sin(x*7.13+y*17.77)*.018,i=(y*512+x)*4;
    for(let k=0;k<3;k++){const key=['r','g','b'][k];pixels.data[i+k]=255*(dye[key]*(1-edge)+cream[key]*edge)*grain;}
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;map.wrapS=map.wrapT=THREE.RepeatWrapping;return map;
}
const finish=map=>new THREE.MeshPhysicalMaterial({map,roughness:.28,metalness:0,clearcoat:.7,clearcoatRoughness:.2});

class CaneCurve extends THREE.Curve{
  constructor(height,bend,radius){super();this.straight=height-radius;this.bend=bend;this.bottom=-height/2+radius;this.length=this.straight+Math.PI*bend;}
  getPoint(t,target=new THREE.Vector3()){
    const distance=t*this.length;
    if(distance<=this.straight)return target.set(0,this.bottom+distance,0);
    const angle=(distance-this.straight)/this.bend;
    return target.set(-this.bend+Math.cos(angle)*this.bend,this.bottom+this.straight+Math.sin(angle)*this.bend,0);
  }
}
export function buildCandyCane(parent,spec){
  const radius=spec.w*.48,curve=new CaneCurve(spec.h,1.55,radius),map=candyMap('#9d3d46');map.repeat.x=curve.length/1.6;
  const material=finish(map),body=new THREE.Mesh(new THREE.TubeGeometry(curve,180,radius,24,false),material);body.name='continuous-striped-candy-cane';parent.add(body);
  for(const t of [0,1]){
    const cap=new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),new THREE.MeshPhysicalMaterial({color:'#e5d7b5',roughness:.28,clearcoat:.7}));cap.position.copy(curve.getPoint(t));parent.add(cap);
  }
  return body;
}

export function buildLollipop(parent,{x,y,r,color,tilt=0}){
  const g=new THREE.Group();g.name='spiral-lollipop';g.position.set(x,y,-4);g.rotation.z=tilt;parent.add(g);
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.095,.11,10,16),new THREE.MeshStandardMaterial({color:'#b9ac8c',roughness:.7}));stick.position.y=-5;g.add(stick);
  const geo=new THREE.SphereGeometry(r,56,32),pos=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,.5+pos.getX(i)/(r*2),.5+pos.getY(i)/(r*2));uv.needsUpdate=true;
  const sweet=new THREE.Mesh(geo,finish(candyMap(color,true)));sweet.scale.z=.19;g.add(sweet);
  // A fine rolled edge gives the boiled sweet a rounded profile without a glowing rim.
  const edge=new THREE.Mesh(new THREE.TorusGeometry(r*.986,.035,8,80),new THREE.MeshStandardMaterial({color,roughness:.35}));g.add(edge);
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(.14,.12,.45,14),new THREE.MeshStandardMaterial({color:'#d0c3a3',roughness:.5}));collar.position.y=-r+.02;g.add(collar);
  return g;
}
