// Rendering and collision detection share these deterministic poses.
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const mod = (n, d) => ((n % d) + d) % d;
export const EXIT = 'EXIT';
export function padPose(pad, time = 0) {
  const m = pad.motion || {}, phase = time * (m.speed || .35) + (m.phase || 0);
  const growth = pad.growAt === undefined ? 1 : clamp((time - pad.growAt) / 2, 0, 1);
  const leaf=pad.kind==='leaf',side=Math.sign(pad.x),growing=leaf&&growth>0&&growth<1;
  return { x: (leaf?side*(.55+pad.w*growth/2):pad.x) + Math.sin(phase) * (m.x || 0), y: pad.y + Math.sin(phase) * (m.y || 0), vx: growing?side*pad.w/4:Math.cos(phase) * (m.x || 0) * (m.speed || .35), vy: Math.cos(phase) * (m.y || 0) * (m.speed || .35), w: pad.w * growth, active: growth === 1, growth };
}
export const windAngle=time=>-.055*Math.sin(time*.65)-.016*Math.sin(time*1.8);
export function obstaclePose(o,time=0){
  if(o.material==='stem'&&o.grows){const top=Math.min(13.1,-9.5+Math.max(0,time-6)*.93),bottom=-13;return {...o,y:(top+bottom)/2,h:top-bottom};}
  if(o.material==='tree'){const angle=windAngle(time),base=o.y-o.h/2;return {...o,angle,x:o.x-Math.sin(angle)*o.h/2,y:base+Math.cos(angle)*o.h/2};}
  return o;
}

export function pointInPolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
function segmentBox(ax,ay,bx,by,left,right,bottom,top){
  let lo=0,hi=1;const dx=bx-ax,dy=by-ay;
  for(const [p,q]of[[-dx,ax-left],[dx,right-ax],[-dy,ay-bottom],[dy,top-ay]]){
    if(Math.abs(p)<1e-10){if(q<0)return null;continue;}
    const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;
  }
  return lo;
}
export function intersectsPolygon(x,y,terrain,halfWidth=1.02,bottom=.46,roof=1.22){
  const points=terrain.points,left=x-halfWidth,right=x+halfWidth,low=y-bottom,top=y+roof;
  if([[left,low],[left,top],[right,low],[right,top]].some(([a,b])=>pointInPolygon(a,b,points)))return true;
  for(let i=0;i<points.length;i++){const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];if(segmentBox(ax,ay,bx,by,left,right,low,top)!==null)return true;}
  return false;
}
export function fuelCanisterPose(item,level,time=0){
  const pad=level.pads.find(p=>p.id===item.padId),pose=padPose(pad,time);
  return {x:pose.x+Math.min(pose.w/2-1,2.2),y:pose.y+.7};
}

// Sweep each shot from its launch point: a struck surface absorbs it for the
// rest of that firing cycle, preventing it reappearing beyond the obstruction.
const shotImpacts=new WeakMap();
export function levelHazardPose(h,time,level){
  const pos=hazardPose(h,time);if(h.path!=='shot'||pos.active===false)return pos;
  const age=pos.age,radius=h.radius||.2;
  const fixed=!level.pads.some(p=>p.motion||p.growAt!==undefined)&&!level.obstacles.some(o=>o.grows||o.material==='tree');
  if(fixed){
    if(!shotImpacts.has(level))shotImpacts.set(level,new WeakMap());const cache=shotImpacts.get(level);
    if(!cache.has(h)){
      const duration=h.duration||7,end={x:h.x+h.vx*duration,y:h.y+h.vy*duration};let impact=Infinity;
      const solids=[...level.pads.map(p=>({x:p.x,y:p.y-(p.depth||.64)/2,w:p.w,h:p.depth||.64})),...level.obstacles];
      for(const o of solids){
        const a=o.angle||0,c=Math.cos(a),s=Math.sin(a),local=p=>({x:(p.x-o.x)*c+(p.y-o.y)*s,y:-(p.x-o.x)*s+(p.y-o.y)*c}),from=local(h),to=local(end);
        const t=segmentBox(from.x,from.y,to.x,to.y,-o.w/2-radius,o.w/2+radius,-o.h/2-radius,o.h/2+radius);if(t!==null)impact=Math.min(impact,t*duration);
      }
      if(level.terrain?.length)for(let t=0;t<Math.min(impact,duration);t+=.02)if(level.terrain.some(o=>intersectsPolygon(h.x+h.vx*t,h.y+h.vy*t,o,radius,radius,radius))){impact=t;break;}
      cache.set(h,impact);
    }
    return {...pos,active:age<cache.get(h)};
  }
  const steps=Math.max(1,Math.ceil(age/.04));
  let previous={x:h.x,y:h.y};
  for(let i=1;i<=steps;i++){
    const t=age*i/steps,clock=time-age+t,current={x:h.x+h.vx*t,y:h.y+h.vy*t};
    const solids=[...level.pads.map(p=>{const q=padPose(p,clock);return q.growth>.01?{x:q.x,y:q.y-(p.depth||.64)/2,w:q.w,h:p.depth||.64}:null;}).filter(Boolean),...level.obstacles.map(o=>obstaclePose(o,clock))];
    for(const o of solids){
      const a=o.angle||0,c=Math.cos(a),s=Math.sin(a),local=p=>({x:(p.x-o.x)*c+(p.y-o.y)*s,y:-(p.x-o.x)*s+(p.y-o.y)*c}),from=local(previous),to=local(current);
      if(segmentBox(from.x,from.y,to.x,to.y,-o.w/2-radius,o.w/2+radius,-o.h/2-radius,o.h/2+radius)!==null)return {...pos,active:false};
    }
    if((level.terrain||[]).some(o=>intersectsPolygon(current.x,current.y,o,radius,radius,radius)))return {...pos,active:false};
    previous=current;
  }
  return pos;
}
export function hazardPose(h, time) {
  const phase = time * (h.speed || .5) + (h.phase || 0);
  if (h.path === 'fall') { const p = mod(time * (h.speed || 3) + (h.phase || 0), 33); return { x: h.x + Math.sin(p * .16 + (h.phase || 0)) * (h.drift || 0), y: 19 - p }; }
  if (h.path === 'shot') {
    const elapsed = time - (h.startsAt || 0), age = mod(elapsed + (h.phase || 0), h.period || 9);
    return { x: h.x + age * h.vx, y: h.y + age * h.vy, age, active: elapsed >= 0 && age < (h.duration || 7) };
  }
  if (h.path === 'bounce') { const wave = p => 1 - Math.abs(mod(p, 4) - 2); return { x: h.x + wave(phase) * (h.range || 17), y: h.y + wave(phase * .73 + 1) * (h.rangeY || 6) }; }
  return { x: h.x + Math.sin(phase) * (h.range || 0), y: h.y + Math.sin(phase * (h.ratio || 1) + .4) * (h.rangeY || 0) };
}
export function beamSegments(b, time, switches = new Set(), resetTime = 0) {
  if (b.gate && switches.has(b.gate)) return [];
  const clock = b.resettable ? Math.max(0, time - resetTime) : time;
  if (b.period && mod(clock + (b.phase || 0), b.period) >= b.onFor) return [];
  if (b.ax !== undefined) return [{ ax: b.ax, ay: b.ay, bx: b.bx, by: b.by, radius: b.width || .12 }];
  if (b.curtain) { const len = clamp((clock - 2.8) * 1.4, 0, 23); return len > .05 ? [{ x: b.x, y: 12 - len / 2, w: b.w || 1, h: len }] : []; }
  if (!b.gap) return [{ x: b.x || 0, y: b.y || 0, w: b.w || .2, h: b.h || .2 }];
  const center = (b.center || 0) + Math.sin(clock * b.speed + (b.phase || 0)) * (b.range || 0), min = b.min ?? -23.5, max = b.max ?? 23.5;
  const left = Math.max(min, center - b.gap / 2), right = Math.min(max, center + b.gap / 2);
  return [...(left > min ? [{ x: (min + left) / 2, y: b.y, w: left - min, h: b.h || .16 }] : []), ...(right < max ? [{ x: (right + max) / 2, y: b.y, w: max - right, h: b.h || .16 }] : [])];
}
export function intersectsRect(x, y, o, halfWidth = 1.02, bottom = .46, roof = 1.22) {
  const hh = (bottom + roof) / 2, cy = y + (roof - bottom) / 2, a = o.angle || 0, c = Math.cos(a), s = Math.sin(a), dx = x - o.x, dy = cy - o.y;
  return Math.abs(dx * c + dy * s) < o.w / 2 + Math.abs(c) * halfWidth + Math.abs(s) * hh && Math.abs(-dx * s + dy * c) < o.h / 2 + Math.abs(s) * halfWidth + Math.abs(c) * hh;
}
export function distanceToSegment(x, y, s) {
  const dx = s.bx - s.ax, dy = s.by - s.ay, t = clamp(((x - s.ax) * dx + (y - s.ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(x - s.ax - t * dx, y - s.ay - t * dy);
}
export function environmentalForce(level, x, y, time) {
  let fx = level.wind || 0, fy = 0;
  if (level.weather) fx += Math.sin(time * .65) * 2.1 * (y > -5 ? 1 : .2);
  for (const f of level.fields || []) {
    const dx = f.x - x, dy = f.y - y, distance = Math.hypot(dx, dy);
    if (f.kind === 'gravity') { const force = Math.min(f.max || 7, f.strength / (distance * distance + 4)); fx += dx / (distance || 1) * force; fy += dy / (distance || 1) * force; }
    if (f.kind === 'radio' && Math.abs(y - f.y) < f.h / 2) { fx += Math.sin(time * 13) * 1.7; fy += Math.cos(time * 9) * .7; }
  }
  return { x: fx, y: fy };
}
