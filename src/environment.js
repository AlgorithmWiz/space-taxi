// Rendering and collision detection share these deterministic poses.
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const mod = (n, d) => ((n % d) + d) % d;
export const EXIT = 'EXIT';
export function padPose(pad, time = 0) {
  const m = pad.motion || {}, phase = time * (m.speed || .35) + (m.phase || 0);
  const growth = pad.growAt === undefined ? 1 : clamp((time - pad.growAt) / 2, 0, 1);
  return { x: pad.x + Math.sin(phase) * (m.x || 0), y: pad.y + Math.sin(phase) * (m.y || 0), vx: Math.cos(phase) * (m.x || 0) * (m.speed || .35), vy: Math.cos(phase) * (m.y || 0) * (m.speed || .35), w: pad.w * growth, active: growth > .98, growth };
}
export function hazardPose(h, time) {
  const phase = time * (h.speed || .5) + (h.phase || 0);
  if (h.path === 'fall') { const p = mod(time * (h.speed || 3) + (h.phase || 0), 33); return { x: h.x + Math.sin(p * .16 + (h.phase || 0)) * (h.drift || 0), y: 19 - p }; }
  if (h.path === 'shot') { const p = mod(time + (h.phase || 0), h.period || 9); return { x: h.x + p * h.vx, y: h.y + p * h.vy, active: p < (h.duration || 7) }; }
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
