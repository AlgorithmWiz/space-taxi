import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const solid=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
const light=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1});
function add(g,geometry,material,x,y,z){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);g.add(o);return o;}
const box=(g,m,x,y,z,w,h,d)=>add(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
export function beachScenery(g){
  const water=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
    varying vec2 v;uniform float time;
    float waves(vec2 p){return sin(p.x*1.7+p.y*9.-time*.7)*.45+sin(p.x*4.1-p.y*12.+time*.5)*.2+sin(p.x*8.+p.y*21.-time*1.1)*.09;}
    void main(){
      float depth=1.-v.y;vec2 p=vec2(v.x*18.,log(1.+depth*30.)*2.);
      float w=waves(p);vec3 n=normalize(vec3(-dFdx(w)*150.,-dFdy(w)*100.,1.));
      float fresnel=pow(1.-clamp(depth,0.,1.),4.);
      vec3 c=mix(vec3(.025,.21,.25),vec3(.12,.36,.38),depth);
      c=mix(c,vec3(.27,.39,.43),fresnel*.7);
      float sun=exp(-pow((v.x-.64)*12.,2.));
      float sparkle=pow(max(0.,dot(n,normalize(vec3(-.3,.5,1.)))),28.);
      c+=vec3(1.,.82,.52)*sun*sparkle*.75;
      float surf=sin(p.y*9.-time*.65+w*.8);
      float foam=smoothstep(.86,1.,surf)*smoothstep(.3,.95,depth);
      c=mix(c,vec3(.63,.78,.73),foam*.45);
      c+=vec3(.07,.16,.16)*w*.25;
      gl_FragColor=vec4(c,1.);
    }`});
  const sea=add(g,new THREE.PlaneGeometry(145,50),water,0,-30,-17);sea.name='ocean-reflection-and-surf';
  const sand=new THREE.ShaderMaterial({vertexShader:`varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 p;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){float grain=hash(floor(p*130.));float ripple=sin(p.y*23.+sin(p.x*.9)*1.6)*.5+.5;
    vec3 c=mix(vec3(.43,.30,.16),vec3(.70,.56,.35),smoothstep(-24.,-11.,p.y));c+=(grain-.5)*.05+ripple*.023;gl_FragColor=vec4(c,1.);}`});
  const shape=new THREE.Shape();shape.moveTo(-70,-12.65);shape.bezierCurveTo(-25,-12.6,-3,-12.65,4,-12.65);shape.bezierCurveTo(9,-12.7,11,-14,15,-17);shape.bezierCurveTo(21,-21,32,-25,49,-30);shape.lineTo(75,-65);shape.lineTo(-75,-65);shape.closePath();
  const shore=add(g,new THREE.ShapeGeometry(shape,48),sand,0,0,-1.5);shore.name='sand-under-lounger';
  const curves=[
    new THREE.CubicBezierCurve3(new THREE.Vector3(-70,-12.65,0),new THREE.Vector3(-25,-12.6,0),new THREE.Vector3(-3,-12.65,0),new THREE.Vector3(4,-12.65,0)),
    new THREE.CubicBezierCurve3(new THREE.Vector3(4,-12.65,0),new THREE.Vector3(9,-12.7,0),new THREE.Vector3(11,-14,0),new THREE.Vector3(15,-17,0)),
    new THREE.CubicBezierCurve3(new THREE.Vector3(15,-17,0),new THREE.Vector3(21,-21,0),new THREE.Vector3(32,-25,0),new THREE.Vector3(49,-30,0)),
  ];
  const foamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:water.uniforms.time},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform float time;void main(){float edge=sin(v.y*3.14159);float wash=.5+.5*sin(v.x*44.+time*.6);gl_FragColor=vec4(.69,.83,.8,edge*(.2+wash*.25));}'});
  for(const curve of curves){
    const positions=[],uvs=[],indices=[];
    for(let i=0;i<=64;i++){const point=curve.getPoint(i/64),tangent=curve.getTangent(i/64),normal=new THREE.Vector3(-tangent.y,tangent.x,0);
      for(const side of [0,1]){const p=point.clone().addScaledVector(normal,side*.35-.06);positions.push(p.x,p.y,-1.3);uvs.push(i/64,side);}
      if(i<64){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();add(g,geometry,foamMaterial,0,0,0);
  }
  const castleSand=solid('#bc9a65'),shadow=solid('#735b3c');
  for(const [x,y,z,size] of [[-21,-12.9,-2.2,.85],[7,-17.5,-.5,1.2],[-25,-13,-3,.6]]){
    const root=new THREE.Group();root.name='sandcastle';root.position.set(x,y,z);root.scale.setScalar(size);g.add(root);
    box(root,castleSand,0,.55,0,2.2,1.1,1.1);
    for(const side of [-1,1]){
      add(root,new THREE.CylinderGeometry(.37,.48,1.7,20),castleSand,side*1.1,.85,0);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;box(root,castleSand,side*1.1+Math.cos(a)*.29,1.79,Math.sin(a)*.29,.2,.3,.2);}
    }
    for(let i=-2;i<=2;i++)box(root,castleSand,i*.42,1.23,0,.23,.28,1.1);
    const door=add(root,new THREE.CircleGeometry(.31,24),shadow,0,.4,.561);door.scale.y=1.35;
    box(root,castleSand,0,.09,.7,1.3,.18,.8);
    box(root,solid('#9d7b46'),0,1.75,0,.035,1.35,.035);
    const flag=add(root,new THREE.PlaneGeometry(.5,.28),solid('#558d95'),.25,2.23,0);
    flag.material.side=THREE.DoubleSide;
  }
  return time=>{water.uniforms.time.value=time;};
}
function facadeTexture(seed){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle='#172c3c';c.fillRect(0,0,128,512);
  const colors=['#224353','#314b59','#b5a077','#556c70','#dbc295'];
  for(let y=3,row=0;y<512;y+=16,row++)for(let x=4,col=0;x<128;x+=16,col++){
    const n=(row*37+col*17+seed*11)%19;c.fillStyle=colors[n<12?0:n<15?1:n<17?2:n===17?3:4];c.fillRect(x,y,10,11);
    c.fillStyle='#132333';c.fillRect(x+4,y,1,11);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}
export function cityScenery(g,reverse=false){
  const district=new THREE.Group();district.name='distant-city';g.add(district);g=district;
  const facades=new Map();
  const concrete=solid(reverse?'#665b51':'#465561'),trim=solid('#314352'),roof=solid('#293d4a');
  const maps=Array.from({length:5},(_,i)=>facadeTexture(i));
  for(const map of maps){map.wrapT=THREE.RepeatWrapping;map.repeat.y=2;}
  const glow=light(reverse?'#deb08b':'#a7ced6',.6);
  for(let layer=0;layer<3;layer++)for(let i=0;i<17;i++){
    const x=-60+i*7.5+layer*2.1,w=3.6+(i*7%5)*.55,h=13+(i*13+layer*7)%25,z=-43+layer*9,base=-18-layer*1.5;
    const color=new THREE.Color(reverse?'#74655c':'#71838e').multiplyScalar(.48+layer*.17);
    const key=`${layer}/${i%5}`;
    if(!facades.has(key))facades.set(key,new THREE.MeshStandardMaterial({map:maps[i%5],emissiveMap:maps[i%5],emissive:'#b7c6c7',emissiveIntensity:.09+layer*.035,color,roughness:.38,metalness:.3}));
    const mat=facades.get(key);
    box(g,mat,x,base+h/2-20,z,w,h+40,3.2);
    // Setback crowns, recessed glass, cornices and rooftop plant vary the silhouette.
    for(const dx of [-w/2,w/2])box(g,trim,x+dx,base+h/2-20,z+1.7,.12,h+40,.16);
    box(g,concrete,x,base+h+.2,z,w+.3,.4,3.6);
    if(i%3!==1){box(g,mat,x,base+h+1.3,z,w*.66,2.3,2.5);box(g,glow,x,base+h+2.5,z+1.3,w*.68,.06,.08);}
    if(i%4===0){box(g,roof,x,base+h+3,z,.12,3,.12);add(g,new THREE.SphereGeometry(.08,8,6),light('#ca7960'),x,base+h+4.6,z);}
    if(i%3===1)for(let j=0;j<3;j++)box(g,roof,x-w*.3+j*w*.3,base+h+.6,z,.6,.6,.8);
    if(layer===2&&i%4===2){box(g,glow,x+w/2+.12,base+h*.65,z+1.8,.1,Math.min(6,h*.35),.08);}
    if(i%5===0)for(let floor=4;floor<h;floor+=5)box(g,concrete,x,base+floor,z+1.65,w+.15,.12,.25);
  }
  // A distant elevated transit deck anchors the skyline without entering the flight plane.
  box(g,roof,0,-15.3,-14,135,.5,2);
  for(let x=-60;x<65;x+=8){box(g,concrete,x,-21,-14,.5,11,1);box(g,glow,x,-14.8,-12.9,3,.055,.05);}
  // One draw per shared facade/trim material, instead of hundreds of tiny boxes.
  const batches=new Map();
  for(const object of [...g.children]){
    object.updateMatrix();const geometry=object.geometry.clone().applyMatrix4(object.matrix);
    if(!batches.has(object.material))batches.set(object.material,[]);
    batches.get(object.material).push(geometry);object.geometry.dispose();g.remove(object);
  }
  for(const [material,geometries] of batches){
    g.add(new THREE.Mesh(mergeGeometries(geometries),material));geometries.forEach(geometry=>geometry.dispose());
  }
}
