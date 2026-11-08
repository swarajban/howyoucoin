import { World } from './scene.js';
import { Sound } from './audio.js';
import { THEMES, themeFor } from './themes.js';
import { CHUNK, HALF_WIDTH, RADIUS, GRAVITY, JUMP_VELOCITY, SECTOR_DISTANCE, STAR_DURATION, COINS_PER_STAR, addCoinCharge, clamp, speedAt, centerAt, makeChunk, hasFloor, obstaclesAt, hitsObstacle, steer, supportedOnRoad } from './core.js';
const $=id=>document.getElementById(id);
const show=(id,visible)=>$(id).classList.toggle('hidden',!visible);
const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const savedSettings=load('howyoucoin-settings',load('neon-drift-settings',{}));
const settings={glow:true,motion:matchMedia('(prefers-reduced-motion: reduce)').matches,sensitivity:1,audio:false,theme:'orbit',...savedSettings};
// Legacy false is an explicit opt-out; legacy true was also the old default.
settings.hintMode=['auto','on','off'].includes(savedSettings.hintMode)?savedSettings.hintMode:(savedSettings.hints===false?'off':'auto');
let hintRuns=Math.max(0,Number(load('howyoucoin-hint-runs',0))||0);
let autoHintsForRun=hintRuns<3;
settings.hints=settings.hintMode==='on'||(settings.hintMode==='auto'&&autoHintsForRun);

let best=Number(load('howyoucoin-best',load('neon-drift-best',0)))||0;
const sound=new Sound();sound.enabled=false;
let world;
const s={mode:'home',distance:0,x:0,target:0,vx:0,y:RADIUS,vy:0,speed:18,boost:0,star:0,starCharge:0,starActivations:0,smashed:0,elapsed:0,coins:0,grounded:true,coyote:0,jumpBuffer:0,seed:17,sector:0,deathTime:0};
let chunks=[],lastTime=0,toastTimer=0,lastHud=-1,pointer=null,settingsFrom='home',newRecord=false;
const keys=new Set();const tutorial=new Set();
const sectorName = sector => { const names=themeFor(settings.theme).sectors; return names[Math.min(sector,names.length-1)]; };
function selectTheme(key){if(!THEMES[key])return;settings.theme=key;world.setTheme(key);document.body.dataset.theme=key;document.documentElement.style.setProperty('--mint',themeFor(key).accent);document.querySelector('.edition').textContent=themeFor(key).edition;$('scene-description').textContent=themeFor(key).subtitle;document.querySelectorAll('[data-scene]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scene===key)));syncSettings();}

function syncSettings(){
  settings.hints=settings.hintMode==='on'||(settings.hintMode==='auto'&&autoHintsForRun);
  document.body.classList.toggle('no-hints',!settings.hints);$('hints-toggle').checked=settings.hints;
  $('hints-note').textContent=settings.hintMode==='auto'?'Automatically shown for your first 3 runs on this device.':'Your choice is saved on this device.';
  if(!settings.hints){$('toast').classList.remove('visible');$('toast').textContent='';toastTimer=0;}
  document.body.classList.toggle('sound-enabled',settings.audio);$('sound').setAttribute('aria-label',settings.audio?'Mute sound':'Enable sound');$('audio-toggle').checked=settings.audio;$('glow-toggle').checked=settings.glow;$('motion-toggle').checked=settings.motion;$('sensitivity').value=settings.sensitivity;$('sensitivity-value').value=`${Number(settings.sensitivity).toFixed(1)}×`;save('howyoucoin-settings',settings);}
function updateBest(){const text=`${best.toLocaleString()} m`;$('home-best').textContent=text;$('best-hud').innerHTML=`${best.toLocaleString()}<span> m</span>`;}
function hint(message,duration=2.4){if(settings.hints){toast(message,duration);$('toast').dataset.hint='true';}}
function toast(message,duration=2.4){if(!settings.hints)return;$('toast').dataset.hint='false';$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=duration;}
function hideModals(){show('modal-layer',false);['pause-panel','over-panel','settings-panel'].forEach(id=>show(id,false));}
function panel(id){hideModals();show('modal-layer',true);show(id,true);requestAnimationFrame(()=>$(id).querySelector('button')?.focus({preventScroll:true}));}
function ensureChunks(){const low=Math.floor(s.distance/CHUNK)-1,high=low+13;for(const c of [...chunks])if(c.index<low){world.removeChunk(c.index);chunks.splice(chunks.indexOf(c),1);}for(let i=Math.max(-1,low);i<=high;i++)if(!chunks.some(c=>c.index===i)){const c=makeChunk(i,s.seed);chunks.push(c);world.addChunk(c);}}
function reset(mode){s.mode=mode;s.distance=0;s.x=0;s.target=0;s.vx=0;s.y=RADIUS;s.vy=0;s.speed=18;s.boost=0;s.star=0;s.starCharge=0;s.starActivations=0;s.smashed=0;s.elapsed=0;document.body.classList.remove('star-active');$('star-screen').style.opacity=0;show('star-hud',false);s.coins=0;s.grounded=true;s.coyote=.12;s.jumpBuffer=0;s.sector=0;s.deathTime=0;s.seed=mode==='home'?17:Math.floor(Math.random()*1e7);chunks=[];tutorial.clear();keys.clear();pointer=null;newRecord=false;lastHud=-1;world.clear();ensureChunks();$('toast').classList.remove('visible');hideModals();$('flash').style.opacity=0;world.ball.scale.setScalar(1);}
function goHome(){reset('home');autoHintsForRun=hintRuns<3;syncSettings();document.body.classList.remove('playing');show('home',true);show('home-footer',true);show('play-ui',false);show('run-hud',false);show('pause',false);show('settings',true);updateBest();$('play').focus({preventScroll:true});}
function start(){sound.unlock().catch(()=>{});sound.set(settings.audio);reset('running');autoHintsForRun=hintRuns<3;hintRuns=Math.min(3,hintRuns+1);save('howyoucoin-hint-runs',hintRuns);syncSettings();document.body.classList.add('playing');show('home',false);show('home-footer',false);show('play-ui',true);show('run-hud',true);show('pause',true);show('settings',true);hint(matchMedia('(pointer:coarse)').matches?'Drag to steer · Swipe up or tap JUMP':'A / D to steer · SPACE to jump',4);$('play').blur();updateHud();}
function pause(){if(s.mode!=='running')return;s.mode='paused';keys.clear();pointer=null;panel('pause-panel');}
function resume(){if(s.mode!=='paused')return;s.mode='running';hideModals();lastTime=performance.now();toast('Back in the flow',1.4);}
function jump(){if(s.mode!=='running')return;s.jumpBuffer=.16;}
function performJump(){s.vy=JUMP_VELOCITY;s.grounded=false;s.coyote=0;s.jumpBuffer=0;sound.jump();$('jump').classList.add('pressed');setTimeout(()=>$('jump').classList.remove('pressed'),140);}
function die(reason){if(s.mode!=='running')return;s.mode='dying';s.deathTime=0;keys.clear();pointer=null;world.shake=.35;sound.crash();world.burst(centerAt(s.distance)+s.x,s.y,0,35);$('flash').style.opacity=.35;$('death-reason').textContent=reason;const distance=Math.floor(s.distance);newRecord=distance>best;if(newRecord){best=distance;save('howyoucoin-best',best);}updateBest();if(navigator.vibrate)navigator.vibrate(30);}
function end(){s.mode='dead';$('final-distance').textContent=Math.floor(s.distance).toLocaleString();$('final-best').textContent=`${best.toLocaleString()} m`;$('final-coins').textContent=`◉ ${s.coins}`;$('end-eyebrow').textContent=newRecord?'A NEW PERSONAL BEST. NICE FLOW.':'EVERY RUN IS A NEW BEGINNING';panel('over-panel');}
function updateHud(){$('charge-count').textContent=`${s.starCharge} / ${COINS_PER_STAR}`;$('charge-fill').style.transform=`scaleX(${s.starCharge/COINS_PER_STAR})`;$('charge-meter').setAttribute('aria-valuenow',String(s.starCharge));const powered=s.star>0;document.body.classList.toggle('star-active',powered);show('star-hud',powered);$('star-time').textContent=`${s.star.toFixed(1)}s`;$('star-progress').style.transform=`scaleX(${s.star/STAR_DURATION})`;$('star-screen').style.opacity=powered?Math.min(1,s.star):0;const d=Math.floor(s.distance);if(d!==lastHud){$('distance').innerHTML=`${d.toLocaleString()}<span> m</span>`;$('speed').innerHTML=`${Math.round(s.speed)} <small>M/S</small>`;$('sector-progress').style.width=`${s.distance%SECTOR_DISTANCE/SECTOR_DISTANCE*100}%`;lastHud=d;}$('coin-count').textContent=s.coins;const sector=Math.floor(s.distance/SECTOR_DISTANCE);$('sector').textContent=`SECTOR ${String(sector+1).padStart(2,'0')}`;$('sector-name').textContent=sectorName(sector);}
function simulate(dt){
  const previous=s.distance;s.elapsed+=dt;
  s.star=Math.max(0,s.star-dt);s.boost=Math.max(0,s.boost-dt);const wanted=speedAt(s.distance)+(s.boost>0?7:0);s.speed+=(wanted-s.speed)*(1-Math.exp(-dt*2));s.distance+=s.speed*dt;
  let axis=0;if(keys.has('ArrowLeft')||keys.has('KeyA'))axis--;if(keys.has('ArrowRight')||keys.has('KeyD'))axis++;
  if(axis)s.target+=axis*dt*8.5*settings.sensitivity;
  s.target=clamp(s.target,-10,10);Object.assign(s,steer(s,s.target,dt));
  ensureChunks();const c=chunks.find(c=>s.distance>=c.start&&s.distance<c.start+CHUNK);const onRoad=c&&hasFloor(c,s.distance)&&supportedOnRoad(s.x);
  s.jumpBuffer=Math.max(0,s.jumpBuffer-dt);if(s.grounded&&onRoad)s.coyote=.1;else s.coyote=Math.max(0,s.coyote-dt);
  if(s.jumpBuffer>0&&(s.grounded||s.coyote>0))performJump();
  if(!onRoad)s.grounded=false;
  if(!s.grounded){s.vy-=GRAVITY*dt;s.y+=s.vy*dt;if(onRoad&&s.y<=RADIUS&&s.y>RADIUS-.22&&s.vy<=0){s.y=RADIUS;s.vy=0;s.grounded=true;s.coyote=.1;sound.land();world.shake=.035;if(s.jumpBuffer>0)performJump();}}
  if(s.y<-4){die(Math.abs(s.x)>HALF_WIDTH?'A little too close to the edge.':'Mind the gap. Jump a little earlier.');return;}
  for(const chunk of chunks){
    const h=chunk.hazard;
    const rendered=world.chunks.get(chunk.index);
    for(const coin of rendered.coins){
      if(chunk.collected.has(coin.index)||Math.abs(s.distance-coin.at)>1.1)continue;
      if(Math.abs(s.x-coin.lane*3.05)<.9&&Math.abs(s.y-coin.mesh.position.y)<1){
        chunk.collected.add(coin.index);s.coins++;sound.coin();world.burst(coin.mesh.position.x,coin.mesh.position.y,s.distance-coin.at,7);
        const reward=addCoinCharge(s.starCharge);s.starCharge=reward.charge;
        if(reward.activations){s.star=STAR_DURATION;s.starActivations+=reward.activations;world.activateStar();sound.star();toast('STAR POWER · SMASH THROUGH',2);if(navigator.vibrate)navigator.vibrate([18,30,40]);}
      }
    }
    if(previous<=h+1.05&&s.distance>=h-1.05){for(const [index,obstacle] of obstaclesAt(chunk,s.elapsed).entries()){
      if(chunk.destroyed.has(index)||!hitsObstacle(obstacle,s.x,s.y))continue;
      if(s.star>0){chunk.destroyed.add(index);s.smashed++;world.smash(chunk,index,obstacle);sound.smash();}
      else{die(chunk.type==='beam'?'Jump over the low barrier.':'Steer around the blocks, or jump over them.');return;}
    }}
    if(chunk.type==='boost'&&!chunk.boosted&&s.distance>=h&&previous<h&&onRoad){chunk.boosted=true;s.boost=3;sound.boost();toast('FLOW BOOST  ↗',2);world.burst(centerAt(s.distance)+s.x,.3,0,22);}
  }
  if(s.distance>54&&!tutorial.has('block')){tutorial.add('block');hint('Blocks ahead · Steer around or jump',3);}
  if(s.distance>145&&!tutorial.has('gap')){tutorial.add('gap');hint('Gap ahead · Jump at the marked edge',3);}
  const sector=Math.floor(s.distance/SECTOR_DISTANCE);if(sector!==s.sector){s.sector=sector;toast(`SECTOR ${String(sector+1).padStart(2,'0')} · ${sectorName(sector)}`,3);sound.boost();}
}
function frame(now){
  const dt=Math.min((now-lastTime)/1000||.016,.05);lastTime=now;
  if(s.mode==='running'){let remaining=dt;while(remaining>0&&s.mode==='running'){const step=Math.min(remaining,1/120);simulate(step);remaining-=step;}updateHud();sound.update(true,s.star>0);}
  else if(s.mode==='home'){s.distance+=dt*4;s.speed=4;s.elapsed+=dt;s.x=1.2;s.y=RADIUS+.07+Math.sin(s.elapsed*1.4)*.035;ensureChunks();}
  else if(s.mode==='dying'){s.deathTime+=dt;s.vy-=GRAVITY*dt;s.y+=s.vy*dt;$('flash').style.opacity=Math.max(0,.35-s.deathTime*.8);if(s.deathTime>.65)end();}
  if(toastTimer>0&&s.mode==='running'){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('visible');}
  world.update(s,(s.mode==='paused'||s.mode==='settings'||s.mode==='dead')?0:dt);
  requestAnimationFrame(frame);
}
document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>selectTheme(button.dataset.scene)));
$('play').addEventListener('click',start);$('retry').addEventListener('click',start);$('restart-pause').addEventListener('click',start);$('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);$('quit').addEventListener('click',goHome);$('back-home').addEventListener('click',goHome);
$('sound').addEventListener('click',()=>{settings.audio=!settings.audio;sound.set(settings.audio);syncSettings();});
function openSettings(){settingsFrom=s.mode;s.mode='settings';keys.clear();pointer=null;syncSettings();panel('settings-panel');}
$('settings').addEventListener('click',openSettings);$('pause-settings').addEventListener('click',openSettings);
$('settings-done').addEventListener('click',()=>{s.mode=settingsFrom;if(s.mode==='paused')panel('pause-panel');else hideModals();lastTime=performance.now();});
$('audio-toggle').addEventListener('change',e=>{settings.audio=e.target.checked;sound.set(settings.audio);syncSettings();});
$('hints-toggle').addEventListener('change',e=>{settings.hintMode=e.target.checked?'on':'off';syncSettings();});
$('glow-toggle').addEventListener('change',e=>{settings.glow=e.target.checked;syncSettings();});
$('motion-toggle').addEventListener('change',e=>{settings.motion=e.target.checked;syncSettings();});
$('sensitivity').addEventListener('input',e=>{settings.sensitivity=+e.target.value;syncSettings();});
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
window.addEventListener('keydown',e=>{if(e.target.matches?.('input'))return;if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Escape'||e.code==='KeyP'){if(s.mode==='running')pause();else if(s.mode==='paused')resume();return;}if(e.code==='Space'||e.code==='ArrowUp'){if(!e.repeat)jump();}keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
$('world').addEventListener('pointerdown',e=>{if(s.mode!=='running'||pointer)return;e.preventDefault();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startY:e.clientY,lastJumpY:e.clientY};$('world').setPointerCapture(e.pointerId);});
$('world').addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId||s.mode!=='running')return;e.preventDefault();s.target+=((e.clientX-pointer.x)/Math.min(innerWidth,850))*19*settings.sensitivity;if(pointer.lastJumpY-e.clientY>42){jump();pointer.lastJumpY=e.clientY;}if(e.clientY>pointer.lastJumpY)pointer.lastJumpY=e.clientY;pointer.x=e.clientX;pointer.y=e.clientY;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(event,e=>{if(pointer?.id===e.pointerId)pointer=null;});
window.addEventListener('blur',()=>{keys.clear();if(s.mode==='running')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&s.mode==='running')pause();});
window.addEventListener('resize',()=>world?.resize());
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();pause();show('fatal',true);$('fatal-message').textContent='The graphics context was interrupted. Reload to roll again; your personal best is saved.';});
// Keep keyboard focus inside the active overlay.
document.addEventListener('keydown',e=>{if(e.code!=='Tab'||$('modal-layer').classList.contains('hidden'))return;const controls=[...$('modal-layer').querySelectorAll('.panel:not(.hidden) button, .panel:not(.hidden) input')].filter(e=>!e.disabled);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}});
try{world=new World($('world'),settings);selectTheme(settings.theme);syncSettings();updateBest();reset('home');$('play').disabled=false;$('play-label').textContent='LET’S ROLL';requestAnimationFrame(frame);}catch(error){console.error(error);show('fatal',true);}
// Read-only state for browser diagnostics and performance verification.
window.__howYouCoin=window.__neonDrift={getState:()=>({mode:s.mode,distance:s.distance,x:s.x,target:s.target,vx:s.vx,y:s.y,speed:s.speed,coins:s.coins,star:s.star,starCharge:s.starCharge,coinsPerStar:COINS_PER_STAR,elapsed:s.elapsed,starActivations:s.starActivations,smashed:s.smashed,sector:s.sector,best,chunks:chunks.length,drawCalls:world?.renderer.info.render.calls,triangles:world?.renderer.info.render.triangles}),getCourse:()=>chunks.map(c=>({index:c.index,type:c.type,hazard:c.hazard,lane:c.lane,gapStart:c.gapStart,gapEnd:c.gapEnd,destroyed:[...c.destroyed]})),getSettings:()=>({...settings}),getVisualState:()=>world.diagnostics()};
