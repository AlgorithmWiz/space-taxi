import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const files = {
  taxi: '20260928_210000_taxi-classic_01a0e963/taxi-classic-optimized.glb',
  Nova: '20260928_210316_passenger-nova-botanist_01a0e966/passenger-nova-botanist-walking.glb',
  Juno: '20260928_210330_passenger-juno-courier_01a0e966/passenger-juno-courier-walking.glb',
};
const cache = new Map(), pending = new Set(), loader = new GLTFLoader();
const enabled = new URLSearchParams(location.search).get('models') !== 'classic';
export const modelStatus = {};
function request(name) {
  if (!enabled || pending.has(name) || !files[name]) return;
  pending.add(name); modelStatus[name] = 'loading';
  // GitHub Pages serves LFS pointers; the media endpoint serves the binary assets.
  const url = location.hostname.endsWith('github.io')
    ? `https://media.githubusercontent.com/media/AlgorithmWiz/space-taxi/ab23e7688cc3eb924ce1a88e30e05f52c883767f/meshy_output/${files[name]}`
    : new URL(`../meshy_output/${files[name]}`, import.meta.url).href;
  loader.loadAsync(url).then(asset => {
    asset.scene.traverse(o => { o.userData.sharedModelAsset = true; });
    cache.set(name, asset); modelStatus[name] = 'ready';
  }).catch(error => { modelStatus[name] = 'fallback'; console.warn(`Using original ${name} model:`, error.message); });
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
    const bounds = new THREE.Box3().setFromObject(object, true);
    const rootPosition = root.getWorldPosition(new THREE.Vector3());
    const rootScale = root.getWorldScale(new THREE.Vector3());
    object.position.y = (rootPosition.y - bounds.min.y) / rootScale.y;
  }
  data.modelLastX = x;
}
