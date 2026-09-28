import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AudioEngine} from '../src/audio.js';
import {VOICE_CLIPS,voiceParts} from '../src/voice-clips.js';
import {riderFor,hailLine} from '../src/riders.js';

function engine(){
  globalThis.window={speechSynthesis:{cancel(){},speak(){}}};
  const audio=new AudioEngine();audio.mode='playing';
  const sources=[];
  audio.context={currentTime:1,createBufferSource(){
    const source={connect(){},disconnect(){},start(...args){this.started=args;},stop(){this.stopped=true;}};
    sources.push(source);return source;
  }};
  audio.voiceBus={};audio.sources=sources;return audio;
}

test('available recordings cover passenger calls and numeric destinations',()=>{
  for(let i=0;i<6;i++){
    const rider=riderFor(0,i);
    if(rider.voice==='giselle')continue;
    assert.ok(voiceParts(rider.thanks,rider.voice));
    assert.ok(voiceParts('Up, please!',rider.voice));
    for(let pad=1;pad<=9;pad++){
      assert.ok(voiceParts(`Pad ${pad}, please.`,rider.voice));
      for(const time of [0,12,24])assert.ok(voiceParts(`${hailLine(rider,time)} Pad ${pad}!`,rider.voice));
    }
  }
  assert.ok(voiceParts('Thanks! You saved my night.','giselle'));
  assert.ok(voiceParts('Smooth landing. Thank you.','giselle'));
  assert.equal(voiceParts('Pad 6, please.','giselle'),null);
  for(const voice of Object.values(VOICE_CLIPS)){
    const wav=fs.readFileSync(new URL(voice.file,new URL('../src/voice-clips.js',import.meta.url)));
    const duration=wav.readUInt32LE(40)/wav.readUInt32LE(28);
    for(const [offset,length] of Object.values(voice.lines)){
      assert.ok(offset>=0&&length>0&&offset+length<=duration+.001);
    }
  }
});

test('muting or pausing invalidates pending recordings',async()=>{
  for(const cancel of [a=>a.toggle(),a=>a.setState('paused'),a=>a.setState('playing',true),a=>a.stopVoice()]){
    const audio=engine();let resolve;
    audio.loadVoice=()=>new Promise(done=>resolve=done);
    const pending=audio.say('Up, please!',{voice:'juno'});
    cancel(audio);resolve({});await pending;
    assert.equal(audio.sources.length,0);
  }
});

test('a newer call wins if an older recording finishes loading later',async()=>{
  const audio=engine();const resolves=[];
  audio.loadVoice=()=>new Promise(done=>resolves.push(done));
  const old=audio.say('Up, please!',{voice:'juno'});
  const next=audio.say('Pad 2, please.',{voice:'juno'});
  resolves[1]({});await next;resolves[0]({});await old;
  assert.equal(audio.sources.length,1);
  assert.deepEqual(audio.sources[0].started.slice(1),voiceParts('Pad 2, please.','juno')[0]);
  audio.stopVoice();assert.equal(audio.sources[0].stopped,true);assert.equal(audio.duckUntil,0);
});

test('hail and pad number play in sequence and are both canceled together',async()=>{
  const audio=engine();audio.loadVoice=async()=>({});
  await audio.say('Over here! Pad 3!',{voice:'juno'});
  assert.equal(audio.sources.length,2);
  assert.ok(audio.sources[1].started[0]>audio.sources[0].started[0]);
  audio.stopVoice();assert.ok(audio.sources.every(source=>source.stopped));
  assert.equal(voiceParts('Unknown line','juno'),null);
  assert.equal(voiceParts('Up, please!','unknown'),null);
});
