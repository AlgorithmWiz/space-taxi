import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreAtStep,SCORE_STEPS,STEP_SECONDS,midiFrequency} from '../src/music.js';
import {riderFor,hailLine} from '../src/riders.js';
test('the music loops at a bar boundary with bounded notes and a varied arrangement',()=>{
  assert.equal(SCORE_STEPS%16,0);assert.ok(STEP_SECONDS>0);
  const instruments=new Set();
  for(let step=0;step<SCORE_STEPS;step++){
    const notes=scoreAtStep(step);assert.deepEqual(notes,scoreAtStep(step+SCORE_STEPS));
    for(const n of notes){instruments.add(n.instrument);assert.ok(n.volume>0&&n.volume<=.5);for(const pitch of n.notes||[n.note].filter(n=>n!==undefined)){assert.ok(Number.isFinite(midiFrequency(pitch)));assert.ok(pitch>=24&&pitch<=96);}}
  }
  assert.equal(instruments.size,7);assert.notDeepEqual(scoreAtStep(16),scoreAtStep(272));
});
test('passenger identity stays consistent for a ride and changes for the next fare',()=>{
  for(let level=0;level<28;level++)for(let ride=0;ride<9;ride++){
    const rider=riderFor(level,ride);assert.equal(rider,riderFor(level,ride));assert.notEqual(rider.name,riderFor(level,ride+1).name);
    assert.match(rider.color,/^#[0-9a-f]{6}$/i);assert.ok(hailLine(rider,0));assert.notEqual(hailLine(rider,0),hailLine(rider,24));
  }
});
