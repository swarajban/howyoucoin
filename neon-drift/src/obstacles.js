import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const shared = geometry => { geometry.userData.shared=true; return geometry; };
export class Obstacles {
  constructor(){
    this.cache=new Map();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');const image=ctx.createImageData(128,128);
    for(let i=0;i<image.data.length;i+=4){const value=165+Math.random()*45;image.data[i]=image.data[i+1]=image.data[i+2]=value;image.data[i+3]=255;}ctx.putImageData(image,0,0);const grain=new THREE.CanvasTexture(canvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(3,3);
    this.shell=new THREE.MeshPhysicalMaterial({color:'#586f8a',metalness:.62,roughness:.34,roughnessMap:grain,bumpMap:grain,bumpScale:.008,clearcoat:.45,clearcoatRoughness:.25});
    this.metal=new THREE.MeshStandardMaterial({color:'#b5c1cb',metalness:.85,roughness:.24});
    this.dark=new THREE.MeshStandardMaterial({color:'#15202b',metalness:.5,roughness:.43});
    this.light=new THREE.MeshStandardMaterial({color:'#ffd9aa',emissive:'#ff8642',emissiveIntensity:2,metalness:.15,roughness:.2});
    this.energy=new THREE.MeshPhysicalMaterial({color:'#ff9fcb',emissive:'#f34484',emissiveIntensity:1.7,metalness:.3,roughness:.18,clearcoat:1});
    this.shadowMaterial=new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:.17,depthWrite:false});
  }
  setTheme(theme){this.shell.color.set(theme.block);this.light.emissive.set(theme.kind===3?'#70d9ff':theme.kind===4?'#6bffd6':'#ff944f');this.energy.emissive.set(theme.kind===4?'#4fffd5':'#ff4d9d');}
  model(type,width,height){
    const key=`${type}:${width}:${height}`;if(this.cache.has(key))return this.cache.get(key).clone(true);
    const group=new THREE.Group();const metal=[],dark=[],lights=[];
    const box=(w,h,d,x,y,z)=>new THREE.BoxGeometry(w,h,d).translate(x,y,z);
    if(type==='beam'){
      // A luminous reactor bar between machined end caps, all inside its hitbox.
      const cylinder=new THREE.CylinderGeometry(.19,.19,width-.5,20).rotateZ(Math.PI/2);
      group.add(new THREE.Mesh(shared(cylinder),this.energy));
      for(const side of [-1,1]){metal.push(box(.28,height,1,side*(width/2-.16),0,0));dark.push(box(.34,.17,1.15,side*(width/2-.2),-height/2+.09,0));}
      dark.push(box(width-.55,.12,.4,0,-.29,0));
      for(let x=-width/2+.6;x<width/2-.5;x+=.75){metal.push(new THREE.TorusGeometry(.22,.025,5,14).rotateY(Math.PI/2).translate(x,0,0));}
    }else{
      const body=new THREE.Mesh(shared(new RoundedBoxGeometry(width-.08,height-.08,1.12,3,.13)),this.shell);group.add(body);
      // Corner guards, brushed-metal belt, recessed face and vent slits.
      for(const side of [-1,1]){
        metal.push(box(.13,height-.16,1.2,side*(width/2-.15),0,0));
        dark.push(box(.38,.12,1.18,side*(width/2-.3),-height/2+.06,0));
        for(const y of [-1,1]){const bolt=new THREE.CylinderGeometry(.055,.055,.045,8).rotateX(Math.PI/2).translate(side*(width/2-.15),y*(height/2-.18),.635);metal.push(bolt);}
      }
      metal.push(box(width-.2,.09,1.18,0,height/2-.15,0));
      dark.push(box(width*.55,height*.47,.05,0,.02,.58));
      for(let i=-1;i<=1;i++)lights.push(box(width*.37,.045,.06,0,i*.15+.03,.625));
      dark.push(box(width*.38,.07,.07,0,-height*.31,.59));
      if(type==='moving'){
        group.add(new THREE.Mesh(shared(new THREE.TorusGeometry(.37,.045,8,32).translate(0,0,.66)),this.light));
        metal.push(box(width*.65,.12,.65,0,height/2-.03,0));
      }
    }
    for(const [parts,material] of [[metal,this.metal],[dark,this.dark],[lights,this.light]])if(parts.length){const merged=shared(mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g)));group.add(new THREE.Mesh(merged,material));parts.forEach(g=>g.dispose());}
    const shadow=new THREE.Mesh(shared(new THREE.PlaneGeometry(width+ .3,1.65)),this.shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=-height/2+.015;group.add(shadow);
    this.cache.set(key,group);return group.clone(true);
  }
}
