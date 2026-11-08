import test from 'node:test';
import assert from 'node:assert/strict';
import {makeChunk,speedAt,obstaclesAt,hasFloor,hitsObstacle,JUMP_VELOCITY,GRAVITY,RADIUS,CHUNK} from '../src/core.js';
test('difficulty grows smoothly and has a playable top speed',()=>{let previous=0;for(let d=0;d<100000;d+=20){const speed=speedAt(d);assert.ok(speed>=previous);assert.ok(speed<=38);previous=speed;}});
test('course stays deterministic and starts with a safe onboarding stretch',()=>{for(let i=0;i<100;i++){const a=makeChunk(i,918),b=makeChunk(i,918);assert.deepEqual(a,b);}assert.equal(makeChunk(0).type,'clear');assert.equal(makeChunk(1).type,'clear');assert.equal(makeChunk(2).type,'block');assert.equal(makeChunk(4).type,'gap');});
test('thousands of generated obstacles always have a dodge or jump solution',()=>{for(let seed=1;seed<=20;seed++)for(let i=0;i<500;i++){const c=makeChunk(i,seed);const obs=obstaclesAt(c,42);const apex=RADIUS+JUMP_VELOCITY**2/(2*GRAVITY);for(const ob of obs)assert.equal(hitsObstacle(ob,ob.x,apex),false);if(c.type==='double')assert.equal(obs.some(ob=>hitsObstacle(ob,c.lane*3.05,RADIUS)),false);if(c.type==='gap'){const airTime=2*JUMP_VELOCITY/GRAVITY;assert.ok(c.gapEnd-c.gapStart<speedAt(c.start)*airTime-4);assert.equal(hasFloor(c,c.hazard),false);assert.equal(hasFloor(c,c.gapStart-1),true);}assert.equal(c.start,i*CHUNK);}});
test('collisions respect the marble width and obstacle clearance',()=>{const o={x:0,width:2.5,height:1.5};assert.equal(hitsObstacle(o,0,RADIUS),true);assert.equal(hitsObstacle(o,3,RADIUS),false);assert.equal(hitsObstacle(o,0,2.2),false);});

test('scenery advances in exactly the same direction and speed as the road',async()=>{
 const {sceneryZ}=await import('../src/core.js');
 for(const distance of [0,30,100,700,3000]){const a=sceneryZ(80,distance),b=sceneryZ(80,distance+2);assert.ok(Math.abs((b-a+506)%506-2)<.00001);}
});
test('precise steering approaches the finger without overshooting and still permits falls',async()=>{
 const {steer,supportedOnRoad}=await import('../src/core.js');
 for(const dt of [1/30,1/60,1/120]){let s={x:0,vx:0},max=0;for(let i=0;i<2/dt;i++){s=steer(s,4.5,dt);max=Math.max(max,s.x);}assert.ok(max<=4.50001);assert.ok(Math.abs(s.x-4.5)<.001);assert.ok(supportedOnRoad(s.x));for(let i=0;i<1/dt;i++)s=steer(s,6,dt);assert.equal(supportedOnRoad(s.x),false);}
});
test('every hundred coins grants a charge, carrying every remaining coin forward',async()=>{
 const {addCoinCharge,COINS_PER_STAR}=await import('../src/core.js');assert.equal(COINS_PER_STAR,100);
 assert.deepEqual(addCoinCharge(98),{charge:99,activations:0});assert.deepEqual(addCoinCharge(99),{charge:0,activations:1});assert.deepEqual(addCoinCharge(0,101),{charge:1,activations:1});assert.deepEqual(addCoinCharge(90,215),{charge:5,activations:3});
 let charge=0,activations=0;for(let i=0;i<1000;i++){const result=addCoinCharge(charge);charge=result.charge;activations+=result.activations;}assert.equal(charge,0);assert.equal(activations,10);
});
test('the opening course offers 100 coins in about thirty seconds',()=>{
 let distance=0,time=0,speed=18,coins=0;while(coins<100){speed+=(speedAt(distance)-speed)*(1-Math.exp(-.01*2));distance+=speed*.01;time+=.01;coins=Math.floor(distance/40)*5+[6,12,18,24,30].filter(z=>z<distance%40).length;}assert.ok(time>26&&time<32);
});
test('difficulty ramps sooner while keeping the same top speed',()=>{assert.ok(speedAt(500)>30);assert.ok(speedAt(1300)>37);assert.equal(speedAt(10000),38);});
