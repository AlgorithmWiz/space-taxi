import * as THREE from 'three';
const point = new THREE.Vector3(), rootPosition = new THREE.Vector3(), rootScale = new THREE.Vector3();
const parentRotation = new THREE.Quaternion(), deltaRotation = new THREE.Quaternion(), axis = new THREE.Vector3();
const forward = new THREE.Vector3(0,0,1);
const modelRotation = new THREE.Quaternion();
function turnInWorld(bone, radians, object) {
  if (!bone) return;
  bone.parent.updateWorldMatrix(true,false);
  bone.parent.getWorldQuaternion(parentRotation).invert();
  object.getWorldQuaternion(modelRotation);
  axis.copy(forward).applyQuaternion(modelRotation).applyQuaternion(parentRotation);
  deltaRotation.setFromAxisAngle(axis,radians); bone.quaternion.premultiply(deltaRotation);
}
export function preparePassengerMotion(object, driver) {
  const bones = [], feet = [];
  object.traverse(node => {
    if (node.isBone) bones.push({node,sample:driver.getObjectByName(node.name),position:node.position.clone(),rotation:node.quaternion.clone(),scale:node.scale.clone()});
    if (node.isSkinnedMesh) {
      const geometry=node.geometry; geometry.computeBoundingBox();
      const low=geometry.boundingBox.min.y+(geometry.boundingBox.max.y-geometry.boundingBox.min.y)*.14;
      const indices=[];for(let i=0;i<geometry.attributes.position.count;i++)if(geometry.attributes.position.getY(i)<=low)indices.push(i);
      feet.push({mesh:node,indices});
    }
  });
  return {bones,feet,byName:Object.fromEntries(bones.map(b=>[b.node.name,b.node])),weight:0,lastTime:null};
}
export function animatePassenger(data, root, time, walk, x, reducedMotion = false) {
  const object=data.modelObject, motion=data.modelMotion;
  const dt=motion.lastTime===null?0:Math.min(.1,Math.max(0,time-motion.lastTime));motion.lastTime=time;
  const moving=walk>0;motion.weight=THREE.MathUtils.damp(motion.weight,moving?1:0,12,dt);
  // Always sample the authored walk, then blend every joint back towards its rest pose.
  data.modelAction.play();data.modelMixer.setTime(time);
  for(const b of motion.bones){b.node.position.lerpVectors(b.position,b.sample.position,motion.weight);b.node.quaternion.slerpQuaternions(b.rotation,b.sample.quaternion,motion.weight);b.node.scale.lerpVectors(b.scale,b.sample.scale,motion.weight);}
  const resting=1-motion.weight, idle=resting*(reducedMotion?0:1), phase=time%7;
  const wave=phase<2.8?Math.sin(phase/2.8*Math.PI):0;
  const spine=motion.byName.Spine,head=motion.byName.Head;
  if(spine)spine.scale.x*=1+Math.sin(time*1.8)*.008*idle;
  if(head)head.rotateY(Math.sin(time*.7)*.06*idle);
  // Lower the rig's A-pose arms at rest, including with reduced motion enabled.
  turnInWorld(motion.byName.LeftArm,-.48*resting+wave*1.85*idle,object);
  turnInWorld(motion.byName.RightArm,.48*resting,object);
  turnInWorld(motion.byName.LeftForeArm,wave*(.8+Math.sin(time*7)*.18)*idle,object);
  const dx=x-(data.modelLastX??x);
  if(moving&&Math.abs(dx)>.0001)data.modelFacing=Math.sign(dx)*Math.PI/2;
  const facing=moving?(data.modelFacing??Math.PI/2):0;
  object.rotation.y=THREE.MathUtils.damp(object.rotation.y,facing,10,dt);
  object.position.y=0;root.updateWorldMatrix(true,true);object.updateMatrixWorld(true);
  // Only the boot vertices can touch the floor in these walking/idle poses.
  // This avoids skinning every helmet, face and backpack vertex on the CPU.
  let minY=Infinity;
  for(const {mesh,indices} of motion.feet)for(const index of indices){mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);minY=Math.min(minY,point.y);}
  root.getWorldPosition(rootPosition);root.getWorldScale(rootScale);
  if(Number.isFinite(minY))object.position.y=(rootPosition.y-minY)/rootScale.y;
  data.modelLastX=x;
}
export function prepareTaxiGear(object) {
  const meshes=[];
  object.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const geometry=mesh.geometry.clone(),position=geometry.attributes.position;
    const retracted=position.clone();
    for(let i=0;i<position.count;i++){
      const y=position.getY(i);
      // Telescope the struts into their pods while translating the solid foot plates.
      const travel=THREE.MathUtils.clamp((-.46-y)/.17,0,1)*.15;
      retracted.setY(i,y+travel);
    }
    geometry.morphAttributes.position=[retracted];mesh.geometry=geometry;mesh.updateMorphTargets();meshes.push(mesh);
  });
  return meshes;
}
