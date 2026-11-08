export const CHUNK = 40;
export const HALF_WIDTH = 4.8;
export const RADIUS = 0.56;
export const GRAVITY = 25;
export const JUMP_VELOCITY = 11;
export const SECTOR_DISTANCE = 500;
export const STAR_DURATION = 6;
export const COINS_PER_STAR = 100;
export function addCoinCharge(charge, coins=1) {
  const total=charge+coins;
  return { charge:total%COINS_PER_STAR, activations:Math.floor(total/COINS_PER_STAR) };
}
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const speedAt = d => Math.min(38, 18 + Math.sqrt(Math.max(0, d)) * .56);
export const centerAt = z => Math.sin(z * .008) * 6 + Math.sin(z * .019) * 2;
export function randomAt(seed, n) {
  let x = Math.imul(n ^ seed, 0x45d9f3b);
  x = Math.imul(x ^ x >>> 16, 0x45d9f3b);
  return ((x ^ x >>> 16) >>> 0) / 4294967296;
}
export function makeChunk(index, seed = 17) {
  const start = index * CHUNK;
  const r = randomAt(seed, index * 13 + 8);
  let lane = Math.floor(randomAt(seed, index * 13 + 2) * 3) - 1;
  let type = 'clear';
  if (index === 2) type = 'block';
  else if (index === 4) type = 'gap';
  else if (index === 6) type = 'boost';
  else if (index > 6) {
    if (index % 10 === 0) type = 'boost';
    else if (r < .22) type = 'gap';
    else if (r < .48) type = 'block';
    else if (r < .67) type = index > 9 ? 'double' : 'block';
    else if (r < .82) type = 'beam';
    else if (r < .94 && index > 11) type = 'moving';
    else type = 'block';
  }
  const gapLength = Math.min(8.5, 5.2 + start / 1600);
  const hazard = start + 22;
  return { index, start, type, lane, hazard, gapStart: hazard - gapLength / 2, gapEnd: hazard + gapLength / 2, collected: new Set(), destroyed: new Set(), passed:false, boosted:false };
}
export function hasFloor(chunk, distance) {
  return !(chunk.type === 'gap' && distance > chunk.gapStart && distance < chunk.gapEnd);
}
export function obstaclesAt(chunk, time = 0) {
  if (chunk.type === 'block') return [{ x: chunk.lane * 3.05, width: 2.55, height: 1.5 }];
  if (chunk.type === 'double') return [-1,0,1].filter(l => l !== chunk.lane).map(l => ({ x: l * 3.05, width: 2.55, height: 1.5 }));
  if (chunk.type === 'beam') return [{ x: 0, width: 9.6, height: .9 }];
  if (chunk.type === 'moving') return [{ x: Math.sin(time * 1.5 + chunk.index) * 3.1, width: 2.3, height: 1.8 }];
  return [];
}
export function hitsObstacle(obstacle, x, y) {
  return Math.abs(x - obstacle.x) < obstacle.width / 2 + RADIUS * .72 && y - RADIUS < obstacle.height - .04;
}

// Recycled scenery travels toward the camera just like track chunks.
export function sceneryZ(offset, distance) {
  return ((offset + distance) % 506 + 506) % 506 - 450;
}

// Exact critically damped response: fast tracking without spring overshoot.
// The target may still move beyond the road, so deliberate oversteering can fall.
export function steer(state, target, dt) {
  const omega = 14;
  const offset = state.x - target;
  const impulse = (state.vx + omega * offset) * dt;
  const decay = Math.exp(-omega * dt);
  return { x: target + (offset + impulse) * decay, vx: (state.vx - omega * impulse) * decay };
}
export const supportedOnRoad = x => Math.abs(x) < HALF_WIDTH - RADIUS * .3;
