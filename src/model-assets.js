import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const files = {
  taxi: 'taxi-classic',
  Nova: 'passenger-nova-botanist', Juno: 'passenger-juno-courier',
  Atlas: 'passenger-atlas-engineer', Pip: 'passenger-pip-tourist',
  Sol: 'passenger-sol-cook', Rae: 'passenger-rae-medic',
  enamel: 'landing-platform-enamel', cloud: 'landing-platform-cloud',
  lounger: 'landing-platform-lounger', parasol: 'landing-platform-parasol',
  candy: 'obstacle-candy-cane', lollipop: 'lollipop', radar: 'radar-dish',
};
const cache = new Map(), pending = new Map(), loader = new GLTFLoader();
const enabled = new URLSearchParams(location.search).get('models') !== 'classic';
export const modelStatus = {};
function request(name) {
  if (!enabled || !files[name]) return Promise.resolve(null);
  if (pending.has(name)) return pending.get(name);
  modelStatus[name] = 'loading';
  const url = new URL(`../assets/models/${files[name]}.glb`, import.meta.url).href;
  const promise = loader.loadAsync(url).then(asset => {
    asset.scene.traverse(o => { o.userData.sharedModelAsset = true; });
    cache.set(name, asset); modelStatus[name] = 'ready'; return asset;
  }).catch(error => {
    modelStatus[name] = 'fallback'; console.warn(`Using original ${name} model:`, error.message); return null;
  });
  pending.set(name, promise); return promise;
}

// Keep collision dimensions and the procedural fallback owned by the level.
// Assets are cached across levels, while instances are attached only to living roots.
export function replaceModelProp(root, name, {rotationY = 0, bounds = null} = {}) {
  const fallback = [...root.children];
  const probe = root.clone(true);
  probe.position.set(0,0,0); probe.rotation.set(0,0,0); probe.scale.setScalar(1);
  const target = bounds || new THREE.Box3().setFromObject(probe);
  request(name).then(asset => {
    if (!asset || root.userData.modelDisposed) return;
    const object = asset.scene.clone(true), holder = new THREE.Group();
    object.rotation.y = rotationY; holder.add(object);
    const source = new THREE.Box3().setFromObject(holder);
    const size = source.getSize(new THREE.Vector3());
    const scale = target.getSize(new THREE.Vector3()).divide(size);
    holder.scale.copy(scale);
    holder.position.copy(target.min).sub(source.min.multiply(scale));
    holder.name = `Meshy ${name}`; root.add(holder);
    fallback.forEach(child => { child.visible = false; });
    root.userData.importedProp = name;
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
    world.taxi.add(group); world.importedTaxi = group;
  }
  if (world.importedTaxi) {
    const active = world.skin.id === 'classic';
    world.importedTaxi.visible = active;
    for (const part of world.originalTaxiParts) part.visible = !active && (!part.userData.pattern || part.userData.pattern === world.skin.pattern);
  }
}
export function updateModelPassenger(root, profile, time, walk, x) {
  request(profile.name);
  const data = root.userData;
  if (data.modelName !== profile.name) {
    data.modelMixer?.stopAllAction();
    if (data.modelObject) { data.modelMixer?.uncacheRoot(data.modelObject); root.remove(data.modelObject); }
    data.modelObject = null; data.modelMixer = null; data.modelName = profile.name;
    data.body.visible = true;
  }
  if (!data.modelObject && cache.has(profile.name)) {
    const asset = cache.get(profile.name), object = clone(asset.scene);
    object.name = `Meshy ${profile.name}`;
    // The rig is 1.7 m; preserve the procedural passenger's 1.65-unit local height.
    object.scale.setScalar(1.65 / 1.7);
    root.add(object); data.modelObject = object; data.body.visible = false;
    data.modelMixer = new THREE.AnimationMixer(object);
    data.modelAction = data.modelMixer.clipAction(asset.animations[0]);
  }
  if (data.modelObject) {
    const object = data.modelObject, moving = walk > 0;
    if (moving) { data.modelAction.play(); data.modelMixer.setTime(time); }
    else { data.modelAction.stop(); data.modelMixer.setTime(0); }
    const dx = x - (data.modelLastX ?? x);
    if (moving && Math.abs(dx) > .0001) data.modelFacing = Math.sign(dx) * Math.PI / 2;
    object.rotation.y = moving ? data.modelFacing || Math.PI / 2 : 0;
    // Ground the evaluated skinned feet each frame, including the walk's vertical bob.
    object.position.y = 0; root.updateWorldMatrix(true, true);
    // SkinnedMesh updates its inverse bind transform in updateMatrixWorld.
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object, true);
    const rootPosition = root.getWorldPosition(new THREE.Vector3());
    const rootScale = root.getWorldScale(new THREE.Vector3());
    object.position.y = (rootPosition.y - bounds.min.y) / rootScale.y;
  }
  data.modelLastX = x;
}
