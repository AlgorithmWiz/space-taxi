import * as THREE from 'three';
import {artFor} from './art-direction.js';
import {surfaceMaterial} from './surface-materials.js';
import {padPose,obstaclePose,windAngle} from './environment.js';
import {buildLollipop} from './candy-props.js';
import {CAVE_THEMES,buildCaveSystem} from './caves.js';
import {buildRadarDish} from './radar.js';
import {CROSSFIRE_GUNS,crossfireGunPose} from './crossfire.js';

const surface=(color,metalness=.12)=>new THREE.MeshStandardMaterial({color,roughness:.88,metalness});
const unlit=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1});
function mesh(g,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);g.add(m);return m;}
const box=(g,m,x,y,z,w,h,d)=>mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const sphere=(g,m,x,y,z,r)=>mesh(g,new THREE.SphereGeometry(r,18,12),m,x,y,z);
function line(g,points,color,opacity=.3){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));g.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity})));}
function tube(g,points,radius,mat){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,radius,8,false),mat);}
function ring(g,mat,x,y,z,r,tube=.05,arc=Math.PI*2){return mesh(g,new THREE.TorusGeometry(r,tube,8,48,arc),mat,x,y,z);}
function placard(g,text,x,y,z,w,color){
  const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle='#151c21';ctx.fillRect(0,0,768,128);ctx.fillStyle=color;ctx.font='600 44px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,66,730);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return mesh(g,new THREE.PlaneGeometry(w,w/6),new THREE.MeshBasicMaterial({map}),x,y,z);
}
function terrain(g,color,y,z,height,seed=1){
  const shape=new THREE.Shape();shape.moveTo(-65,-55);shape.lineTo(-65,y);
  for(let i=0;i<=30;i++){const x=-65+i*4.4;shape.lineTo(x,y+Math.sin(i*1.67+seed)*height*.4+Math.sin(i*.56+seed)*height*.6);}
  shape.lineTo(67,-55);shape.closePath();return mesh(g,new THREE.ShapeGeometry(shape),unlit(color),0,0,z);
}
function wallTexture(kind,color){
  const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,512,512);
  // Deterministic patina keeps broad surfaces tactile without animated visual noise.
  for(let i=0;i<1400;i++){ctx.fillStyle=i%2?'#0000000b':'#ffffff07';ctx.fillRect((i*97)%512,(i*193)%512,1+i%9,1+i%3);}
  ctx.strokeStyle='#0000003b';ctx.lineWidth=3;
  const row=kind==='stone'?64:128,col=kind==='stone'?128:128;
  for(let y=0;y<512;y+=row){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();for(let x=(y/row%2)*col/2;x<512;x+=col){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+row);ctx.stroke();if(kind!=='stone'){ctx.fillStyle='#a4a8a02f';ctx.fillRect(x+9,y+9,3,3);ctx.fillRect(x+col-12,y+row-12,3,3);}}}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(4,3);return map;
}
function indoor(g,type,color){
  const map=wallTexture(type,color);
  mesh(g,new THREE.PlaneGeometry(110,75),new THREE.MeshStandardMaterial({map,color:'#d8d9d6',roughness:1}),0,-5,-24);
}
function tree(g,x,y,z,h,color,snow=false){
  const seed=x,root=new THREE.Group();root.name='wind-tree';root.position.set(x,y,z);g.add(root);g=root;x=0;y=0;z=0;
  const trunk=mesh(g,new THREE.CylinderGeometry(h*.007,h*.018,h,9),surface('#494438'),x,y+h/2,z);
  const vertices=[],colors=[],branches=[],base=new THREE.Color(color),snowColor=new THREE.Color('#a5b2b0');
  const vertex=(v,c)=>{vertices.push(...v);colors.push(c.r,c.g,c.b);};
  for(let row=0;row<15;row++)for(let side=0;side<6;side++){
    const u=row/15,a=side*Math.PI/3+row*1.71+seed,r=h*.25*(1-u)*(1+Math.sin(row*3+side)*.12);
    const root=[x,y+h*(.13+u*.83),z],tip=[x+Math.cos(a)*r,root[1]-.08*r,z+Math.sin(a)*r];
    branches.push(...root,...tip);
    for(let f=0;f<8;f++){
      const t=(f+1)/9,px=x+(tip[0]-x)*t,py=root[1]-.1*r*t,pz=z+(tip[2]-z)*t;
      const len=r*.33*(1-t*.7),spread=r*.18*(1-t*.55),tone=base.clone().multiplyScalar(.65+.35*Math.sin(f*3+row)**2);
      const v1=[px-Math.sin(a)*spread,py+len*.25,pz+Math.cos(a)*spread];
      const v2=[px+Math.cos(a)*len,py-len*.1,pz+Math.sin(a)*len];
      const v3=[px+Math.sin(a)*spread,py+len*.25,pz-Math.cos(a)*spread];
      vertex(v1,tone);vertex(v2,tone);vertex(v3,tone);
      // Hanging needle sprays keep the crown legible from the side-on game camera.
      vertex([px-spread,py+len*.3,pz+.015],tone);vertex([px+spread,py+len*.2,pz+.02],tone);vertex([px+spread*.2,py-len*.9,pz+.04],tone);
      if(snow&&(f+side+row)%3!==0){const snowTone=snowColor.clone().multiplyScalar(.82+u*.18);vertex([v1[0],v1[1]+.035,v1[2]],snowTone);vertex([px+Math.cos(a)*len*.7,py+.04,pz+Math.sin(a)*len*.7],snowTone);vertex([v3[0],v3[1]+.035,v3[2]],snowTone);}
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  mesh(g,geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));
  const twigs=new THREE.BufferGeometry();twigs.setAttribute('position',new THREE.Float32BufferAttribute(branches,3));g.add(new THREE.LineSegments(twigs,new THREE.LineBasicMaterial({color:'#59604d',transparent:true,opacity:.5})));
  const crown=mesh(g,new THREE.ConeGeometry(h*.021,h*.16,9),surface(color),0,h*.925,0);crown.rotation.y=seed;
  if(snow)mesh(g,new THREE.ConeGeometry(h*.012,h*.11,7),surface('#a5b2b0'),-.005*h,h*.935,.008*h);
  return root;
}

export function buildLevelBackdrop(parent,level){
  const g=new THREE.Group();g.name=`original-motif-${level.theme}`;parent.add(g);
  const p=artFor(level),theme=level.theme,animations=[],ambient=[];
  const iron=surface('#333b40',.45),steel=surface('#6e777c',.5),dark=surface('#20272c'),warm=surface('#8d7651');
  const lamp=unlit(p.accent,.7);
  const interior=['training','pong','puzzle','magnet','electric','barrier','rebound','shifting','laser','moving','museum'];
  if(interior.includes(theme))indoor(g,['maze','puzzle','museum'].includes(theme)?'stone':'metal',p.horizon);
  if(CAVE_THEMES.has(theme)){const cave=buildCaveSystem(g,level);ambient.push(t=>cave.update(t));}

  if(theme==='candy'){
    // The candy cane and sweets are original geometry cues, rendered as aged enamel.
    terrain(g,'#262528',-13,-20,2,3);terrain(g,'#37302c',-17,-12,1.2,5);
    for(const [x,y,r,color,tilt]of[[-17,6,2.1,'#5f784b',-.05],[-12,-3,1.1,'#685379',.06],[19,10,1.6,'#994e5b',-.035]])buildLollipop(g,{x,y,r,color,tilt});
    for(let i=0;i<9;i++)sphere(g,surface(i%2?'#806b83':'#697369'),-21+(i%3)*2.1,-8+Math.floor(i/3)*2.3,-3,.3);
    for(const x of [-25.2,25.2]){box(g,surface('#625148'),x,0,-3,.7,29,2);for(let y=-13;y<15;y+=1.3)box(g,surface('#923f48'),x,y,-1.98,.7,.6,.03);}
  }
  if(theme==='beach'){
    terrain(g,'#40484a',-8,-35,5,5);terrain(g,'#53524c',-13,-28,3,2);
    const water=mesh(g,new THREE.PlaneGeometry(150,65),new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform float time;void main(){float wave=pow(.5+.5*sin(v.y*460.+sin(v.x*23.+time*.2)*2.),20.);float shine=exp(-pow((v.x-.67)*9.,2.));vec3 c=mix(vec3(.035,.095,.12),vec3(.14,.21,.23),v.y);c+=vec3(.2,.17,.11)*wave*shine*.35;gl_FragColor=vec4(c,1.);}' }),0,-42,-18);ambient.push(t=>water.material.uniforms.time.value=t);
    // The landing objects themselves are built with their pads, so there is no
    // separate generic platform laid over the cloud, chair or umbrella.
    const drink=mesh(g,new THREE.CylinderGeometry(.2,.16,.8,14),surface('#9aab9d'),-7,-7.55,-1.4);
    line(g,[[-7,-7.25,-1.4],[-6.9,-6.85,-1.4],[-6.7,-6.65,-1.4]],'#cdc6b4',.9);
  }
  if(theme==='city'||theme==='reverse'){
    const map=wallTexture('stone',theme==='city'?'#3c454c':'#56483e');
    for(let layer=0;layer<2;layer++)for(let i=0;i<14;i++){
      const x=-44+i*6.6,w=4+(i%3),h=13+((i*13+level.number*7)%19),z=-32+layer*10;
      const building=box(g,new THREE.MeshStandardMaterial({map,color:layer?'#8a949c':'#596773',roughness:.95}),x,-39+h/2,z,w,h+38,3);
      for(let y=-13;y<-20+h;y+=2.2)for(let dx=-w/2+.6;dx<w/2-.3;dx+=1.3)if((Math.floor(y)+i+Math.round(dx*10))%3===0)box(g,unlit(theme==='city'?'#a69c7f':'#ce9d73',.35),x+dx,y,z+1.52,.32,.6,.025);
      if(i%3===0)box(g,iron,x,-20+h+.9,z,w*.55,1.8,2);
      building.userData.background=true;
    }
  }
  if(theme==='training'){
    for(const x of [-26,-13,0,13,26])box(g,iron,x,0,-16,.4,35,1);
    for(const y of [-13,-4,5,14]){box(g,iron,0,y,-16,55,.4,1);for(let x=-26;x<25;x+=6){const strut=box(g,steel,x+3,y+1,-16,6,.13,.2);strut.rotation.z=.25;}}
    placard(g,'FLIGHT TEST / 04',0,13,-13,13,p.accent);
    for(const [i,pad]of level.pads.entries())line(g,[[pad.x,pad.y-.8,-8],[pad.x,pad.y-2,-8],[i%2?24:-24,pad.y-2,-8]],'#b5a572',.18);
  }
  if(theme==='garden'||theme==='orbital'){
    if(theme==='garden'){
      terrain(g,'#23392e',-11,-30,8,4);terrain(g,'#203529',-15,-16,5,1);
      for(let i=0;i<15;i++)tree(g,-36+i*5,-17,-19,9+(i*7%13),'#304b36');
      const vine=new THREE.Group();vine.position.y=-13;g.add(vine);
      tube(vine,Array.from({length:70},(_,i)=>[Math.sin(i*.63)*.35,i*26/69,-.4+Math.cos(i*.63)*.25]),.1,surface('#596d3f'));
      animations.push(t=>{vine.scale.y=obstaclePose(level.obstacles[0],t).h/26;});
      for(const pad of level.pads){
        const side=Math.sign(pad.x),inner=pad.x-side*pad.w/2;
        const petiole=tube(g,[[side*.3,pad.y-.55,-.3],[side*.7,pad.y-.35,-.2],[inner+side*.2,pad.y-.21,-.1]],.11,surface('#657a48'));
        animations.push(t=>{petiole.visible=padPose(pad,t).growth>.01;});
      }
    }else{
      const planet=sphere(g,surface('#3e5563'),23,13,-40,9);planet.scale.z=.8;
      for(const x of [-26,26]){const dish=mesh(g,new THREE.SphereGeometry(4,24,12,0,Math.PI*2,0,Math.PI/2),steel,x,-9,-13);dish.rotation.z=x<0?-.7:.7;box(g,iron,x,-15,-13,.8,8,.8);}
    }
    for(let i=0;i<18;i++){const spore=sphere(g,unlit('#b2be96',.4),Math.sin(i*2.4)*22,-12+i*1.6,-9,.025);ambient.push(t=>{spore.position.y=-12+(i*1.6+t*.1)%29;});}
  }
  if(theme==='pong'){
    for(const x of [-17,17])box(g,surface('#665444'),x,-9,-2,.5,8,.5);
    for(const x of [-16,15]){const paddle=sphere(g,surface(x<0?'#6c5447':'#4b5666'),x,-3.7,-1,1);paddle.scale.set(1.3,.1,.65);box(g,warm,x+(x<0?-1.2:1.2),-3.7,-1,1.2,.16,.25);}
    for(let x=-33;x<=33;x+=6)box(g,surface('#473d32'),x,0,-17,.2,30,.2);
    box(g,surface('#30483e'),0,-5.2,-3,40,.15,6);
    for(const z of [-5.8,-.8])box(g,surface('#b7b7a5'),0,-5.08,z,39,.025,.06);
    placard(g,'TABLE 06 / MATCH IN PROGRESS',0,13,-16,19,'#b9ad93');
  }
  if(theme==='teleport'){
    for(const portal of level.portals){ring(g,iron,portal.x,portal.y,-2,1.65,.15);for(const side of [-1,1])box(g,steel,portal.x+side*1.9,portal.y,-3,.25,3.6,.3);}
  }
  if(theme==='puzzle'||theme==='maze'){
    if(theme==='puzzle'){
      // Five octagonal bays around an open upper center, as in Puzzler.
      for(const [x,y,w,h,c]of[[-17,8,13,11,'#7c5450'],[17,8,13,11,'#a39d71'],[-17,-6,13,15,'#946b52'],[0,-6,20,15,'#76607f'],[17,-6,13,15,'#586482']]){
        const cut=2,pts=[[-w/2+cut,-h/2],[w/2-cut,-h/2],[w/2,-h/2+cut],[w/2,h/2-cut],[w/2-cut,h/2],[-w/2+cut,h/2],[-w/2,h/2-cut],[-w/2,-h/2+cut]];
        const shape=new THREE.Shape();pts.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));shape.closePath();
        mesh(g,new THREE.ShapeGeometry(shape),surface('#26292b'),x,y,-10);
        line(g,[...pts,pts[0]].map(([px,py])=>[x+px,y+py,-9.95]),c,.75);
        for(const s of [-1,1])box(g,surface(c),x+s*(w/2+.28),y,-10,.45,h-1,1);
      }
    }
    for(const x of [-25,25])for(const y of [-8,4,13]){box(g,iron,x,y,-10,.6,1.1,.5);box(g,lamp,x,y,-9.73,.3,.6,.025);}
  }
  if(theme==='cannon'){
    terrain(g,'#343436',-8,-33,5,7);terrain(g,'#46403d',-13,-21,2,5);
    // Recessed masonry gives the two foreground buildings depth without
    // introducing decorative obstacles into the central firing lanes.
    for(const side of [-1,1]){
      box(g,surfaceMaterial('stone','#735652'),side*27,2,-2.5,6,32,5);
      for(let y=-11;y<17;y+=3.5){
        box(g,iron,side*26.4,y,.5,1.3,1.9,.08);
        for(const offset of [-.3,.3])box(g,steel,side*26.4+offset,y,.56,.06,1.9,.08);
      }
      box(g,surface('#b49b87'),side*24.35,2,.5,.3,31,.3);
    }
    for(const [index,gun]of CROSSFIRE_GUNS.entries()){
      const mount=new THREE.Group();mount.name=`crossfire-gun-${index}`;mount.position.set(gun.x,gun.y,0);g.add(mount);
      mesh(mount,new THREE.CylinderGeometry(.9,1.2,.5,24),iron,0,-.88,0);
      for(const side of [-1,1])box(mount,iron,side*.65,-.1,0,.25,1.2,1.1);
      sphere(mount,steel,0,0,0,.52);
      const barrelGroup=new THREE.Group();barrelGroup.name='crossfire-barrel';mount.add(barrelGroup);
      const barrel=new THREE.Group();barrelGroup.add(barrel);
      mesh(barrel,new THREE.CylinderGeometry(.23,.36,1.8,24,1,true),steel,0,.9,0);
      mesh(barrel,new THREE.CircleGeometry(.21,24),dark,0,1.801,0).rotation.x=-Math.PI/2;
      for(const y of [.1,.8,1.65])ring(barrel,iron,0,y,0,.3,.055).rotation.x=Math.PI/2;
      const flash=sphere(barrel,unlit('#ffd7a0'),0,1.87,0,.35);flash.name='crossfire-muzzle-flash';flash.scale.y=1.6;
      animations.push(t=>{const pose=crossfireGunPose(gun,t);barrelGroup.rotation.z=pose.angle;barrel.position.y=-pose.recoil;flash.visible=pose.flash;});
      for(const side of [-1,1]){const bolt=mesh(mount,new THREE.CylinderGeometry(.15,.15,.1,6),warm,side*.81,.05,0);bolt.rotation.z=Math.PI/2;}
    }
    for(let i=0;i<8;i++)box(g,surface('#4e4542'),-27+i*8,-15,-12,4.8,2,3);
  }
  if(theme==='crystal'){
    for(let i=0;i<18;i++){
      const x=-39+i*4.5,h=1+(i*7%6),mat=surface(theme==='crystal'?(i%2?'#695476':'#4e6471'):'#615c54',.24);
      const rock=mesh(g,theme==='crystal'?new THREE.ConeGeometry(.8,h,5):new THREE.DodecahedronGeometry(1.2,0),mat,x,-12+Math.sin(i*2),-8-i%3);rock.scale.y=theme==='crystal'?1:1.3;rock.rotation.z=Math.sin(i)*.4;
    }
  }
  if(theme==='magnet'){
    for(const x of [-16,-1,14]){
      ring(g,surface('#69515a',.5),x,11,-1.5,2.5,.43,Math.PI);
      for(const s of [-1,1]){box(g,iron,x+s*2.5,10,-1.5,.8,2,.8);box(g,surface(s<0?'#936466':'#73899a'),x+s*2.5,8.8,-1.5,.8,.5,.8);}
      for(let i=0;i<5;i++)line(g,[[x-2+i,7,-6],[x-2+i,3,-6],[x-2+i,-4,-6]],'#8c9b9a',.12);
    }
    for(const x of [-27,27])box(g,steel,x,0,-12,2,32,3);
  }
  if(theme==='blackhole'){
    sphere(g,unlit('#010104'),0,2,.5,1.3);
    const disk=mesh(g,new THREE.PlaneGeometry(9,7),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time;void main(){vec2 q=p*vec2(1.,1.4);float r=length(q),a=atan(q.y,q.x);float band=exp(-abs(r-.45)*23.);float threads=.62+.2*sin(r*220.+sin(a*8.-time)*1.8)+.16*sin(a*19.+r*93.-time*.7);float arc=.7+.3*cos(a-.4);vec3 c=mix(vec3(.28,.20,.15),vec3(1.,.78,.48),band)*threads*arc;gl_FragColor=vec4(c,band*.9);}' }),0,2,.1);animations.push(t=>disk.material.uniforms.time.value=t);
    const points=new Float32Array(120*3);for(let i=0;i<120;i++){const a=i*2.4,r=3+(i%20)*.22;points.set([Math.cos(a)*r,2+Math.sin(a)*r*.45,-1],i*3);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(points,3));g.add(new THREE.Points(geo,new THREE.PointsMaterial({color:'#b6a18f',size:.035,transparent:true,opacity:.4})));
  }
  if(theme==='turbo'||theme==='refinery'){
    if(theme==='turbo'){
      terrain(g,'#3d3830',-12,-30,3,2);
      box(g,surface('#77634a'),-.5,1.5,-3,2.2,5,2);const roof=mesh(g,new THREE.ConeGeometry(2,2,4),surface('#7e4f42'),-.5,5,-3);roof.rotation.y=Math.PI/4;
      ring(g,steel,-.5,2.3,-1.9,.66,.06);placard(g,'T',-.5,2.3,-1.7,1.4,p.accent);
    }else sphere(g,unlit('#a46131'),22,9,-43,10);
    for(const x of [-26,-16,17,27]){
      box(g,iron,x,-7,-16,4,14,4);mesh(g,new THREE.CylinderGeometry(1.8,1.8,2,16),steel,x,.5,-16);
      tube(g,[[x,-5,-12],[x+3,-5,-12],[x+3,8,-12]],.2,steel);
      for(let i=0;i<5;i++)box(g,warm,x,-11+i*2,-13.95,2.7,.15,.04);
    }
  }
  if(theme==='mines'){
    const moon=sphere(g,surface('#263b35'),26,6,-45,11);moon.scale.y=.75;
    for(const x of [-27,27]){box(g,iron,x,-2,-12,.3,27,.3);for(const y of [-12,-4,4,12]){box(g,steel,x,y,-11,.9,.8,.7);line(g,[[x,y,-12],[x<0?-34:34,y+3,-12]],'#748776');}}
    for(let i=0;i<5;i++){const mine=sphere(g,surface('#44564d'),-25+i*13,-16,-18,.8);for(let j=0;j<3;j++)box(mine,iron,0,0,0,.1,2,.1).rotation.z=j*Math.PI/3;}
  }
  if(theme==='electric'){
    for(const x of [-26,26])for(const y of [-7,0,7,14]){
      mesh(g,new THREE.CylinderGeometry(.55,.75,3.4,12),surface('#817c66'),x,y,-7);
      for(let i=0;i<7;i++)ring(g,surface('#596f67'),x,y-1.4+i*.45,-7,1,.1).rotation.x=Math.PI/2;
    }
    for(const y of [-6,-.5,5,10]){box(g,dark,0,y,-17,49,1.3,2);line(g,[[-26,y,-10],[26,y,-10]],'#81998d',.2);}
  }
  if(theme==='snow'||theme==='radio'){
    terrain(g,theme==='snow'?'#788b97':'#464b4a',-1,-34,12,6);terrain(g,theme==='snow'?'#4c6469':'#373e39',-9,-22,7,3);
    for(let i=0;i<15;i++){const pine=tree(g,-39+i*5.5,-15,-14,4+(i*7%6),'#38483e',theme==='snow');if(theme==='snow')ambient.push(t=>pine.rotation.z=windAngle(t+i*.2)*.7);}
    if(theme==='snow'){
      for(const o of level.obstacles){const pine=tree(g,o.x,o.y-o.h/2,0,o.h,'#536856',true);pine.userData.collisionTree=true;animations.push(t=>pine.rotation.z=windAngle(t));}
      for(let i=0;i<18;i++){const drift=sphere(g,surface('#aebcb8'),-29+i*3.4,-10.6,-3.5,1.1);drift.scale.set(2,.5,1.5);}
      const points=new Float32Array(150*3);for(let i=0;i<150;i++)points.set([(i*13.7)%65-32,(i*6.7)%39-14,-5-i%12],i*3);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(points,3));const snow=new THREE.Points(geo,new THREE.PointsMaterial({color:'#d6dcd7',size:.05,transparent:true,opacity:.6}));g.add(snow);ambient.push(t=>{snow.position.y=-(t*.8%6);snow.position.x=Math.sin(t*.3)*1.5;});
    }else for(const [i,tower]of level.obstacles.filter(o=>o.material==='brick').entries()){
      const radar=buildRadarDish(g,tower.x,tower.y+tower.h/2,i);ambient.push(t=>radar.update(t));
    }
  }
  if(theme==='barrier'){
    for(const x of [-24,24])for(let i=0;i<9;i++)box(g,surface(i%2?'#522c2f':'#3b2328'),x+i*.24-1,0,-7,.28,31,1.5);
    box(g,warm,0,15,-8,51,.8,2);box(g,surface('#42342e'),0,-16,-9,60,3,10);
    for(const x of [-21,21]){const light=mesh(g,new THREE.ConeGeometry(.65,1.6,16),iron,x,14,-5);light.rotation.z=x<0?-.4:.4;}
  }
  if(theme==='rebound'){
    for(const o of level.obstacles){const rail=box(g,surface('#56605d'),o.x,o.y,-4,o.w+1.1,o.h,.8);rail.rotation.z=o.angle;}
    for(const x of [-26,26])for(let y=-12;y<14;y+=4){ring(g,steel,x,y,-5,1,.14);sphere(g,surface('#998251'),x,y,-4.4,.55);}
    box(g,iron,0,-16,-9,54,3,5);
  }
  if(theme==='shifting'){
    for(let x=-27;x<=27;x+=9){box(g,iron,x,0,-10,.8,33,2);for(let y=-13;y<15;y+=2)box(g,steel,x,y,-8.9,1,.18,.2);}
    for(const y of [6.5,1.5,-3.5,-7.8]){box(g,dark,0,y,-12,55,2.6,2);for(const x of [-24,24]){const wheel=ring(g,steel,x,y,-10.7,.9,.2);animations.push(t=>wheel.rotation.z=t*.3);}}
  }
  if(theme==='laser'){
    for(const x of [-27,27]){box(g,surface('#69777d'),x,0,-12,4,33,3);for(let y=-12;y<15;y+=4)box(g,dark,x,y,-10.4,2.9,1.8,.15);}
    for(const beam of level.beams)for(const side of [-1,1]){box(g,steel,beam.x,beam.y+side*beam.h/2,-1,.8,.45,1);box(g,unlit('#a6746b'),beam.x,beam.y+side*(beam.h/2-.18),-.48,.26,.06,.03);}
    line(g,[[-26,-14,-8],[26,-14,-8]],'#98a8af',.3);
  }
  if(theme==='moving'){
    for(const y of [8.2,1.2,-5.8,-11.8]){
      box(g,iron,0,y,-5,50,.3,.5);
      for(let x=-23;x<24;x+=1.2){const link=ring(g,steel,x,y,-2,.27,.05);link.scale.x=1.7;}
      for(const x of [-24,24]){const cog=mesh(g,new THREE.CylinderGeometry(.85,.85,.4,12),steel,x,y,-2);cog.rotation.x=Math.PI/2;animations.push(t=>cog.rotation.y=t*.35);}
    }
    for(const x of [-27,27])box(g,iron,x,0,-8,1.5,33,2);
  }
  if(theme==='museum'){
    placard(g,'MUSEWORLD / THE ARCHIVE',0,12,-10,21,p.accent);
    for(const x of [-25,-9,9,25]){box(g,surface('#66675d'),x,0,-14,1.1,29,2);box(g,warm,x,13,-13,2,1,2);}
    const van=new THREE.Group();g.add(van);van.position.set(-5,-9,-1);box(van,surface('#b9b7a6'),0,.7,0,2.4,1.1,1);box(van,surface('#80464a'),0,1.4,0,.4,.2,.5);
    for(const x of [-.8,.8])sphere(van,dark,x,.1,.4,.25);
    for(const x of [-17,17]){box(g,steel,x,.8,-1,.7,1.1,.6);sphere(g,surface('#7e8b7b'),x,1.8,-1,.5);for(const s of [-1,1])box(g,dark,x+s*.23,.1,-1,.15,.5,.2);}
  }
  return {update(time,ambientTime=time){for(const f of animations)f(time);for(const f of ambient)f(ambientTime);}};
}
