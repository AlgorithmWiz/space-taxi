import * as THREE from 'three';
import { beamSegments, mod } from './environment.js';

const material=(color,emit=0)=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.35,emissive:color,emissiveIntensity:emit});
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

export function buildObstacle(parent,o,color){
  const g=new THREE.Group();g.position.set(o.x,o.y,0);g.rotation.z=o.angle||0;parent.add(g);
  if(o.kind==='rock'){
    // The beveled box retains the same silhouette as its collision rectangle.
    const m=box(g,material('#3f465b'),0,0,-.3,o.w,o.h,2.2);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.18})));
    return g;
  }
  const colors={candy:'#ecbed1',wood:'#9e6d43',pole:'#8499ab',stem:'#417450',tree:'#5a473c',table:'#337c68',net:'#a1dacc',brick:'#434c68',cannon:'#5d3f58',magnet:'#804b77'};
  const body=box(g,material(colors[o.material]||'#263b51'),0,0,-.1,o.w,o.h,1.1);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.35}));body.add(edges);
  if(o.material==='candy')for(let y=-o.h/2+.3;y<o.h/2;y+=.9)box(g,material('#e37eab'),0,y,.47,o.w+.01,.4,.06);
  if(o.material==='stem'){
    for(let y=-o.h/2;y<o.h/2;y+=1.2){const ring=torus(g,material('#86c16b',.3),0,y,0,.57,.035);ring.rotation.x=Math.PI/2;}
  }
  if(o.material==='brick'||o.material==='cannon'){
    for(let y=-o.h/2+.5;y<o.h/2-.3;y+=1.3)box(g,material('#a8d5ef',.5),0,y,.49,Math.min(o.w*.45,.75),.22,.05);
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
    const mat=material(color,solid?.3:1.9), meshes=[0,1].map(()=>add(parent,new THREE.BoxGeometry(1,1,1),mat));
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

export function buildDressing(parent,level){
  const g=new THREE.Group();parent.add(g);const animations=[],ambientAnimations=[];
  const dark=material('#263748'),accent=material(level.color,.8),steel=material('#6d8497');
  const theme=level.theme;
  // Soft atmospheric color adds depth without outlines across the playfield.
  const haze=add(g,new THREE.PlaneGeometry(90,55),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{tint:{value:new THREE.Color(level.color)}},
    vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 p;uniform vec3 tint;void main(){float mist=exp(-dot(p*vec2(1.3,2.),p*vec2(1.3,2.))*2.);gl_FragColor=vec4(tint,mist*.06);}' }),0,3,-19);
  const dustPositions=new Float32Array(48*3);
  for(let i=0;i<48;i++)dustPositions.set([(i*17.17)%52-26,(i*7.39)%34-15,-11-(i%5)],i*3);
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:level.color,size:.055,transparent:true,opacity:.38,depthWrite:false}));g.add(dust);
  ambientAnimations.push(t=>{dust.position.x=Math.sin(t*.07)*1.4;dust.position.y=Math.sin(t*.11)*.65;});
  if(theme==='candy'){
    for(const [x,y,r,c]of[[-17,6,2.1,'#a5ef85'],[-12,-3,1.1,'#c59aff'],[19,10,1.6,'#ffa3cd']]){
      box(g,material('#bb9b70'),x,y-4,-3,.17,8,.17);ball(g,material(c,.2),x,y,-3,r);
      torus(g,material('#f8dce9'),x,y,-.9,r*.7,.06);
    }
    for(let i=0;i<9;i++)add(g,new THREE.OctahedronGeometry(.38),material(i%2?'#bb94f6':'#a6e1bb',.4),-21+(i%3)*2.1,-8+Math.floor(i/3)*2.3,-3);
    const hook=torus(g,material('#efc5d9'),19.05,3.5,0,1.5,.55,Math.PI);hook.rotation.z=-.7;
  }
  if(theme==='beach'){
    const water=box(g,new THREE.MeshStandardMaterial({color:'#285d82',metalness:.7,roughness:.18,transparent:true,opacity:.75}),0,-12.4,-4,48,1.2,15);
    for(let i=0;i<14;i++)line(g,[[-23+i*.9,-11.7,-2],[-14+i*2,-11.7,-2]],'#92dedc',.25);
    for(const x of [-17,1])box(g,material('#756253'),x,-10.5,-2,.35,5,.35);
    const parasol=add(g,new THREE.ConeGeometry(5,2,8,1,true),material('#9564b4'),12,7,-2);parasol.scale.z=.55;
    for(let i=0;i<4;i++)ball(g,material('#b3d7de'),-20+i*1.7,9.6,-3,1.3);
  }
  if(theme==='city'||theme==='reverse'){
    for(const x of [-23,23]){
      box(g,dark,x,-3,-2.6,2,20,2);
      for(let y=-10;y<7;y+=1.7)box(g,material(level.color,.8),x,y,-1.55,.55,.6,.04);
    }
    sign(g,'ORBITAL METROPOLIS',0,-12,-2,level.color,11);
  }
  if(theme==='training'){
    const colors=['#86d9ee','#ff9eca','#b8dd8b'];
    for(const [i,p]of level.pads.entries())line(g,[[p.x,p.y-.4,-2],[p.x,p.y-2.1,-2],[i%2?21:-21,p.y-2.1,-2]],colors[i%3],.4);
  }
  if(theme==='garden'){
    const vine=new THREE.CatmullRomCurve3(Array.from({length:80},(_,i)=>new THREE.Vector3(Math.sin(i*.7)*.53,-12+i*.31,-.25+Math.cos(i*.7)*.4)));
    add(g,new THREE.TubeGeometry(vine,100,.13,6,false),material('#89bb66'));
    for(let i=0;i<20;i++){const spore=ball(g,material('#c1ee7f',1),Math.sin(i*2.4)*17,-10+i*1.2,-4,.035);animations.push(t=>{spore.position.x+=Math.sin(t+i)*.001;});}
  }
  if(theme==='pong'){
    for(const x of [-17,17])box(g,material('#78684b'),x,-8.5,-2,.4,7,.4);
    for(const x of [-16,15]){const paddle=ball(g,material(x<0?'#62a8dc':'#d67da9'),x,-3.7,-1,1);paddle.scale.set(1.3,.11,.65);box(g,steel,x+(x<0?-1.2:1.2),-3.7,-1,1.2,.16,.25);}
  }
  if(theme==='cannon'){
    for(const x of [-22,22]){ball(g,steel,x,-11,-.4,.75);const barrel=add(g,new THREE.CylinderGeometry(.25,.4,2,16),dark,x+(x<0?.4:-.4),-10.3,0);barrel.rotation.z=x<0?-.6:.6;ball(g,material('#ffb469',1.2),x+(x<0?1:-1),-9.5,.2,.22);}
  }
  if(theme==='meteors'){
    for(let i=0;i<9;i++){const rock=add(g,new THREE.DodecahedronGeometry(1.1+(i%3)*.4),material('#716a52'),-22+i*5,-11+Math.sin(i*2)*1.2,-3);rock.scale.y=2.2;}
  }
  if(theme==='magnet'){
    for(const x of [-16,-1,14]){torus(g,material('#955987'),x,11,-1.5,2.5,.43,Math.PI);for(const s of [-1,1]){box(g,material('#955987'),x+s*2.5,10,-1.5,.8,2,.8);box(g,material('#9fbdff',1.4),x+s*2.5,8.8,-1.5,.8,.5,.8);}for(let i=0;i<3;i++)line(g,[[x-1.3+i*1.3,7,-2],[x-1.3+i*1.3,4,-2]],'#bda2ff',.22);}
  }
  if(theme==='blackhole'){
    ball(g,new THREE.MeshBasicMaterial({color:'#020309'}),0,2,.5,1.3);
    for(let i=0;i<5;i++){const r=torus(g,material(i%2?'#ffbda5':'#b9a0ff',1.8),0,2,.25,1.6+i*.43,.025+i*.015);r.rotation.x=.22+i*.1;animations.push(t=>r.rotation.z=t*(.13+i*.025));}
    const halo=add(g,new THREE.CircleGeometry(5,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time;void main(){float r=length(p);float spiral=.5+.5*sin(atan(p.y,p.x)*3.+r*28.+time);gl_FragColor=vec4(.55,.32,.95,spiral*pow(1.-r,2.)*.24);}' }),0,2,-.2);
    animations.push(t=>halo.material.uniforms.time.value=t);
  }
  if(theme==='turbo'){
    box(g,material('#64594b'),-.5,1.5,-3,2.2,5,2);const roof=add(g,new THREE.ConeGeometry(2,2,4),material('#b26e62'),-.5,5,-3);roof.rotation.y=Math.PI/4;
    torus(g,accent,-.5,2.3,-1.9,.66,.06);sign(g,'T',-.5,2.3,-1.7,level.color,1.5);
    sign(g,'TURBO WORKS',0,-5,-2,level.color,9);
  }
  if(theme==='snow'){
    for(const [x,height]of[[-16,13],[5,13],[17,6]])for(let i=0;i<4;i++){
      const cone=add(g,new THREE.ConeGeometry(height*.26*(1-i*.17),height*.38,8),material(i%2?'#b7d5d9':'#719e98'),x,-9+height*.22+i*height*.18,-2.2);
      cone.scale.z=.65;
    }
    box(g,material('#9ecccc'),0,-12.2,-3,48,1,6);
    for(let i=0;i<55;i++){const flake=ball(g,material('#d6eced',.3),(i*13.7)%48-24,(i*6.7)%30-12,-4,.045);animations.push(t=>{flake.position.y=18-mod(t*.7+i*.7,32);flake.position.x=(i*13.7)%48-24+Math.sin(t*.65)*.6;});}
  }
  if(theme==='radio'){
    for(const [x,y]of[[-23,3],[-4,4],[11,6],[23,3]]){
      box(g,steel,x,y+1,-1,.13,2,.13);const dish=add(g,new THREE.SphereGeometry(.65,16,12,0,Math.PI*2,0,Math.PI/2),accent,x,y+2,-1);dish.rotation.z=.9;
      for(let i=0;i<3;i++){const ring=torus(g,new THREE.MeshBasicMaterial({color:level.color,transparent:true,opacity:.13,depthWrite:false}),x,y+2,-2,1.4+i*1.3,.02);animations.push(t=>{ring.scale.setScalar(1+Math.sin(t*2+i)*.15);});}
    }
  }
  if(theme==='moving'){
    for(const y of [8.2,1.2,-5.8,-11.8])for(let x=-23;x<24;x+=1.2){const link=torus(g,steel,x,y,-1.8,.27,.055);link.scale.x=1.7;}
    for(const x of [-22,22])for(const y of [9,2,-5,-11]){const gear=add(g,new THREE.CylinderGeometry(.65,.65,.3,10),steel,x,y,-1.8);gear.rotation.x=Math.PI/2;animations.push(t=>gear.rotation.y=t*.4);}
  }
  if(theme==='museum'){
    sign(g,'WELCOME TO MUSEWORLD',0,11,-3,level.color,19);
    // A rescue vehicle, an archive sentry and a robot salute the classic bonus room.
    const van=new THREE.Group();van.position.set(-5,-9,-1);g.add(van);box(van,material('#e3e8d6'),0,.7,0,2.4,1.1,1);box(van,material('#ad6874'),0,1.4,0,.4,.2,.5);box(van,material('#b05b68'),0,.7,.55,.2,.6,.03);box(van,material('#b05b68'),0,.7,.55,.6,.2,.03);
    for(const x of [-.8,.8])ball(van,dark,x,.1,.4,.25);
    for(const x of [-17,17]){box(g,steel,x,.8,-1,.7,1.1,.6);ball(g,accent,x,1.8,-1,.5);for(const s of [-1,1])box(g,dark,x+s*.23,.1,-1,.15,.5,.2);}
  }
  return {update(time,ambientTime=time){for(const animate of animations)animate(time);for(const animate of ambientAnimations)animate(ambientTime);}};
}
