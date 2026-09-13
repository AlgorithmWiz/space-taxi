import {SCORE_KEY,BOARDS,cleanCallsign,parseScores,entryFromFlight,upsertScore,scoresFor,rankOf,boardFor} from './highscores.js';
import {LEVELS} from './levels.js';

const score=value=>String(value).padStart(6,'0');
const route=e=>`${String(e.start+1).padStart(2,'0')} → ${String(e.level+1).padStart(2,'0')}`;
export class Scoreboard{
  constructor({document:doc=document,storage,storageKey=SCORE_KEY}={}){
    this.doc=doc;this.storageKey=storageKey;this.saved=true;this.board='campaign';this.current=null;
    try{this.storage=storage??window.localStorage;this.data=parseScores(this.storage.getItem(storageKey));}catch{this.saved=false;this.data=parseScores(null);}
    this.$=id=>doc.getElementById(id);
    this.$('pilot-name').value=this.data.pilot;
    this.$('close-scores').addEventListener('click',()=>this.$('scores-dialog').close());
    this.$('score-form').addEventListener('submit',event=>{event.preventDefault();this.saveName();});
    this.$('pilot-name').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);});
    doc.querySelectorAll('[data-score-board]').forEach(button=>button.addEventListener('click',()=>{this.board=button.dataset.scoreBoard;this.render();}));
    this.render();
  }
  persist(){
    try{this.storage.setItem(this.storageKey,JSON.stringify(this.data));this.saved=true;}catch{this.saved=false;}
  }
  record(flight){
    const entry=entryFromFlight(flight,this.data.pilot);if(!entry)return null;
    this.data=upsertScore(this.data,entry);this.current=entry;this.persist();return rankOf(this.data,entry);
  }
  present(flight){
    this.record(flight);const entry=entryFromFlight(flight,this.data.pilot),rank=rankOf(this.data,entry);
    this.$('score-entry').classList.toggle('hidden',!entry);
    this.$('score-form').classList.toggle('hidden',!rank);
    this.$('pilot-name').value=this.data.pilot;
    this.$('score-entry-title').textContent=rank?`#${String(rank).padStart(2,'0')} · ${BOARDS[boardFor(entry.start)].toUpperCase()}`:'KEEP CHASING THE TOP 10';
    this.$('score-entry-note').textContent=rank?`${this.saved?'SAVED':'SESSION SCORE'} AS ${this.data.pilot} · MAKE IT YOURS`:'Your personal best is still tracked.';
  }
  saveName(){
    const name=cleanCallsign(this.$('pilot-name').value);this.$('pilot-name').value=name;
    this.data.pilot=name;if(this.current){this.current={...this.current,name};this.data=upsertScore(this.data,this.current);}
    this.persist();this.$('score-entry-note').textContent=this.saved?`SAVED AS ${name}. SEE YOU ON THE BOARD.`:`${name} SAVED FOR THIS SESSION. BROWSER STORAGE IS UNAVAILABLE.`;
    this.render();
  }
  open(board){this.board=board||this.board;this.render();this.$('scores-dialog').showModal();}
  render(){
    this.doc.querySelectorAll('[data-score-board]').forEach(button=>{const selected=button.dataset.scoreBoard===this.board;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
    const rows=scoresFor(this.data,this.board),body=this.$('scores-body');body.replaceChildren();
    this.$('scores-empty').classList.toggle('hidden',rows.length>0);this.$('scores-table').classList.toggle('hidden',!rows.length);
    this.$('scores-best').textContent=rows.length?`${score(rows[0].score)} CR`:'YOUR NAME GOES HERE';
    this.$('scores-description').textContent={campaign:'Runs starting at level 01. How far can you take the shift?',free:'Runs starting from a selected level. Every departure is shown.',bonus:'The three Orbital Shift routes. A separate leaderboard.'}[this.board];
    this.$('scores-storage').textContent=this.saved?'TOP 10 PER BOARD · SAVED IN THIS BROWSER':'BROWSER STORAGE UNAVAILABLE · SCORES LAST FOR THIS SESSION';
    rows.forEach((entry,index)=>{
      const row=this.doc.createElement('tr');row.classList.toggle('latest',entry.id===this.current?.id);if(index===0)row.classList.add('champion');
      for(const [i,text]of [String(index+1).padStart(2,'0'),entry.name,score(entry.score),route(entry),String(entry.delivered)].entries()){
        const cell=this.doc.createElement('td');cell.textContent=text;if(i===1&&entry.finished){const mark=this.doc.createElement('small');mark.textContent=' SHIFT COMPLETE';cell.appendChild(mark);}if(i===3)cell.title=`${LEVELS[entry.start].name} to ${LEVELS[entry.level].name}`;row.appendChild(cell);
      }
      body.appendChild(row);
    });
  }
}
