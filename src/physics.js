import { LEVELS, MYSTERY_INDEX, BONUS_START } from './levels.js';
import { EXIT, clamp, padPose, hazardPose, beamSegments, intersectsRect, distanceToSegment, environmentalForce } from './environment.js';
export { clamp } from './environment.js';
export const SHIP = { halfWidth:1.02, halfHeight:.46, roof:1.22, feet:.86, safeVertical:3, safeHorizontal:2.2 };

export class Flight {
  constructor(onEvent = () => {}) { this.onEvent = onEvent; this.reset(); }
  emit(type, data = {}) { this.onEvent({type,...data}); }
  reset(sector = 0) {
    this.runId=globalThis.crypto?.randomUUID?.()||`run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.score=0; this.lives=3; this.delivered=0; this.totalTime=0; this.startSector=sector; this.completed=[];
    this.loadSector(sector);
  }
  loadSector(index) {
    if (!Number.isInteger(index) || !LEVELS[index]) throw new RangeError('Unknown level');
    this.status='playing'; this.sector=index; this.level=LEVELS[index]; this.routes=this.level.routes.map(r=>[...r]);
    this.routeIndex=0; this.passenger=false; this.fareTime=0; this.exitOpen=false;
    this.time=0; this.serviceTime=0; this.crashTime=0; this.fuel=100;
    this.switches=new Set(); this.switchContacts=new Set(); this.resetTime=0; this.portalCooldown=0; this.bounceCooldown=0;
    this.respawn(); this.emit('sector',{index});
  }
  respawn() {
    const pad=this.level.pads[0], pose=padPose(pad,this.time), spawn=this.level.spawn;
    this.x=spawn?.x ?? pose.x; this.y=spawn?.y ?? pose.y+SHIP.feet;
    this.vx=0; this.vy=0; this.gear=true; this.landed=spawn?null:pad.id;
    this.dockOffset=0; this.thrust=0; this.horizontal=0; this.fuel=Math.max(this.fuel,65);
    this.invulnerable=1.5; this.portalCooldown=.8;
  }
  get route() { return this.routes[this.routeIndex]; }
  get targetId() { const id=this.route?.[this.passenger?1:0]; return id===EXIT?null:id; }
  get fare() { return Math.max(100,500-Math.floor(this.fareTime*3)); }
  get isFinalLevel() { return this.sector===MYSTERY_INDEX || this.sector===LEVELS.length-1; }
  get condition() {
    if (this.level.controls==='reverse') return 'REVERSED CONTROLS · S = UP';
    if (this.level.gravity<0) return 'REVERSED GRAVITY · S = DESCEND';
    if (this.level.thrustScale) return 'TURBO THRUST · SHORT TAPS';
    if (this.level.weather) return `WIND ${Math.sin(this.time*.65)>0?'→':'←'} · LOW ALTITUDE = SHELTER`;
    if (this.level.fields?.some(f=>f.kind==='radio') && Math.abs(this.y-1)<4) return 'RADIO INTERFERENCE';
    if (this.level.growing) return `${this.level.pads.filter(p=>padPose(p,this.time).active).length} / 9 LEAVES GROWN`;
    return this.level.hint || this.level.subtitle;
  }
  toggleGear() { if(this.status==='playing'&&!this.crashTime&&this.landed===null) { this.gear=!this.gear; if(this.gear)this.horizontal=0; this.emit('gear',{down:this.gear}); } }
  crash(reason) {
    if(this.crashTime||this.status!=='playing') return;
    this.lives--; this.crashTime=1.5; this.thrust=0; this.horizontal=0; this.emit('crash',{reason,x:this.x,y:this.y,vx:this.vx,vy:this.vy});
    if(this.passenger) { this.passenger=false; this.fareTime=0; this.exitOpen=false; this.emit('passenger-reset'); }
    this.serviceTime=0;
  }
  finishLevel() {
    if(this.passenger&&this.route?.[1]===EXIT) {
      const earned=this.fare, riderIndex=this.routeIndex;
      this.score+=earned; this.delivered++; this.routeIndex++; this.passenger=false;
      this.emit('fare-earned',{earned,riderIndex,runId:this.runId,sector:this.sector});
    }
    this.score+=250; this.completed.push(this.sector);
    // Longer campaigns replenish one taxi every four levels, up to three.
    if(this.sector<BONUS_START&&(this.sector+1)%4===0) this.lives=Math.min(3,this.lives+1);
    this.status=this.isFinalLevel?'won':'sector-complete';
    this.emit(this.isFinalLevel?'win':'sector-complete');
  }
  interact() {
    const contacts=new Set();
    for(const [i,s] of (this.level.switches||[]).entries()) {
      if(Math.hypot(this.x-s.x,this.y+.3-s.y)>1.2) continue;
      contacts.add(i);
      if(!this.switchContacts.has(i)) {
        for(const name of s.toggles||[]) this.switches.has(name)?this.switches.delete(name):this.switches.add(name);
        if(s.reset) this.resetTime=this.time;
        this.emit('switch',{label:s.label,reset:!!s.reset});
      }
    }
    this.switchContacts=contacts;
    if(this.portalCooldown<=0&&this.landed===null) {
      for(const portal of this.level.portals||[]) {
        if(Math.hypot(this.x-portal.x,this.y+.2-portal.y)>1.15) continue;
        const to=this.level.portals[portal.to];
        this.x=to.x; this.y=to.y; this.vx=0; this.vy=0; this.portalCooldown=1.8;
        this.emit('teleport',{x:this.x,y:this.y}); break;
      }
    }
  }
  checkDanger() {
    for(const beam of this.level.beams||[]) {
      for(const segment of beamSegments(beam,this.time,this.switches,this.resetTime)) {
        const hit=segment.ax!==undefined?distanceToSegment(this.x,this.y+.25,segment)<.8+segment.radius:intersectsRect(this.x,this.y,segment);
        if(hit) { this.crash(beam.gate?'Touch a switch to open that door.':beam.kind==='mine'?'The link between matching mines is live.':'Wait for a clear gap before crossing.'); return true; }
      }
    }
    for(const field of this.level.fields||[]) {
      if(field.kind==='gravity'&&Math.hypot(this.x-field.x,this.y-field.y)<field.radius+.65) { this.crash('Keep your distance from the singularity.'); return true; }
    }
    if(this.invulnerable>0) return false;
    for(const hazard of this.level.hazards||[]) {
      const pos=hazardPose(hazard,this.time);
      if(pos.active===false||Math.hypot(this.x-pos.x,this.y+.2-pos.y)>hazard.radius+.8) continue;
      if(hazard.kind==='rebound') {
        if(this.bounceCooldown>0) continue;
        this.vx=-this.vx+(this.x>=pos.x?2:-2); this.vy=-this.vy+1.5;
        this.landed=null; this.bounceCooldown=.65; this.emit('rebound');
      } else { this.crash(hazard.kind==='snow'?'Watch the falling snowflakes.':'Look out for moving objects, even while docked.'); return true; }
    }
    return false;
  }
  service(pad,dt) {
    if(pad.fuel&&this.fuel<100) { const refill=Math.min(100-this.fuel,dt*18); this.fuel+=refill; this.score=Math.max(0,this.score-refill*.55); }
    this.serviceTime+=dt;
    if(this.serviceTime<.9||pad.id!==this.targetId) return;
    this.serviceTime=0;
    if(!this.passenger) {
      if(this.level.growing&&this.routeIndex===0&&this.time<8) this.routes=[[1,EXIT]];
      this.passenger=true; this.fareTime=0;
      if(this.route[1]===EXIT) { this.exitOpen=true; this.emit('exit-open'); }
      else this.emit('pickup',{destination:this.targetId});
    } else {
      const earned=this.fare, riderIndex=this.routeIndex; this.score+=earned; this.delivered++; this.routeIndex++; this.passenger=false;
      if(!this.route) this.exitOpen=true;
      this.emit('fare-earned',{earned,riderIndex,runId:this.runId,sector:this.sector});
      this.emit('delivery',{earned,pad:pad.id,riderIndex});
      if(this.exitOpen) this.emit('exit-open');
    }
  }
  step(dt,input={}) {
    if(this.status!=='playing') return;
    dt=Math.min(Math.max(dt,0),1/30); const previousTime=this.time;
    this.time+=dt; this.totalTime+=dt;
    if(this.crashTime>0) {
      this.crashTime-=dt;
      if(this.crashTime<=0) { this.crashTime=0; if(this.lives<=0) { this.status='over'; this.emit('gameover'); } else { this.respawn(); this.emit('respawn'); } }
      return;
    }
    this.invulnerable=Math.max(0,this.invulnerable-dt); this.portalCooldown=Math.max(0,this.portalCooldown-dt); this.bounceCooldown=Math.max(0,this.bounceCooldown-dt);
    if(this.passenger) this.fareTime+=dt;
    if(this.level.controls==='reverse') input={up:input.down,down:input.up,left:input.right,right:input.left};
    const up=!!input.up&&this.fuel>0, down=!!input.down&&this.fuel>0;
    // Deployed legs mechanically lock both side thrusters, including reversed controls.
    let horizontal=this.fuel>0&&!this.gear?Number(!!input.right)-Number(!!input.left):0;
    if(this.level.theme==='radio'&&Math.abs(this.y-1)<4&&Math.sin(this.time*4)>.7) horizontal*=-1;
    this.thrust=up?1:0; this.horizontal=horizontal;
    this.interact();
    if(this.landed!==null) {
      const pad=this.level.pads.find(p=>p.id===this.landed), pose=padPose(pad,this.time);
      this.x=pose.x+this.dockOffset; this.y=pose.y+SHIP.feet; this.vx=pose.vx; this.vy=pose.vy;
      if(this.checkDanger()) return;
      if(this.landed!==null) {
        if(up) { this.landed=null; this.vy=pose.vy+.3; this.serviceTime=0; this.emit('takeoff'); }
        else { this.service(pad,dt); return; }
      }
    }
    const previousY=this.y, thrustScale=this.level.thrustScale||1, sidePower=7.5*thrustScale;
    const force=environmentalForce(this.level,this.x,this.y,this.time);
    this.vx+=(horizontal*sidePower+force.x-this.vx*(this.gear?1.05:.34))*dt;
    this.vy+=((up?9.6*thrustScale:0)-(down?(this.level.downPower||3.3)*thrustScale:0)-this.level.gravity+force.y-this.vy*.13)*dt;
    const limit=this.level.speedLimit||9;
    this.vx=clamp(this.vx,-limit,limit); this.vy=clamp(this.vy,-limit-2,limit);
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    this.fuel=Math.max(0,this.fuel-dt*((up?1.55:0)+Math.abs(horizontal)*.6+(down?.45:0)+.075)*(this.level.fuelRate||1));
    const foot=this.gear?SHIP.feet:SHIP.halfHeight;
    for(const pad of this.level.pads) {
      const pose=padPose(pad,this.time), before=padPose(pad,previousTime);
      if(!pose.active||Math.abs(this.x-pose.x)>=pose.w/2+SHIP.halfWidth) continue;
      const relativeVy=this.vy-pose.vy;
      const crosses=previousY-foot>=before.y-.015&&this.y-foot<=pose.y&&relativeVy<=0;
      if(crosses) {
        if(!this.gear) { this.crash('Extend your landing gear before touchdown.'); return; }
        if(Math.abs(this.x-pose.x)>pose.w/2-SHIP.halfWidth) { this.crash('Center both landing feet on the pad.'); return; }
        if(-relativeVy>SHIP.safeVertical||Math.abs(this.vx-pose.vx)>SHIP.safeHorizontal) { this.crash('A little softer! Match the pad and brake before touchdown.'); return; }
        this.y=pose.y+SHIP.feet; this.vx=pose.vx; this.vy=pose.vy; this.landed=pad.id; this.dockOffset=this.x-pose.x;
        this.thrust=0; this.serviceTime=0; this.emit('land',{pad:pad.id,fuel:!!pad.fuel}); return;
      }
      const depth=pad.depth||.64;
      if(this.y-SHIP.halfHeight<pose.y-.06&&this.y+SHIP.roof>pose.y-depth) { this.crash('Watch the spaceport walls and platform undersides.'); return; }
      if(pad.kind==='island') {
        const rockDepth=pose.y-(this.y+SHIP.roof);
        if(rockDepth>.64&&rockDepth<3.35&&Math.abs(this.x-pose.x)<pose.w*(.45-.31*clamp((rockDepth-.55)/2.8,0,1))+SHIP.halfWidth) { this.crash('Watch the rock beneath the spaceport.'); return; }
      }
    }
    for(const obstacle of this.level.obstacles) if(intersectsRect(this.x,this.y,obstacle)) { this.crash('Give the scenery a little more room.'); return; }
    if(this.checkDanger()) return;
    if(this.y>15.2&&this.exitOpen&&Math.abs(this.x)<4.2) { this.finishLevel(); return; }
    if(this.x<-24||this.x>24||this.y<-13.5||this.y>18) this.crash('Stay inside the flight zone.');
  }
}
