import * as THREE from 'three';
import { RADIUS, STAR_DURATION } from './core.js';
export class StarPower {
  constructor(scene){
    this.time=0;this.launch=0;this.debris=[];
    this.aura=new THREE.Group();scene.add(this.aura);
    this.shield=new THREE.Mesh(new THREE.SphereGeometry(RADIUS*1.37,32,20),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},strength:{value:0}},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;uniform float time;uniform float strength;void main(){float f=pow(1.-max(dot(n,v),0.),2.2);vec3 c=.55+.45*cos(6.28318*(vec3(0.,.33,.67)+time*.16+n.y*.16));gl_FragColor=vec4(c*2.,f*.8*strength);}`}));this.aura.add(this.shield);
    this.rings=[];for(let i=0;i<3;i++){const mesh=new THREE.Mesh(new THREE.TorusGeometry(.88+i*.11,.015,5,64),new THREE.MeshBasicMaterial({color:['#ffe795','#9bffef','#f6a6ff'][i],transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));this.aura.add(mesh);this.rings.push(mesh);}
    const glow=document.createElement('canvas');glow.width=glow.height=128;const ctx=glow.getContext('2d');const g=ctx.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'#ffffff');g.addColorStop(.18,'rgba(255,236,130,.8)');g.addColorStop(1,'rgba(255,221,100,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
    this.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glow),color:'#ffdb83',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.35}));this.halo.scale.set(3.8,3.8,1);this.aura.add(this.halo);
    this.motes=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.055),new THREE.MeshBasicMaterial({color:'#fff3bf',toneMapped:false}),40);this.motes.frustumCulled=false;this.aura.add(this.motes);this.dummy=new THREE.Object3D();
    this.wave=new THREE.Mesh(new THREE.RingGeometry(.9,1,80),new THREE.MeshBasicMaterial({color:'#ffeeb4',side:THREE.DoubleSide,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));this.wave.rotation.x=-Math.PI/2;scene.add(this.wave);
    this.shards=new THREE.InstancedMesh(new THREE.BoxGeometry(.18,.18,.18),new THREE.MeshStandardMaterial({color:'#d2dce1',metalness:.7,roughness:.3,emissive:'#ff9e3b',emissiveIntensity:.25}),80);this.shards.frustumCulled=false;this.shards.count=0;scene.add(this.shards);
    this.aura.visible=false;
  }
  activate(){this.launch=1;}
  smash(x,y,z,width,height){for(let i=0;i<24;i++)this.debris.push({x:x+(Math.random()-.5)*width,y:y+(Math.random()-.5)*height,z,vx:(Math.random()-.5)*13,vy:3+Math.random()*7,vz:(Math.random()-.5)*9,life:1.1+Math.random()*.5,size:.5+Math.random()*1.5});this.debris=this.debris.slice(-80);}
  clear(){this.launch=0;this.debris=[];this.aura.visible=false;this.wave.material.opacity=0;this.shards.count=0;}
  update(state,ball,dt,reducedMotion){
    this.time+=dt;const t=this.time,active=state.star>0,strength=Math.min(1,state.star);this.aura.visible=active&&ball.visible;this.aura.position.copy(ball.position);
    this.shield.material.uniforms.time.value=t;this.shield.material.uniforms.strength.value=strength;
    this.rings.forEach((ring,i)=>{ring.rotation.set(.8+i*.7,reducedMotion?i:t*(.6+i*.2),i*1.1);ring.material.opacity=.65*strength;});this.halo.material.opacity=.32*strength;
    if(active){ball.material.emissive.setHSL((t*.18)%1,.8,.3);ball.material.emissiveIntensity=.85*strength;this.halo.material.color.setHSL((t*.18+.1)%1,.65,.7);for(let i=0;i<40;i++){const angle=i*2.4+(reducedMotion?0:t*1.5),radius=.8+(i%7)*.13;this.dummy.position.set(Math.cos(angle)*radius,Math.sin(angle*1.3)*.85,Math.sin(angle)*radius);this.dummy.rotation.set(t+i,t*.5,0);this.dummy.scale.setScalar(.6+(i%3)*.35);this.dummy.updateMatrix();this.motes.setMatrixAt(i,this.dummy.matrix);}this.motes.instanceMatrix.needsUpdate=true;}
    if(this.launch>0){this.launch=Math.max(0,this.launch-dt*1.5);const size=1+(1-this.launch)*11;this.wave.position.set(ball.position.x,.07,0);this.wave.scale.setScalar(reducedMotion?3:size);this.wave.material.opacity=this.launch*.75;}else this.wave.material.opacity=0;
    this.debris=this.debris.filter(p=>p.life>0);this.debris.forEach((p,i)=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=(p.vz+state.speed)*dt;p.vy-=17*dt;this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(t*3+i,t*2+i,0);this.dummy.scale.setScalar(p.size*Math.min(1,p.life*3));this.dummy.updateMatrix();this.shards.setMatrixAt(i,this.dummy.matrix);});this.shards.count=this.debris.length;this.shards.instanceMatrix.needsUpdate=true;
  }
}
