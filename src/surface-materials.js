import * as THREE from 'three';

// Small, deterministic material maps keep the remake self-contained.
export function surfaceMaterial(kind,color){
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  let seed=1984;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<6000;i++){
    ctx.fillStyle=i%2?'#ffffff0d':'#00000012';
    const x=rand()*256,y=rand()*256;
    ctx.fillRect(x,y,kind==='metal'?10+rand()*22:1+rand()*3,1+rand()*2);
  }
  if(kind==='timber'){
    for(let i=0;i<65;i++){
      const y=i*4;ctx.strokeStyle=i%3?'#271b122a':'#dfc6a225';ctx.lineWidth=.5+rand();ctx.beginPath();
      for(let x=0;x<=256;x+=4){const yy=y+Math.sin(x*.037+i)*1.7+Math.sin(x*.092+i*.7)*.6;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();
    }
  }else if(['stone','rock','concrete'].includes(kind)){
    for(let i=0;i<140;i++){ctx.fillStyle='#191e1f25';ctx.beginPath();ctx.ellipse(rand()*256,rand()*256,.4+rand()*2,.4+rand()*2,rand()*6,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<7;i++){ctx.strokeStyle='#11191c23';ctx.lineWidth=.6;let x=rand()*256,y=rand()*256;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<6;j++){x+=rand()*10-5;y+=rand()*12;ctx.lineTo(x,y);}ctx.stroke();}
  }else if(kind==='enamel'){
    for(let i=0;i<30;i++){ctx.fillStyle='#25201c35';ctx.fillRect(rand()*256,rand()*256,rand()*4+.5,1);}
  }
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  return new THREE.MeshStandardMaterial({map,roughness:kind==='metal'?.72:kind==='enamel'?.48:.95,metalness:kind==='metal'?.35:.03});
}
