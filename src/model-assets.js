import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {preparePassengerMotion, animatePassenger, prepareTaxiGear} from './model-motion.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const files = {
  taxi: 'taxi-classic',
  Nova: 'passenger-nova-botanist', Juno: 'passenger-juno-courier',
  Atlas: 'passenger-atlas-engineer', Pip: 'passenger-pip-tourist',
  Sol: 'passenger-sol-cook', Rae: 'passenger-rae-medic',
  enamel: 'landing-platform-enamel', cloud: 'landing-platform-cloud',
  lounger: 'landing-platform-lounger', parasol: 'landing-platform-parasol',
  candy: 'obstacle-candy-cane', lollipop: 'lollipop', radar: 'radar-dish',
  fuel: 'fuel-canister', leaf: 'landing-leaf-leaf', bastion: 'landing-platform-bastion',
  felt: 'landing-platform-felt', metal: 'landing-platform-metal', rock: 'landing-platform-rock',
  stone: 'landing-platform-stone', concrete: 'landing-tower-concrete',
  wallMetal: 'obstacle-wall-metal', net: 'obstacle-wall-net', pole: 'obstacle-wall-pole',
  stem: 'obstacle-wall-stem', tableRail: 'obstacle-wall-table', wood: 'obstacle-wall-wood',
  pine: 'pine-tree', crystalSwitch: 'switch-crystal', paddle: 'table-tennis-paddle',
  table: 'table-tennis-table', portal: 'teleporter-ring', teleportTerrain: 'terrain-teleport',
  vine: 'climbing-vine', pong: 'hazard-pong',
};
const cache = new Map(), pending = new Map(), loader = new GLTFLoader();
const enabled = new URLSearchParams(location.search).get('models') !== 'classic';
export const modelStatus = {};
const users = new Map(), queue = []; let active = 0, cleanupTimer;
function trimCache() {
  const idle=[...cache.keys()].filter(name=>!users.get(name));
  while(idle.length>6){
    const name=idle.shift(),asset=cache.get(name),geometries=new Set(),materials=new Set(),textures=new Set();
    asset.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    const images=new Set([...textures].map(t=>t.source?.data));images.forEach(image=>image?.close?.());
    cache.delete(name);pending.delete(name);delete modelStatus[name];
  }
}
function scheduleCleanup(){clearTimeout(cleanupTimer);cleanupTimer=setTimeout(trimCache,0);}
function retain(name,root){users.set(name,(users.get(name)||0)+1);root.userData.modelLease=name;}
export function releaseModelInstance(root){const name=root.userData.modelLease;if(!name)return;users.set(name,Math.max(0,(users.get(name)||1)-1));delete root.userData.modelLease;scheduleCleanup();}
export function modelCacheInfo(){return {ready:cache.size,unused:[...cache.keys()].filter(n=>!users.get(n)).length,loading:active,queued:queue.length};}
function pump(){
  while(active<2&&queue.length){const {name,resolve}=queue.shift();active++;
    loader.loadAsync(new URL(`../assets/models/${files[name]}.glb`,import.meta.url).href).then(asset=>{
      asset.scene.traverse(o=>{o.userData.sharedModelAsset=true;for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(material.isMeshStandardMaterial)material.metalness=Math.min(material.metalness,.45);}});cache.set(name,asset);modelStatus[name]='ready';resolve(asset);
    }).catch(error=>{modelStatus[name]='fallback';console.warn(`Using original ${name} model:`,error.message);resolve(null);}).finally(()=>{active--;pump();scheduleCleanup();});
  }
}
function request(name) {
  if (!enabled || !files[name]) return Promise.resolve(null);
  if (pending.has(name)) return pending.get(name);
  modelStatus[name]='loading';
  const promise=new Promise(resolve=>{queue.push({name,resolve});});pending.set(name,promise);pump();return promise;
}

// Keep collision dimensions and the procedural fallback owned by the level.
// Assets are cached across levels, while instances are attached only to living roots.
export function replaceModelProp(root, name, {rotationY = 0, rotationZ = 0, bounds = null, keep = [], landingSurface = null} = {}) {
  if (!enabled) return Promise.resolve(null);
  retain(name,root);
  const fallback = root.children.filter(child=>!keep.includes(child));
  const probe = root.clone(true);
  probe.position.set(0,0,0); probe.rotation.set(0,0,0); probe.scale.setScalar(1);
  const target = bounds || new THREE.Box3().setFromObject(probe);
  return request(name).then(asset => {
    if (!asset || root.userData.modelDisposed) return;
    const object = asset.scene.clone(true), holder = new THREE.Group();
    object.rotation.y = rotationY; object.rotation.z = rotationZ; holder.add(object);
    const source = new THREE.Box3().setFromObject(holder);
    const size = source.getSize(new THREE.Vector3());
    const scale = target.getSize(new THREE.Vector3()).divide(size);
    holder.scale.copy(scale);
    holder.position.copy(target.min).sub(source.min.multiply(scale));
    if(landingSurface!==null){
      holder.updateMatrixWorld(true);
      const ray=new THREE.Raycaster(new THREE.Vector3(0,target.max.y+10,0),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObject(holder,true)[0];
      if(hit)holder.position.y+=landingSurface-hit.point.y;
    }
    holder.name = `Meshy ${name}`; root.add(holder);
    fallback.forEach(child => { child.visible = false; });
    root.userData.importedProp = name; scheduleCleanup();
    return holder;
  });
}

export function importedProps(group) {
  const names = new Set();
  group.traverse(o => { if (o.userData.importedProp) names.add(o.userData.importedProp); });
  return [...names];
}
export function updateModelTaxi(world) {
  request('taxi');
  if (!world.importedTaxi && cache.has('taxi')) {
    const group = new THREE.Group(), object = cache.get('taxi').scene.clone(true);
    object.rotation.y = Math.PI; group.add(object); group.name = 'Meshy taxi';
    const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3());
    const scale = 2.8 / size.x; object.scale.setScalar(scale);
    object.position.set(-(bounds.min.x + bounds.max.x) * .5 * scale, -.87 - bounds.min.y * scale, -(bounds.min.z + bounds.max.z) * .5 * scale);
    const effects = new Set([...world.flames, ...world.sideFlames, world.engineLight]);
    world.originalTaxiParts = world.taxi.children.filter(o => !effects.has(o));
    world.importedTaxiGearMeshes=prepareTaxiGear(object);
    retain('taxi',group); world.taxi.add(group); world.importedTaxi = group;
  }
  if (world.importedTaxi) {
    const active = world.skin.id === 'classic';
    world.importedTaxi.visible = active;
    const extension=THREE.MathUtils.clamp((world.gearGroup.scale.y-.15)/.85,0,1);
    world.importedTaxi.userData.gearExtension=extension;
    for(const mesh of world.importedTaxiGearMeshes)mesh.morphTargetInfluences[0]=1-extension;
    for (const part of world.originalTaxiParts) part.visible = !active && (!part.userData.pattern || part.userData.pattern === world.skin.pattern);
  }
}
export function updateModelPassenger(root, profile, time, walk, x, reducedMotion = false) {
  request(profile.name);
  const data = root.userData;
  if (data.modelName !== profile.name) {
    data.modelMixer?.stopAllAction();
    if (data.modelObject) { data.modelMixer?.uncacheRoot(data.modelDriver); releaseModelInstance(data.modelObject); data.modelObject.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();}); root.remove(data.modelObject); }
    data.modelObject = null; data.modelMixer = null; data.modelDriver = null; data.modelMotion = null; data.modelAction = null; data.modelName = profile.name;
    data.body.visible = true;
  }
  if (!data.modelObject && cache.has(profile.name)) {
    const asset = cache.get(profile.name), object = clone(asset.scene);
    object.name = `Meshy ${profile.name}`;
    object.scale.setScalar(1.65 / 1.7);
    retain(profile.name,object); root.add(object); data.modelObject = object; data.body.visible = false;
    data.modelDriver = clone(asset.scene);
    data.modelMixer = new THREE.AnimationMixer(data.modelDriver);
    data.modelAction = data.modelMixer.clipAction(asset.animations[0]);
    data.modelMotion = preparePassengerMotion(object,data.modelDriver);
  }
  if (data.modelObject) animatePassenger(data,root,time,walk,x,reducedMotion);
  data.modelLastX = x;
}
