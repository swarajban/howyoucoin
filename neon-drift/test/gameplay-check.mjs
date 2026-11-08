import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true,isMobile:true,deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>{
 Math.random=()=>.41231;
 localStorage.setItem('howyoucoin-settings',JSON.stringify({glow:false,motion:true,sensitivity:1,audio:false,theme:'dunes'}));
 // Deterministic frame clock; graphics are covered separately by rendered screenshots.
 let frames=[],now=performance.now();window.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};window.__step=(count=1)=>{for(let i=0;i<count;i++){now+=1000/60;const callbacks=frames;frames=[];for(const cb of callbacks)cb(now);}};
 for(const method of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced'])WebGL2RenderingContext.prototype[method]=()=>{};
});
await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
const result=await page.evaluate(()=>{
 const state=()=>window.__neonDrift.getState(),click=id=>document.getElementById(id).click(),step=n=>window.__step(n);
 const key=(code,down)=>document.body.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
 const drag=(dx,dy=0)=>{const canvas=document.getElementById('world');canvas.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:300,clientY:850,bubbles:true}));canvas.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:300+dx,clientY:850+dy,bubbles:true}));canvas.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));};
 // Synthetic pointer capture isn't valid for synthetic pointer IDs; ignore capture only in this deterministic harness.
 HTMLCanvasElement.prototype.setPointerCapture=()=>{};
 step(4);click('play');step(30);const started=state();drag(100);step(30);const steered=state();drag(0,-70);step(10);const swipeJump=state();
 click('pause');const p=state().distance;step(120);const paused=state().distance===p;click('resume');step(30);
 click('pause');click('restart-pause');step(3);
 // Drive 2.5 km by solving the actual upcoming hazards with ordinary keyboard input.
 let jumped=-1;let steps=0;let sawBoost=false;const types=new Set();
 while(state().distance<2500&&state().mode==='running'&&steps<13000){
  const s=state(),course=window.__neonDrift.getCourse();const c=course.find(c=>c.hazard>=s.distance-1);let target=0;
  if(c){types.add(c.type);if(c.type==='block')target=c.lane===0?-3.05:0;if(c.type==='double')target=c.lane*3.05;
   const immuneAtHazard=s.star>(c.hazard-s.distance)/s.speed+.18;
   if(immuneAtHazard)target=0;
   const needsJump=c.type==='gap'||(!immuneAtHazard&&['beam','moving'].includes(c.type));const trigger=c.type==='gap'?c.gapStart-2.5:c.hazard-s.speed*.32;
   if(needsJump&&s.distance>=trigger&&jumped!==c.index){key('Space',true);key('Space',false);jumped=c.index;}
  }
  const error=target-s.vx*.20-s.target;key('KeyD',error>.09);key('KeyA',error<-.09);step(1);steps++;if(state().speed>40)sawBoost=true;
 }
 key('KeyA',false);key('KeyD',false);const longRun=state();
 if(longRun.mode==='running'){drag(500);step(120);}else step(90);const death=state();
 click('retry');step(5);const restarted=state();
 return {started,steered,swipeJump,paused,longRun,death,restarted,types:[...types],steps,sawBoost};
});
console.log(JSON.stringify(result,null,2));assert.equal(result.started.mode,'running');assert.ok(result.steered.x>1);assert.ok(result.swipeJump.y>1);assert.ok(result.paused);assert.ok(result.longRun.distance>=2500,'Autopilot should survive 2.5 km');assert.equal(result.death.mode,'dead');assert.ok(result.death.best>=2500);assert.equal(result.restarted.mode,'running');assert.ok(result.restarted.distance<5);assert.equal(result.restarted.coins,0);assert.ok(result.longRun.starActivations>=2);assert.ok(result.longRun.smashed>=1);assert.equal(result.restarted.star,0);assert.equal(result.restarted.starCharge,0);
await page.reload({waitUntil:'networkidle'});assert.ok(await page.evaluate(()=>window.__neonDrift.getState().best)>=2500);assert.deepEqual(errors,[]);console.log('PASS: touch gestures, 2.5 km, all hazards, bounded chunks, death, retry, persistence.');await browser.close();
