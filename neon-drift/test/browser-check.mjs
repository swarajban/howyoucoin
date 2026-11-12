import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.addInitScript(()=>{
    let frames=[],now=performance.now();
    window.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
    window.__step=(count=1)=>{for(let i=0;i<count;i++){now+=1000/60;const callbacks=frames;frames=[];for(const callback of callbacks)callback(now);}};
    performance.now=()=>now;
  });
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__howYouCoin&&!document.getElementById('play').disabled);
  const step=count=>page.evaluate(count=>window.__step(count),count);
  const state=()=>page.evaluate(()=>window.__howYouCoin.getState());
  await step(2);
  assert.equal((await state()).mode,'home');
  assert.ok((await state()).drawCalls>0,'The renderer should submit draw calls');
  await page.screenshot({path:'/tmp/neon-desktop-home.png'});
  await page.locator('#play').click();
  await step(5);
  assert.equal((await state()).mode,'running');
  assert.ok((await state()).distance>0);
  await page.keyboard.press('Space');
  await step(5);
  assert.ok((await state()).y>0.56,'Space should jump in the rendered game');
  await page.screenshot({path:'/tmp/neon-desktop-play.png'});
  await page.locator('#pause').click();
  const paused=await state();
  await step(5);
  assert.equal((await state()).mode,'paused');
  assert.equal((await state()).distance,paused.distance);
  await page.locator('#resume').click();
  await page.keyboard.down('KeyD');
  await step(5);
  await page.keyboard.up('KeyD');
  assert.ok((await state()).x>paused.x,'D should steer right in the rendered game');
  await page.locator('#pause').click();
  await page.locator('#quit').click();
  await page.setViewportSize({width:820,height:1180});
  await step(2);
  await page.screenshot({path:'/tmp/neon-ipad-home.png'});
  await page.locator('#play').click();
  await step(5);
  assert.equal((await state()).mode,'running');
  await page.screenshot({path:'/tmp/neon-ipad-play.png'});
  await page.setViewportSize({width:390,height:844});
  await step(2);
  await page.screenshot({path:'/tmp/neon-iphone-play.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: rendered desktop/iPad/phone smoke, start, jump, pause, resume and steering.');
} finally {
  await browser.close();
}
