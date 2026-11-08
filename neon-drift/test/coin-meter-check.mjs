import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true,isMobile:true,deviceScaleFactor:.8});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.addInitScript(()=>{
 Math.random=()=>.41231;let frames=[],now=performance.now();window.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};window.__step=(count=1)=>{for(let i=0;i<count;i++){now+=1000/60;const callbacks=frames;frames=[];for(const cb of callbacks)cb(now);}};performance.now=()=>now;
 window.__skipDraw=true;for(const method of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const original=WebGL2RenderingContext.prototype[method];WebGL2RenderingContext.prototype[method]=function(...args){if(!window.__skipDraw)return original.apply(this,args);};}
});
await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
const onboarding=await page.evaluate(()=>{
 const click=id=>document.getElementById(id).click();const result=[];
 for(let run=1;run<=4;run++){click('play');window.__step(5);result.push({run,hints:window.__howYouCoin.getSettings().hints,toast:document.getElementById('toast').classList.contains('visible')});click('pause');window.__step();click('quit');window.__step();}
 return result;
});assert.deepEqual(onboarding.map(r=>r.hints),[true,true,true,false]);assert.deepEqual(onboarding.map(r=>r.toast),[true,true,true,false]);
await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>window.__howYouCoin.getSettings().hints),false);
const toggleResults=await page.evaluate(()=>{
 const click=id=>document.getElementById(id).click();const toggle=value=>{const input=document.getElementById('hints-toggle');input.checked=value;input.dispatchEvent(new Event('change'));};
 click('settings');toggle(true);click('settings-done');click('play');window.__step(5);const visibleBefore=document.getElementById('toast').classList.contains('visible');
 click('pause');window.__step();click('pause-settings');toggle(false);const immediatelyHidden=!document.getElementById('toast').classList.contains('visible')&&getComputedStyle(document.getElementById('toast')).display==='none';click('settings-done');click('resume');window.__step(5);
 return {visibleBefore,immediatelyHidden,resumeHidden:!document.getElementById('toast').classList.contains('visible'),mode:window.__howYouCoin.getState().mode};
});assert.deepEqual(toggleResults,{visibleBefore:true,immediatelyHidden:true,resumeHidden:true,mode:'running'});
await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>window.__howYouCoin.getSettings().hintMode),'off');
await page.evaluate(()=>{document.getElementById('play').click();window.__step(3);window.__drive={jumped:-1};});
async function driveToCoins(goal){return await page.evaluate(goal=>{
 const state=()=>window.__howYouCoin.getState();const key=(code,down)=>document.body.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));let steps=0;
 while(state().coins<goal&&state().mode==='running'&&steps<13000){const s=state(),c=window.__howYouCoin.getCourse().find(c=>c.hazard>=s.distance-1);let target=0;
 if(c){if(c.type==='block')target=c.lane===0?-3.05:0;if(c.type==='double')target=c.lane*3.05;const immune=s.star>(c.hazard-s.distance)/s.speed+.18;if(immune)target=0;
 const jump=c.type==='gap'||(!immune&&['beam','moving'].includes(c.type));const trigger=c.type==='gap'?c.gapStart-2.5:c.hazard-s.speed*.32;if(jump&&s.distance>=trigger&&window.__drive.jumped!==c.index){key('Space',true);key('Space',false);window.__drive.jumped=c.index;}}
 const error=target-s.vx*.2-s.target;key('KeyD',error>.09);key('KeyA',error<-.09);window.__step();steps++;}
 key('KeyD',false);key('KeyA',false);return {state:state(),visual:window.__howYouCoin.getVisualState(),meter:document.getElementById('charge-meter').getAttribute('aria-valuenow'),toastVisible:document.getElementById('toast').classList.contains('visible')};
 },goal);}
let result=await driveToCoins(99);assert.equal(result.state.coins,99);assert.equal(result.state.starCharge,99);assert.equal(result.state.star,0);assert.equal(result.state.starActivations,0);assert.equal(result.meter,'99');assert.equal(result.toastVisible,false);
await page.evaluate(()=>{document.getElementById('pause').click();window.__step();document.getElementById('modal-layer').style.visibility='hidden';window.__skipDraw=false;window.__step(8);window.__skipDraw=true;});await page.screenshot({path:'/tmp/howyoucoin-meter-ready.png'});
await page.evaluate(()=>{document.getElementById('modal-layer').style.visibility='';document.getElementById('resume').click();});
result=await driveToCoins(100);assert.equal(result.state.coins,100);assert.equal(result.state.starCharge,0);assert.equal(result.state.starActivations,1);assert.ok(result.state.star>5.9);assert.equal(result.visual.starAura,true);assert.equal(result.toastVisible,false);
await page.evaluate(()=>{document.getElementById('pause').click();window.__step();});const remaining=await page.evaluate(()=>window.__howYouCoin.getState().star);await page.evaluate(()=>window.__step(180));assert.equal(await page.evaluate(()=>window.__howYouCoin.getState().star),remaining);await page.evaluate(()=>document.getElementById('resume').click());
result=await driveToCoins(101);assert.equal(result.state.starCharge,1);assert.equal(result.state.starActivations,1);assert.ok(result.state.star>0);
await page.evaluate(()=>{window.__skipDraw=false;window.__step(8);window.__skipDraw=true;});await page.screenshot({path:'/tmp/howyoucoin-coin-star.png'});
result=await driveToCoins(200);assert.equal(result.state.starActivations,2);assert.equal(result.state.starCharge,0);assert.ok(result.state.star>5.9);assert.equal(result.toastVisible,false);console.log('REWARDS',result.state);
await page.evaluate(()=>{document.getElementById('pause').click();window.__step();document.getElementById('restart-pause').click();window.__step(3);});const reset=await page.evaluate(()=>window.__howYouCoin.getState());assert.equal(reset.coins,0);assert.equal(reset.starCharge,0);assert.equal(reset.star,0);assert.equal(reset.starActivations,0);assert.deepEqual(errors,[]);
console.log('PASS: three-run onboarding, mid-run off/resume, persistence, 99→100→101→200 coins, automatic power, charging during power, pause and reset.');await browser.close();
