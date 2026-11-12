import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true,isMobile:true,deviceScaleFactor:.8});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__howYouCoin&& !document.getElementById('play').disabled);
for(const theme of ['dunes','forest','neon']){
 await page.locator(`[data-scene=${theme}]`).tap();await page.waitForTimeout(600);await page.screenshot({path:`/tmp/howyoucoin-${theme}-ipad.png`});
 console.log(theme,await page.evaluate(()=>window.__howYouCoin.getVisualState()));
 assert.equal(await page.evaluate(()=>window.__howYouCoin.getSettings().theme),theme);
}
await page.locator('[data-scene=dunes]').tap();await page.locator('#play').tap();await page.waitForFunction(()=>window.__howYouCoin.getState().distance>1);
const before=await page.evaluate(()=>({s:window.__howYouCoin.getState(),v:window.__howYouCoin.getVisualState()}));
await page.waitForFunction(before=>window.__howYouCoin.getState().distance>before.s.distance+1&&window.__howYouCoin.getVisualState().reflectionUpdates>before.v.reflectionUpdates,before,{timeout:10000});
const after=await page.evaluate(()=>({s:window.__howYouCoin.getState(),v:window.__howYouCoin.getVisualState()}));
assert.ok(after.v.reflectionUpdates>before.v.reflectionUpdates);assert.ok(after.v.buildingPosition[2]>before.v.buildingPosition[2]);assert.ok(Math.abs((after.v.buildingPosition[2]-before.v.buildingPosition[2])-(after.s.distance-before.s.distance))<.001);assert.notDeepEqual(before.v.marbleQuaternion,after.v.marbleQuaternion);
await page.screenshot({path:'/tmp/howyoucoin-dunes-play.png'});
await page.locator('#pause').tap();await page.locator('#quit').tap();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:'/tmp/howyoucoin-phone.png'});
await page.locator('[data-scene=forest]').tap();await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>window.__howYouCoin.getSettings().theme),'forest');
console.log('ERRORS',errors);assert.deepEqual(errors,[]);console.log('PASS: themes, persistence, scenery direction, rolling orientation, live reflections.');await browser.close();
