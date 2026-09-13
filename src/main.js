import { Flight, SHIP } from './physics.js';
import { LEVELS, CLASSIC_COUNT } from './levels.js';
import { EXIT, padPose } from './environment.js';
import { renderAtlas } from './atlas.js';
import { PROGRESS_KEY, parseProgress, checkpoint } from './progress.js';
import { AudioEngine } from './audio.js';
import { World } from './world.js';
import { riderFor, hailLine } from './riders.js';
import { createPassengerPortraits } from './passenger.js';
import { Scoreboard } from './scoreboard.js';
import { boardFor } from './highscores.js';
import { FareWallet, WALLET_KEY } from './wallet.js';
import { Garage } from './garage.js';

const $ = id => document.getElementById(id);
const audio = new AudioEngine();
const scoreboard=new Scoreboard();
const wallet = new FareWallet();
let garage;
let portraits={};
const keys = new Set(), touch = new Set();
let world, flight, mode = 'menu', selected = 0, toastTime = 0, manualPaused = false, best = 0;
let progress = parseProgress(null), atlasTab = 0;
let hailKey='',nextHail=0,hailAfter=0;
try { progress = parseProgress(localStorage.getItem(PROGRESS_KEY)); } catch {}
try { best = Number(localStorage.getItem('space-taxi-best')) || 0; } catch {}
const formatScore = value => String(Math.floor(value)).padStart(6, '0');
$('best-score').textContent = formatScore(best);
const padNumber = id => id === EXIT || id === null ? '↑' : typeof id === 'number' ? String(id).padStart(2, '0') : id || '✓';
function saveProgress() {
  wallet.syncProgress(progress);
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch {}
  $('resume-button').classList.toggle('hidden', !progress.checkpoint);
  if (progress.checkpoint) $('resume-button').innerHTML = `RESUME LEVEL ${String(progress.checkpoint.sector + 1).padStart(2, '0')} <span>→</span>`;
  $('atlas-progress').textContent = `${progress.cleared.filter(i => i < CLASSIC_COUNT).length} / 24 CLASSIC LEVELS COMPLETE`;
}
function recordCompletion() {
  if (!progress.cleared.includes(flight.sector)) progress.cleared.push(flight.sector);
  progress.checkpoint = flight.isFinalLevel ? null : checkpoint(flight, flight.sector + 1);
  saveProgress();
}
function selectLevel(index) {
  selected = index; world.setLevel(index);
  $('departure-label').textContent = `${index < 24 ? `DEPARTURE ${padNumber(index + 1)}` : 'BONUS DEPARTURE'} · ${LEVELS[index].name.toUpperCase()}`;
  document.querySelectorAll('[data-sector]').forEach(card => {
    const chosen = index < 24 && Math.floor(index / 8) === Math.floor(Number(card.dataset.sector) / 8);
    card.classList.toggle('selected', chosen); card.setAttribute('aria-pressed', String(chosen));
  });
}
function refreshAtlas() {
  renderAtlas($('atlas-grid'), atlasTab, selected, progress.cleared, index => {
    selectLevel(index); $('atlas-dialog').close(); audio.init(); audio.effect('select');
  });
  document.querySelectorAll('[data-atlas-tab]').forEach(button => {
    const active = Number(button.dataset.atlasTab) === atlasTab;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
}

function saveBest() {
  scoreboard.record(flight);
  if (flight.score <= best) return;
  best = Math.floor(flight.score); $('best-score').textContent = formatScore(best);
  try { localStorage.setItem('space-taxi-best', String(best)); } catch {}
}
function toast(text, warning = false, duration = 3.5) {
  $('toast').textContent = text; $('toast').classList.remove('hidden'); $('toast').classList.toggle('warning', warning); toastTime = duration;
}
function updateMission() {
  const level = flight.level;
  const rider=riderFor(flight.sector,flight.routeIndex);
  $('sector-label').textContent = `${flight.sector < 24 ? `LEVEL ${padNumber(flight.sector + 1)} / 24` : 'BONUS'} · ${level.name.toUpperCase()}`;
  if (flight.exitOpen) {
    $('mission-title').textContent = flight.passenger ? 'Up, please!' : 'Route complete.';
    $('mission-detail').textContent = flight.passenger ? `${rider.name} is aboard. Take them through the exit above.` : 'Fly through the exit above to continue.';
    $('route-from').textContent = '✓'; $('route-to').textContent = '↑'; $('route-status').textContent = 'EXIT OPEN';
  } else {
    $('mission-title').textContent = flight.passenger ? `Pad ${flight.targetId}, please.` : 'Hey, taxi!';
    $('mission-detail').textContent = flight.passenger ? `${rider.name} is aboard. ${rider.job} · happy to be heading home.` : `${rider.name} · ${rider.job}. Waiting at Pad ${flight.targetId}.`;
    $('route-from').textContent = padNumber(flight.route[0]); $('route-to').textContent = padNumber(flight.route[1]);
    $('route-status').textContent = flight.passenger ? 'PASSENGER ON BOARD' : 'AWAITING PICKUP';
  }
  for (const { pad } of world.padObjects) {
    const label = document.querySelector(`[data-pad="${pad.id}"]`);
    if (!label) continue;
    label.classList.toggle('target', pad.id === flight.targetId);
    const marker = label.querySelector('.target-marker');
    marker.textContent = pad.id === flight.targetId && flight.passenger ? 'DROP OFF ↓' : '';
  }
}
function makeLabels() {
  $('pad-labels').replaceChildren();
  for (const pad of flight.level.pads) {
    const label = document.createElement('div'); label.className = 'pad-label'; label.dataset.pad = pad.id;
    label.innerHTML = `<strong>${padNumber(pad.id)}</strong><small>${pad.fuel ? 'REFUEL' : /^pad\s*\w+$/i.test(pad.name) ? '' : pad.name.toUpperCase()}</small><span class="target-marker"></span>`;
    $('pad-labels').appendChild(label);
  }
}
function showOverlay(kind) {
  mode = kind; keys.clear(); touch.clear(); audio.thrust(0); saveBest();
  const copy = {
    paused: ['FLIGHT ON HOLD', 'Take a breather.', 'Your passengers can wait a moment.', 'BACK TO THE SHIFT'],
    'sector-complete': ['ANOTHER HOUR, ANOTHER ORBIT', 'Nice flying, cabbie.', `${flight.level.name} is complete. Next: ${LEVELS[flight.sector + 1]?.name || 'home'}.`, 'NEXT LEVEL'],
    over: ['SHIFT ENDED', 'A bumpy night.', 'Even the best cabbies have a rough shift. Grab a fresh taxi and give it another go.', 'TRY AGAIN'],
    won: ['SHIFT COMPLETE', 'You own the night.', flight.sector === 24 ? 'The final ride through Museworld is complete. That’s a shift to remember.' : 'Every bonus route complete. Every passenger home.', 'ANOTHER SHIFT'],
  }[kind];
  $('overlay-eyebrow').textContent = copy[0]; $('overlay-title').textContent = copy[1]; $('overlay-detail').textContent = copy[2];
  $('continue-button').innerHTML = `${copy[3]} <span>↗</span>`;
  $('overlay-stats').classList.toggle('hidden', kind === 'paused');
  $('overlay-stats').innerHTML = `${formatScore(flight.score)} CR<small>${flight.delivered} PASSENGERS DELIVERED · ${Math.floor(flight.totalTime / 60)}M ${Math.floor(flight.totalTime % 60)}S</small>`;
  $('restart-button').classList.toggle('hidden', kind === 'over' || kind === 'won');
  if(kind!=='paused')scoreboard.present(flight);else $('score-entry').classList.add('hidden');
  $('overlay').classList.remove('hidden'); $('continue-button').focus();
}
function handleEvent(event) {
  if (!world || !flight) return;
  audio.effect(event.type);
  switch (event.type) {
    case 'sector': hailKey='';hailAfter=0;world.setLevel(event.index); makeLabels(); updateMission(); progress.checkpoint = checkpoint(flight); saveProgress(); break;
    case 'pickup': toast(`${riderFor(flight.sector,flight.routeIndex).name} aboard. Pad ${event.destination}, please!`); audio.say(`Pad ${event.destination}, please.`,riderFor(flight.sector,flight.routeIndex)); updateMission(); break;
    case 'delivery': {const rider=riderFor(flight.sector,event.riderIndex);toast(`${rider.name}: “${rider.thanks}” +${event.earned} credits`, false, 3); world.burst(flight.x, flight.y + .5, 'green', 32);world.disembark(flight,event.pad,event.riderIndex); audio.say(rider.thanks,rider);hailAfter=flight.time+4.5; saveBest(); updateMission(); break;}
    case 'fare-earned': wallet.credit(event); garage?.refresh(); break;
    case 'exit-open': toast(flight.passenger ? 'Up, please! Fly your passenger through the open exit.' : 'Route complete. Fly through the open exit.', false, 5); audio.say('Up, please!',riderFor(flight.sector,flight.routeIndex)); updateMission(); break;
    case 'land': if (event.fuel) toast('Refueling at 0.55 credits per unit.', false, 2.5); break;
    case 'teleport': world.burst(event.x, event.y, 'blue', 24); toast('Portal transit complete.', false, 1.8); break;
    case 'switch': toast(event.reset ? 'Curtains retracted. Make your move!' : `Switch ${event.label} toggled.`, false, 2.5); break;
    case 'rebound': toast('Rebound! Correct your drift.', true, 1.8); break;
    case 'crash': world.explode(event.x,event.y,event.vx,event.vy);window.speechSynthesis?.cancel();hailAfter=flight.time+4; toast(event.reason, true, 4); break;
    case 'respawn': toast('Fresh taxi. Same determination.', false, 2.5); updateMission(); break;
    case 'passenger-reset': updateMission(); break;
    case 'sector-complete': recordCompletion(); showOverlay('sector-complete'); break;
    case 'gameover': showOverlay('over'); break;
    case 'win': recordCompletion(); showOverlay('won'); break;
  }
}
function start() {
  if(flight&&mode!=='menu')saveBest();
  audio.init(); audio.effect('start');
  flight.reset(selected); mode = 'playing'; keys.clear(); touch.clear();
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); $('overlay').classList.add('hidden'); $('pause-button').classList.remove('hidden');
  $('start-button').blur(); document.activeElement?.blur();
  toast(flight.level.hint || 'Hold W or ↑ to lift off. SPACE retracts your gear.', false, 6);
  audio.setState('playing');
}
function resume() { mode = 'playing'; $('overlay').classList.add('hidden'); keys.clear(); touch.clear(); document.activeElement?.blur(); audio.init(); }
function toMenu() {
  saveBest(); mode = 'menu'; keys.clear(); touch.clear(); audio.thrust(0); window.speechSynthesis?.cancel();
  $('overlay').classList.add('hidden'); $('hud').classList.add('hidden'); $('pause-button').classList.add('hidden'); $('menu').classList.remove('hidden');
  selectLevel(selected); saveProgress(); garage.refresh();
}
function gear() {
  if (mode !== 'playing') return;
  if (flight.landed !== null) toast('Lift off before retracting your landing gear.', false, 2);
  else flight.toggleGear();
  $('gear-button').blur();
}
function openHelp() {
  if ($('help-dialog').open) return;
  manualPaused = mode === 'playing';
  if (manualPaused) { mode = 'manual'; keys.clear(); touch.clear(); audio.thrust(0); }
  $('help-dialog').showModal();
}
function closeHelp() { $('help-dialog').close(); }
function toggleSound() {
  audio.init(); const muted = audio.toggle();
  $('sound-button').textContent = muted ? '♪̸' : '♫'; $('sound-button').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  $('sound-button').setAttribute('aria-pressed', String(muted)); $('sound-button').blur();
}
function updateMusicButton(){
  $('music-button').textContent=audio.musicEnabled?'MUSIC ON  ♪':'MUSIC OFF  ♪';
  $('music-button').setAttribute('aria-pressed',String(audio.musicEnabled));
}
$('music-button').addEventListener('click',()=>{audio.init();audio.toggleMusic();updateMusicButton();});
updateMusicButton();
$('start-button').addEventListener('click', start);
$('gear-button').addEventListener('click', gear);
$('sound-button').addEventListener('click', toggleSound);
$('pause-button').addEventListener('click', () => mode === 'playing' ? showOverlay('paused') : mode === 'paused' && resume());
$('help-button').addEventListener('click', openHelp); $('close-help').addEventListener('click', closeHelp); $('manual-ready').addEventListener('click', closeHelp);
$('help-dialog').addEventListener('close', () => { if (manualPaused) { manualPaused = false; mode = 'playing'; keys.clear(); touch.clear(); } });
$('continue-button').addEventListener('click', () => {
  if (mode === 'paused') resume();
  else if (mode === 'sector-complete') {
    flight.status = 'playing'; flight.loadSector(flight.sector + 1); resume();
    toast(LEVELS[flight.sector].subtitle, false, 4);
  } else start();
});
$('restart-button').addEventListener('click', start); $('menu-button').addEventListener('click', toMenu);
$('scores-button').addEventListener('click',()=>scoreboard.open());
$('garage-button').addEventListener('click', () => { audio.init(); audio.effect('select'); garage.open(); });
window.addEventListener('storage', event => {
  if (event.key === PROGRESS_KEY) wallet.syncProgress(parseProgress(event.newValue));
  if (event.key === WALLET_KEY || event.key === PROGRESS_KEY) { garage?.refresh(); if ($('garage-dialog').open) garage.render(); }
});
$('overlay-scores-button').addEventListener('click',()=>scoreboard.open(boardFor(flight.startSector)));
$('resume-button').addEventListener('click', () => {
  const saved = progress.checkpoint;
  if (!saved) return;
  selected = saved.startSector; start();
  Object.assign(flight, saved); flight.loadSector(saved.sector);
  toast(`Resuming ${flight.level.name}. ${flight.level.hint}`, false, 6);
});
$('atlas-button').addEventListener('click', () => { atlasTab = selected < 24 ? Math.floor(selected / 8) : 3; refreshAtlas(); $('atlas-dialog').showModal(); });
$('close-atlas').addEventListener('click', () => $('atlas-dialog').close());
document.querySelectorAll('[data-atlas-tab]').forEach(button => button.addEventListener('click', () => { atlasTab = Number(button.dataset.atlasTab); refreshAtlas(); }));
$('home-button').addEventListener('click', event => { event.preventDefault(); if (mode === 'playing') showOverlay('paused'); else if (mode !== 'menu') toMenu(); });
document.querySelectorAll('[data-sector]').forEach(button => button.addEventListener('click', () => {
  selectLevel(Number(button.dataset.sector));
  audio.init(); audio.effect('select');
}));
const mapping = { KeyW: 'up', ArrowUp: 'up', KeyA: 'left', ArrowLeft: 'left', KeyS: 'down', ArrowDown: 'down', KeyD: 'right', ArrowRight: 'right' };
window.addEventListener('keydown', event => {
  if ($('help-dialog').open || $('atlas-dialog').open || $('scores-dialog').open || $('garage-dialog').open || ['INPUT','TEXTAREA'].includes(event.target.tagName)) return;
  if (mapping[event.code] && mode === 'playing') { event.preventDefault(); keys.add(event.code); if(flight.gear&&['left','right'].includes(mapping[event.code])&&!event.repeat)toast('Side thrusters locked. Press SPACE to retract the landing gear.',false,2.5); }
  if (event.repeat) return;
  if (event.code === 'Enter' && mode === 'menu' && !event.target.closest?.('button,a,summary,[role="button"]')) { event.preventDefault(); start(); }
  if (event.code === 'Space' && mode === 'playing') { event.preventDefault(); gear(); }
  if (event.code === 'Escape') { if (mode === 'playing') showOverlay('paused'); else if (mode === 'paused') resume(); }
  if (event.code === 'KeyM') toggleSound();
  if (event.code === 'KeyH') openHelp();
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); touch.clear(); if (mode === 'playing') showOverlay('paused'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') showOverlay('paused');audio.setState(mode,document.hidden);if(document.hidden)window.speechSynthesis?.cancel(); });
document.querySelectorAll('[data-control]').forEach(button => {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touch.add(button.dataset.control); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => touch.delete(button.dataset.control));
});

function updateHud() {
  $('score').textContent = formatScore(flight.score); $('lives').textContent = Array.from({ length: 3 }, (_, i) => i < flight.lives ? '◆' : '◇').join(' ');
  $('fuel-value').innerHTML = `${Math.ceil(flight.fuel)}<small>%</small>`;
  $('fuel-fill').style.width = `${flight.fuel}%`; $('fuel-fill').style.background = flight.fuel < 20 ? '#ff9673' : 'var(--lime)';
  $('fuel-value').classList.toggle('warning-text', flight.fuel < 20);
  const speed = flight.landed !== null ? 0 : flight.vy;
  $('velocity').innerHTML = `${speed > .05 ? '+' : ''}${speed.toFixed(1)} <small>M/S</small>`;
  $('velocity').classList.toggle('warning-text', speed < -SHIP.safeVertical);
  $('landing-status').textContent = flight.crashTime ? 'TAXI RECOVERY' : flight.landed !== null ? `DOCKED · PAD ${flight.landed}` : speed < -SHIP.safeVertical ? 'SLOW YOUR DESCENT' : flight.gear ? 'SIDE THRUST LOCKED' : 'FREE FLIGHT';
  $('gear-label').textContent = flight.gear ? 'DEPLOYED' : 'RETRACTED'; $('gear-light').style.opacity = flight.gear ? '1' : '.25';
  $('gear-label').style.color = flight.gear ? 'var(--lime)' : '#91a3b4'; $('gear-button').setAttribute('aria-pressed', String(flight.gear));
  $('gear-detail').textContent=flight.gear?'SIDE THRUST LOCKED':'SIDE THRUST READY';
  for(const side of ['left','right']){const button=document.querySelector(`[data-control="${side}"]`);button.disabled=flight.gear;button.title=flight.gear?'Retract gear to enable side thrust':'';}
  $('fare-label').textContent = flight.passenger ? 'LIVE FARE' : 'PASSENGERS';
  $('fare').innerHTML = flight.passenger ? `${flight.fare}<small> CR</small>` : `${flight.routeIndex} <small>/ ${flight.routes.length}</small>`;
  $('fare-detail').textContent = flight.passenger ? 'TIME IS CREDITS' : 'THIS LEVEL';
  $('level-condition').textContent = flight.condition;
  $('hud').dataset.state = JSON.stringify({mode,level:flight.sector,x:flight.x,y:flight.y,gear:flight.gear,landed:flight.landed,fuel:flight.fuel,lives:flight.lives,passenger:flight.passenger,exitOpen:flight.exitOpen,audio:audio.snapshot(),explosion:world.explosion.group.visible,wallet:wallet.state.balance,skin:wallet.state.equipped});
  const waiting=world.padObjects.find(o=>o.pad.id===flight.route?.[0]);
  const showCall=waiting&&!flight.passenger&&!flight.crashTime&&padPose(waiting.pad,flight.time).active;
  $('passenger-call').classList.toggle('hidden',!showCall);
  if(showCall){
    const rider=riderFor(flight.sector,flight.routeIndex),pose=padPose(waiting.pad,flight.time);
    const position=world.project(pose.x+waiting.person.position.x,pose.y+2.95,1);
    $('passenger-call').style.left=`${Math.max(80,Math.min(innerWidth-80,position.x))}px`;
    $('passenger-call').style.top=`${position.y}px`; $('passenger-call').style.setProperty('--rider-color',rider.color);
    $('hail-name').textContent=`${rider.name.toUpperCase()} · PAD ${waiting.pad.id}`;
    if($('hail-portrait').dataset.rider!==rider.name&&portraits[rider.name]){$('hail-portrait').src=portraits[rider.name];$('hail-portrait').dataset.rider=rider.name;$('hail-portrait').classList.remove('hidden');}
    $('hail-text').textContent=flight.landed===waiting.pad.id?'Coming aboard!':hailLine(rider,flight.time);
  }
  for (const pad of flight.level.pads) {
    const label = document.querySelector(`[data-pad="${pad.id}"]`);
    const pose = padPose(pad, flight.time);
    const pos = world.project(pose.x, pose.y - 1.35, 2.1);
    label.classList.toggle('hidden', !pose.active);
    label.style.left = `${pos.x}px`; label.style.top = `${pos.y}px`;
  }
}
function fail(error) {
  console.error(error); $('load-error').classList.remove('hidden');
  $('error-message').textContent = `Please use a browser with WebGL 2 enabled. ${error.message || error}`;
}
try {
  world = new World($('scene')); flight = new Flight(handleEvent); makeLabels(); updateMission(); saveProgress();
  garage = new Garage({ wallet, world, onChange: () => { garage.refresh(); audio.effect('select'); } });
  try{portraits=createPassengerPortraits();}catch(error){console.warn('Passenger portraits unavailable:',error.message);}
  let last = performance.now(), accumulator = 0, hudClock = 0;
  const fixedStep = 1 / 120;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (mode === 'playing') {
      const input = {};
      for (const code of keys) if (mapping[code]) input[mapping[code]] = true;
      for (const control of touch) input[control] = true;
      accumulator += dt;
      while (accumulator >= fixedStep) { flight.step(fixedStep, input); accumulator -= fixedStep; }
      const key=`${flight.sector}/${flight.routeIndex}`;
      if(key!==hailKey){hailKey=key;nextHail=Math.max(flight.time+1.2,hailAfter);}
      const waiting=flight.level.pads.find(p=>p.id===flight.route?.[0]);
      if(!flight.passenger&&!flight.crashTime&&waiting&&padPose(waiting,flight.time).active&&flight.time>=Math.max(nextHail,hailAfter)){
        const rider=riderFor(flight.sector,flight.routeIndex);audio.effect('hail');audio.say(`${hailLine(rider,flight.time)} Pad ${waiting.id}!`,rider);nextHail=flight.time+16;
      }
      audio.thrust(flight.crashTime ? 0 : flight.thrust + Math.abs(flight.horizontal) * .25);
      if (toastTime > 0) { toastTime -= dt; if (toastTime <= 0) $('toast').classList.add('hidden'); }
    } else { accumulator = 0; audio.thrust(0); }
    audio.setState(mode,document.hidden);
    world.update(dt, now / 1000, flight, mode === 'menu', mode !== 'menu' && mode !== 'playing');
    hudClock += dt;
    if (mode !== 'menu' && hudClock >= .05) { updateHud(); hudClock = 0; }
  }
  requestAnimationFrame(frame);
  // Read-only telemetry makes browser smoke checks and issue reports reproducible.
  window.spaceTaxi = Object.freeze({
    snapshot: () => ({ mode, sector: flight.sector, x: flight.x, y: flight.y, vx: flight.vx, vy: flight.vy, gear: flight.gear, landed: flight.landed, fuel: flight.fuel, lives: flight.lives, score: flight.score, passenger: flight.passenger, target: flight.targetId, delivered: flight.delivered, exitOpen: flight.exitOpen, status: flight.status, renderer: world.renderer.info.render }),
  });
  world.renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); if (mode === 'playing') showOverlay('paused'); fail(new Error('The graphics context was lost. Reload to restart.')); });
} catch (error) { fail(error); }
