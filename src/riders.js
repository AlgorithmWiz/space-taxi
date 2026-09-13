const PEOPLE=[
  {name:'Nova',job:'Botanist',color:'#bce879',skin:'#bd8663',hair:'#493328',kit:'botanist',build:.95,pitch:1.18,hail:'Hey, taxi!',thanks:'Thanks! You saved my night.'},
  {name:'Juno',job:'Orbital courier',color:'#ef9ec6',skin:'#875338',hair:'#211c28',kit:'courier',build:.94,pitch:1.3,hail:'Over here, cabbie!',thanks:'Perfect. Right on time!'},
  {name:'Atlas',job:'Station engineer',color:'#ffb367',skin:'#e2b087',hair:'#654029',kit:'engineer',build:1.1,pitch:.82,hail:'Taxi! Need a lift!',thanks:'Nice flying, captain.'},
  {name:'Pip',job:'Lunar tourist',color:'#7edfe8',skin:'#e5bb9e',hair:'#67423c',kit:'tourist',build:.92,pitch:1.4,hail:'Hey! Room for one?',thanks:'Best taxi in the galaxy!'},
  {name:'Sol',job:'Night-shift cook',color:'#c2a6f3',skin:'#975e45',hair:'#26252a',kit:'cook',build:1.04,pitch:.98,hail:'Cabbie! This way!',thanks:'Thanks. Dinner is on me.'},
  {name:'Rae',job:'Deep-space medic',color:'#f2cd75',skin:'#c99270',hair:'#963f35',kit:'medic',build:.98,pitch:1.08,hail:'Taxi, please!',thanks:'Smooth landing. Thank you.'},
];
export function riderFor(level,index=0){return PEOPLE[((level*3+index)%PEOPLE.length+PEOPLE.length)%PEOPLE.length];}
export function hailLine(rider,time){return [rider.hail,'Over here!','One passenger, please!'][Math.floor(Math.max(0,time)/12)%3];}
