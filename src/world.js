import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LEVELS } from './levels.js';
import { padPose, hazardPose } from './environment.js';
import { buildObstacle, buildHazard, buildMechanisms, buildDressing } from './scenery.js';
import { Explosion } from './explosion.js';
import { createPassenger, posePassenger } from './passenger.js';
import { riderFor } from './riders.js';
import { SKINS, applyTaxiSkin } from './skins.js';

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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.22;
    this.renderer.setClearColor(0x080e19); container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.FogExp2(0x0b1422, .005);
    this.camera = new THREE.OrthographicCamera(-30, 30, 18, -18, .1, 250);
    this.camera.position.set(0, 6, 65); this.camera.lookAt(0, 1, 0);
    this.composer = new EffectComposer(this.renderer); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1280, 800), .36, .55, 1.05);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.scene.add(new THREE.HemisphereLight(0x9fbcd9, 0x0a0c25, 2.2));
    const key = new THREE.DirectionalLight(0xffead1, 3.4); key.position.set(-12, 20, 30); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7cabff, 3); rim.position.set(5, 4, -12); this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xa680fa, 1.8); fill.position.set(15, -6, 5); this.scene.add(fill);
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
      uniforms: { time: { value: 0 } }, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv;uniform float time;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(7.1);a*=.5;}return v;}
        void main(){vec2 uv=vUv;float n=fbm(uv*7.+vec2(time*.002,-time*.001));float mist=fbm(uv*12.+n*2.+time*.001);float band=exp(-pow((uv.y-.54+(uv.x-.5)*.29+n*.17)*6.,2.));vec3 c=vec3(.006,.011,.023);c+=vec3(.065,.032,.13)*mist*band*.65;c+=vec3(.007,.022,.04)*pow(n,2.)*1.5;c+=vec3(.05,.018,.035)*exp(-length((uv-vec2(.75,.68))*vec2(3.,5.)))*mist;gl_FragColor=vec4(c,1.);}`,
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
    const planetMat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=normalize(normalMatrix*normal);vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 vNormal;varying vec3 vPosition;void main(){vec3 n=normalize(vNormal);float light=max(0.,dot(n,normalize(vec3(-.8,.6,.5))));float stripes=sin(vPosition.y*1.2+sin(vPosition.x*.3)*.7)*.04;float rim=pow(1.-max(0.,n.z),3.);vec3 c=mix(vec3(.015,.021,.05),vec3(.13+stripes,.22+stripes,.32+stripes),light*.8);c+=vec3(.1,.26,.3)*rim*.6;gl_FragColor=vec4(c,1.);}`,
    });
    this.planet = mesh(new THREE.SphereGeometry(10.5, 64, 48), planetMat, this.scene, 29, 15, -45);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x63858a, side: THREE.DoubleSide, transparent: true, opacity: .13, depthWrite: false });
    const ring = mesh(new THREE.RingGeometry(13.5, 18.2, 128), ringMat, this.scene, 29, 15, -45); ring.rotation.set(1.13, .2, -.4);
    const orbit = mesh(new THREE.RingGeometry(19, 19.05, 128), new THREE.MeshBasicMaterial({ color: 0x8dadb1, side: THREE.DoubleSide, transparent: true, opacity: .18 }), this.scene, 29, 15, -45); orbit.rotation.copy(ring.rotation);
    // A distant orbital horizon grounds the floating flight zone.
    const horizon = mesh(new THREE.SphereGeometry(95, 64, 48), metal(0x101c30, 1, 0), this.scene, 0, -110, -55);
    const halo = mesh(new THREE.SphereGeometry(95.5, 64, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: 'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 n;void main(){float a=pow(1.-abs(n.z),6.);gl_FragColor=vec4(.1,.35,.65,a*.36);}' }), this.scene, 0, -110, -55);
    horizon.rotation.z = -.1; halo.rotation.z = -.1;
    // Distant craft live behind the flight zone and never participate in collisions.
    this.traffic = [];
    for (let i = 0; i < 5; i++) {
      const craft = new THREE.Group(); this.scene.add(craft);
      box(craft, metal(0x567184, .5), 1.1, .16, .28);
      box(craft, metal(0x34485e), .48, .09, 1.2, -.05, 0);
      box(craft, glow(i % 2 ? 0xc5a9e4 : 0x8ddadf, .6), .09, .07, .18, -.58, 0);
      const trail = box(craft, new THREE.MeshBasicMaterial({ color: 0x729cb4, transparent: true, opacity: .1, depthWrite: false }), 3.8, .025, .025, -2.4, 0);
      craft.scale.setScalar(.45 + i * .06);
      this.traffic.push({ craft, trail, offset: i * 19, height: 19 - i * 7, speed: .5 + i * .16 });
    }
    this.satellite = new THREE.Group(); this.scene.add(this.satellite);
    mesh(new THREE.OctahedronGeometry(.42), metal(0x94a6b8), this.satellite);
    for (const x of [-1.15, 1.15]) {
      box(this.satellite, metal(0x334b74, .3), 1.4, .65, .06, x);
      for (let k = 0; k < 4; k++) box(this.satellite, metal(0x83afbd), .025, .62, .075, x - .53 + k * .35);
    }
  }
  makeTaxi() {
    this.taxi = new THREE.Group(); this.stage.add(this.taxi);
    const yellow = metal(0xe8b728, .3, .55), trim = metal(0x162635, .38, .65), silver = metal(0x8295a0, .25, .8);
    const windowMaterial = new THREE.MeshPhysicalMaterial({ color: 0x123e52, metalness: .65, roughness: .13, clearcoat: 1, emissive: 0x12384d, emissiveIntensity: .4 });
    yellow.name = 'taxi-paint'; trim.name = 'taxi-trim'; windowMaterial.name = 'taxi-glass';
    const accent = metal(0xd9f5ed, .25, .7); accent.name = 'taxi-accent';
    mesh(rounded(2.7, .65, 1.25, .16), yellow, this.taxi, 0, -.02, 0);
    mesh(rounded(2.5, .19, 1.2, .06), trim, this.taxi, 0, -.35, 0);
    mesh(rounded(1.65, .73, 1.04, .15), yellow, this.taxi, -.15, .55, 0);
    mesh(rounded(1.42, .51, 1.07, .1), windowMaterial, this.taxi, -.15, .56, 0);
    box(this.taxi, yellow, .065, .62, 1.1, -.27, .54);
    box(this.taxi, trim, 1.25, .035, .015, -.18, .32, .552);
    box(this.taxi, yellow, 1.59, .11, 1.11, -.15, .91);
    const sign = mesh(rounded(.64, .29, .28, .04), glow(0xffe695, .7), this.taxi, -.15, 1.12);
    box(this.taxi, trim, .8, .055, .4, -.15, .96);
    mesh(new THREE.PlaneGeometry(.5, .25), new THREE.MeshBasicMaterial({ map: labelTexture('TAXI', '#243322'), transparent: true }), sign, 0, 0, .146);
    for (let i = 0; i < 15; i++) {
      for (let row = 0; row < 2; row++) if ((i + row) % 2 === 0) {
        box(this.taxi, trim, .135, .10, .018, -1.04 + i * .147, .08 + row * .1, .633);
        box(this.taxi, trim, .135, .10, .018, -1.04 + i * .147, .08 + row * .1, -.633);
      }
    }
    box(this.taxi, silver, .23, .045, .04, -.13, .02, .65);
    for (const z of [-.44, .44]) {
      mesh(rounded(.12, .21, .25, .04), glow(0xe5faff, 4), this.taxi, 1.34, -.03, z);
      mesh(rounded(.1, .18, .23, .03), glow(0xff5a36, 2.5), this.taxi, -1.35, -.03, z);
      mesh(new THREE.CylinderGeometry(.19, .22, .2, 16), trim, this.taxi, -.87, -.45, z);
      mesh(new THREE.CylinderGeometry(.19, .22, .2, 16), trim, this.taxi, .86, -.45, z);
    }
    this.gearGroup = new THREE.Group(); this.taxi.add(this.gearGroup);
    for (const x of [-.84, .84]) for (const z of [-.44, .44]) {
      const leg = mesh(new THREE.CylinderGeometry(.035, .05, .4, 8), silver, this.gearGroup, x, -.61, z); leg.rotation.z = x > 0 ? -.12 : .12;
      mesh(rounded(.45, .1, .25, .035), trim, this.gearGroup, x, -.82, z);
      box(this.gearGroup, glow(0x8fe8e8, 1.2), .25, .025, .02, x, -.79, z + .13);
    }
    this.flames = [];
    for (const x of [-.84, .84]) for (const z of [-.44, .44]) {
      const flame = mesh(new THREE.ConeGeometry(.16, .85, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x77ddff, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), this.taxi, x, -.8, z);
      flame.rotation.z = Math.PI; this.flames.push(flame);
    }
    this.engineLight = new THREE.PointLight(0x64d5ff, 4, 7, 2); this.engineLight.position.set(0, -1, 1); this.taxi.add(this.engineLight);
    this.engineLight.name = 'taxi-engine-light';
    this.sideFlames=[-1,1].map(side=>{
      const flame=mesh(new THREE.ConeGeometry(.13,.7,10,1,true),new THREE.MeshBasicMaterial({color:0x93e6ff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),this.taxi,side*1.3,-.06,.15);
      flame.rotation.z=-side*Math.PI/2;flame.userData.side=side;flame.visible=false;return flame;
    });
    const stripe = box(this.taxi, silver, .21, .03, 1.05, .95, .321); stripe.rotation.z = .07;
    for (const flame of [...this.flames, ...this.sideFlames]) flame.material.name = 'taxi-engine';
    for (const pattern of ['stripe', 'rescue', 'luxury']) {
      const decals = new THREE.Group(); decals.userData.pattern = pattern; this.taxi.add(decals);
      if (pattern === 'stripe') {
        for (const z of [-.23, .23]) {
          box(decals, accent, .53, .018, .13, 1.0, .318, z);
          box(decals, accent, 1.55, .018, .13, -.15, .973, z);
        }
        for (const z of [-.646, .646]) box(decals, accent, 2.3, .055, .014, 0, -.14, z);
      } else if (pattern === 'rescue') {
        for (const z of [-.654, .654]) {
          box(decals, accent, .43, .09, .012, .72, -.01, z);
          box(decals, accent, .09, .42, .012, .72, -.01, z);
          box(decals, accent, .3, .09, .012, -.86, -.12, z);
        }
        box(decals, accent, 1.56, .02, .16, -.15, .974, .34);
      } else {
        for (const z of [-.65, .65]) for (const y of [-.16, .26]) box(decals, accent, 2.25, .027, .012, 0, y, z);
        for (const z of [-.36, .36]) box(decals, accent, .43, .015, .04, 1, .327, z);
      }
    }
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
  makeIsland(pad, theme, index) {
    const group = new THREE.Group(); group.position.set(pad.x, pad.y, 0); this.levelGroup.add(group);
    if (pad.kind === 'island') {
      const rockMat = metal(index === 1 ? 0x3e315e : index === 2 ? 0x4a3835 : 0x283546, .98, .12);
      const rock = mesh(new THREE.CylinderGeometry(pad.w * .45, pad.w * .14, 2.8, 7, 2), rockMat, group, 0, -1.95, -.35);
      rock.scale.z = .51; rock.rotation.y = .16;
      for (let i = 0; i < 6; i++) {
      const pebble = mesh(new THREE.IcosahedronGeometry(.35 + random() * .65, 0), rockMat, group, (random() - .5) * pad.w * .65, -2.7 - random() * .8, (random() - .5) * 1.2);
      pebble.scale.set(.6, 1.1 + random(), .7); pebble.rotation.set(random(), random(), random());
      }
    } else if (pad.kind === 'tower' && pad.depth > .7) {
      box(group, metal(0x29374b), pad.w, pad.depth, 3.3, 0, -pad.depth / 2, -.1);
      const windows = glow(theme, .45);
      for (let y = -1.2; y > -pad.depth + .6; y -= 1.35) for (let x = -pad.w / 2 + .7; x < pad.w / 2 - .3; x += 1.15) {
        box(group, windows, .28, .4, .025, x, y, 1.57);
      }
    } else if (pad.kind === 'leaf') {
      const leaf = mesh(new THREE.SphereGeometry(1, 16, 10), metal(0x527e46), group, 0, -.4, -.2); leaf.scale.set(pad.w / 2, .27, 1.8);
    }
    const deck = metal(0x394b56, .62, .65), edge = metal(0x152a36, .52, .62), light = glow(theme, 1.7);
    mesh(rounded(pad.w, .42, 3.5, .13), deck, group, 0, -.24);
    mesh(rounded(pad.w + .13, .19, 3.55, .07), edge, group, 0, -.53);
    box(group, light, pad.w - .25, .045, .07, 0, -.16, 1.8);
    box(group, light, .055, .035, 3.3, -pad.w / 2 + .2, -.018);
    box(group, light, .055, .035, 3.3, pad.w / 2 - .2, -.018);
    for (let i = 0; i < 8; i++) {
      const stripe = box(group, i % 2 === 0 ? metal(0xc8b958) : edge, .26, .14, .016, -pad.w / 2 + .3 + i * .28, -.35, 1.79);
      stripe.rotation.z = -.3;
    }
    for (const x of [-pad.w / 2 + .3, pad.w / 2 - .3]) {
      box(group, metal(0x65808a), .1, .5, .1, x, .2, -1.48);
      mesh(new THREE.SphereGeometry(.09, 8, 6), light, group, x, .46, -1.48);
    }
    // Touchdown markings and large pad numerals, painted on the deck.
    const ring = mesh(new THREE.RingGeometry(.85, .9, 48), new THREE.MeshBasicMaterial({ color: theme, side: THREE.DoubleSide, transparent: true, opacity: .55 }), group, 0, -.018, 0);
    ring.rotation.x = -Math.PI / 2;
    const number = mesh(new THREE.PlaneGeometry(1.55, .78), new THREE.MeshBasicMaterial({ map: labelTexture(String(pad.id), theme), transparent: true, depthWrite: false }), group, 0, 0, .1); number.rotation.x = -Math.PI / 2;
    const sign = mesh(new THREE.PlaneGeometry(1.05, .52), new THREE.MeshBasicMaterial({ map: labelTexture(String(pad.id), '#c2dbe4'), transparent: true }), group, 0, -.28, 1.81);
    sign.renderOrder = 2;
    // Recessed faceplates and inset light tracks stay inside the existing deck silhouette.
    const alloy = metal(index === 1 ? 0x615975 : index === 0 ? 0x627d79 : 0x627183, .35, .75);
    for (const x of [-pad.w / 2 + .55, pad.w / 2 - .55]) {
      mesh(rounded(.65, .29, .12, .04), alloy, group, x, -.36, 1.79);
      for (let k = 0; k < 3; k++) box(group, edge, .045, .14, .02, x - .16 + k * .16, -.36, 1.862);
    }
    for (let x = -pad.w / 2 + 1.15; x < pad.w / 2 - .8; x += .7) {
      box(group, edge, .035, .014, 2.8, x, -.017, -.1);
      box(group, alloy, .27, .018, .09, x, -.014, 1.42);
      box(group, light, .12, .018, .08, x, -.012, -1.35);
    }
    const pulse = box(group, new THREE.MeshBasicMaterial({ color: theme, transparent: true, opacity: .8, depthWrite: false }), .55, .045, .02, 0, -.16, 1.85);
    const halo = mesh(new THREE.RingGeometry(.7, .75, 40, 1, 0, Math.PI * 1.4), new THREE.MeshBasicMaterial({ color: theme, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }), group, 0, -.63, 0);
    halo.rotation.x = Math.PI / 2;
    const beacon = new THREE.Group(); group.add(beacon);
    const targetRing = mesh(new THREE.TorusGeometry(1.25, .025, 5, 60), glow(theme, 2), beacon, 0, .07); targetRing.rotation.x = Math.PI / 2;
    const cone = mesh(new THREE.CylinderGeometry(1.25, 1.25, 2.8, 48, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { tint: { value: new THREE.Color(theme) } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec2 vUv;uniform vec3 tint;void main(){float a=pow(1.-vUv.y,2.)*.11;gl_FragColor=vec4(tint,a);}' }), beacon, 0, 1.45);
    if (pad.fuel) {
      const station = new THREE.Group(); station.position.set(-pad.w / 2 + 1, .04, -1.1); group.add(station);
      mesh(rounded(.7, 1.4, .65, .08), metal(0x6e8390), station, 0, .7);
      box(station, glow(0x82f4c3, 1), .42, .37, .03, 0, 1, .34);
      box(station, edge, .28, .11, .05, 0, .46, .35);
      const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(.35, 1.12, 0), new THREE.Vector3(.7, .95, 0), new THREE.Vector3(.65, .3, .1), new THREE.Vector3(.36, .54, .3)]);
      mesh(new THREE.TubeGeometry(hose, 12, .045, 6, false), edge, station);
      const tank = mesh(new THREE.CylinderGeometry(.5, .5, 1.5, 16), metal(0x3d626d), group, pad.w / 2 - .9, .75, -1.2);
      box(group, light, .3, .1, .08, tank.position.x, 1.2, -.67);
    } else if (index === 0) {
      for (let i = 0; i < 3; i++) {
        const tx = -pad.w / 2 + .6 + i * .8, ty = .65 + random() * .5;
        mesh(new THREE.CylinderGeometry(.035, .08, ty, 6), metal(0x567774), group, tx, ty / 2, -1.2);
        const tree = mesh(new THREE.IcosahedronGeometry(.43, 1), metal(i % 2 ? 0x608d76 : 0x3b756d), group, tx, ty, -1.2); tree.scale.set(.8, 1.5, .8);
      }
      const shelter = mesh(new THREE.SphereGeometry(1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x729fae, roughness: .17, metalness: .6, transparent: true, opacity: .44, side: THREE.DoubleSide }), group, pad.w / 2 - 1.2, .08, -1.15);
      shelter.scale.set(1, .8, .7);
      box(group, edge, 2.3, .13, 1.6, shelter.position.x, .08, -1.1);
    } else if (index === 1) {
      for (let i = 0; i < 5; i++) {
        const crystal = mesh(new THREE.ConeGeometry(.22 + random() * .15, .9 + random() * 1.5, 5), metal(i % 2 ? 0x8462b4 : 0x528cb2, .22, .5), group, (i < 3 ? -1 : 1) * (pad.w / 2 - .45 - random() * .7), .55, -1.3);
        crystal.rotation.z = (random() - .5) * .5;
      }
    } else {
      for (let i = 0; i < 3; i++) {
        mesh(new THREE.CylinderGeometry(.28, .33, 1.1 + i * .28, 12), metal(0x6e5951), group, -pad.w / 2 + .7 + i * .55, .65, -1.3);
        box(group, light, .25, .12, .07, -pad.w / 2 + .7 + i * .55, .75, -.96);
      }
      box(group, edge, 1.2, 1.4, .7, pad.w / 2 - 1, .75, -1.35);
    }
    const person = this.makePerson(group, pad.w * .28);
    this.padObjects.push({ group, beacon, ring: targetRing, person, pad, pulse, halo });
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
    disposeGroup(this.levelGroup); this.padObjects = []; this.hazardObjects = [];
    this.departures=[];this.explosion.clear();
    for(const particle of this.particles)particle.life=0;
    this.index = index; const level = LEVELS[index];
    const skin = ['garden', 'beach', 'snow', 'candy', 'orbital', 'museum'].includes(level.theme) ? 0 : ['teleport', 'crystal', 'puzzle'].includes(level.theme) ? 1 : 2;
    level.pads.forEach(pad => this.makeIsland(pad, level.color, skin));
    for (const obstacle of level.obstacles) {
      if (level.original || index === 24) { buildObstacle(this.levelGroup, obstacle, level.color); continue; }
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
    this.planet.rotation.y = ambientTime * .004;
    for (const { craft, offset, height, speed } of this.traffic) {
      craft.position.set(((ambientTime * speed + offset) % 110) - 55, height + Math.sin(ambientTime * .04 + offset) * 1.2, -37);
      craft.rotation.z = .06 * Math.sin(ambientTime * .04 + offset);
    }
    this.satellite.position.set(29 + Math.cos(ambientTime * .024 + 2) * 19, 15 + Math.sin(ambientTime * .024 + 2) * 5, -31);
    this.satellite.rotation.set(.3, ambientTime * .045, -.35);
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
      d.person.position.y=pose.y;d.person.scale.setScalar(1.45*Math.min(1,(3-age)*2));
    }
    this.hazardObjects.forEach((h, i) => {
      const spec = LEVELS[this.index].hazards[i], pos = hazardPose(spec, levelTime);
      h.position.set(pos.x, pos.y, 0); h.visible = pos.active !== false;
      if (!isPaused) { h.rotation.x += dt * .3; h.rotation.z += dt * .4; }
    });
    this.mechanisms.update(levelTime, isMenu ? new Set() : flight.switches, isMenu ? levelTime - 6 : flight.resetTime);
    this.dressing.update(levelTime, ambientTime);
    this.exit.visible = !isMenu && flight.exitOpen;
    this.composer.render(dt);
  }
}
