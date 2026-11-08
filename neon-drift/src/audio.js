export class Sound {
  constructor(){this.enabled=false;this.ctx=null;this.step=0;this.next=0;}
  async unlock(){if(!this.ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=.2;this.master.connect(this.ctx.destination);}if(this.ctx.state==='suspended')await this.ctx.resume();}
  set(enabled){this.enabled=enabled;if(enabled)this.unlock().catch(()=>{});if(this.master)this.master.gain.setTargetAtTime(enabled?.2:0,this.ctx.currentTime,.08);}
  note(freq,duration=.2,type='sine',volume=.2,delay=0,end){if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime+delay;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);if(end)osc.frequency.exponentialRampToValueAtTime(end,t+duration);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.01);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(this.master);osc.start(t);osc.stop(t+duration+.05);}
  jump(){this.note(170,.24,'sine',.4,0,550);}
  coin(){this.note(880,.22,'sine',.22);this.note(1320,.18,'sine',.1,.06);}
  land(){this.note(75,.12,'sine',.4,0,40);}
  crash(){this.note(120,.6,'sawtooth',.14,0,25);}
  boost(){[220,330,440,660].forEach((f,i)=>this.note(f,.35,'triangle',.18,i*.08));}
  star(){[261.63,329.63,392,523.25,659.25,783.99].forEach((f,i)=>this.note(f,.42,'triangle',.2,i*.065));this.note(65,.7,'sine',.35,0,260);}
  smash(){this.note(75,.23,'triangle',.35,0,35);this.note(1046,.3,'sine',.18,.03,1568);}
  update(active,powered=false){if(!this.enabled||!this.ctx||!active)return;const now=this.ctx.currentTime;if(this.next<now-.5)this.next=now;while(this.next<now+.12){const bass=[55,55,65.406,49][Math.floor(this.step/16)%4];if(this.step%4===0)this.note(bass,.55,'triangle',.15,this.next-now);if(this.step%2===0){const melody=[4,6,8,6,4,8,12,8][Math.floor(this.step/2)%8];this.note(bass*melody,.4,'sine',.045,this.next-now);}if(powered)this.note([523.25,659.25,783.99,1046.5][this.step%4],.17,'triangle',.085,this.next-now);this.step++;this.next+=powered?.125:.175;}}
}
