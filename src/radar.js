import * as THREE from 'three';

function part(g,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;}
function rod(g,mat,a,b,r=.025){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),m=part(g,new THREE.CylinderGeometry(r,r,start.distanceTo(end),8),mat);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());}
export function buildRadarDish(parent,x,y,index=0){
  const base=new THREE.Group();base.name='radar-assembly';base.position.set(x,y,-1.8);parent.add(base);
  const metal=new THREE.MeshStandardMaterial({color:'#9caaa9',roughness:.57,metalness:.55,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:'#36444a',roughness:.75,metalness:.35});
  part(base,new THREE.CylinderGeometry(.14,.24,2.8,16),dark,0,1.4);
  part(base,new THREE.CylinderGeometry(.32,.4,.16,20),metal,0,.08);
  const turntable=part(base,new THREE.CylinderGeometry(.35,.35,.14,24),metal,0,2.74);
  const swivel=new THREE.Group();swivel.name='radar-swivel';swivel.position.y=2.85;base.add(swivel);
  const dish=new THREE.Group();dish.name='radar-elevation';dish.position.y=.4;swivel.add(dish);
  for(const side of [-1,1]){part(swivel,new THREE.BoxGeometry(.11,.55,.15),dark,side*.31,.24);part(dish,new THREE.SphereGeometry(.12,12,8),metal,side*.31,0);}
  const profile=Array.from({length:17},(_,i)=>{const r=i/16*.92;return new THREE.Vector2(r,r*r*.5);});
  const bowl=part(dish,new THREE.LatheGeometry(profile,48),metal);bowl.rotation.x=Math.PI/2;
  part(dish,new THREE.TorusGeometry(.92,.034,8,64),metal,0,0,.423);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(dish,dark,[Math.cos(a)*.82,Math.sin(a)*.82,.34],[0,0,1.04]);}
  part(dish,new THREE.CylinderGeometry(.085,.12,.22,12),dark,0,0,1.03).rotation.x=Math.PI/2;
  const beacon=part(base,new THREE.SphereGeometry(.055,10,8),new THREE.MeshBasicMaterial({color:'#bda36d'}),.36,2.84);
  const waves=[];
  for(let i=0;i<3;i++){
    const wave=part(dish,new THREE.TorusGeometry(1,.014,5,48),new THREE.MeshBasicMaterial({color:'#b8c0ae',transparent:true,opacity:0,depthWrite:false}),0,0,1.2);
    waves.push(wave);
  }
  return {update(time){
    const phase=time*.42+index*1.63;
    swivel.rotation.y=Math.sin(phase)*1.08;
    dish.rotation.x=-.35+Math.sin(time*.19+index)*.18;dish.rotation.z=.18*Math.sin(phase*.5);
    turntable.rotation.y=swivel.rotation.y;
    beacon.material.color.set(Math.sin(time*2+index)>.8?'#e0ba70':'#8c7957');
    for(let i=0;i<waves.length;i++){const progress=((time*.22+i/3+index*.14)%1+1)%1;waves[i].scale.setScalar(.25+progress*1.4);waves[i].position.z=1.1+progress*1.7;waves[i].material.opacity=Math.sin(progress*Math.PI)*.08;}
  }};
}
