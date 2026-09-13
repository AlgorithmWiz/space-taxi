import { LEVELS, BONUS_START } from './levels.js';

export const SCORE_KEY='space-taxi-highscores-v1', BOARD_LIMIT=10;
export const BOARDS={campaign:'Classic campaign',free:'Level select',bonus:'Bonus routes'};
export const cleanCallsign=value=>String(value??'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3)||'ACE';
export const boardFor=start=>start>=BONUS_START?'bonus':start===0?'campaign':'free';
export function compareScores(a,b){return b.score-a.score||b.delivered-a.delivered||(b.level-b.start)-(a.level-a.start)||a.seconds-b.seconds||a.date.localeCompare(b.date)||a.id.localeCompare(b.id);}
function validEntry(e){
  return e&&typeof e.id==='string'&&/^[\w-]{1,80}$/.test(e.id)&&Number.isSafeInteger(e.score)&&e.score>0&&e.score<=1e9&&Number.isInteger(e.start)&&e.start>=0&&e.start<LEVELS.length&&Number.isInteger(e.level)&&e.level>=e.start&&e.level<LEVELS.length&&(e.start<BONUS_START)===(e.level<BONUS_START)&&Number.isInteger(e.delivered)&&e.delivered>=0&&e.delivered<=100000&&Number.isFinite(e.seconds)&&e.seconds>=0&&e.seconds<31536000&&typeof e.date==='string'&&Number.isFinite(Date.parse(e.date));
}
function normalize(e){return {id:e.id,name:cleanCallsign(e.name),score:e.score,start:e.start,level:e.level,delivered:e.delivered,seconds:Math.floor(e.seconds),date:new Date(e.date).toISOString(),finished:e.finished===true};}
function trim(entries){return Object.keys(BOARDS).flatMap(board=>entries.filter(e=>boardFor(e.start)===board).sort(compareScores).slice(0,BOARD_LIMIT));}
export function parseScores(raw){
  try{
    const data=JSON.parse(raw),byId=new Map();
    for(const entry of Array.isArray(data?.entries)?data.entries.slice(0,1000):[]){
      if(!validEntry(entry))continue;const e=normalize(entry),old=byId.get(e.id);if(!old||compareScores(e,old)<0)byId.set(e.id,e);
    }
    return {version:1,pilot:cleanCallsign(data?.pilot),entries:trim([...byId.values()])};
  }catch{return {version:1,pilot:'ACE',entries:[]};}
}
export function entryFromFlight(flight,name,date=new Date().toISOString()){
  if(flight.debug) return null;
  const e={id:flight.runId,name,score:Math.floor(flight.score),start:flight.startSector,level:flight.sector,delivered:flight.delivered,seconds:Math.floor(flight.totalTime),date,finished:flight.status==='won'};
  return validEntry(e)?normalize(e):null;
}
export function upsertScore(store,entry){
  if(!validEntry(entry))return store;
  const e=normalize(entry),old=store.entries.find(row=>row.id===e.id);
  // Checkpoint replay, refueling and repeated clicks cannot duplicate or lower a run's record.
  const next=old&&compareScores(old,e)<0?{...old,name:e.name}:e;
  return {...store,entries:trim([...store.entries.filter(row=>row.id!==e.id),next])};
}
export const scoresFor=(store,board)=>store.entries.filter(e=>boardFor(e.start)===board).sort(compareScores);
export function rankOf(store,entry){if(!entry)return null;const rows=scoresFor(upsertScore(store,entry),boardFor(entry.start));const index=rows.findIndex(e=>e.id===entry.id);return index<0?null:index+1;}
