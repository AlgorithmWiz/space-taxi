import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LEVELS } from './levels.js';
import { padPose, levelHazardPose, obstaclePose, fuelCanisterPose } from './environment.js';
import { buildSolidTerrain } from './caves.js';
import { buildLandingObject, buildFuelCanister } from './landing-props.js';
import { buildObstacle, buildHazard, buildMechanisms, buildDressing } from './scenery.js';
import { Explosion } from './explosion.js';
import { createPassenger, posePassenger, PASSENGER_SCALE } from './passenger.js';
import { riderFor } from './riders.js';
import { SKINS, applyTaxiSkin } from './skins.js';
import { createTaxi } from './taxi.js';
import { artFor } from './art-direction.js';
import { surfaceMaterial } from './surface-materials.js';

const random = (seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; })(1984);
const metal = (color, roughness = .55, metalness = .35) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const glow = (color, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .4 });
function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); parent.add(m); return m;
}
function box(parent, material, w, h, d, x = 0, y = 0, z = 0) { return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z); }
function rounded(w, h, d, radius = .12) {
  const shape = new THREE.Shape();
  const x = -w / 2 + radius, y = -h / 2 + radius, wi = w - radius * 2, he = h - radius * 2;
  shape.moveTo(x, y); shape.lineTo(x + wi, y); shape.lineTo(x + wi, y + he); shape.lineTo(x, y + he); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - radius * 2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: radius, bevelThickness: radius });
  geometry.translate(0, 0, -d / 2 + radius); return geometry;
}
function labelTexture(text, color = '#c9ff9a', size = 128) {
  const canvas = document.createElement('canvas'); canvas.width = size * 2; canvas.height = size;
  const context = canvas.getContext('2d'); context.fillStyle = color; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = `700 ${size * .68}px monospace`; context.fillText(text, size, size * .55);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function disposeGroup(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) for (const mat of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(mat); if (mat.map) textures.add(mat.map); } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); group.clear();
}

export class World {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(0x080e19); container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.FogExp2(0x0b1422, .005);
    this.camera = new THREE.OrthographicCamera(-30, 30, 18, -18, .1, 250);
    this.camera.position.set(0, 6, 65); this.camera.lookAt(0, 1, 0);
    this.composer = new EffectComposer(this.renderer); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1280, 800), .18, .45, 1.15);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.ambientLight = new THREE.HemisphereLight(0xd0d7dd, 0x17171a, 1.6); this.scene.add(this.ambientLight);
    const key = new THREE.DirectionalLight(0xffefd8, 2.2); key.position.set(-12, 20, 30); this.scene.add(key);
    this.rimLight = new THREE.DirectionalLight(0xc4cbd1, 1.1); this.rimLight.position.set(5, 4, -12); this.scene.add(this.rimLight);
    const fill = new THREE.DirectionalLight(0xb6bbc4, .5); fill.position.set(15, -6, 5); this.scene.add(fill);
    this.stage = new THREE.Group(); this.scene.add(this.stage);
    this.levelGroup = new THREE.Group(); this.stage.add(this.levelGroup);
    this.background(); this.makeTaxi(); this.makeParticles();this.explosion=new Explosion(this.stage);
    this.preview = 1; this.shake = 0; this.padObjects = []; this.hazardObjects = [];
    this.setLevel(0); this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    this.aspect = aspect;
    const halfHeight = Math.max(18.5, 26 / aspect);
    this.camera.left = -halfHeight * aspect; this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight; this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }
  background() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, zenith:{value:new THREE.Color()}, horizon:{value:new THREE.Color()}, clouds:{value:0} }, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv;uniform float time;uniform vec3 zenith;uniform vec3 horizon;uniform float clouds;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(7.1);a*=.5;}return v;}
        void main(){vec2 uv=vUv;float n=fbm(uv*vec2(9.,19.)+vec2(time*.001,0.));vec3 c=mix(horizon,zenith,smoothstep(.25,.72,uv.y));c=mix(c,c*.55+vec3(.025),clouds*smoothstep(.32,.8,n)*.6);gl_FragColor=vec4(c,1.);}`,
    });
    this.skyMaterial = skyMaterial;
    mesh(new THREE.PlaneGeometry(260, 170), skyMaterial, this.scene, 0, 5, -80);
    const positions = [], colors = [];
    for (let i = 0; i < 1750; i++) {
      positions.push((random() - .5) * 180, (random() - .5) * 115, -65 + random() * 30);
      const color = new THREE.Color().setHSL(.55 + random() * .17, .2, .25 + random() * .6); colors.push(color.r, color.g, color.b);
    }
    const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ vertexColors: true, size: .075, sizeAttenuation: true, transparent: true, opacity: .9, depthWrite: false })); this.scene.add(this.stars);
  }
  makeTaxi() {
    Object.assign(this, createTaxi()); this.stage.add(this.taxi);
    this.setSkin(SKINS[0]);
  }
  setSkin(skin) {
    this.skin = skin; applyTaxiSkin(this.taxi, skin);
    this.exhaustColor = new THREE.Color(skin.engine);
  }
  createSkinPortraits() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(480, 285); renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.4;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 480 / 285, .1, 30);
    camera.position.set(4.3, 2.7, 7.4); camera.lookAt(0, .1, 0);
    camera.zoom = 1.7; camera.updateProjectionMatrix();
    scene.add(new THREE.HemisphereLight(0xc8e7ff, 0x233149, 3));
    const key = new THREE.DirectionalLight(0xffefd4, 4); key.position.set(-3, 5, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x89beff, 3); rim.position.set(3, 2, -3); scene.add(rim);
    const model = this.taxi.clone(true); model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.setScalar(1); model.visible = true;
    const materials = new Map();
    model.traverse(o => {
      if (o.material) {
        if (!materials.has(o.material)) materials.set(o.material, o.material.clone());
        o.material = materials.get(o.material);
      }
      if (o.material?.name === 'taxi-engine') { o.visible = false; }
    });
    scene.add(model); const portraits = {};
    try {
      for (const skin of SKINS) { applyTaxiSkin(model, skin); renderer.render(scene, camera); portraits[skin.id] = renderer.domElement.toDataURL('image/png'); }
    } finally {
      materials.forEach(material => material.dispose()); renderer.dispose(); renderer.forceContextLoss();
    }
    return portraits;
  }
  makeIsland(pad, theme) {
    const art=this.art, group=new THREE.Group();
    group.position.set(pad.x,pad.y,0);this.levelGroup.add(group);
    const organic=pad.kind==='leaf', cloud=pad.style==='cloud';
    const natural=organic||cloud||['timber','felt','snow','enamel'].includes(art.material);
    const deck=this.deckMaterial;
    const edge=metal(new THREE.Color(art.surface).multiplyScalar(.55),.86,.15);
    const markings=metal('#cec5aa',.95,.02);
    const special=buildLandingObject(group,pad);
    if(pad.kind==='island'){
      const rockMat=metal(art.surface,.98,.05);
      const rock=mesh(new THREE.CylinderGeometry(pad.w*.45,pad.w*.14,2.8,9,2),rockMat,group,0,-1.95,-.35);rock.scale.z=.51;
      for(let i=0;i<5;i++){
        const pebble=mesh(new THREE.IcosahedronGeometry(.4+random()*.6),rockMat,group,(random()-.5)*pad.w*.6,-2.8,(random()-.5)*1.2);
        pebble.scale.set(.6,1.2+random(),.7);
      }
    }else if(pad.kind==='tower'&&pad.depth>.7){
      box(group,deck,pad.w,pad.depth,3.3,0,-pad.depth/2,-.1);
      for(let y=-1.1;y>-pad.depth+.5;y-=1.35)for(let x=-pad.w/2+.65;x<pad.w/2-.3;x+=1.1){
        box(group,edge,.52,.64,.04,x,y,1.57);
        box(group,glow('#b8a37c',.13),.28,.38,.05,x,y,1.6);
      }
      for(let y=-1.9;y>-pad.depth;y-=2.7)box(group,edge,pad.w,.08,.06,0,y,1.6);
    }
    if(organic){
      const leaf=mesh(new THREE.SphereGeometry(1,24,12),deck,group,0,-.25,-.1);leaf.scale.set(pad.w/2,.25,1.75);
      box(group,markings,pad.w*.88,.018,.035,0,-.04,.1);
      for(const side of [-1,1])for(let x=-pad.w/2+.65;x<pad.w/2-.3;x+=.85){
        const vein=box(group,metal('#6c814f',.95,.01),.03,.015,1.4,x,-.045,side*.6);vein.rotation.y=side*-.45;
      }
    }else if(special){
      // The cloud, canvas furniture and terrain itself supply the landing surface.
    }else{
      mesh(rounded(pad.w,.42,3.5,.1),deck,group,0,-.24);
      box(group,edge,pad.w,.14,3.5,0,-.52);
      if(art.material==='snow')box(group,metal('#c4cdc9',1,0),pad.w,.09,3.5,0,-.045);
      if(art.material==='timber')for(let x=-pad.w/2+.6;x<pad.w/2;x+=.6)box(group,edge,.035,.012,3.3,x,-.018);
      if(!natural)for(const x of [-pad.w/2+.35,pad.w/2-.35]){
        box(group,markings,.55,.14,.02,x,-.28,1.77);
        for(let i=0;i<3;i++)box(group,edge,.07,.14,.025,x-.18+i*.18,-.28,1.79);
      }
    }
    // Small painted touchdown brackets leave both the approach and pad silhouette clear.
    for(const side of [-1,1]){
      box(group,markings,.06,.015,1.3,side*Math.min(2.2,pad.w*.3),.008,.05);
      for(const z of [-.6,.7])box(group,markings,.45,.015,.06,side*(Math.min(2.2,pad.w*.3)-.18),.008,z);
    }
    const number=mesh(new THREE.PlaneGeometry(1.55,.78),new THREE.MeshBasicMaterial({map:labelTexture(String(pad.id),'#dad3bb'),transparent:true,depthWrite:false}),group,0,.01,.1);number.rotation.x=-Math.PI/2;
    mesh(new THREE.PlaneGeometry(1.05,.52),new THREE.MeshBasicMaterial({map:labelTexture(String(pad.id),'#d9d3c4'),transparent:true}),group,0,-.28,1.81);
    const pulse=box(group,new THREE.MeshBasicMaterial({color:theme,transparent:true,opacity:.22,depthWrite:false}),.16,.04,.02,0,-.17,1.82);
    const halo=mesh(new THREE.RingGeometry(.7,.72,32),new THREE.MeshBasicMaterial({color:theme,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false}),group,0,-.63,0);halo.rotation.x=Math.PI/2;halo.visible=false;
    const beacon=new THREE.Group();group.add(beacon);
    const targetRing=mesh(new THREE.TorusGeometry(1.25,.025,5,48),glow(theme,.7),beacon,0,.06);targetRing.rotation.x=-Math.PI/2;
    if(!natural&&!special){
      box(group,edge,.55,.28,.55,pad.w/2-.65,.14,-1.4);
      for(let i=0;i<3;i++)box(group,markings,.04,.015,.4,pad.w/2-.8+i*.15,.29,-1.4);
    }
    const person=this.makePerson(group,pad.w*.28);
    this.padObjects.push({group,beacon,ring:targetRing,person,pad,pulse,halo});
  }
  makePerson(parent, x) {
    return createPassenger(parent,x);
  }
  disembark(flight,padId,riderIndex) {
    const pad=flight.level.pads.find(p=>p.id===padId),pose=padPose(pad,flight.time);
    const person=createPassenger(this.levelGroup);
    this.departures.push({person,pad,start:flight.time,from:flight.x-pose.x,profile:riderFor(flight.sector,riderIndex)});
  }
  explode(x,y,vx,vy) {
    this.explosion.trigger(x,y,vx,vy);this.burst(x,y,'orange',120);this.shake=.9;
  }
  setLevel(index) {
    disposeGroup(this.levelGroup); this.padObjects = []; this.hazardObjects = [];this.obstacleObjects=[];this.fuelObjects=[];
    this.departures=[];this.explosion.clear();
    for(const particle of this.particles)particle.life=0;
    this.index=index;this.art=artFor(LEVELS[index]);
    const level={...LEVELS[index],color:this.art.accent};
    this.skyMaterial.uniforms.zenith.value.set(this.art.zenith);
    this.skyMaterial.uniforms.horizon.value.set(this.art.horizon);
    this.skyMaterial.uniforms.clouds.value=this.art.clouds;
    this.scene.fog.color.set(this.art.zenith);
    this.stars.visible=this.art.stars;
    this.rimLight.color.set(this.art.accent);
    this.deckMaterial=surfaceMaterial(this.art.material,this.art.surface);
    level.pads.forEach(pad => this.makeIsland(pad, level.color));
    buildSolidTerrain(this.levelGroup,level);
    for(const item of level.fuelCanisters||[])this.fuelObjects.push({item,group:buildFuelCanister(this.levelGroup,item)});
    for (const obstacle of level.obstacles) {
      if(obstacle.material==='tree')continue; // The wind-bent tree model supplies the trunk too.
      if (level.original || index === 24) { const group=buildObstacle(this.levelGroup, obstacle, level.color,level.theme);this.obstacleObjects.push({group,obstacle}); continue; }
      const group = new THREE.Group(); group.position.set(obstacle.x, obstacle.y, 0); this.levelGroup.add(group);
      const body = mesh(new THREE.DodecahedronGeometry(1, 0), metal(level.theme === 'crystal' ? 0x44375d : 0x574339, .88), group);
      body.scale.set(obstacle.w * .6, obstacle.h * .65, 1.2); body.rotation.z = .2;
      for (let i = 0; i < 5; i++) {
        const c = mesh(new THREE.ConeGeometry(.25, .9, 5), glow(level.color, .2), group, (random() - .5) * obstacle.w, obstacle.h * .5, -.4 + random()); c.rotation.z = (random() - .5);
      }
    }
    for (const hazard of level.hazards) {
      if (level.original || index === 24) { this.hazardObjects.push(buildHazard(this.levelGroup, hazard, level.color)); continue; }
      const h = mesh(new THREE.IcosahedronGeometry(hazard.radius, 1), metal(level.theme === 'crystal' ? 0x8064a6 : 0x945435, .6), this.levelGroup, hazard.x, hazard.y);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(h.geometry), new THREE.LineBasicMaterial({ color: level.color, transparent: true, opacity: .35 })); h.add(edges);
      this.hazardObjects.push(h);
    }
    this.mechanisms = buildMechanisms(this.levelGroup, level);
    this.dressing = buildDressing(this.levelGroup, level);
    this.exit = new THREE.Group(); this.exit.position.set(0, 15.4, 0); this.levelGroup.add(this.exit);
    const gateMat = glow(level.color, 1.6);
    box(this.exit, gateMat, 7.7, .08, .09, 0, .8);
    for (const x of [-4, 4]) { box(this.exit, gateMat, .1, 1.7, .15, x); box(this.exit, metal(0x41606e), .35, 2.4, .45, x * 1.06); }
    mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: labelTexture('EXIT ↑'), transparent: true, depthWrite: false }), this.exit, 0, 1.1, .3);
    this.exit.visible = false;
    // Fine perimeter marks indicate the horizontal flight bounds.
    const lineMat = new THREE.LineBasicMaterial({ color: 0x7596ae, transparent: true, opacity: .13 });
    const coordinates = [];
    for (const x of [-24, 24]) for (let y = -12; y < 17; y += 2) coordinates.push(x, y, -.4, x, y + .6, -.4);
    const border = new THREE.BufferGeometry(); border.setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3)); this.levelGroup.add(new THREE.LineSegments(border, lineMat));
  }
  makeParticles() {
    this.particles = Array.from({ length: 240 }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
    this.particlePositions = new Float32Array(720); this.particleColors = new Float32Array(720);
    this.particleGeometry = new THREE.BufferGeometry(); this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3)); this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    this.particleMesh = new THREE.Points(this.particleGeometry, new THREE.PointsMaterial({ size: .14, vertexColors: true, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false })); this.particleMesh.frustumCulled = false; this.stage.add(this.particleMesh);
    this.cursor = 0;
  }
  burst(x, y, color = 'orange', count = 65) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.cursor++ % this.particles.length];
      Object.assign(p, { x, y, z: .4, vx: (random() - .5) * 15, vy: (random() - .35) * 12, vz: (random() - .5) * 5, life: .6 + random(), max: 1.6, color });
    }
    if (color === 'orange') this.shake = .5;
  }
  project(x, y, z = 0) {
    const p = new THREE.Vector3(x, y, z); this.stage.localToWorld(p); p.project(this.camera);
    return { x: (p.x * .5 + .5) * innerWidth, y: (-p.y * .5 + .5) * innerHeight };
  }
  update(dt, time, flight, isMenu, isPaused = false) {
    this.preview = THREE.MathUtils.damp(this.preview, isMenu ? 1 : 0, 4, dt);
    const mobile = this.aspect < .8;
    const classicView = !mobile && (LEVELS[this.index].original || this.index === 24);
    const playScale = classicView ? .82 : 1;
    this.stage.scale.setScalar(playScale + this.preview * (.78 - playScale));
    this.stage.position.set(this.preview * (mobile ? 11 : 12), this.preview * (mobile ? -2 : .5) + (classicView ? 1.8 * (1 - this.preview) : 0), 0);
    this.stage.rotation.y = this.preview * -.13;
    this.camera.position.x = (random() - .5) * this.shake; this.camera.position.y = 6 + (random() - .5) * this.shake;
    this.shake *= Math.exp(-6 * (isPaused?0:dt));
    this.explosion.update(isPaused?0:dt);
    const ambientTime = this.reducedMotion.matches ? 0 : time;
    this.skyMaterial.uniforms.time.value = ambientTime;
    this.stars.rotation.z = Math.sin(ambientTime * .015) * .014;
    this.stars.material.opacity = .84 + Math.sin(ambientTime * .35) * .06;

    this.taxi.visible = isMenu || (!flight.crashTime && flight.status !== 'over');
    if (isMenu) {
      this.taxi.position.set(1.5 + Math.sin(time * .27) * 1.1, 7.5 + Math.sin(time * .8) * .38, 3);
      this.taxi.rotation.set(.06, -.24 + Math.sin(time * .2) * .08, -.06 + Math.sin(time * .7) * .025);
      this.taxi.scale.setScalar(mobile ? 3.6 : 4.0);
      this.gearGroup.scale.y = .14;
    } else {
      this.taxi.position.set(flight.x, flight.y, .45);
      this.taxi.rotation.set(0, 0, THREE.MathUtils.damp(this.taxi.rotation.z, flight.landed !== null ? 0 : -flight.vx * .028, 7, dt));
      this.taxi.scale.setScalar(1);
      this.gearGroup.scale.y = THREE.MathUtils.damp(this.gearGroup.scale.y, flight.gear ? 1 : .15, 12, dt);
    }
    const thrust = isMenu ? .65 : flight.crashTime ? 0 : flight.thrust;
    for (const flame of this.flames) {
      flame.visible = thrust > 0; const length = (.45 + random() * .6) * thrust;
      flame.scale.y = length * 1.6; flame.position.y = -.48 - .425 * flame.scale.y;
    }
    this.engineLight.intensity = thrust * (4 + random() * 2);
    for(const flame of this.sideFlames){
      flame.visible=!isMenu&&!flight.crashTime&&!flight.gear&&flight.horizontal===-flame.userData.side;
      flame.scale.y=.55+random()*.7;flame.position.x=flame.userData.side*(1.08+flame.scale.y*.35);
    }
    if (thrust && !isPaused) {
      for (let i = 0; i < 2; i++) {
        const p = this.particles[this.cursor++ % this.particles.length];
        Object.assign(p, { x: this.taxi.position.x + (i ? .84 : -.84) * this.taxi.scale.x, y: this.taxi.position.y - .7 * this.taxi.scale.y, z: this.taxi.position.z, vx: (random() - .5) * .6, vy: -3 - random() * 4, vz: 0, life: .2 + random() * .3, max: .5, color: 'blue' });
      }
    }
    this.particles.forEach((p, i) => {
      const step=isPaused?0:dt;
      p.life = Math.max(0, p.life - step); p.x += p.vx * step; p.y += p.vy * step; p.z += p.vz * step;
      const a = p.life / p.max;
      this.particlePositions.set([p.x, p.y, p.z], i * 3);
      this.particleColors.set(p.color === 'orange' ? [a * 2, a * .7, a * .1] : p.color === 'green' ? [a * .6, a * 1.7, a * .4] : [a * this.exhaustColor.r * 1.7, a * this.exhaustColor.g * 1.7, a * this.exhaustColor.b * 1.7], i * 3);
    });
    this.particleGeometry.attributes.position.needsUpdate = true; this.particleGeometry.attributes.color.needsUpdate = true;
    const levelTime = isMenu ? time % 120 + 40 : flight.time;
    for(const {group,obstacle}of this.obstacleObjects){const pose=obstaclePose(obstacle,levelTime);group.position.set(pose.x,pose.y,0);group.rotation.z=pose.angle||0;group.scale.y=pose.h/obstacle.h;}
    for(const {group,item}of this.fuelObjects){const pose=fuelCanisterPose(item,LEVELS[this.index],levelTime);group.position.set(pose.x,pose.y,1.05);group.visible=isMenu||!flight.fuelUsed.has(item.id);}
    for (const { group, pad, beacon, ring, person, pulse, halo } of this.padObjects) {
      const pose = padPose(pad, levelTime);
      group.position.x = pose.x; group.position.y = pose.y;
      group.scale.x = Math.max(.001, pose.growth); group.visible = pose.growth > .001;
      const target = !isMenu && pad.id === flight.targetId;
      beacon.visible = target || isMenu && pad.id === 4;
      ring.scale.setScalar(1 + Math.sin(time * 2) * .08);
      pulse.position.x = Math.sin(ambientTime * .8 + pad.x) * (pad.w / 2 - .6);
      halo.rotation.z = ambientTime * .5;
      person.visible = !isMenu && pose.active && !flight.passenger && flight.route?.[0] === pad.id;
      const approach=person.visible&&flight.landed===pad.id?Math.min(1,flight.serviceTime/.9):0;
      const home=person.userData.homeX;
      posePassenger(person,{time:levelTime,profile:riderFor(this.index,flight.routeIndex),x:THREE.MathUtils.lerp(home,flight.x-pose.x,approach),walk:approach>0?1:0,boarding:Math.max(0,(approach-.7)/.3),look:(flight.x-pose.x-home)*.04});
    }
    for(let i=this.departures.length-1;i>=0;i--){
      const d=this.departures[i],age=flight.time-d.start,pose=padPose(d.pad,levelTime);
      if(age>3){disposeGroup(d.person);this.levelGroup.remove(d.person);this.departures.splice(i,1);continue;}
      const x=THREE.MathUtils.lerp(d.from,-d.pad.w*.33,Math.min(1,age/2));
      posePassenger(d.person,{time:levelTime,profile:d.profile,x:pose.x+x,walk:age<2?1:0,departing:true});
      d.person.position.y=pose.y;d.person.scale.setScalar(PASSENGER_SCALE*Math.min(1,(3-age)*2));
    }
    this.hazardObjects.forEach((h, i) => {
      const spec = LEVELS[this.index].hazards[i], pos = levelHazardPose(spec, levelTime,LEVELS[this.index]);
      h.position.set(pos.x, pos.y, 0); h.visible = pos.active !== false;
      if (!isPaused) { h.rotation.x += dt * .3; h.rotation.z += dt * .4; }
    });
    this.mechanisms.update(levelTime, isMenu ? new Set() : flight.switches, isMenu ? levelTime - 6 : flight.resetTime);
    this.dressing.update(levelTime, ambientTime);
    this.exit.visible = !isMenu && flight.exitOpen;
    this.composer.render(dt);
  }
}
