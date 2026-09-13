import * as THREE from 'three';

export const CAVE_THEMES=new Set(['teleport','meteors','maze','crystal']);
const palettes={teleport:['#726451','#473e34','#1c1c1b'],meteors:['#756450','#473f34','#13191c'],maze:['#516975','#31434b','#111c24'],crystal:['#74637e','#473951','#1b1524']};
function part(g,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);g.add(m);return m;}
function shape(points){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}

function rockMaterial(color,worldUV=false){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),pixels=ctx.createImageData(256,256);
  const base=new THREE.Color(color).convertLinearToSRGB();
  const hash=(x,y)=>{const value=Math.sin(x*127.1+y*311.7)*43758.5453;return value-Math.floor(value);};
  const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;};
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const n=noise(x*.034,y*.045)*.55+noise(x*.12,y*.16)*.28+noise(x*.4,y*.4)*.17;
    const vein=Math.abs(Math.sin(y*.075+x*.018+n*9))<.085?.64:1,light=(.62+n*.66)*vein,i=(y*256+x)*4;
    pixels.data[i]=base.r*255*light;pixels.data[i+1]=base.g*255*light;pixels.data[i+2]=base.b*255*light;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  if(worldUV)map.repeat.set(.07,.07);map.anisotropy=4;
  return new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:.24,roughness:.94,metalness:.03});
}

export function buildCaveWall(parent,o,theme){
  const color=(palettes[theme]||palettes.meteors)[0],mat=rockMaterial(color),depth=1.5;
  // The outer rectangle is the collision envelope. Relief varies only in depth.
  part(parent,new THREE.BoxGeometry(o.w,o.h,depth),mat,0,0,-depth/2);
  const geo=new THREE.PlaneGeometry(o.w,o.h,Math.max(2,Math.ceil(o.w/.65)),Math.max(2,Math.ceil(o.h/.65))),v=geo.attributes.position;
  for(let i=0;i<v.count;i++){
    const x=v.getX(i),y=v.getY(i),edge=Math.min(o.w/2-Math.abs(x),o.h/2-Math.abs(y));
    v.setZ(i,.06+Math.min(.65,edge)*(.65+.3*Math.sin(x*4.2+y*3.9+o.x)));
  }
  geo.computeVertexNormals();const rock=part(parent,geo,mat);rock.name='solid-cave-wall';
  const lines=[];
  if(o.w>o.h){for(let x=-o.w/2+.7;x<o.w/2-.1;x+=1.4)lines.push(x,-o.h*.44,.07,x+.23,o.h*.44,.07);}
  else for(let y=-o.h/2+.7;y<o.h/2-.1;y+=1.4)lines.push(-o.w*.44,y,.07,o.w*.44,y+.18,.07);
  if(lines.length){const cracks=new THREE.BufferGeometry();cracks.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));parent.add(new THREE.LineSegments(cracks,new THREE.LineBasicMaterial({color:'#152126',transparent:true,opacity:.4})));}
  return rock;
}

export function buildSolidTerrain(parent,level){
  if(!(level.terrain||[]).some(t=>!t.model))return;
  const snow=level.theme==='snow',color=snow?'#afb9b6':(palettes[level.theme]||palettes.meteors)[0];
  const material=snow?new THREE.MeshStandardMaterial({color,roughness:1}):rockMaterial(color,true);
  if(snow){
    const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);
    gradient.addColorStop(0,'#cad3d0');gradient.addColorStop(.2,'#bbc9cd');gradient.addColorStop(1,'#596e7c');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
    for(let i=0;i<9000;i++){const noise=n=>{const v=Math.sin(n*127.1)*43758.5453;return v-Math.floor(v);};ctx.fillStyle=i%2?'#ffffff05':'#16344103';ctx.fillRect(noise(i)*512,noise(i+17)*512,1,1);}
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;material.map=map;material.color.set('#ffffff');
  }
  for(const terrain of level.terrain||[]){
    if(terrain.model)continue;
    const s=shape(terrain.points),geo=new THREE.ExtrudeGeometry(s,{depth:3,bevelEnabled:false,curveSegments:1});
    if(snow){const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/200+.5,Math.max(0,Math.min(1,(p.getY(i)+40)/30)));}
    const rock=part(parent,geo,material,0,0,-2.5);rock.name=snow?'continuous-snow-ground':'solid-jagged-cave';
    // A thin contour catches light without obscuring the actual collision boundary.
    const points=[...terrain.points,terrain.points[0]].map(([x,y])=>new THREE.Vector3(x,y,.51));
    const edge=new THREE.BufferGeometry().setFromPoints(points);
    parent.add(new THREE.Line(edge,new THREE.LineBasicMaterial({color:snow?'#d1dad5':'#a49981',transparent:true,opacity:snow?.7:.32})));
  }
}

function openingPoints(inset=0){
  const pts=[[-26-inset,-15-inset],[-15,-15.6-inset],[-4,-15-inset],[10,-15.7-inset],[25.8+inset,-15-inset],[26.8+inset,-6],[26.2+inset,5],[26+inset,15],[23+inset,20.5],[17,20+inset],[11,20.4+inset],[6,21+inset],[5,26],[-5,26],[-6,21+inset],[-13,20.2+inset],[-19,21+inset],[-25-inset,20],[-27-inset,7],[-26.5-inset,-4]];
  return pts;
}
function caveFrame(parent,color,z,inset,seed){
  const outline=shape([[-75,-65],[75,-65],[75,65],[-75,65]]);
  const points=openingPoints(inset),hole=new THREE.Path();points.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));hole.closePath();outline.holes.push(hole);
  const mat=rockMaterial(color,true),chunkMaterial=rockMaterial(color);
  const geometry=new THREE.ExtrudeGeometry(outline,{depth:2.4,bevelEnabled:true,bevelSize:.45,bevelThickness:.6,bevelSegments:2,curveSegments:2});
  const face=part(parent,geometry,mat,0,0,z);face.name='cave-perimeter';
  // Small strata on the outside of the clear flight aperture break up the rock face.
  for(let i=0;i<points.length;i++){
    const [x,y]=points[i];if(Math.abs(x)<6&&y>18)continue;
    const rock=part(parent,new THREE.DodecahedronGeometry(1,0),chunkMaterial,x+Math.sign(x)*1.2,y+(y>13?1.5:y<-13?-1:0),z+2.8);
    rock.scale.set(1.6+Math.sin(i*2+seed)*.4,1.15+Math.cos(i*3)*.2,.65);rock.rotation.z=i*.74;
  }
}
function chamber(parent,x,y,w,h,color,seed){
  const points=[];
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,noise=1+.05*Math.sin(a*9+seed)+.025*Math.cos(a*17);points.push([x+Math.cos(a)*w/2*noise,y+Math.sin(a)*h/2*noise]);}
  part(parent,new THREE.ShapeGeometry(shape(points)),new THREE.MeshBasicMaterial({color}),0,0,-27);
  const path=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,-26.5)),true);
  part(parent,new THREE.TubeGeometry(path,96,.22,8,true),rockMaterial('#343b3e'));
}

export function buildCaveSystem(parent,level){
  const g=new THREE.Group();g.name=`cave-system-${level.theme}`;parent.add(g);
  const [stone,mid,dark]=palettes[level.theme],animations=[];
  const rear=rockMaterial(mid);rear.map.repeat.set(5,4);part(g,new THREE.PlaneGeometry(155,120),rear,0,0,-42);
  const rooms={
    teleport:[[-13,7,21,13],[-13,-7,21,11],[13,9,21,15],[13,-2,21,6],[13,-9,21,6]],
    meteors:[[-17,6,27,26],[13,1,29,31],[-7,-11,31,12]],
    maze:[[0,13,49,7],[-1,6,45,7],[-4,-1,41,7],[7,-8,36,7]],
    crystal:[[0,1,53,35],[-25,-4,15,18],[23,7,18,20]],
  }[level.theme];
  if(!level.terrain?.length)rooms.forEach(([x,y,w,h],i)=>chamber(g,x,y,w,h,dark,i+level.number));
  else part(g,new THREE.PlaneGeometry(54,40),new THREE.MeshBasicMaterial({color:dark}),0,3,-26);
  // Two receding rock rims create an enclosed cavern, with the exit shaft open.
  caveFrame(g,mid,-17,-.8,level.number);caveFrame(g,stone,-5.8,.6,level.number+3);
  const ledge=rockMaterial(mid);
  for(const side of [-1,1])for(let i=0;i<8;i++){
    const r=part(g,new THREE.IcosahedronGeometry(1,1),ledge,side*(29+i%2),-13+i*4,-4);
    r.scale.set(2.2,1.8+i%3,.8);r.rotation.z=side*(.3+i*.2);
  }
  // Stalactites sit above the usable ceiling, away from the top-center exit.
  for(const side of [-1,1])for(let i=0;i<7;i++){
    const x=side*(8+i*2.6),h=.9+(i*7%5)*.35;
    const stalactite=part(g,new THREE.ConeGeometry(.5,h,7),ledge,x,22-h*.25,-7);stalactite.rotation.z=Math.PI;
  }
  if(level.theme==='crystal'){
    const mineral=new THREE.MeshPhysicalMaterial({color:'#8e789e',roughness:.32,metalness:.15,clearcoat:.3});
    for(const side of [-1,1])for(let i=0;i<11;i++){
      const shard=part(g,new THREE.ConeGeometry(.25+i%3*.14,1.5+i%4*.7,6),mineral,side*(25.9+i%2),-12+i*2.5,-2.6);shard.rotation.z=-side*(.25+i%3*.2);
    }
  }
  const drips=[];
  for(let i=0;i<12;i++){
    const drop=part(g,new THREE.CylinderGeometry(.015,.024,.24,5),new THREE.MeshBasicMaterial({color:'#a7b6b6',transparent:true,opacity:.23,depthWrite:false}),Math.sin(i*4.7)*23,10,-16-i%3*2);drips.push(drop);
  }
  animations.push(t=>drips.forEach((drop,i)=>{drop.position.y=17-((t*2.8+i*4.1)%32);drop.material.opacity=.16+Math.sin(i+t)*.04;}));
  for(const side of [-1,1]){
    const m=new THREE.MeshStandardMaterial({color:'#aba583',emissive:'#b5a878',emissiveIntensity:.4,roughness:.8});
    part(g,new THREE.BoxGeometry(.25,.5,.18),m,side*25,1,-3);
  }
  return {update(time){animations.forEach(fn=>fn(time));}};
}
