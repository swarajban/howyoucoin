import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { centerAt, sceneryZ, randomAt } from './core.js';

// Both art directions use genuinely different geometry, silhouettes and lighting.
export class Landscape {
  constructor(scene) {
    this.dummy = new THREE.Object3D();
    this.dunes = new THREE.Group();
    this.forest = new THREE.Group();
    scene.add(this.dunes, this.forest);
    this.rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#bd8060', roughness: .95, flatShading: true }), 96);
    this.rocks.frustumCulled = false;
    this.dunes.add(this.rocks);
    // Fine horizontal sediment bands stay attached to the rock as it moves.
    this.rocks.material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRock;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRock=position;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRock;').replace('#include <color_fragment>', '#include <color_fragment>\nfloat band=smoothstep(.67,.73,fract(vRock.y*10.+sin(vRock.x*3.)*.2));diffuseColor.rgb*=.86+band*.17;');
    };
    const mesaGeo = new THREE.CylinderGeometry(1, 1.35, 1, 7, 1);
    this.islands = new THREE.InstancedMesh(mesaGeo, new THREE.MeshStandardMaterial({color:'#8ea69b',roughness:1,flatShading:true}), 66);
    this.islandTops = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.02,1.05,.13,7),new THREE.MeshStandardMaterial({color:'#83b595',roughness:1,flatShading:true}),66);
    this.islands.frustumCulled=this.islandTops.frustumCulled=false;
    this.forest.add(this.islands,this.islandTops);
    const parts=[];
    for(let layer=0;layer<3;layer++){
      const g=new THREE.ConeGeometry(1.25-layer*.25,2.4-layer*.3,7).translate(0,1.8+layer*.95,0);
      const color=new THREE.Color(['#397869','#4c9678','#70b28a'][layer]);
      const colors=[];for(let i=0;i<g.attributes.position.count;i++)colors.push(color.r,color.g,color.b);
      g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(g);
    }
    const trunk=new THREE.CylinderGeometry(.15,.22,1.8,6).translate(0,.8,0);const color=new THREE.Color('#785f4c');const colors=[];for(let i=0;i<trunk.attributes.position.count;i++)colors.push(color.r,color.g,color.b);trunk.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(trunk);
    this.trees=new THREE.InstancedMesh(mergeGeometries(parts),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}),198);parts.forEach(g=>g.dispose());this.trees.frustumCulled=false;this.forest.add(this.trees);
    // Broad, low-poly cloud banks help sell the miniature sky-island world.
    this.clouds=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:'#e4efdc',fog:true}),36);this.clouds.frustumCulled=false;this.forest.add(this.clouds);
    this.color=new THREE.Color();
    for(let i=0;i<96;i++){this.color.setHSL(.065+randomAt(51,i)*.035,.3+randomAt(61,i)*.2,.42+randomAt(71,i)*.2);this.rocks.setColorAt(i,this.color);}
  }
  setTheme(key){this.dunes.visible=key==='dunes';this.forest.visible=key==='forest';}
  place(mesh,i,x,y,z,sx,sy,sz,rotation=0){this.dummy.position.set(x,y,z);this.dummy.scale.set(sx,sy,sz);this.dummy.rotation.set(0,rotation,0);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);}
  update(distance){
    if(this.dunes.visible){for(let i=0;i<96;i++){
      const side=i%2?-1:1,row=Math.floor(i/32),j=Math.floor(i%32/2);
      const z=sceneryZ(j*31+row*9,distance);const at=distance-z;
      const height=10+randomAt(29,i)*25;const width=5+randomAt(13,i)*8;
      this.place(this.rocks,i,centerAt(at)+side*(15+row*21+randomAt(9,i)*5),height*.38-14,z,width,height,6+randomAt(17,i)*8,randomAt(4,i)*3);
    }this.rocks.instanceMatrix.needsUpdate=true;}
    if(this.forest.visible){for(let i=0;i<66;i++){
      const side=i%2?-1:1,j=Math.floor(i/2);const z=sceneryZ(j*15.3,distance);const at=distance-z;
      const x=centerAt(at)+side*(13+randomAt(10,i)*20),top=-3+randomAt(12,i)*8,width=3+randomAt(7,i)*5;
      this.place(this.islands,i,x,top-7,z,width,14,width*.75,i);
      this.place(this.islandTops,i,x,top,z,width,2,width*.75,i);
      for(let k=0;k<3;k++){const size=1.3+randomAt(90,i*3+k)*1.8;this.place(this.trees,i*3+k,x+(k-1)*width*.5,top+.1,z+(k%2)*2,size,size,size,i*.2+k);}
    }
    for(let i=0;i<36;i++){const z=sceneryZ(i*14,distance*.8);this.place(this.clouds,i,centerAt(distance-z)+(i%2?-1:1)*(15+randomAt(22,i)*55),-17-randomAt(5,i)*10,z,9+randomAt(15,i)*12,3,6+randomAt(2,i)*8);}
    for(const mesh of [this.islands,this.islandTops,this.trees,this.clouds])mesh.instanceMatrix.needsUpdate=true;
    }
  }
}
