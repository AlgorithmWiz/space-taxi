import * as THREE from 'three';
import { beamSegments } from './environment.js';
import { surfaceMaterial } from './surface-materials.js';
import { buildCandyCane } from './candy-props.js';
import { CAVE_THEMES, buildCaveWall } from './caves.js';

const material=(color,emit=0)=>new THREE.MeshStandardMaterial({color,roughness:.83,metalness:.14,emissive:color,emissiveIntensity:emit});
function add(group,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);group.add(m);return m;}
const box=(g,m,x,y,z,w,h,d)=>add(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const ball=(g,m,x,y,z,r)=>add(g,new THREE.SphereGeometry(r,20,14),m,x,y,z);
function line(g,points,color,opacity=.5){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity}));g.add(l);return l;}
function sign(g,text,x,y,z,color='#d9f4d5',width=5){
  const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font='bold 37px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  return add(g,new THREE.PlaneGeometry(width,width*96/512),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}),x,y,z);
}
function torus(g,mat,x,y,z,r,tube=.06,arc=Math.PI*2){return add(g,new THREE.TorusGeometry(r,tube,8,64,arc),mat,x,y,z);}

export function buildObstacle(parent,o,color,theme){
  const g=new THREE.Group();g.position.set(o.x,o.y,0);g.rotation.z=o.angle||0;parent.add(g);
  if(o.material==='candy'){buildCandyCane(g,o);return g;}
  if(CAVE_THEMES.has(theme)){buildCaveWall(g,o,theme);return g;}
  if(o.kind==='rock'){
    // The beveled box retains the same silhouette as its collision rectangle.
    const m=box(g,surfaceMaterial('rock','#62636a'),0,0,-.3,o.w,o.h,2.2);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.18})));
    return g;
  }
  const colors={candy:'#b6a993',wood:'#69503a',pole:'#847963',stem:'#4d633b',tree:'#594639',table:'#34594e',net:'#b8bbb0',brick:'#5c534b',cannon:'#84615e',magnet:'#625775'};
  const kind={candy:'enamel',wood:'timber',tree:'timber',brick:'stone',cannon:'stone',table:'felt',stem:'leaf'}[o.material]||'metal';
  if(o.material==='tree'){
    add(g,new THREE.CylinderGeometry(o.w*.32,o.w*.5,o.h,12),surfaceMaterial('timber',colors.tree),0,0,0);
    return g;
  }
  if(o.material==='pole'){
    add(g,new THREE.CylinderGeometry(o.w*.45,o.w*.5,o.h,20),material('#948f79'),0,0,0);return g;
  }
  if(o.material==='stem'){
    add(g,new THREE.CylinderGeometry(o.w*.4,o.w*.5,o.h,12),surfaceMaterial('leaf',colors.stem));
    for(let y=-o.h/2+.4;y<o.h/2;y+=1.8){const joint=torus(g,material('#748453'),0,y,0,.39,.018);joint.rotation.x=Math.PI/2;}
    return g;
  }
  const body=box(g,surfaceMaterial(kind,colors[o.material]||'#535a61'),0,0,-.1,o.w,o.h,1.1);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color:'#b9b3a8',transparent:true,opacity:.16}));body.add(edges);
  if(o.material==='brick'||o.material==='cannon'){
    for(let y=-o.h/2+.5;y<o.h/2-.3;y+=1.3){
      box(g,material('#393936'),0,y,.49,o.w,.045,.05);
      for(let x=-o.w/2+.65;x<o.w/2;x+=1.3)box(g,material('#393936'),x,y+.6,.49,.04,1.2,.05);
    }
  }
  return g;
}

export function buildHazard(parent,h,color){
  const g=new THREE.Group();parent.add(g);
  const tint=h.kind==='snow'?'#d2f8ff':h.kind==='star'?'#ffe7a1':h.kind==='rebound'?'#ffd58a':h.kind==='pong'?'#e8fff1':h.kind==='cannon'?'#ff9b65':color;
  if(h.kind==='snow'){
    for(let i=0;i<3;i++){const arm=box(g,material(tint,1),0,0,0,h.radius*2,.05,.06);arm.rotation.z=i*Math.PI/3;}
  }else{
    const geo=['pong','cannon','rebound'].includes(h.kind)?new THREE.SphereGeometry(h.radius,18,12):new THREE.IcosahedronGeometry(h.radius,0);
    add(g,geo,material(tint,h.kind==='cannon'?2:1));
    if(h.kind==='star')for(let i=0;i<4;i++){const ray=box(g,material(tint,2),0,0,0,h.radius*3,.06,.06);ray.rotation.z=i*Math.PI/4;}
    if(h.kind==='rebound')torus(g,material(tint,2),0,0,0,h.radius*1.45,.025);
  }
  return g;
}

export function buildMechanisms(parent,level){
  const beams=(level.beams||[]).map(spec=>{
    const color=spec.color||(spec.gate?'#dfafff':spec.kind==='electric'?'#94f7df':spec.kind==='chain'?'#a3b4c7':'#ff657c');
    const solid=['shutter','chain','curtain'].includes(spec.kind);
    const mat=material(spec.kind==='curtain'?'#713a40':color,solid?0:1.2), meshes=[0,1].map(()=>add(parent,new THREE.BoxGeometry(1,1,1),mat));
    let wire=null;
    if(spec.ax!==undefined){
      wire=line(parent,[[spec.ax,spec.ay,.3],[spec.bx,spec.by,.3]],color,.3);
      for(const [x,y]of[[spec.ax,spec.ay],[spec.bx,spec.by]])add(parent,new THREE.OctahedronGeometry(.42),material(color,1),x,y,.3);
    }
    if(spec.period)for(const s of [-1,1]){
      const vertical=spec.h>spec.w,x=(spec.x||0)+(vertical?0:s*spec.w/2),y=(spec.y||0)+(vertical?s*spec.h/2:0);
      ball(parent,material('#657d90'),x,y,0,.22);torus(parent,material(color,1),x,y,.4,.23,.03);
    }
    if(spec.gate)sign(parent,spec.gate.toUpperCase(),spec.x+.8,spec.y+1,1,color,1.2);
    return {spec,meshes,wire};
  });
  const portals=(level.portals||[]).map((p,i)=>{
    const g=new THREE.Group();g.position.set(p.x,p.y,0);parent.add(g);
    const ring=torus(g,material(p.color,2),0,0,.3,1.15,.095);
    const rim=torus(g,material('#476075'),0,0,0,1.35,.1);
    const face=add(g,new THREE.CircleGeometry(1.05,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},tint:{value:new THREE.Color(p.color)}},vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time;uniform vec3 tint;void main(){float r=length(p);float spiral=.5+.5*sin(atan(p.y,p.x)*5.+r*12.-time*3.);gl_FragColor=vec4(tint,(1.-r)*spiral*.4);}' }));
    sign(g,`${i+1} → ${p.to+1}`,0,-1.8,.3,p.color,2.4);
    return {g,ring,rim,face};
  });
  const switches=(level.switches||[]).map(s=>{
    const g=new THREE.Group();g.position.set(s.x,s.y,0);parent.add(g);
    const gem=add(g,new THREE.OctahedronGeometry(.43),material('#e3ffe2',1.7));torus(g,material('#c6f778',1),0,0,0,.85,.025);
    sign(g,s.label,0,-1.2,.5,'#dcf5c8',2.2);return {g,gem,spec:s};
  });
  return {update(time,switchFlags,resetTime){
    for(const b of beams){
      const segments=beamSegments(b.spec,time,switchFlags,resetTime);
      b.meshes.forEach((m,i)=>{const s=segments[i];m.visible=!!s&&s.ax===undefined;if(m.visible){m.position.set(s.x,s.y,.05);m.scale.set(Math.max(.01,s.w),Math.max(.01,s.h),['shutter','curtain'].includes(b.spec.kind)?1.2:.22);}});
      if(b.wire)b.wire.material.opacity=.2+Math.sin(time*2)*.08;
    }
    for(const p of portals){p.ring.rotation.z=time*.3;p.face.material.uniforms.time.value=time;}
    for(const s of switches){s.gem.rotation.y=time;s.gem.rotation.z=time*.5;const active=s.spec.toggles?.every(flag=>switchFlags.has(flag));s.gem.material.color.set(active?'#c6ff8f':'#edf7ff');}
  }};
}

export { buildLevelBackdrop as buildDressing } from './level-backdrops.js';
