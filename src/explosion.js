import * as THREE from 'three';

// A bounded effect pool: repeated crashes reuse geometry, materials and textures.
export class Explosion {
  constructor(parent) {
    this.group=new THREE.Group();parent.add(this.group);this.group.visible=false;this.age=10;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
    gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.35,'rgba(255,255,255,.7)');gradient.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);this.texture=new THREE.CanvasTexture(canvas);
    this.puffs=Array.from({length:24},(_,i)=>{
      const fire=i<10,mat=new THREE.SpriteMaterial({map:this.texture,color:fire?0xffa126:0x556074,transparent:true,depthWrite:false,blending:fire?THREE.AdditiveBlending:THREE.NormalBlending});
      const sprite=new THREE.Sprite(mat);this.group.add(sprite);return {sprite,fire};
    });
    this.shards=Array.from({length:22},(_,i)=>{
      const geo=i%4===0?new THREE.CylinderGeometry(.12,.12,.45,6):new THREE.BoxGeometry(.18+(i%3)*.13,.12,.25);
      const mat=new THREE.MeshStandardMaterial({color:[0xe4b844,0x384957,0x96d9e8,0x171e25][i%4],metalness:.65,roughness:.45,emissive:0xe95a12,transparent:true});
      const mesh=new THREE.Mesh(geo,mat);this.group.add(mesh);return {mesh};
    });
    this.rings=[0,1].map(i=>{
      const mesh=new THREE.Mesh(new THREE.TorusGeometry(1,.035,6,80),new THREE.MeshBasicMaterial({color:i?0xff7b31:0xffe9a3,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
      mesh.rotation.x=i?1.1:.18;this.group.add(mesh);return mesh;
    });
    this.flash=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,color:0xffecc5,blending:THREE.AdditiveBlending,depthWrite:false}));this.group.add(this.flash);
    this.light=new THREE.PointLight(0xffa544,0,22,1.7);this.group.add(this.light);
  }
  trigger(x,y,vx=0,vy=0) {
    this.age=0;this.group.position.set(x,y,.6);this.group.visible=true;
    for(const [i,p] of this.puffs.entries()){
      const a=i*2.39996,speed=p.fire?1.4+Math.random()*2.6:.8+Math.random()*1.3;
      Object.assign(p,{delay:p.fire?i*.012:.1+(i-10)*.025,vx:Math.cos(a)*speed+vx*.13,vy:Math.sin(a)*speed+1.2,vz:(Math.random()-.5)*1.8,size:p.fire?1.2+Math.random():1.5+Math.random(),life:p.fire?.65+Math.random()*.4:1.9+Math.random()*.6});
    }
    for(const [i,s] of this.shards.entries()){
      const a=i*2.39996,speed=3+Math.random()*7;
      Object.assign(s,{vx:Math.cos(a)*speed+vx*.25,vy:Math.sin(a)*speed+2+vy*.15,vz:(Math.random()-.5)*5,spin:(Math.random()-.5)*14});
      s.mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
    }
    this.update(0);
  }
  clear(){this.age=10;this.group.visible=false;this.light.intensity=0;}
  update(dt) {
    if(!this.group.visible)return;
    this.age+=dt;const t=this.age;
    if(t>3){this.clear();return;}
    this.flash.visible=t<.28;this.flash.scale.setScalar(3+t*16);this.flash.material.opacity=Math.max(0,1-t/.28);
    this.light.intensity=90*Math.exp(-t*8);
    this.rings.forEach((ring,i)=>{const a=Math.max(0,t-i*.045);ring.scale.setScalar(.4+a*(i?11:15));ring.material.opacity=Math.max(0,1-a/.55);ring.visible=a<.55;});
    for(const p of this.puffs){
      const a=t-p.delay,f=a/p.life;p.sprite.visible=a>=0&&f<1;
      if(!p.sprite.visible)continue;
      p.sprite.position.set(p.vx*a,p.vy*a+(p.fire?0:a*a*.6),p.vz*a+(p.fire?.5:-.3));
      p.sprite.scale.setScalar(p.size*(.3+a*(p.fire?3:1.5)));
      p.sprite.material.opacity=(1-f)*(p.fire?.9:.48)*Math.min(1,a*18);
      if(p.fire)p.sprite.material.color.setRGB(1,Math.max(.06,.72-f*.9),Math.max(.015,.25-f*.5));
    }
    for(const s of this.shards){
      s.mesh.position.set(s.vx*t,s.vy*t-3.7*t*t,s.vz*t);
      s.mesh.rotation.x+=s.spin*dt;s.mesh.rotation.z+=s.spin*.7*dt;
      s.mesh.material.emissiveIntensity=Math.max(0,2-t*2);s.mesh.material.opacity=Math.min(1,Math.max(0,2.5-t));
      s.mesh.visible=t<2.5;
    }
  }
}
