// Original-inspired Crossfire: two ground guns, six mirrored firing lanes and
// three shell speeds. Geometry, launch timing and visible barrels share this data.
export const CROSSFIRE_GUNS = [-1, 1].map((side, index) => ({
  side, x: side * 14.4, y: -12.35, firstShot: 1.2 + index * 1.2,
}));
const SLOPES = [.52, .72, 1.05];
const SPEEDS = [3.4, 4.3, 5.2];
const INTERVAL = 2.4, SHOTS = 9, BARREL = 1.8;

function lane(gun, index) {
  const slope = SLOPES[index % 3], norm = Math.hypot(1, slope);
  return {dx: -gun.side / norm, dy: slope / norm};
}
export function crossfireShots() {
  return CROSSFIRE_GUNS.flatMap((gun, gunIndex) => Array.from({length: SHOTS}, (_, index) => {
    const {dx, dy} = lane(gun, index), speed = SPEEDS[Math.floor(index / 3)];
    const x = gun.x + dx * BARREL, y = gun.y + dy * BARREL;
    const vx = dx * speed, vy = dy * speed;
    return {kind: 'cannon', path: 'shot', gun: gunIndex, x, y, vx, vy,
      startsAt: gun.firstShot + index * INTERVAL, period: INTERVAL * SHOTS,
      duration: Math.min((17.7 - y) / vy, (24 - Math.sign(vx) * x) / Math.abs(vx)), radius: .28};
  }));
}
export function crossfireGunPose(gun, time) {
  const elapsed = time - gun.firstShot, index = Math.max(0, Math.floor(elapsed / INTERVAL));
  const {dx, dy} = lane(gun, index % SHOTS);
  const age = elapsed < 0 ? Infinity : elapsed - index * INTERVAL;
  return {angle: Math.atan2(-dx, dy), flash: age < .12,
    recoil: age < .28 ? Math.sin(age / .28 * Math.PI) * .12 : 0};
}
