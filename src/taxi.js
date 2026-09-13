import * as THREE from 'three';

const metal = (color, roughness = .35, metalness = .7) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const light = (color, strength = 1.4) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness: .3 });
function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, material); part.position.set(x, y, z); parent.add(part); return part;
}
function box(parent, material, w, h, d, x = 0, y = 0, z = 0) {
  return mesh(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
}
function profile(parent, material, points, depth, z = 0, bevel = .015) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSegments: 1, steps: 1, bevelSize: bevel, bevelThickness: bevel });
  geometry.translate(0, 0, -depth / 2);
  return mesh(parent, geometry, material, 0, 0, z);
}
function panel(parent, material, corners) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
  return mesh(parent, geometry, material);
}
function label(text, color) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = color; context.font = '700 108px sans-serif';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 256, 85);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
}

// The same model supplies the flight zone, departures hero, and all skin portraits.
// Landing feet, roof height, and thruster anchors retain the existing flight dimensions.
export function createTaxi() {
  const taxi = new THREE.Group(); taxi.name = 'TX-84 cyber taxi';
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xe8b728, roughness: .3, metalness: .55, clearcoat: .4, clearcoatRoughness: .32 });
  const trim = metal(0x162635, .48), alloy = metal(0x81929f, .25, .85), rubber = metal(0x090f18, .75, .15);
  const glass = new THREE.MeshPhongMaterial({ color: 0x123e52, specular: 0x102a38, shininess: 28, emissive: 0x123e52, emissiveIntensity: .12, side: THREE.DoubleSide });
  const accent = metal(0x8295a0, .26), neon = light(0x77ddff, 1.6);
  paint.name = 'taxi-paint'; trim.name = 'taxi-trim'; glass.name = 'taxi-glass';
  accent.name = 'taxi-accent'; neon.name = 'taxi-neon';
  const headlight = light(0xc8f5ff, 2.5), tailLight = light(0xff4973, 1.8);

  // Faceted armor over a recessed graphite chassis.
  profile(taxi, trim, [[-1.34,-.22],[-1.23,.14],[1.22,.13],[1.38,-.19],[1.11,-.39],[-1.07,-.39]], 1.15, 0, .025);
  profile(taxi, paint, [[-1.32,-.12],[-1.28,.1],[-1.03,.27],[.98,.27],[1.36,.045],[1.37,-.12],[1.09,-.24],[-1.06,-.24]], 1.16, 0, .025);
  profile(taxi, rubber, [[-1.3,-.27],[1.32,-.27],[1.07,-.42],[-1.06,-.42]], 1.02, 0, .015);

  // Swept glass cabin, windshield, and a floating armored roof cap.
  profile(taxi, trim, [[-.91,.265],[-.65,.845],[.25,.885],[.81,.28]], .99, 0, .02);
  for (const side of [-1, 1]) {
    profile(taxi, glass, [[-.81,.325],[-.585,.80],[.215,.831],[.70,.33]], .009, side * .519, 0);
    const pillar = box(taxi, trim, .042, .50, .025, -.15, .572, side * .535); pillar.rotation.z = -.065;
    box(taxi, alloy, 1.36, .02, .022, -.06, .305, side * .537);
    const reflection = new THREE.MeshBasicMaterial({ color: 0xa5e7f3, transparent: true, opacity: .105, depthWrite: false, side: THREE.DoubleSide });
    profile(taxi, reflection, [[-.52,.75],[-.39,.755],[-.57,.35],[-.67,.35]], .001, side * .538, 0);
    profile(taxi, reflection, [[.12,.78],[.155,.78],[.48,.37],[.43,.37]], .001, side * .538, 0);
  }
  // Keep the windshield outside the cabin's beveled front face.
  panel(taxi, glass, [[.304,.883,.47],[.304,.883,-.47],[.817,.33,-.49],[.817,.33,.49]]);
  const windshieldBrace = box(taxi, trim, .77, .027, .027, .557, .605, 0); windshieldBrace.rotation.z = -.827;
  profile(taxi, paint, [[-.69,.845],[-.57,.925],[.245,.962],[.355,.865]], 1.06, 0, .018);
  for (const side of [-1, 1]) {
    const roofEdge = box(taxi, neon, .92, .018, .015, -.145, .865, side * .551); roofEdge.rotation.z = .04;
    const mirror = box(taxi, trim, .17, .065, .16, .59, .35, side * .572); mirror.rotation.z = -.18;
    box(taxi, neon, .085, .015, .012, .61, .353, side * .658);
  }

  // Door inserts, service handles, sill lighting, and machined side intakes.
  const fleetLabel = label('TX-84', '#c1d2d6');
  for (const side of [-1, 1]) {
    profile(taxi, trim, [[-.69,-.20],[-.73,.125],[.52,.125],[.65,-.095],[.51,-.205]], .014, side * .609, .008);
    box(taxi, accent, .19, .027, .023, -.38, .065, side * .633);
    const plate = mesh(taxi, new THREE.PlaneGeometry(.42,.13), fleetLabel, -.025, -.065, side * .634);
    if (side < 0) plate.rotation.y = Math.PI;
    box(taxi, trim, 2.18, .09, .05, -.01, -.286, side * .584);
    box(taxi, neon, 1.95, .025, .018, .01, -.274, side * .616);
    box(taxi, alloy, .23, .032, .045, 1.04, -.245, side * .57);
    profile(taxi, trim, [[-1.28,-.14],[-1.24,.095],[-.89,.13],[-.92,-.19]], .025, side * .61, .009);
    for (let i = 0; i < 4; i++) {
      const vent = box(taxi, alloy, .019, .135, .02, -1.19 + i * .066, -.025, side * .641); vent.rotation.z = -.22;
    }
    box(taxi, tailLight, .032, .15, .022, -1.275, -.008, side * .632);
    for (const x of [-.67,.49]) mesh(taxi, new THREE.SphereGeometry(.018,6,4), alloy, x, -.15, side * .643);
  }

  // Thin LED headlamps, front grille, and vented hood.
  box(taxi, rubber, .046, .14, 1.015, 1.373, -.025);
  for (const z of [-.31,.31]) {
    box(taxi, headlight, .048, .035, .32, 1.4, .016, z);
    box(taxi, neon, .025, .07, .023, 1.405, -.01, z + Math.sign(z) * .175);
  }
  for (const z of [-.29,-.145,0,.145,.29]) box(taxi, alloy, .017, .04, .052, 1.402, -.085, z);
  const bonnet = box(taxi, trim, .27, .026, .62, 1.035, .237); bonnet.rotation.z = -.46;
  for (const z of [-.22,-.11,0,.11,.22]) {
    const fin = box(taxi, alloy, .21, .016, .016, 1.038, .256, z); fin.rotation.z = -.46;
  }
  box(taxi, trim, .035, .135, .87, -1.325, -.052);
  box(taxi, tailLight, .04, .03, .69, -1.347, -.013);
  for (let i = 0; i < 5; i++) {
    const louvre = box(taxi, trim, .13, .035, .78, -.96 + i * .043, .31 + i * .094); louvre.rotation.z = 1.12;
  }

  // Low-profile roof sign: dark housing and legible illuminated lettering.
  box(taxi, trim, .48, .09, .20, -.15, .972);
  profile(taxi, trim, [[-.54,1.015],[-.49,1.203],[.18,1.203],[.23,1.015]], .25, 0, .012);
  const taxiLabel = label('TAXI', '#b4f7ff');
  for (const side of [-1, 1]) {
    const text = mesh(taxi, new THREE.PlaneGeometry(.58,.18), taxiLabel, -.155, 1.109, side * .139);
    if (side < 0) text.rotation.y = Math.PI;
    box(taxi, neon, .65, .015, .018, -.155, 1.202, side * .137);
    box(taxi, neon, .65, .012, .018, -.155, 1.019, side * .137);
  }

  // Four armored lift turbines. The original nozzle and landing-foot anchors stay fixed.
  for (const x of [-.84,.84]) for (const z of [-.44,.44]) {
    mesh(taxi, new THREE.CylinderGeometry(.205,.23,.18,8), trim, x, -.402, z);
    mesh(taxi, new THREE.CylinderGeometry(.152,.18,.05,12), alloy, x, -.495, z);
    mesh(taxi, new THREE.CylinderGeometry(.115,.14,.025,12), rubber, x, -.522, z);
    const rim = mesh(taxi, new THREE.TorusGeometry(.147,.017,5,20), neon, x, -.523, z); rim.rotation.x = Math.PI / 2;
    for (const offset of [-.082,0,.082]) box(taxi, alloy, .019, .014, .22, x + offset, -.538, z);
  }
  const gearGroup = new THREE.Group(); gearGroup.name = 'landing gear'; taxi.add(gearGroup);
  for (const x of [-.84,.84]) for (const z of [-.44,.44]) {
    const sleeve = mesh(gearGroup, new THREE.CylinderGeometry(.052,.068,.25,8), trim, x, -.58, z); sleeve.rotation.z = x > 0 ? -.12 : .12;
    mesh(gearGroup, new THREE.CylinderGeometry(.029,.036,.25,8), alloy, x, -.694, z);
    profile(gearGroup, rubber, [[x-.22,-.87],[x-.20,-.78],[x+.18,-.78],[x+.22,-.87]], .25, z, 0);
    box(gearGroup, neon, .25, .018, .016, x, -.803, z + Math.sign(z) * .129);
  }
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0x77ddff, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  flameMaterial.name = 'taxi-engine';
  const flames = [];
  for (const x of [-.84,.84]) for (const z of [-.44,.44]) {
    const flame = mesh(taxi, new THREE.ConeGeometry(.14,.85,12,1,true), flameMaterial, x, -.8, z);
    flame.rotation.z = Math.PI; flames.push(flame);
  }
  const sideFlames = [-1,1].map(side => {
    const flame = mesh(taxi, new THREE.ConeGeometry(.11,.7,10,1,true), flameMaterial, side * 1.3, -.06, .15);
    flame.rotation.z = -side * Math.PI / 2; flame.userData.side = side; flame.visible = false; return flame;
  });
  const engineLight = new THREE.PointLight(0x77ddff,4,7,2); engineLight.position.set(0,-1,1);
  engineLight.name = 'taxi-engine-light'; taxi.add(engineLight);

  // Skin-specific markings share the material roles used by the fare-wallet garage.
  for (const pattern of ['classic','stripe','rescue','luxury']) {
    const decals = new THREE.Group(); decals.userData.pattern = pattern; taxi.add(decals);
    for (const side of [-1,1]) {
      if (pattern === 'classic') {
        box(decals, paint, 1.14, .12, .014, -.09, .195, side * .612);
        for (let i = 0; i < 12; i++) for (let row = 0; row < 2; row++) if ((i + row) % 2 === 0) {
          box(decals, trim, .086, .047, .01, -.585 + i * .091, .171 + row * .049, side * .627);
        }
      } else if (pattern === 'rescue') {
        box(decals, accent, .30, .065, .016, .9, -.065, side * .619);
        box(decals, accent, .065, .23, .016, .9, -.065, side * .62);
        box(decals, accent, .8, .03, .014, -.08, .2, side * .622);
      } else {
        box(decals, accent, 1.16, pattern === 'luxury' ? .022 : .043, .016, -.07, .194, side * .622);
        if (pattern === 'luxury') box(decals, accent, 1.13, .016, .016, -.07, -.185, side * .639);
        const roofStripe = box(decals, accent, .69, .017, pattern === 'luxury' ? .028 : .085, -.13, .949, side * .29); roofStripe.rotation.z = .045;
      }
    }
  }
  return { taxi, gearGroup, flames, sideFlames, engineLight };
}
