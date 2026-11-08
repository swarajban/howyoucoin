import * as THREE from 'three';
import { Obstacles } from './obstacles.js';
import { StarPower } from './power.js';
import { ExoticWorlds } from './exotic-worlds.js';
import { Landscape } from './landscape.js';
import { themeFor } from './themes.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CHUNK, HALF_WIDTH, RADIUS, centerAt, obstaclesAt, randomAt, sceneryZ } from './core.js';
const V = THREE.Vector3;
const basic = (color, extra={}) => new THREE.MeshBasicMaterial({color,...extra});
const glowColor = hex => new THREE.Color(hex).multiplyScalar(1.7);
export class World {
  constructor(canvas, settings) {
    this.settings=settings; this.time=0; this.chunks=new Map();this.particles=[];this.trail=[];this.shake=0;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.info.autoReset=false;this.renderer.setClearColor(0x070a1c);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x101932,.008);
    this.camera=new THREE.PerspectiveCamera(63,1,.1,650);

    this.hemi=new THREE.HemisphereLight(0xc0d8ff,0x30264c,2.1);this.scene.add(this.hemi);
    const light=this.keyLight=new THREE.DirectionalLight(0xccddff,3.5);light.position.set(-10,14,8);this.scene.add(light);
    const rim=this.rimLight=new THREE.DirectionalLight(0xb559ff,4);rim.position.set(8,5,-14);this.scene.add(rim);
    this.makeSky(); this.makeCity(); this.landscape=new Landscape(this.scene);this.exotic=new ExoticWorlds(this.scene);this.power=new StarPower(this.scene);this.obstacles=new Obstacles(); this.makeBall();this.makeParticles();
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.48,.6,.9);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.floorMat=new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color('#10294e')},fogColor:{value:new THREE.Color('#101932')},kind:{value:0},time:{value:0}},vertexShader:`varying vec2 vUv; varying float dep; void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);dep=-p.z;gl_Position=projectionMatrix*p;}`,fragmentShader:`
      varying vec2 vUv;varying float dep;uniform vec3 color;uniform vec3 fogColor;uniform float kind;uniform float time;
      void main(){
        vec2 grid=abs(fract(vUv/vec2(3.2,3.)-.5)-.5)/fwidth(vUv/vec2(3.2,3.));
        float line=1.-min(min(grid.x,grid.y),1.);float center=exp(-abs(vUv.x)*.7);
        vec3 col=color+vec3(.055,.17,.3)*line+vec3(.015,.03,.055)*center;
        if(kind>.5){
          float grain=sin(vUv.x*35.+sin(vUv.y*1.3))*sin(vUv.y*28.)*.022;
          float seam=smoothstep(.96,1.,fract(vUv.y/(kind>1.5?1.1:4.)));
          float joint=kind>1.5?0.:smoothstep(.985,1.,fract((vUv.x+floor(vUv.y/4.)*2.)/4.8));
          col=color*(1.+grain-.2*seam-.14*joint);
          if(kind>1.5)col+=vec3(.025,.035,.005)*sin(vUv.x*4.+sin(vUv.y*.3));
          col+=vec3(.06,.04,.015)*smoothstep(4.35,4.5,abs(vUv.x));
        }
        if(kind>2.5&&kind<3.5){
          float hue=(vUv.x+4.8)/9.6*.82+vUv.y*.0015;
          vec3 rainbow=.5+.5*cos(6.28318*(hue+vec3(0.,.33,.67)));
          vec2 tile=abs(fract(vUv/vec2(1.2,2.)-.5)-.5)/fwidth(vUv/vec2(1.2,2.));
          float seam=1.-min(min(tile.x,tile.y),1.);col=rainbow*.58+vec3(.055,.045,.1)+rainbow*seam*.8;
          col+=vec3(.2)*pow(max(0.,sin(vUv.y*.09+vUv.x*.4)),14.);
        }
        if(kind>3.5){float caustic=pow(.5+.5*sin(vUv.x*1.8+sin(vUv.y*.7+time*.25))*sin(vUv.y*.9+vUv.x*.8),6.);col=color*.7+vec3(.04,.35,.29)*caustic;}
        float fog=1.-exp(-(kind>2.5?.000018:.000064)*dep*dep);gl_FragColor=vec4(mix(col,fogColor,fog),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.edgeMat=basic(glowColor('#5acbff'));this.gapMat=basic(glowColor('#ff6699'));
    this.blockMat=new THREE.MeshStandardMaterial({color:0x812789,emissive:0xb42378,emissiveIntensity:.35,metalness:.45,roughness:.24});
    this.blockEdgeMat=new THREE.LineBasicMaterial({color:glowColor('#ff71b8')});this.makeCoinMaterial();
    this.boxGeo=new THREE.BoxGeometry(1,1,1);this.coinGeo=new THREE.CylinderGeometry(.38,.38,.105,28).rotateX(Math.PI/2);
    this.makeReflections();this.setTheme(settings.theme);this.resize();
  }
  activateStar(){this.power.activate();this.shake=.08;}
  smash(chunk,index,obstacle){const rendered=this.chunks.get(chunk.index);if(rendered)rendered.objects[index].visible=false;this.power.smash(centerAt(chunk.hazard)+obstacle.x,obstacle.height/2,rendered?.group.position.z-(chunk.hazard-chunk.start)||0,obstacle.width,obstacle.height);this.shake=.13;this.burst(centerAt(chunk.hazard)+obstacle.x,obstacle.height/2,0,20);}
  makeCoinMaterial(){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle='#d6a532';ctx.fillRect(0,0,256,256);
    const gold=ctx.createRadialGradient(85,60,4,128,128,130);gold.addColorStop(0,'#fff2b0');gold.addColorStop(.55,'#f2cc65');gold.addColorStop(1,'#b87b1b');ctx.fillStyle=gold;ctx.beginPath();ctx.arc(128,128,123,0,Math.PI*2);ctx.fill();
    for(const [radius,width,color] of [[112,5,'#fff1a2'],[100,3,'#ad781a']]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(128,128,radius,0,Math.PI*2);ctx.stroke();}
    ctx.font='bold 142px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#a86f16';ctx.fillText('¢',130,132);ctx.fillStyle='#fff0a0';ctx.fillText('¢',126,128);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;this.coinMat=new THREE.MeshStandardMaterial({map:texture,metalness:.68,roughness:.25,emissive:0x8c4f04,emissiveIntensity:.12});
  }
  makeReflections(){
    // A low-resolution local environment includes the same moving scenery, while
    // omitting small coins/particles to keep six cube faces inexpensive on iPad.
    this.reflectionScene=new THREE.Scene();this.reflectionScene.fog=this.scene.fog;
    this.reflectionSky=this.sky.clone();this.reflectionScene.add(this.reflectionSky);
    this.reflectionHemi=this.hemi.clone();this.reflectionKey=this.keyLight.clone();this.reflectionScene.add(this.reflectionHemi,this.reflectionKey);
    this.reflectionCopies=[];
    for(const mesh of [this.city,this.landscape.rocks,this.landscape.islands,this.landscape.islandTops,this.landscape.trees,this.exotic.asteroids,this.exotic.corals]){
      const proxy=new THREE.InstancedMesh(mesh.geometry,mesh.material,mesh.count);proxy.instanceMatrix=mesh.instanceMatrix;proxy.instanceColor=mesh.instanceColor;proxy.frustumCulled=false;this.reflectionScene.add(proxy);this.reflectionCopies.push({source:mesh,proxy});
    }
    this.reflectionRoad=new THREE.Mesh(new THREE.PlaneGeometry(HALF_WIDTH*2,180),new THREE.MeshStandardMaterial({color:'#925f42',roughness:.8}));this.reflectionRoad.rotation.x=-Math.PI/2;this.reflectionRoad.position.z=-30;this.reflectionScene.add(this.reflectionRoad);
    this.reflectionTarget=new THREE.WebGLCubeRenderTarget(64,{type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
    this.reflectionCamera=new THREE.CubeCamera(.1,240,this.reflectionTarget);this.reflectionElapsed=1;this.reflectionUpdates=0;this.scene.environment=this.reflectionTarget.texture;
  }
  setTheme(key){
    const theme=themeFor(key);this.themeKey=['dunes','forest','neon','orbit','abyss'].includes(key)?key:'dunes';this.theme=theme;
    this.city.visible=this.themeKey==='neon';this.landscape.setTheme(this.themeKey);this.exotic.setTheme(this.themeKey);this.obstacles.setTheme(theme);
    this.sky.material.uniforms.kind.value=theme.kind;this.sky.material.uniforms.top.value.set(theme.skyTop);this.sky.material.uniforms.horizon.value.set(theme.horizon);
    this.scene.fog.color.set(theme.fog);this.scene.fog.density=theme.kind>=3?.004:.008;this.renderer.setClearColor(theme.fog);this.renderer.toneMappingExposure=theme.exposure;
    this.floorMat.uniforms.color.value.set(theme.road);this.floorMat.uniforms.fogColor.value.set(theme.fog);this.floorMat.uniforms.kind.value=theme.kind;
    this.edgeMat.color.set(theme.edge).multiplyScalar(theme.kind===0?1.7:1);
    this.gapMat.color.set(theme.kind===0?'#ff6699':'#f7cf79');
    this.blockMat.color.set(theme.block);this.blockMat.emissive.set(theme.blockGlow);this.blockMat.emissiveIntensity=theme.kind===0?.35:.05;this.blockMat.roughness=theme.kind===0?.24:.7;
    this.blockEdgeMat.color.set(theme.kind===0?'#ff71b8':'#f6c28e');
    this.hemi.color.set(theme.hemisphere);this.hemi.groundColor.set(theme.ground);this.hemi.intensity=theme.kind===0?2.1:2.7;
    this.keyLight.color.set(theme.key);this.keyLight.intensity=theme.kind===0?3.5:2.5;this.rimLight.color.set(theme.rim);this.rimLight.intensity=theme.kind===0?4:1.4;
    this.halo.material.color.set(theme.sun);this.halo.material.opacity=theme.kind===0?1:theme.kind===3?.75:theme.kind===4?.15:.35;
    this.sunDisk.visible=theme.kind!==0;this.sunDisk.material.color.set(theme.sun);this.sun.children[0].visible=this.sun.children[1].visible=theme.kind===0;
    this.stars.visible=theme.kind===0||theme.kind===3;this.stars.material.opacity=theme.kind===3?1:.7;this.stars.material.size=theme.kind===3?.32:.18;this.sun.visible=theme.kind<3;this.bloom.strength=theme.bloom;
    this.ball.material.color.set('#ffffff');this.ball.material.emissive.set(theme.marbleGlow);this.ball.material.roughness=theme.kind===0?.17:.2;
    this.marbleTextures??={neon:this.marbleTexture};
    if(!this.marbleTextures[this.themeKey]){
      const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');const pixels=ctx.createImageData(512,256);
      const palettes=theme.kind===1?[[224,143,55],[253,239,198]]:theme.kind===3?[[106,70,206],[230,208,255]]:theme.kind===4?[[28,124,167],[175,255,236]]:[[42,128,123],[192,239,215]];const [a,b]=palettes;
      for(let y=0;y<256;y++)for(let x=0;x<512;x++){
        const u=x/512*Math.PI*2,v=y/256*Math.PI;const wave=Math.sin(u*3+v*5+Math.sin(v*6+Math.cos(u*2)*1.3)*1.5);
        const blend=Math.pow((wave+1)*.5,4);const i=(y*512+x)*4;for(let k=0;k<3;k++)pixels.data[i+k]=a[k]+(b[k]-a[k])*blend;pixels.data[i+3]=255;
      }ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;this.marbleTextures[this.themeKey]=texture;
    }
    this.ball.material.map=this.ball.material.bumpMap=this.marbleTextures[this.themeKey];this.ball.material.needsUpdate=true;
    this.reflectionHemi.color.copy(this.hemi.color);this.reflectionHemi.groundColor.copy(this.hemi.groundColor);this.reflectionHemi.intensity=this.hemi.intensity;
    this.reflectionKey.color.copy(this.keyLight.color);this.reflectionKey.intensity=this.keyLight.intensity;this.reflectionRoad.material.color.set(theme.road);this.reflectionElapsed=1;
    this.sparks.material.color.set('#ffdb79');
  }
  updateReflections(x,y,dt){
    this.reflectionElapsed+=dt;if(this.reflectionElapsed<.12)return;
    this.reflectionElapsed=0;this.reflectionSky.position.x=x;this.reflectionRoad.position.x=x;
    for(const {source,proxy} of this.reflectionCopies)proxy.visible=source===this.city?this.city.visible:source.parent.visible;
    this.reflectionCamera.position.set(x,Math.max(.25,y),0);this.reflectionCamera.update(this.renderer,this.reflectionScene);this.reflectionUpdates++;
  }
  diagnostics(){
    const m=new THREE.Matrix4();this.city.getMatrixAt(10,m);
    return {theme:this.themeKey,buildingPosition:new THREE.Vector3().setFromMatrixPosition(m).toArray(),reflectionUpdates:this.reflectionUpdates,marbleQuaternion:this.ball.quaternion.toArray(),visibleLandscape:this.themeKey,starAura:this.power.aura.visible,activeDebris:this.power.debris.length,obstacleModels:this.obstacles.cache.size};
  }

  makeSky(){
    const sky=new THREE.Mesh(new THREE.SphereGeometry(500,24,16),new THREE.ShaderMaterial({uniforms:{top:{value:new THREE.Color('#040611')},horizon:{value:new THREE.Color('#130a26')},kind:{value:0}},side:THREE.BackSide,depthWrite:false,vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;uniform vec3 top;uniform vec3 horizon;uniform float kind;void main(){float h=normalize(p).y;vec3 c=mix(horizon,top,smoothstep(-.05,.5,h));
    if(kind>2.5&&kind<3.5){vec3 q=normalize(p);float nebula=pow(max(0.,sin(q.x*4.+q.y*9.+sin(q.z*8.))*.5+.5),6.);c+=vec3(.07,.012,.13)*nebula;}
    if(kind>3.5){float ray=pow(max(0.,sin(normalize(p).x*28.+normalize(p).z*6.)),16.)*max(0.,h);c+=vec3(.01,.08,.075)*ray;}gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`}));this.scene.add(sky);this.sky=sky;
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const gr=ctx.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,.65)');gr.addColorStop(.35,'rgba(255,255,255,.2)');gr.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,128,128);
    this.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));this.halo.scale.set(160,160,1);this.halo.position.set(10,30,-260);this.scene.add(this.halo);
    this.sun=new THREE.Group();const ring=new THREE.Mesh(new THREE.RingGeometry(19.7,20,100),basic('#9757dd',{side:THREE.DoubleSide,transparent:true,opacity:.6,fog:false}));this.sun.add(ring);const r2=new THREE.Mesh(new THREE.RingGeometry(21.5,21.55,100),basic('#8e65bd',{side:THREE.DoubleSide,transparent:true,opacity:.2,fog:false}));this.sun.add(r2);this.sun.position.set(10,30,-259);this.scene.add(this.sun);this.sunDisk=new THREE.Mesh(new THREE.CircleGeometry(17,64),basic('#ffe8b3',{fog:false}));this.sun.add(this.sunDisk);
    const pos=[];for(let i=0;i<450;i++){pos.push((Math.random()-.5)*650,Math.random()*140+14,-Math.random()*430-40);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));this.stars=new THREE.Points(geo,new THREE.PointsMaterial({color:0x919bcf,size:.18,transparent:true,opacity:.7,sizeAttenuation:true,fog:false}));this.scene.add(this.stars);
  }
  makeCity(){
    const mat=new THREE.ShaderMaterial({uniforms:{fogColor:{value:new THREE.Color('#101932')}},vertexShader:`varying vec3 wp;varying vec3 norm;varying float dep;void main(){vec4 p=instanceMatrix*vec4(position,1.);wp=vec3(position.x*length(instanceMatrix[0].xyz),position.y*length(instanceMatrix[1].xyz),position.z*length(instanceMatrix[2].xyz));norm=normal;vec4 mv=modelViewMatrix*p;dep=-mv.z;gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec3 wp;varying vec3 norm;varying float dep;uniform vec3 fogColor;void main(){vec2 uv=abs(norm.y)>.5?wp.xz:(abs(norm.x)>.5?wp.zy:wp.xy);uv/=3.2;vec2 grid=abs(fract(uv-.5)-.5)/max(fwidth(uv),vec2(.003));float line=1.-min(min(grid.x,grid.y),1.);float fade=.7+.3*sin(wp.y*.032);vec3 base=vec3(.018,.035,.085);vec3 col=base+vec3(.09,.23,.48)*line*fade;col+=vec3(.016,.018,.038)*max(norm.y,0.);float fog=1.-exp(-.000045*dep*dep);gl_FragColor=vec4(mix(col,fogColor,fog),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
    this.city=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,132);this.city.frustumCulled=false;this.scene.add(this.city);this.dummy=new THREE.Object3D();
    this.buildings=Array.from({length:132},(_,i)=>{const side=i%2===0?-1:1;const row=Math.floor(i/44);const j=Math.floor(i%44/2);return {side,row,z:j*23+row*7,width:6+randomAt(71,i)*7,depth:9+randomAt(41,i)*6,height:15+randomAt(31,i)*58};});
  }
  makeBall(){
    const c=document.createElement('canvas');c.width=512;c.height=256;const cx=c.getContext('2d');const pixels=cx.createImageData(512,256);for(let y=0;y<256;y++)for(let x=0;x<512;x++){const u=x/512*Math.PI*2,v=y/256*Math.PI;const f=Math.sin(u*4+Math.sin(v*7+Math.cos(u*3)*1.8)*1.5+v*5);const vein=Math.pow(Math.max(0,Math.sin(f*3+v*4+u)),12);const idx=(y*512+x)*4;pixels.data[idx]=94+f*24+vein*55;pixels.data[idx+1]=25+vein*35;pixels.data[idx+2]=158+f*25+vein*55;pixels.data[idx+3]=255;}cx.putImageData(pixels,0,0);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    this.marbleTexture=tex;this.ball=new THREE.Mesh(new THREE.SphereGeometry(RADIUS,64,40),new THREE.MeshPhysicalMaterial({map:tex,bumpMap:tex,bumpScale:.014,color:0xe8c9ff,metalness:.25,roughness:.17,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.2,emissive:0x460c73,emissiveIntensity:.055}));this.scene.add(this.ball);
    const glow=document.createElement('canvas');glow.width=glow.height=128;const gc=glow.getContext('2d');const g=gc.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(177,65,255,.6)');g.addColorStop(.3,'rgba(141,49,255,.25)');g.addColorStop(1,'rgba(98,33,255,0)');gc.fillStyle=g;gc.fillRect(0,0,128,128);this.glowTexture=new THREE.CanvasTexture(glow);
    this.ballGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.55}));this.ballGlow.scale.set(2.8,2.8,1);this.scene.add(this.ballGlow);
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');const sg=sc.createRadialGradient(64,64,0,64,64,64);sg.addColorStop(0,'rgba(0,0,0,.75)');sg.addColorStop(.35,'rgba(0,0,0,.35)');sg.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);
    this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),basic(0x15101e,{map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.025;this.scene.add(this.shadow);
    this.trailGeo=new THREE.BufferGeometry();this.trailGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36*6*3),3));this.trailGeo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(36*6*2),2));this.trailMesh=new THREE.Mesh(this.trailGeo,new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,uniforms:{time:{value:0},powered:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float time;uniform float powered;void main(){vec3 rainbow=.55+.45*cos(6.28318*(vec3(0.,.33,.67)+time*.15+vUv.y*.9));vec3 c=mix(vec3(.43,.16,1.),rainbow*1.4,powered);float a=(1.-vUv.y)*smoothstep(0.,.25,vUv.x)*(1.-smoothstep(.75,1.,vUv.x));gl_FragColor=vec4(c,a*mix(.22,.65,powered));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`}));this.trailMesh.frustumCulled=false;this.scene.add(this.trailMesh);
  }
  makeParticles(){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(100*3),3));this.sparks=new THREE.Points(g,new THREE.PointsMaterial({color:0xaaffdf,size:.1,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));this.sparks.frustumCulled=false;this.scene.add(this.sparks);
  }
  burst(x,y,z,count=14){for(let i=0;i<count;i++)this.particles.push({x,y,z,vx:(Math.random()-.5)*6,vy:Math.random()*5,vz:(Math.random()-.5)*6,life:.6+Math.random()*.4});this.particles=this.particles.slice(-100);}
  ribbon(start,end,x1,x2,y,material){
    const positions=[],uvs=[],indices=[];const n=Math.max(1,Math.ceil((end-start)/3));for(let i=0;i<=n;i++){const d=start+(end-start)*i/n;const cx=centerAt(d);positions.push(cx+x1,y,-(d-start),cx+x2,y,-(d-start));uvs.push(x1,d,x2,d);if(i<n){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);return mesh;
  }
  addChunk(data){
    const group=new THREE.Group();const {start,type,hazard}=data;const ranges=type==='gap'?[[start,data.gapStart],[data.gapEnd,start+CHUNK]]:[[start,start+CHUNK]];
    for(const [a,b] of ranges){const floor=this.ribbon(a,b,-HALF_WIDTH,HALF_WIDTH,0,this.floorMat);floor.position.z=-(a-start);group.add(floor);for(const side of [-1,1]){const e=this.ribbon(a,b,side*HALF_WIDTH-.025,side*HALF_WIDTH+.025,.028,this.edgeMat);e.position.z=-(a-start);group.add(e);const sidewall=this.ribbon(a,b,side*HALF_WIDTH-.08,side*HALF_WIDTH+.08,-.18,this.edgeMat);sidewall.position.z=-(a-start);group.add(sidewall);} }
    if(type==='gap'){for(const at of [data.gapStart,data.gapEnd]){const line=new THREE.Mesh(this.boxGeo,this.gapMat);line.scale.set(HALF_WIDTH*2,.05,.12);line.position.set(centerAt(at),.03,-(at-start));group.add(line);}for(let k=0;k<3;k++){const mark=this.ribbon(data.gapStart-5+k*1.4,data.gapStart-4.8+k*1.4,-1,1,.02,this.gapMat);mark.position.z=-(data.gapStart-5+k*1.4-start);group.add(mark);}}
    const objects=[];for(const ob of obstaclesAt(data)){const m=this.obstacles.model(type,ob.width,ob.height);m.position.set(centerAt(hazard)+ob.x,ob.height/2,-(hazard-start));group.add(m);objects.push(m);}
    const coins=[];for(let i=0;i<5;i++){const at=start+6+i*6;let lane=0;if(type==='block')lane=data.lane===0?-1:0;if(type==='double')lane=data.lane;if(type==='moving')lane=-1;const coin=new THREE.Mesh(this.coinGeo,this.coinMat);coin.position.set(centerAt(at)+lane*3.05,type==='gap'&&at>data.gapStart-2&&at<data.gapEnd+2?2.3:1,-(at-start));group.add(coin);coins.push({mesh:coin,at,lane,index:i});}
    if(type==='boost'){
      const portalMat=basic(glowColor('#59ffc7'));const portal=new THREE.Group();portal.position.set(centerAt(hazard),0,-(hazard-start));for(const side of [-1,1]){const column=new THREE.Mesh(this.boxGeo,portalMat);column.scale.set(.09,5,.13);column.position.set(side*4.5,2.5,0);portal.add(column);}const top=new THREE.Mesh(this.boxGeo,portalMat);top.scale.set(9,.1,.15);top.position.y=5;portal.add(top);group.add(portal);
      for(let i=0;i<6;i++){const d=hazard-7+i*1.8;const chevron=new THREE.Group();for(const side of [-1,1]){const bar=new THREE.Mesh(this.boxGeo,portalMat);bar.scale.set(1.5,.035,.1);bar.rotation.y=side*.48;bar.position.set(side*.65,0,side===-1?0:0);chevron.add(bar);}chevron.position.set(centerAt(d),.04,-(d-start));group.add(chevron);}
    }
    this.scene.add(group);this.chunks.set(data.index,{group,data,objects,coins});
  }
  removeChunk(index){const c=this.chunks.get(index);if(!c)return;c.group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared&&o.geometry!==this.boxGeo&&o.geometry!==this.coinGeo)o.geometry.dispose();});this.scene.remove(c.group);this.chunks.delete(index);}
  clear(){for(const index of [...this.chunks.keys()])this.removeChunk(index);this.trail=[];this.particles=[];this.shake=0;this.reflectionElapsed=1;this.power.clear();}
  resize(){const w=innerWidth,h=innerHeight;this.pixelRatio=Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.5:1.75);this.renderer.setPixelRatio(this.pixelRatio);this.renderer.setSize(w,h,false);this.composer.setPixelRatio(this.pixelRatio);this.composer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  update(s,dt){
    this.renderer.info.reset();
    const {distance:d,x,y,speed,mode}=s;this.time+=dt;const t=this.time;const cx=centerAt(d);const isHome=mode==='home';
    for(const c of this.chunks.values()){c.group.position.z=d-c.data.start;const obs=obstaclesAt(c.data,s.elapsed);c.objects.forEach((m,i)=>{m.position.x=centerAt(c.data.hazard)+obs[i].x;m.visible=!c.data.destroyed.has(i);});c.coins.forEach(g=>{g.mesh.visible=!c.data.collected.has(g.index);g.mesh.rotation.y=t*1.5+g.index;g.mesh.position.y=(c.data.type==='gap'&&g.at>c.data.gapStart-2&&g.at<c.data.gapEnd+2?2.3:1)+Math.sin(t*2+g.index)*.12;});}
    for(let i=0;i<this.buildings.length;i++){const b=this.buildings[i];const z=sceneryZ(b.z,d);const actual=d-z;const xpos=centerAt(actual)+b.side*(14+b.row*18+randomAt(111,i)*5);this.dummy.position.set(xpos,b.height/2-27,z);this.dummy.scale.set(b.width,b.height,b.depth);this.dummy.updateMatrix();this.city.setMatrixAt(i,this.dummy.matrix);}this.city.instanceMatrix.needsUpdate=true;this.landscape.update(d);this.exotic.update(d,t);this.floorMat.uniforms.time.value=t;
    this.sky.position.z=0;this.sky.position.x=cx;this.halo.position.x=cx+14;this.sun.position.x=cx+14;
    const bx=cx+x;this.ball.position.set(bx,y,0);this.ball.visible=mode!=='dead'||y>-6;
    if(mode==='running'||isHome){const axis=new V(-speed,0,-s.vx).normalize();this.ball.rotateOnWorldAxis(axis,Math.hypot(speed,s.vx)*dt/RADIUS);}
    this.ballGlow.position.copy(this.ball.position);this.ballGlow.material.opacity=this.ball.visible&&this.themeKey==='neon'?.25:0;this.shadow.position.x=bx;this.shadow.scale.setScalar(1+Math.max(0,y-RADIUS)*.25);this.shadow.material.opacity=Math.max(0,.85-(y-RADIUS)*.18);this.shadow.visible=y>=RADIUS;this.trailMesh.visible=this.themeKey==='neon'||this.themeKey==='orbit'||s.star>0;this.trailMesh.material.uniforms.time.value=t;this.trailMesh.material.uniforms.powered.value=s.star>0?1:0;
    if(mode==='running'||isHome){this.trail.unshift({x:bx,y:y-.15,d});if(this.trail.length>35)this.trail.pop();}const ta=this.trailGeo.attributes.position;const tu=this.trailGeo.attributes.uv;ta.array.fill(0);let k=0;for(let i=0;i<this.trail.length-1;i++){const a=this.trail[i],b=this.trail[i+1],wa=(s.star>0?.48:.22)*(1-i/35),wb=(s.star>0?.48:.22)*(1-(i+1)/35);for(const v of [[a.x-wa,a.y,d-a.d],[a.x+wa,a.y,d-a.d],[b.x-wb,b.y,d-b.d],[a.x+wa,a.y,d-a.d],[b.x+wb,b.y,d-b.d],[b.x-wb,b.y,d-b.d]]){ta.array.set(v,k);k+=3;}tu.array.set([0,i/35,1,i/35,0,(i+1)/35,1,i/35,1,(i+1)/35,0,(i+1)/35],i*12);}ta.needsUpdate=true;tu.needsUpdate=true;this.trailGeo.setDrawRange(0,k/3);
    const pa=this.sparks.geometry.attributes.position;pa.array.fill(0);this.particles=this.particles.filter(p=>p.life>0);this.particles.forEach((p,i)=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=(p.vz+speed)*dt;p.vy-=8*dt;pa.array.set([p.x,p.y,p.z],i*3);});pa.needsUpdate=true;this.sparks.geometry.setDrawRange(0,this.particles.length);
    const portrait=this.camera.aspect<.8;const menuOffset=isHome?(portrait?1.2:3.1):0;const desiredX=cx+x*(isHome?.6:.4)-menuOffset;const desiredY=isHome?4.5:4.2+Math.max(0,y-RADIUS)*.2;const desiredZ=isHome?(portrait?10.5:9):8.2;
    const lerp=1-Math.exp(-dt*5);this.camera.position.x=THREE.MathUtils.lerp(this.camera.position.x,desiredX,lerp);this.camera.position.y=THREE.MathUtils.lerp(this.camera.position.y,desiredY,lerp);this.camera.position.z=THREE.MathUtils.lerp(this.camera.position.z,desiredZ,lerp);
    if(this.shake>0&&!this.settings.motion){this.camera.position.x+=(Math.random()-.5)*this.shake;this.camera.position.y+=(Math.random()-.5)*this.shake;this.shake*=Math.exp(-dt*9);}
    this.camera.lookAt(cx+x*.23-menuOffset*.6,1.1,-20);if(!this.settings.motion&&!isHome)this.camera.rotateZ(-s.vx*.006);
    const fov=63+(s.star>0&&!this.settings.motion?4:0)+(s.boost>0?7:0)+(speed-18)*.18;this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,lerp);this.camera.updateProjectionMatrix();
    if(s.star<=0){this.ball.material.emissive.set(this.theme.marbleGlow);this.ball.material.emissiveIntensity=.055;}this.power.update(s,this.ball,dt,this.settings.motion);this.bloom.strength=this.theme.bloom+(s.star>0?.32*Math.min(1,s.star):0);
    this.updateReflections(bx,y,dt);
    if(this.settings.glow){this.composer.render();}else{this.renderer.render(this.scene,this.camera);}
  }
}
