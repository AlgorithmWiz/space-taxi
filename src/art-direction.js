// Original stage motifs with restrained, material-led lighting. No shared city skin.
const profiles = {
  candy: ['Confectionery after closing','#161318','#44332f','#c6aa88','#6a5550','enamel',false,.35],
  beach: ['Atlantic dusk','#172a35','#746758','#c1b79a','#665b49','timber',false,.8],
  city: ['Concrete skyline','#121b27','#465563','#b8c7ce','#4a5055','concrete',false,.5],
  training: ['Flight test hangar','#0d1319','#26323d','#cfbd83','#525960','metal',false,0],
  garden: ['The giant beanstalk','#101e19','#3e5040','#a9b483','#4c6440','leaf',false,.5],
  pong: ['After-hours table tennis','#161613','#41392a','#c5b688','#355a52','felt',false,0],
  teleport: ['Subterranean transfers','#151619','#403a32','#c5bcaa','#726451','rock',false,0],
  puzzle: ['Stone puzzle vault','#171615','#443f36','#c0ac83','#635d50','stone',false,0],
  cannon: ['Fortified courtyard','#211d1d','#51433e','#cbb28e','#84615e','stone',false,.35],
  meteors: ['Meteor caverns','#080e1d','#252b3e','#c9c1ad','#66615c','rock',false,.12],
  magnet: ['Magnetic test chamber','#121a1d','#344349','#bdc7c4','#526268','metal',false,0],
  blackhole: ['Deep-space singularity','#030409','#15121f','#bcb3c6','#48424f','metal',true,0],
  turbo: ['Turbine works','#211a14','#5d4a35','#d5b579','#6d5e4b','metal',false,.65],
  mines: ['The orbital minefield','#071413','#233c37','#b4bd95','#3d4d43','metal',true,.1],
  electric: ['High-voltage insulators','#111717','#31473e','#b1cdbd','#52655c','ceramic',false,0],
  snow: ['Alpine whiteout','#3c4b58','#909d9e','#d7dedb','#74838a','snow',false,1],
  radio: ['Mountain relay station','#20272f','#665e52','#c5bb9e','#5d625f','concrete',false,.85],
  maze: ['The basalt labyrinth','#0d161b','#30444a','#a5bbc0','#495960','stone',false,0],
  reverse: ['Skyscrapers in a squall','#262022','#67514a','#d0b194','#625751','concrete',false,1],
  barrier: ['Curtain timing chamber','#1a1011','#482b2d','#d1af8e','#62494a','metal',false,0],
  rebound: ['Rebound testing ground','#1b1d1b','#474b43','#cbc195','#62645a','metal',false,0],
  shifting: ['Sliding bulkhead shaft','#151418','#3e3745','#c3b7c9','#655a68','metal',false,0],
  laser: ['Laser test enclosure','#0c131d','#283e54','#a7bfd0','#45596b','concrete',false,0],
  moving: ['Chain-driven gantries','#211b17','#514437','#cbbb9c','#62584c','metal',false,0],
  museum: ['Museworld archive','#151918','#3f4941','#ccc6aa','#686658','stone',false,0],
  orbital: ['Orbital gardens','#071323','#293f56','#b3c4bd','#526468','metal',true,.12],
  crystal: ['Amethyst cavern','#121020','#39304b','#b5a7c7','#554767','rock',false,.12],
  refinery: ['Solar furnace','#24110c','#6a3a23','#ddbd8b','#715443','metal',true,.55],
};
export function artFor(level) {
  const entry=profiles[level.theme];
  if(!entry) throw new Error(`Missing art direction: ${level.theme}`);
  const [name,zenith,horizon,accent,surface,material,stars,clouds]=entry;
  return {name,zenith,horizon,accent,surface,material,stars,clouds};
}
