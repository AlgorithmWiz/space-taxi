export const SKINS = Object.freeze([
  { id: 'classic', name: 'TX–84 Original', tag: 'THE ICON', price: 0, paint: '#e8b728', trim: '#162635', accent: '#8295a0', engine: '#77ddff', glass: '#123e52', pattern: 'classic', description: 'Checkerboard yellow. Every great shift starts here.' },
  { id: 'lagoon', name: 'Lagoon Runner', tag: 'COASTAL CHROME', price: 3000, paint: '#19b9ae', trim: '#102f40', accent: '#d9f5ed', engine: '#82ffe0', glass: '#164754', pattern: 'stripe', description: 'Sea-glass paint, ivory racing stripes, mint ion trails.' },
  { id: 'polar', name: 'Polar Rescue', tag: 'ARCTIC SERVICE', price: 8000, requiredLevel: 8, paint: '#e4eced', trim: '#344453', accent: '#ff7245', engine: '#9eeaff', glass: '#245575', pattern: 'rescue', description: 'Pearl white with rescue-orange service markings.' },
  { id: 'night', name: 'After Hours', tag: 'NEON EDITION', price: 16000, requiredLevel: 16, paint: '#7850c3', trim: '#211d3b', accent: '#f592e2', engine: '#d8a1ff', glass: '#3c326d', pattern: 'stripe', description: 'Violet lacquer and pink neon for the midnight crowd.' },
  { id: 'solar', name: 'Solar Flare', tag: 'ORBITAL SPORT', price: 28000, requiredLevel: 20, paint: '#d94b36', trim: '#271c28', accent: '#ffcb6c', engine: '#ffb477', glass: '#482d46', pattern: 'stripe', description: 'Vermilion paint, gold twin stripes, amber exhaust.' },
  { id: 'auric', name: 'Auric Executive', tag: 'FIRST CLASS', price: 45000, requiredLevel: 24, paint: '#d6aa54', trim: '#19232b', accent: '#fff0ba', engine: '#ffe2a0', glass: '#2a454b', pattern: 'luxury', description: 'Brushed gold, dark chrome, and a first-class finish.' },
]);
export const skinById = id => SKINS.find(skin => skin.id === id) || SKINS[0];

// Material roles are shared by the flying taxi and its garage portraits.
export function applyTaxiSkin(taxi, skin) {
  taxi.traverse(object => {
    const mat = object.material;
    if (mat?.name === 'taxi-paint') {
      mat.color.set(skin.paint); mat.roughness = skin.id === 'auric' ? .23 : .3;
      mat.metalness = skin.id === 'auric' ? .85 : .55;
    }
    if (mat?.name === 'taxi-trim') mat.color.set(skin.trim);
    if (mat?.name === 'taxi-accent') mat.color.set(skin.accent);
    if (mat?.name === 'taxi-glass') { mat.color.set(skin.glass); mat.emissive.set(skin.glass); }
    if (mat?.name === 'taxi-engine') mat.color.set(skin.engine);
    if (object.name === 'taxi-engine-light') object.color.set(skin.engine);
    if (object.userData.pattern) object.visible = object.userData.pattern === skin.pattern;
  });
}
