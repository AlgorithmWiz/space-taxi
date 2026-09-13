import { STEP_SECONDS, scoreAtStep, midiFrequency } from './music.js';

export class AudioEngine {
  constructor() {
    this.muted=false;this.context=null;this.musicEnabled=true;this.mode='menu';this.hidden=false;this.musicStep=0;this.scheduledNotes=0;this.duckUntil=0;
    try{this.musicEnabled=localStorage.getItem('space-taxi-music')!=='off';}catch{}
  }
  init() {
    if(!this.context){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      this.context=new Context();
      this.master=this.context.createGain();this.master.gain.value=this.muted?0:.22;
      this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-8;this.limiter.ratio.value=8;
      this.master.connect(this.limiter);this.limiter.connect(this.context.destination);
      this.musicBus=this.context.createGain();this.musicBus.gain.value=0;this.musicBus.connect(this.master);
      this.engine=this.context.createOscillator();this.engine.type='sawtooth';
      this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=190;
      this.engineGain=this.context.createGain();this.engineGain.gain.value=0;
      this.engine.connect(this.filter);this.filter.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();
      this.noiseBuffer=this.context.createBuffer(1,this.context.sampleRate,this.context.sampleRate);
      const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      this.nextNote=this.context.currentTime+.05;
      this.timer=setInterval(()=>this.tick(),25);
    }
    this.context.resume().catch(()=>{});this.tick();
  }
  setState(mode,hidden=false){this.mode=mode;this.hidden=hidden;}
  toggle(){
    this.muted=!this.muted;
    if(this.master)this.master.gain.setTargetAtTime(this.muted?0:.22,this.context.currentTime,.03);
    if(this.muted)window.speechSynthesis?.cancel();return this.muted;
  }
  toggleMusic(){
    this.musicEnabled=!this.musicEnabled;
    try{localStorage.setItem('space-taxi-music',this.musicEnabled?'on':'off');}catch{}
    this.tick();return this.musicEnabled;
  }
  tick(){
    if(!this.context)return;
    const now=this.context.currentTime,active=!this.hidden&&['menu','playing'].includes(this.mode)&&this.musicEnabled;
    const target=active?(this.mode==='playing'?.62:.33)*(now<this.duckUntil?.25:1):0;
    this.musicBus.gain.setTargetAtTime(target,now,.14);
    if(!active||this.muted||this.context.state!=='running'){this.nextNote=now+.05;return;}
    if(this.nextNote<now)this.nextNote=now+.025;
    while(this.nextNote<now+.12){
      for(const note of scoreAtStep(this.musicStep))this.playNote(note,this.nextNote);
      this.musicStep++;this.nextNote+=STEP_SECONDS;
    }
  }
  oscillator(frequency,t,duration,volume,type='sine',bus=this.master,{attack=.008,endFrequency=frequency,filter=0}={}){
    const osc=this.context.createOscillator(),gain=this.context.createGain();osc.type=type;
    osc.frequency.setValueAtTime(frequency,t);if(endFrequency!==frequency)osc.frequency.exponentialRampToValueAtTime(endFrequency,t+duration);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+attack);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    let lowpass;if(filter){lowpass=this.context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=filter;osc.connect(lowpass);lowpass.connect(gain);}else osc.connect(gain);
    gain.connect(bus);osc.start(t);osc.stop(t+duration+.03);
    osc.onended=()=>{osc.disconnect();lowpass?.disconnect();gain.disconnect();};
  }
  noise(t,duration,volume,frequency,type='highpass',bus=this.musicBus){
    const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
    source.buffer=this.noiseBuffer;filter.type=type;filter.frequency.value=frequency;
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.005);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(t);source.stop(t+duration+.02);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  playNote(note,t){
    this.scheduledNotes++;
    const {instrument,volume}=note;
    if(instrument==='kick')this.oscillator(145,t,.25,volume,'sine',this.musicBus,{endFrequency:38});
    else if(instrument==='snare'){this.noise(t,.13,volume,1400);this.oscillator(175,t,.1,.065,'triangle',this.musicBus);}
    else if(instrument==='hat')this.noise(t,.045,volume,7800);
    else if(instrument==='pad')for(const n of note.notes)this.oscillator(midiFrequency(n),t,note.duration,volume,'triangle',this.musicBus,{attack:.35,filter:1200});
    else{
      const type=instrument==='bass'?'triangle':instrument==='lead'?'square':'sine';
      this.oscillator(midiFrequency(note.note),t,note.duration,volume,type,this.musicBus,{filter:instrument==='lead'?2200:0});
      if(instrument==='lead')this.oscillator(midiFrequency(note.note),t+.225,.22,volume*.22,'sine',this.musicBus);
    }
  }
  thrust(value){
    if(!this.context)return;
    this.engineGain.gain.setTargetAtTime(value*.24,this.context.currentTime,.07);
    this.engine.frequency.setTargetAtTime(47+value*28,this.context.currentTime,.07);
  }
  tone(frequency,duration=.15,delay=0,type='sine'){
    if(this.context)this.oscillator(frequency,this.context.currentTime+delay,duration,.45,type);
  }
  effect(type){
    if(!this.context)return;
    if(type==='delivery'||type==='win')[523,659,784,1047].forEach((n,i)=>this.tone(n,.23,i*.11));
    else if(type==='pickup'||type==='exit-open')[440,660].forEach((n,i)=>this.tone(n,.2,i*.14));
    else if(type==='crash'){
      const t=this.context.currentTime;
      this.oscillator(145,t,.85,1.5,'sine',this.master,{endFrequency:25});
      this.noise(t,.95,1.4,1700,'lowpass',this.master);
      this.noise(t+.035,.23,.65,2900,'highpass',this.master);
      [980,710,480].forEach((n,i)=>this.oscillator(n,t+i*.065,.18,.13,'triangle',this.master,{endFrequency:n*.45}));
    }
    else if(type==='hail'){this.tone(880,.09);this.tone(1174,.12,.1);}
    else if(type==='land')this.tone(170,.16);
    else if(type==='gear')this.tone(320,.08,0,'triangle');
    else if(['start','select','switch','teleport','rebound'].includes(type))this.tone(660,.08);
  }
  say(text,profile={}){
    if(this.muted||this.hidden||!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const voice=new SpeechSynthesisUtterance(text);voice.rate=1.04;voice.pitch=profile.pitch||1.1;voice.volume=.55;
    if(this.context)this.duckUntil=this.context.currentTime+Math.min(7,Math.max(2,text.length*.07));
    window.speechSynthesis.speak(voice);
  }
  snapshot(){return {context:this.context?.state||'idle',musicEnabled:this.musicEnabled,muted:this.muted,notes:this.scheduledNotes,step:this.musicStep,musicGain:this.musicBus?.gain.value||0};}
}
