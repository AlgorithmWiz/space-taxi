import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseScores,upsertScore,scoresFor,boardFor,cleanCallsign,entryFromFlight,rankOf} from '../src/highscores.js';
import {Flight} from '../src/physics.js';
import {checkpoint,parseProgress} from '../src/progress.js';
const entry=(id,score=1000,start=0,extra={})=>({id,name:'ACE',score,start,level:start,delivered:2,seconds:60,date:'2026-09-12T20:00:00Z',finished:false,...extra});

test('each high-score board ranks its own top ten and separates level-select departures',()=>{
  let store=parseScores(null);
  for(const start of [0,8,25])for(let i=0;i<14;i++)store=upsertScore(store,entry(`${start}-${i}`,100+i*100,start));
  assert.equal(store.entries.length,30);
  for(const board of ['campaign','free','bonus']){const scores=scoresFor(store,board);assert.equal(scores.length,10);assert.equal(scores[0].score,1400);assert.equal(scores[9].score,500);}
  assert.equal(boardFor(24),'free');assert.equal(boardFor(25),'bonus');
  assert.equal(rankOf(store,entry('winner',2000)),1);assert.equal(rankOf(store,entry('too-low',1)),null);
});
test('one run has one record; refueling and checkpoint replay cannot reduce or duplicate it',()=>{
  let store=upsertScore(parseScores(null),entry('same-run',2000,0,{level:3}));
  store=upsertScore(store,entry('same-run',1500,0,{name:'JET'}));
  assert.equal(store.entries.length,1);assert.equal(store.entries[0].score,2000);assert.equal(store.entries[0].name,'JET');assert.equal(store.entries[0].level,3);
  store=upsertScore(store,entry('same-run',2400,0,{level:4,name:'JET'}));
  assert.equal(store.entries.length,1);assert.equal(store.entries[0].score,2400);assert.equal(store.entries[0].level,4);
});
test('saved leaderboards round-trip and reject corrupt records without rendering raw names',()=>{
  const raw={pilot:'n<o>va',entries:[entry('good',1200,0,{name:'<x>'}),entry('nan',-10),entry('cross',100,0,{level:26}),entry('bad-date',200,0,{date:'tomorrow'}),entry('fraction',2.3)]};
  const parsed=parseScores(JSON.stringify(raw));assert.equal(parsed.entries.length,1);assert.equal(parsed.entries[0].name,'X');assert.equal(parsed.pilot,'NOV');
  assert.deepEqual(parseScores(JSON.stringify(parsed)),parsed);
  for(const raw of [null,'null','{','[]'])assert.equal(parseScores(raw).entries.length,0);
  assert.equal(cleanCallsign(''),'ACE');assert.equal(cleanCallsign(' ab-7 '),'AB7');
});
test('equal scores use fares, progress and elapsed flight time as stable tie breakers',()=>{
  let store=parseScores(null);
  for(const e of [entry('slow',1000,0,{seconds:100}),entry('fast',1000,0,{seconds:50}),entry('fares',1000,0,{delivered:3})])store=upsertScore(store,e);
  assert.deepEqual(scoresFor(store,'campaign').map(e=>e.id),['fares','fast','slow']);
});
test('a resumed campaign carries its run ID into a single high-score record',()=>{
  const flight=new Flight();flight.score=900;flight.delivered=1;
  const store=upsertScore(parseScores(null),entryFromFlight(flight,'CAB'));
  const saved=parseProgress(JSON.stringify({checkpoint:checkpoint(flight,1)})).checkpoint;
  const resumed=new Flight();assert.notEqual(resumed.runId,flight.runId);Object.assign(resumed,saved);resumed.loadSector(saved.sector);resumed.score+=500;
  const next=upsertScore(store,entryFromFlight(resumed,'CAB'));assert.equal(next.entries.length,1);assert.equal(next.entries[0].score,1400);assert.equal(resumed.runId,flight.runId);
});
test('unearned scores are excluded and finished flights retain their result details',()=>{
  const flight=new Flight();assert.equal(entryFromFlight(flight,'CAB'),null);
  flight.reset(24);flight.service(flight.level.pads[0],1);flight.finishLevel();
  const e=entryFromFlight(flight,'CAB');assert.ok(e.score>0);assert.equal(e.finished,true);assert.equal(e.level,24);assert.equal(e.start,24);
});
