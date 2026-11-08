import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true,isMobile:true,deviceScaleFactor:.8});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.addInitScript(()=>{
 Math.random=()=>.41231;let frames=[],now=performance.now();window.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};window.__step=(count=1)=>{for(let i=0;i<count;i++){now+=1000/60;const callbacks=frames;frames=[];for(const cb of callbacks)cb(now);}};
 performance.now=()=>now;window.__skipDraw=true;for(const method of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const original=WebGL2RenderingContext.prototype[method];WebGL2RenderingContext.prototype[method]=function(...args){if(!window.__skipDraw)return original.apply(this,args);};}
});
await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
const click=async id=>page.evaluate(id=>document.getElementById(id).click(),id);
const render=async path=>{await page.evaluate(()=>{window.__skipDraw=false;window.__step(8);window.__skipDraw=true;});await page.screenshot({path});};
for(const theme of ['orbit','abyss']){await page.evaluate(theme=>{document.querySelector(`[data-scene=${theme}]`).click();window.__step(100);},theme);await render(`/tmp/howyoucoin-${theme}.png`);assert.equal(await page.evaluate(()=>window.__howYouCoin.getSettings().theme),theme);}
await click('settings');await page.evaluate(()=>{const input=document.getElementById('hints-toggle');input.checked=false;input.dispatchEvent(new Event('change'));});await click('settings-done');await click('play');await page.evaluate(()=>window.__step(30));
assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('steer-zone')).visibility),'hidden');assert.equal(await page.evaluate(()=>document.getElementById('toast').classList.contains('visible')),false);
await click('pause');await page.evaluate(()=>window.__step());await click('pause-settings');await click('settings-done');assert.equal(await page.evaluate(()=>window.__howYouCoin.getState().mode),'paused');await click('resume');
await page.evaluate(()=>{while(window.__howYouCoin.getState().distance<90)window.__step();document.getElementById('pause').click();window.__step();});await render('/tmp/howyoucoin-obstacle.png');await click('resume');
await page.evaluate(()=>{document.getElementById('pause').click();document.getElementById('quit').click();});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__step(60));await render('/tmp/howyoucoin-v3-phone.png');await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>window.__howYouCoin.getSettings().hints),false);assert.deepEqual(errors,[]);console.log('PASS new worlds, hints persistence, and pause settings.');await browser.close();
