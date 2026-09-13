import { LEVELS, BONUS_START } from './levels.js';
import { padPose, beamSegments } from './environment.js';
import { artFor } from './art-direction.js';
const svgNS='http://www.w3.org/2000/svg';
function shape(name,attrs){const e=document.createElementNS(svgNS,name);for(const [key,value]of Object.entries(attrs))e.setAttribute(key,String(value));return e;}
export function thumbnail(level){
  const art=artFor(level);level={...level,color:art.accent};
  const svg=shape('svg',{viewBox:'0 0 240 148','aria-hidden':'true'});
  svg.append(shape('rect',{x:0,y:0,width:240,height:148,rx:4,fill:art.zenith}));
  const g=shape('g',{transform:'translate(120 77) scale(4.5 -4.1)'});svg.append(g);
  for(const o of level.obstacles)g.append(shape('rect',{x:o.x-o.w/2,y:o.y-o.h/2,width:o.w,height:o.h,fill:level.color,opacity:.17,transform:`rotate(${(o.angle||0)*180/Math.PI} ${o.x} ${o.y})`}));
  for(const o of level.terrain||[])g.append(shape('polygon',{points:o.points.map(p=>p.join(',')).join(' '),fill:art.surface,opacity:.9}));
  for(const p of level.pads){const q=padPose(p,45);g.append(shape('rect',{x:q.x-q.w/2,y:q.y-.6,width:q.w,height:.6,rx:.15,fill:p.fuel?'#fff1b2':level.color}));if(p.depth>1)g.append(shape('rect',{x:q.x-q.w/2,y:q.y-p.depth,width:q.w,height:p.depth,fill:level.color,opacity:.12}));}
  for(const beam of level.beams||[])for(const s of beamSegments(beam,4)){
    if(s.ax!==undefined)g.append(shape('line',{x1:s.ax,y1:s.ay,x2:s.bx,y2:s.by,stroke:beam.color||level.color,'stroke-width':.16,opacity:.55}));
    else g.append(shape('rect',{x:s.x-s.w/2,y:s.y-s.h/2,width:s.w,height:s.h,fill:beam.color||'#ff7794',opacity:.6}));
  }
  for(const p of level.portals||[])g.append(shape('circle',{cx:p.x,cy:p.y,r:1.2,fill:'none',stroke:p.color,'stroke-width':.3}));
  for(const f of level.fields||[])if(f.kind==='gravity')g.append(shape('circle',{cx:f.x,cy:f.y,r:2.2,fill:'#050610',stroke:level.color,'stroke-width':.25}));
  g.append(shape('path',{d:'M-3 16h6',stroke:level.color,'stroke-width':.35}));return svg;
}
export function renderAtlas(container,tab,selected,cleared,onSelect){
  container.replaceChildren();
  const indices=tab<3?Array.from({length:8},(_,i)=>tab*8+i):[24,25,26,27];
  for(const index of indices){
    const level=LEVELS[index],button=document.createElement('button');button.className='atlas-card';button.classList.toggle('chosen',index===selected);button.dataset.level=index;
    button.setAttribute('aria-label',`Select ${index<24?`level ${index+1}`:'bonus'}: ${level.name}`);button.setAttribute('aria-pressed',String(index===selected));
    button.append(thumbnail(level));
    const info=document.createElement('div');info.className='atlas-card-info';
    const number=document.createElement('span');number.className='atlas-number';number.textContent=index<24?String(index+1).padStart(2,'0'):index===24?'?':`B${index-BONUS_START+1}`;
    const title=document.createElement('b');title.textContent=level.name;
    const complete=document.createElement('span');complete.className='atlas-complete';complete.textContent=cleared.includes(index)?'✓':'↗';
    info.append(number,title,complete);button.append(info);
    const hint=document.createElement('small');hint.textContent=level.hint;button.append(hint);
    button.addEventListener('click',()=>onSelect(index));container.append(button);
  }
}
