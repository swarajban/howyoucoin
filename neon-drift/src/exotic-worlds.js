import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { centerAt, sceneryZ, randomAt } from './core.js';
export class ExoticWorlds {
  constructor(scene){
    this.orbit=new THREE.Group();this.abyss=new THREE.Group();scene.add(this.orbit,this.abyss);this.dummy=new THREE.Object3D();
    this.planet=new THREE.Group();
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');for(let y=0;y<256;y++){const band=.5+.5*Math.sin(y*.19+Math.sin(y*.04)*2);ctx.fillStyle=`hsl(${25+band*12} ${28+band*15}% ${45+band*23}%)`;ctx.fillRect(0,y,512,1);}const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const globe=new THREE.Mesh(new THREE.SphereGeometry(25,64,40),new THREE.MeshStandardMaterial({map,color:'#e8d7ff',roughness:.85,fog:false}));this.planet.add(globe);
    const ringMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{},vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;void main(){float r=length(p.xy);float bands=.5+.5*sin(r*5.5);vec3 c=mix(vec3(.37,.26,.51),vec3(.94,.78,.65),bands);float a=smoothstep(30.,32.,r)*(1.-smoothstep(47.,49.,r));gl_FragColor=vec4(c,a*.72);}`});
    const rings=new THREE.Mesh(new THREE.RingGeometry(30,49,128),ringMaterial);rings.rotation.set(1.14,.25,.35);this.planet.add(rings);this.planet.rotation.z=-.2;this.orbit.add(this.planet);
    const moon=new THREE.Mesh(new THREE.SphereGeometry(7,32,20),new THREE.MeshStandardMaterial({color:'#8277bb',roughness:1,fog:false}));moon.position.set(-64,37,-235);this.orbit.add(moon);
    this.asteroids=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#6e7196',roughness:.85,metalness:.15,flatShading:true}),62);this.asteroids.frustumCulled=false;this.orbit.add(this.asteroids);
    // Bell and tentacles are separate surfaces: glassy translucence above, light below.
    this.jellies=[];const bellGeo=new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI*.58);
    const tentacles=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;const points=[];for(let j=0;j<9;j++){const y=-j*.4;points.push(new THREE.Vector3(Math.cos(a)*(.6+j*.025)+Math.sin(j*.8+i)*.12,y,Math.sin(a)*(.6+j*.025)));}tentacles.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.018,4,false));}const tentacleGeo=mergeGeometries(tentacles);tentacles.forEach(g=>g.dispose());
    for(let i=0;i<16;i++){
      const color=new THREE.Color().setHSL(.47+(i%4)*.085,.8,.65);const group=new THREE.Group();
      const bell=new THREE.Mesh(bellGeo,new THREE.MeshPhysicalMaterial({color,emissive:color,emissiveIntensity:.3,metalness:.1,roughness:.2,transparent:true,opacity:.47,side:THREE.DoubleSide,depthWrite:false,clearcoat:1}));group.add(bell);
      const fringe=new THREE.Mesh(new THREE.TorusGeometry(.97,.027,5,48),new THREE.MeshBasicMaterial({color:color.clone().multiplyScalar(1.6)}));fringe.rotation.x=Math.PI/2;fringe.position.y=-.2;group.add(fringe);
      const tendrils=new THREE.Mesh(tentacleGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6,depthWrite:false}));group.add(tendrils);this.jellies.push(group);this.abyss.add(group);
    }
    this.corals=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,6),new THREE.MeshStandardMaterial({color:'#214657',emissive:'#1b4050',emissiveIntensity:.3,roughness:.65,flatShading:true}),90);this.corals.frustumCulled=false;this.abyss.add(this.corals);
    const bubblePositions=[];for(let i=0;i<240;i++)bubblePositions.push((randomAt(7,i)-.5)*130,randomAt(8,i)*55-15,-randomAt(9,i)*350);const bubbleGeometry=new THREE.BufferGeometry();bubbleGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bubblePositions,3));this.bubbles=new THREE.Points(bubbleGeometry,new THREE.PointsMaterial({color:'#adf8ed',size:.12,transparent:true,opacity:.45,depthWrite:false}));this.abyss.add(this.bubbles);
    this.setTheme('orbit');
  }
  setTheme(key){this.orbit.visible=key==='orbit';this.abyss.visible=key==='abyss';}
  put(mesh,i,x,y,z,sx,sy,sz,rotation=0){this.dummy.position.set(x,y,z);this.dummy.scale.set(sx,sy,sz);this.dummy.rotation.set(rotation*.2,rotation,rotation*.3);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);}
  update(distance,time){
    if(this.orbit.visible){this.planet.position.set(centerAt(distance)+34,30,-175);for(let i=0;i<62;i++){const z=sceneryZ(i*8.1,distance),side=i%2?1:-1,size=1+randomAt(11,i)*3;this.put(this.asteroids,i,centerAt(distance-z)+side*(13+randomAt(21,i)*42),-13+randomAt(31,i)*29,z,size,size*.75,size*1.1,i+time*.035);}this.asteroids.instanceMatrix.needsUpdate=true;}
    if(this.abyss.visible){for(let i=0;i<16;i++){const z=sceneryZ(i*31.6,distance*.82),size=2.1+randomAt(90,i)*3;const jelly=this.jellies[i];jelly.position.set(centerAt(distance-z)+(i%2?1:-1)*(12+randomAt(61,i)*23),3+randomAt(4,i)*15+Math.sin(time*.6+i)*.9,z);jelly.scale.set(size,size*(.72+Math.sin(time*1.3+i)*.05),size);jelly.rotation.z=Math.sin(time*.35+i)*.08;}
      for(let i=0;i<90;i++){const z=sceneryZ(i*5.6,distance),height=4+randomAt(51,i)*13;this.put(this.corals,i,centerAt(distance-z)+(i%2?1:-1)*(11+randomAt(81,i)*32),-9,z,1+randomAt(3,i)*3,height,2,i*.6);}this.corals.instanceMatrix.needsUpdate=true;this.bubbles.position.y=(time*.35)%10;
    }
  }
}
