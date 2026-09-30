export const QUALITY_KEY='space-taxi-graphics';
export function resolveQuality(search='',saved=null){
  const choice=new URLSearchParams(search).get('quality')||saved;
  return choice==='highest'||choice==='high'?'highest':choice==='low'?'low':'balanced';
}
let saved;try{saved=globalThis.localStorage?.getItem(QUALITY_KEY);}catch{}
export const QUALITY=resolveQuality(globalThis.location?.search,saved);
export const GRAPHICS={
  low:{samples:0,pixelRatio:1,bloom:false},
  balanced:{samples:2,pixelRatio:1.7,bloom:true},
  highest:{samples:4,pixelRatio:2,bloom:true},
}[QUALITY];
