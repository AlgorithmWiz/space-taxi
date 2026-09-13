// "Orbit After Hours" — an original 32-bar, 100 BPM synth score.
export const BPM=100, STEP_SECONDS=60/BPM/4, SCORE_STEPS=512;
export const midiFrequency=n=>440*2**((n-69)/12);
const CHORDS=[[45,48,52,55],[41,45,48,52],[48,52,55,59],[43,47,50,53]];
const LEADS=[
  [76,null,79,null,81,null,79,76,74,null,72,null,74,null,null,null],
  [72,null,76,null,77,null,76,72,69,null,72,null,76,null,null,null],
  [76,null,79,null,83,null,81,79,76,null,74,null,72,null,null,null],
  [74,null,79,null,77,null,74,71,74,null,72,null,71,null,null,null],
];
export function scoreAtStep(absoluteStep){
  const step=((absoluteStep%SCORE_STEPS)+SCORE_STEPS)%SCORE_STEPS,bar=Math.floor(step/16),beat=step%16,phrase=Math.floor(bar/8),chord=CHORDS[Math.floor(bar/2)%4],events=[];
  if(beat===0)events.push({instrument:'pad',notes:chord.map(n=>n+12),duration:STEP_SECONDS*15.5,volume:.045});
  if([0,6,8,14].includes(beat))events.push({instrument:'bass',note:chord[0]-12+(beat===14?12:0),duration:.21,volume:.24});
  if(beat%2===0)events.push({instrument:'arp',note:chord[[0,2,1,3,2,1,3,2][beat/2]]+24,duration:.12,volume:.065});
  const note=LEADS[Math.floor(bar/2)%4][beat];
  if(phrase!==2&&bar%2===1&&note!==null)events.push({instrument:'lead',note:note+(phrase===3?12:0),duration:.25,volume:.13});
  if(beat%4===0)events.push({instrument:'kick',volume:.5});
  if(beat===4||beat===12)events.push({instrument:'snare',volume:.19});
  if(beat%2===0)events.push({instrument:'hat',volume:beat%4===2?.13:.075});
  return events;
}
