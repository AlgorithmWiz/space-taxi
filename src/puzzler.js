// C64 switch combinations: https://strategywiki.org/wiki/Space_Taxi/Morning_shift
// Separate doors belong to each chamber, including the two ends of a passage.
export const PUZZLE_ROOMS=[
  {id:1,x:17,y:8,w:13,h:11,doors:['left','bottom'],color:'#a69c59'},
  {id:2,x:17,y:-7,w:13,h:11,doors:['top','left'],color:'#526da2'},
  {id:3,x:0,y:-7,w:14,h:11,doors:['top','left','right'],color:'#9166a7'},
  {id:4,x:-17,y:-7,w:13,h:11,doors:['top','right'],color:'#b9864d'},
  {id:5,x:-17,y:8,w:13,h:11,doors:['bottom','right'],color:'#a25c58'},
];
export const PUZZLE_SWITCHES=[
  {x:-5,y:.5,room:0,label:'CENTRE L',toggles:['3-left','1-left','1-bottom']},
  {x:5,y:.5,room:0,label:'CENTRE R',toggles:['4-top','1-left','1-bottom']},
  {x:17,y:5,room:1,label:'UPPER R',toggles:['1-bottom','2-top','5-right']},
  {x:-17,y:5,room:5,label:'UPPER L',toggles:['4-right','5-bottom','3-right']},
  {x:0,y:-5,room:3,label:'CENTRE',toggles:['3-top','3-right','2-left','1-bottom']},
];
export function puzzleLayout(){
  const obstacles=[],beams=[],thickness=.45;
  for(const r of PUZZLE_ROOMS)for(const side of ['left','right','top','bottom']){
    const vertical=side==='left'||side==='right',length=vertical?r.h:r.w,gap=vertical&&r.y>0?7:5.5;
    const x=r.x+(vertical?(side==='left'?-1:1)*r.w/2:0),y=r.y+(!vertical?(side==='bottom'?-1:1)*r.h/2:0);
    const wall=(offset,len)=>obstacles.push({kind:'wall',material:'metal',x:x+(vertical?0:offset),y:y+(vertical?offset:0),w:vertical?thickness:len,h:vertical?len:thickness});
    if(r.doors.includes(side)){
      wall(-(length+gap)/4,(length-gap)/2);wall((length+gap)/4,(length-gap)/2);
      beams.push({gate:`${r.id}-${side}`,room:r.id,x,y,w:vertical?thickness:gap,h:vertical?gap:thickness,color:r.color});
    }else wall(0,length);
  }
  return {obstacles,beams,switches:PUZZLE_SWITCHES};
}
const doors=PUZZLE_ROOMS.flatMap(r=>r.doors.map(d=>`${r.id}-${d}`));
const maskFor=names=>names.reduce((mask,name)=>mask|(1<<doors.indexOf(name)),0);
const roomMasks=PUZZLE_ROOMS.map(r=>maskFor(r.doors.map(d=>`${r.id}-${d}`)));
// Explore both switch state and chamber. Merely checking that every door can
// toggle is insufficient: buttons in chambers 1, 3 and 5 must be reachable.
export function puzzleSolvable(flags,startRoom=0){
  const initial=maskFor([...flags]),seen=new Set(),queue=[[initial,startRoom]],rooms=new Set();
  for(let i=0;i<queue.length;i++){
    const [mask,room]=queue[i],key=mask*6+room;if(seen.has(key))continue;seen.add(key);rooms.add(room);
    if(rooms.size===6)return true;
    if(room===0){for(let j=0;j<5;j++)if(mask&roomMasks[j])queue.push([mask,j+1]);}
    else if(mask&roomMasks[room-1])queue.push([mask,0]);
    for(const s of PUZZLE_SWITCHES)if(s.room===room)queue.push([mask^maskFor(s.toggles),room]);
  }
  return false;
}
export function shiftPuzzleDoors(flags,room,random=Math.random){
  for(let attempt=0;attempt<32;attempt++){
    const next=new Set(flags),choices=[...doors];
    for(let i=0,n=2+Math.floor(random()*3);i<n;i++){
      const name=choices.splice(Math.min(choices.length-1,Math.floor(random()*choices.length)),1)[0];
      next.has(name)?next.delete(name):next.add(name);
    }
    if(puzzleSolvable(next,room))return next;
  }
  // Keep a proven playable state if repeated random candidates would trap the taxi.
  return new Set(flags);
}
