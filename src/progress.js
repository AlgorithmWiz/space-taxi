import { LEVELS } from './levels.js';
export const PROGRESS_KEY='space-taxi-campaign-v1';
// Unlocks follow the uninterrupted sequence of cleared classic levels. A direct
// atlas departure does not count as reaching that level in the campaign.
export function campaignLevelReached(progress) {
  const cleared = new Set(Array.isArray(progress?.cleared) ? progress.cleared : []);
  let reached = 1;
  while (reached < 24 && cleared.has(reached - 1)) reached++;
  const saved = progress?.checkpoint;
  if (saved?.startSector === 0 && Number.isInteger(saved.sector) && saved.sector >= 0 && saved.sector <= 24) reached = Math.max(reached, Math.min(24, saved.sector + 1));
  return reached;
}
export function parseProgress(raw){
  try{
    const data=JSON.parse(raw);
    const cleared=Array.isArray(data?.cleared)?[...new Set(data.cleared.filter(i=>Number.isInteger(i)&&i>=0&&i<LEVELS.length))]:[];
    const c=data?.checkpoint;
    const valid=c&&Number.isInteger(c.sector)&&LEVELS[c.sector]&&Number.isInteger(c.startSector)&&LEVELS[c.startSector]&&c.startSector<=c.sector&&Number.isFinite(c.score)&&c.score>=0&&Number.isInteger(c.lives)&&c.lives>0&&c.lives<=3&&Number.isInteger(c.delivered)&&c.delivered>=0&&Number.isFinite(c.totalTime)&&c.totalTime>=0;
    const runId=typeof c?.runId==='string'&&/^[\w-]{1,80}$/.test(c.runId)?c.runId:undefined;
    return {cleared,checkpoint:valid?{sector:c.sector,startSector:c.startSector,score:c.score,lives:c.lives,delivered:c.delivered,totalTime:c.totalTime,...(runId?{runId}:{})}:null};
  }catch{return {cleared:[],checkpoint:null};}
}
export function checkpoint(flight,sector=flight.sector){
  if(flight.debug) return null;
  return {sector,startSector:flight.startSector,score:flight.score,lives:flight.lives,delivered:flight.delivered,totalTime:flight.totalTime,runId:flight.runId};
}
