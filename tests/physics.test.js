import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Flight, SHIP } from '../src/physics.js';
import { LEVELS, BONUS_START } from '../src/levels.js';
const originalFlight = (event) => { const f = new Flight(event); f.reset(BONUS_START); return f; };

function advance(flight, seconds, input = {}) { for (let i = 0; i < Math.ceil(seconds * 120); i++) flight.step(1 / 120, input); }
function approach(flight, id, { gear = true, speed = -1 } = {}) {
  const pad = flight.level.pads.find(p => p.id === id);
  flight.x = pad.x; flight.y = pad.y + (gear ? SHIP.feet : SHIP.halfHeight) + .025;
  flight.vx = 0; flight.vy = speed; flight.gear = gear; flight.landed = null;
}
test('takeoff consumes fuel; gravity returns the taxi toward a pad', () => {
  const f = originalFlight(); const initialY = f.y;
  advance(f, .8, { up: true });
  assert.ok(f.y > initialY + 1); assert.equal(f.landed, null); assert.ok(f.fuel < 100);
  advance(f, 1.5); assert.ok(f.vy < 0);
});
test('landing gear assists lateral braking and can only retract after takeoff', () => {
  const f = originalFlight(); f.toggleGear(); assert.equal(f.gear, true);
  advance(f, .1, { up: true }); f.toggleGear(); assert.equal(f.gear, false);
  f.x = 0; f.y = 12; f.vx = 6; f.vy = 0; advance(f, .1);
  const noGear = f.vx; f.gear = true; f.vx = 6; advance(f, .1);
  assert.ok(f.vx < noGear);
});
test('safe landing boards passenger, correct destination awards a fare', () => {
  const events = []; const f = originalFlight(e => events.push(e.type));
  approach(f, 2); advance(f, 1.1);
  assert.equal(f.landed, 2); assert.equal(f.passenger, true); assert.equal(f.targetId, 3);
  approach(f, 3); advance(f, 1.1);
  assert.equal(f.delivered, 1); assert.equal(f.routeIndex, 1); assert.ok(f.score >= 490); assert.equal(f.passenger, false);
  assert.ok(events.includes('pickup')); assert.ok(events.includes('delivery'));
});
test('wrong pad does not board a passenger', () => {
  const f = originalFlight(); approach(f, 4); advance(f, 1.2); assert.equal(f.passenger, false); assert.equal(f.routeIndex, 0);
});
test('hard landing, gear-up landing, and edge landing each consume one taxi', () => {
  for (const options of [{ speed: -7 }, { gear: false }, { edge: true }]) {
    const f = originalFlight(); approach(f, 2, options); if (options.edge) f.x += 3;
    advance(f, .15); assert.equal(f.lives, 2); assert.ok(f.crashTime > 0);
    advance(f, 1.7); assert.equal(f.landed, 1); assert.equal(f.lives, 2);
  }
});
test('crashing with a passenger restores the same pickup without advancing the route', () => {
  const f = originalFlight(); approach(f, 2); advance(f, 1.1); assert.equal(f.passenger, true);
  f.crash('test'); advance(f, 1.6);
  assert.equal(f.passenger, false); assert.equal(f.targetId, 2); assert.equal(f.routeIndex, 0);
});
test('ordinary depots no longer provide unlimited refueling', () => {
  const f = originalFlight(); f.fuel = 20; f.score = 100; advance(f, 1);
  assert.equal(f.fuel,20); assert.equal(f.score,100);
  advance(f,10);assert.equal(f.fuel,20);
});
test('all routes in all sectors can finish and the exit advances or wins', () => {
  for (let index = 0; index < 3; index++) {
    const f = originalFlight(); f.reset(BONUS_START + index);
    for (const [pickup, destination] of f.level.routes) {
      approach(f, pickup); advance(f, 1.1); assert.equal(f.passenger, true);
      approach(f, destination); advance(f, 1.1); assert.equal(f.passenger, false);
    }
    assert.equal(f.delivered, 3); assert.equal(f.exitOpen, true);
    f.x = 0; f.y = 15.3; f.vy = 1; f.landed = null; f.step(1 / 120);
    assert.equal(f.status, index === 2 ? 'won' : 'sector-complete');
  }
});
test('game over freezes the simulation after the third crash', () => {
  const f = originalFlight();
  for (let i = 0; i < 3; i++) { f.crash('test'); advance(f, 1.6); }
  assert.equal(f.status, 'over'); assert.equal(f.lives, 0);
  const y = f.y; advance(f, 2, { up: true }); assert.equal(f.y, y);
});
test('moving debris and obstacles collide with the taxi', () => {
  const f = originalFlight(); f.reset(BONUS_START + 1); f.landed = null; f.x = 0; f.y = -.5; f.step(1 / 120); assert.equal(f.lives, 2);
  const g = originalFlight(); g.reset(BONUS_START + 1); g.landed = null; g.x = 1; g.y = 8; g.invulnerable = 0; g.step(1 / 120); assert.equal(g.lives, 2);
});

test('a complete first fare is reachable with thrust and landing-gear control', () => {
  const f = originalFlight();
  // A conservative pilot climbs above the other platforms before crossing.
  // This exercises continuous motion and collision geometry without teleporting.
  function flyTo(x, y, landingPad = null) {
    for (let tick = 0; tick < 120 * 55; tick++) {
      const shouldDeploy = landingPad !== null && Math.abs(x - f.x) < .3 && Math.abs(f.vx) < .25;
      if (f.landed === null && f.gear !== shouldDeploy) f.toggleGear();
      const desiredVx = Math.max(-3, Math.min(3, (x - f.x) * 1.25));
      const desiredVy = Math.max(-1.7, Math.min(3.5, (y - f.y) * 1.4));
      f.step(1 / 120, { up: f.vy < desiredVy, right: f.vx < desiredVx - .035, left: f.vx > desiredVx + .035 });
      assert.equal(f.lives, 3, `Crashed while flying to ${x},${y}`);
      if (landingPad !== null ? f.landed === landingPad : Math.hypot(x - f.x, y - f.y) < .16) return;
    }
    assert.fail(`Unable to reach ${x},${y}; ended at ${f.x},${f.y}`);
  }
  flyTo(-17, 12); flyTo(-5, 12); flyTo(-5, -.5, 2); advance(f, 1.1);
  assert.equal(f.passenger, true);
  flyTo(-5, 12); flyTo(16, 12); flyTo(16, -4.5, 3); advance(f, 1.1);
  assert.equal(f.delivered, 1); assert.ok(f.score > 100); assert.ok(f.fuel > 0);
});

test('floating island rock and taxi roof are part of collision detection', () => {
  const f = originalFlight(); f.x = -5; f.y = -3.8; f.landed = null; f.vy = .5; f.step(1 / 120); assert.equal(f.lives, 2);
  const g = originalFlight(); g.x = -5; g.y = -2; g.landed = null; g.vy = 1; g.step(1 / 120); assert.equal(g.lives, 2);
});

