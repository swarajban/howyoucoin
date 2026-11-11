import {chromium} from 'playwright';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const bundle=await build({stdin:{contents:source+'\nwindow.__fallTest={s,simulate,start};',resolveDir:new URL('../src',import.meta.url).pathname},bundle:true,format:'esm',write:false});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true,isMobile:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.addInitScript(()=>{
    Math.random=()=>.41231;
    localStorage.setItem('howyoucoin-settings',JSON.stringify({glow:false,motion:true,audio:false}));
    let frames=[],now=performance.now();
    window.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};
    window.__render=()=>{now+=1000/60;const callbacks=frames;frames=[];for(const cb of callbacks)cb(now);};
  });
  await page.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text}));
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  const results=await page.evaluate(()=>{
    const {s,simulate,start}=window.__fallTest;
    const reset=values=>{start();Object.assign(s,values);};
    const step=(n=1)=>{for(let i=0;i<n&&s.mode==='running';i++)simulate(1/120);};
    const snapshot=()=>({mode:s.mode,x:s.x,y:s.y,vy:s.vy,grounded:s.grounded,star:s.star,distance:s.distance});
    const results={};
    reset({distance:178,star:6});step(45);results.gap=snapshot();
    reset({distance:181,star:1/120});step();results.gapExpiry=snapshot();step(120);results.gapDeath=snapshot();
    reset({distance:178});step(120);results.normalGap=snapshot();
    for(const side of [-1,1]){
      reset({x:side*6,target:side*6,star:1});step(60);results['edge'+side]=snapshot();
      step(180);results['edgeExpiry'+side]=snapshot();
      reset({x:side*6,target:side*6});step(120);results['normalEdge'+side]=snapshot();
    }
    reset({x:6,target:6,star:2,grounded:false,y:2,vy:-3});step(60);results.landing=snapshot();
    reset({x:6,target:6,star:2,grounded:false,y:.3,vy:-2});step();results.rescue=snapshot();
    reset({x:6,target:6,star:2,jumpBuffer:.16});step();results.jump=snapshot();
    reset({x:6,target:0,star:1});step(180);results.returnToRoad=snapshot();
    reset({star:1/120});step(120);results.safeExpiry=snapshot();
    reset({star:6});s.mode='paused';window.__render();results.paused=snapshot();
    start();results.restart=snapshot();
    reset({x:6,target:6,star:4});for(let i=0;i<90;i++)window.__render();results.rendered=snapshot();
    return results;
  });
  for(const name of ['gap','edge-1','edge1','landing','rescue']){
    assert.equal(results[name].mode,'running',name);
    assert.equal(results[name].y,.56,name);
    assert.equal(results[name].grounded,true,name);
  }
  assert.ok(results.gap.distance>185,'Cross the entire opening gap without jumping');
  assert.equal(results.gapExpiry.star,0);
  assert.equal(results.gapExpiry.grounded,false);
  assert.ok(results.gapExpiry.y<.56);
  for(const name of ['gapDeath','normalGap','edgeExpiry-1','edgeExpiry1','normalEdge-1','normalEdge1'])assert.equal(results[name].mode,'dying',name);
  assert.ok(results.jump.y>.56);
  for(const name of ['returnToRoad','safeExpiry']){
    assert.equal(results[name].star,0);
    assert.equal(results[name].mode,'running');
    assert.equal(results[name].grounded,true);
  }
  assert.equal(results.paused.star,6);
  assert.equal(results.restart.star,0);
  assert.deepEqual(errors,[]);
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>{for(let i=0;i<10;i++)window.__render();});
  await page.screenshot({path:'/tmp/howyoucoin-star-edge.png'});
  console.log('PASS: powered gaps, both edges, expiry, normal falls, airborne landing/rescue, jumping, return to road, pause and reset.',results);
} finally {
  await browser.close();
}
