import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Flight } from '../src/physics.js';
import { checkpoint, parseProgress, campaignLevelReached } from '../src/progress.js';

test('saved checkpoints round-trip and restart the correct level with earnings and taxis', () => {
  const original = new Flight(); original.reset(8);
  Object.assign(original, { score: 1720, delivered: 4, totalTime: 135, lives: 2 });
  const saved = checkpoint(original, 9);
  const progress = parseProgress(JSON.stringify({ cleared: [8], checkpoint: saved }));
  const resumed = new Flight(); resumed.reset(progress.checkpoint.startSector);
  Object.assign(resumed, progress.checkpoint); resumed.loadSector(progress.checkpoint.sector);
  assert.equal(resumed.sector, 9); assert.equal(resumed.startSector, 8);
  assert.equal(resumed.score, 1720); assert.equal(resumed.lives, 2);
  assert.equal(resumed.totalTime, 135); assert.equal(resumed.delivered, 4);
  assert.equal(resumed.routeIndex, 0); assert.equal(resumed.fuel, 100);
  assert.equal(resumed.passenger, false); assert.equal(resumed.status, 'playing');
});

test('invalid saved data cannot create a broken game; completion indices are sanitized', () => {
  for (const raw of [null, 'broken', '{}', 'null']) assert.deepEqual(parseProgress(raw), { cleared: [], checkpoint: null });
  const good = checkpoint(new Flight());
  for (const bad of [{ sector: 99 }, { lives: 0 }, { lives: 4 }, { score: -1 }, { totalTime: -1 }, { startSector: 5 }, { delivered: 1.5 }]) {
    const saved = parseProgress(JSON.stringify({ cleared: [0, 0, 24, -1, 28, '2'], checkpoint: { ...good, ...bad } }));
    assert.equal(saved.checkpoint, null); assert.deepEqual(saved.cleared, [0, 24]);
  }
});

test('four-level milestones restore one taxi, level 24 leads to Mystery, and Mystery ends the campaign', () => {
  const f = new Flight(); f.reset(3); f.lives = 1; f.finishLevel();
  assert.equal(f.lives, 2); assert.equal(f.status, 'sector-complete');
  f.loadSector(4); assert.equal(f.lives, 2); assert.equal(f.time, 0);
  f.loadSector(23); f.finishLevel(); assert.equal(f.status, 'sector-complete');
  const next = checkpoint(f, f.sector + 1); assert.equal(next.sector, 24);
  f.loadSector(next.sector); f.finishLevel(); assert.equal(f.status, 'won');
});

test('skin milestones follow earned campaign progress, not a selected high-level departure', () => {
  assert.equal(campaignLevelReached(null), 1);
  assert.equal(campaignLevelReached({ cleared: [7, 15, 19, 23, 24, 25] }), 1);
  assert.equal(campaignLevelReached({ cleared: [0, 1, 3, 4, 5, 6, 7] }), 3);
  assert.equal(campaignLevelReached({ cleared: [6, 5, 4, 3, 2, 1, 0, 0] }), 8);
  for (const level of [8, 16, 20, 24]) {
    assert.equal(campaignLevelReached({ cleared: Array.from({ length: level - 1 }, (_, i) => i) }), level);
    assert.equal(campaignLevelReached({ checkpoint: { startSector: 0, sector: level - 1 } }), level);
    assert.equal(campaignLevelReached({ checkpoint: { startSector: level - 1, sector: level - 1 } }), 1);
  }
  assert.equal(campaignLevelReached({ cleared: Array.from({ length: 28 }, (_, i) => i) }), 24);
  for (const sector of [-1, 25, '15', 15.5]) assert.equal(campaignLevelReached({ checkpoint: { startSector: 0, sector } }), 1);
});
