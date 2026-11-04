import * as THREE from 'three';
import {smoother} from './runtime/motion.mjs';

const TAU = Math.PI * 2;

// A fixed topology keeps soft-body identities stable while seeking any frame.
function surface(rows, columns, fn) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((rows + 1) * (columns + 1) * 3), 3));
  const indices = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
    const a = r * (columns + 1) + c, b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  geometry.setIndex(indices);
  return {geometry, update(t) {
    const positions = geometry.attributes.position;
    for (let r = 0; r <= rows; r++) for (let c = 0; c <= columns; c++) {
      const v = fn(r / rows, c / columns, t);
      positions.setXYZ(r * (columns + 1) + c, v[0], v[1], v[2]);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  }};
}

function bellState(t) {
  const contraction = Math.pow(0.5 + 0.5 * Math.sin(TAU * t / 1.85 - 0.6), 2.5);
  return {radius:1.18 * (1 - 0.16 * contraction), height:0.76 + 0.2 * contraction, rim:0.11 + 0.1 * contraction, contraction};
}

function bellPoint(s, a, t) {
  const b = bellState(t), theta = s * Math.PI / 2;
  const fold = Math.cos(a * 16), radius = b.radius * Math.sin(theta) * (1 + 0.018 * fold * s ** 3);
  const y = b.rim + b.height * Math.pow(Math.max(0, Math.cos(theta)), 0.86) - 0.025 * (1 - fold) * s ** 4;
  return [radius * Math.cos(a), y, radius * Math.sin(a)];
}

function material(color, opacity, extra = {}) {
  return new THREE.MeshPhysicalMaterial({color, metalness:0, roughness:0.2, ior:1.34, clearcoat:0.35,
    transparent:true, opacity, depthWrite:false, side:THREE.DoubleSide, ...extra});
}

export async function createScene(config) {
  const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(config.supersample); renderer.setSize(config.width, config.height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04;
  document.querySelector('#stage').append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#020b16'); scene.fog = new THREE.FogExp2('#041322',0.028);
  const camera = new THREE.PerspectiveCamera(37,config.width/config.height,0.1,70);
  scene.add(new THREE.HemisphereLight('#a3dfff','#061324',1.8));
  const key = new THREE.DirectionalLight('#b3f5ff',3.2); key.position.set(-3,5,5); scene.add(key);
  const rim = new THREE.DirectionalLight('#4679d2',2.6); rim.position.set(3,1,-4); scene.add(rim);
  const pink = new THREE.PointLight('#c6a7e7',4.5,7); pink.position.set(1.2,-0.1,2); scene.add(pink);

  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60,40), new THREE.ShaderMaterial({
    depthWrite:false, uniforms:{},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv; void main(){vec3 c=mix(vec3(.003,.013,.029),vec3(.012,.062,.095),vUv.y); float glow=exp(-10.*length((vUv-vec2(.43,.75))*vec2(1.5,1.))); c+=vec3(.006,.04,.058)*glow;gl_FragColor=vec4(c,1.);}'
  }));
  backdrop.position.set(0,0,-15); scene.add(backdrop);

  const jelly = new THREE.Group(); jelly.position.set(1.0,0.1,0); scene.add(jelly);
  const animated = [];
  function add(s, mat, name) {
    const mesh = new THREE.Mesh(s.geometry,mat); mesh.name=name; jelly.add(mesh); animated.push(s); return mesh;
  }
  const shell = surface(44,128,(s,v,t)=>bellPoint(s,v*TAU,t));
  add(shell,material('#97e2eb',0.42,{transmission:0.16,thickness:0.18,emissive:'#1b4f68',emissiveIntensity:0.3}),'translucent-open-bell');
  const hem = surface(128,8,(s,v,t)=>{
    const a=s*TAU, p=bellPoint(1,a,t), q=v*TAU, thick=0.018;
    return [p[0]+Math.cos(a)*Math.cos(q)*thick,p[1]+Math.sin(q)*thick,p[2]+Math.sin(a)*Math.cos(q)*thick];
  });
  add(hem,material('#b3edf3',0.76,{emissive:'#3d8b9d',emissiveIntensity:0.5}),'scalloped-attached-margin');

  // Thin radial canals lie on the skin, following every bell contraction.
  for(let i=0;i<16;i++) {
    const canal = surface(32,5,(s,v,t)=>{
      const a=i*TAU/16, p=bellPoint(0.08+s*0.92,a,t), q=v*TAU, radius=0.006;
      return [p[0]+Math.cos(a)*Math.cos(q)*radius,p[1]+0.009+Math.sin(q)*radius,p[2]+Math.sin(a)*Math.cos(q)*radius];
    });
    add(canal,material('#9ad5ec',0.36,{emissive:'#316a8b',emissiveIntensity:0.35}),`radial-canal-${i}`);
  }

  // Four softly curled gonad loops remain visible through the outer membrane.
  for(let i=0;i<4;i++) {
    const a=i*TAU/4+0.4;
    const gonad = surface(64,8,(s,v,t)=>{
      const b=bellState(t), phi=s*TAU, tube=v*TAU, rr=0.19*(1-0.1*b.contraction);
      const x=Math.cos(a)*0.36+Math.cos(phi)*rr, z=Math.sin(a)*0.36+Math.sin(phi)*rr*0.78;
      return [x+Math.cos(phi)*Math.cos(tube)*0.025,0.39+Math.sin(phi*2)*0.025+Math.sin(tube)*0.025,z+Math.sin(phi)*Math.cos(tube)*0.025];
    });
    add(gonad,material('#c2a9d3',0.58,{emissive:'#57476d',emissiveIntensity:0.35}),`internal-gonad-${i}`);
  }

  // Fine marginal filaments taper and carry a travelling wave away from the rim.
  for(let i=0;i<24;i++) {
    const a=i*TAU/24, length=2.5+0.42*Math.sin(i*2.31), phase=i*0.77;
    const center=(s,t)=>{
      const p=bellPoint(1,a,t), fade=s**1.35;
      return [p[0]+0.24*s+0.20*fade*Math.sin(3.4*t-5.8*s+phase),
        p[1]-length*s+0.055*fade*Math.sin(3.4*t-5.8*s+phase+0.7),
        p[2]+0.19*fade*Math.cos(3.4*t-5.8*s+phase)];
    };
    const filament=surface(64,6,(s,v,t)=>{
      const p=center(s,t), q=v*TAU, thick=0.009*(1-0.77*s);
      return [p[0]+Math.cos(q)*thick,p[1],p[2]+Math.sin(q)*thick];
    });
    add(filament,material(i%3 ? '#9fdfe5':'#b9b2df',0.68,{emissive:'#245d79',emissiveIntensity:0.38}),`marginal-tentacle-${i}`);
  }

  // Oral arms are folded membranes, rather than rigid rods.
  for(let i=0;i<4;i++) {
    const a=i*TAU/4+0.4;
    const arm=surface(76,14,(s,v,t)=>{
      const phase=3.4*t-5*s+i*1.4, radial=0.12+0.24*s+0.10*s*Math.sin(phase);
      const width=(0.06+0.18*Math.sin(Math.PI*s)**0.65)*(2*v-1);
      const fold=0.08*Math.sin(s*45+(2*v-1)*4-phase)*Math.abs(2*v-1)**2*s;
      return [Math.cos(a)*radial-Math.sin(a)*width+0.11*s*s*Math.sin(phase),
        0.2-1.86*s+fold,
        Math.sin(a)*radial+Math.cos(a)*width+0.12*s*s*Math.cos(phase)];
    });
    add(arm,material(i%2 ? '#c0b3d8':'#a1dee0',0.5,{roughness:0.37,emissive:'#304e69',emissiveIntensity:0.32}),`folded-oral-arm-${i}`);
  }

  let seed=config.seed;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;};
  const seeds=Array.from({length:280},()=>[(random()-0.5)*17,(random()-0.5)*12,(random()-0.5)*15,random()]);
  const snowGeometry=new THREE.BufferGeometry();
  snowGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(seeds.length*3),3));
  const snow=new THREE.Points(snowGeometry,new THREE.PointsMaterial({color:'#7eacbd',size:0.016,transparent:true,opacity:0.3,depthWrite:false})); scene.add(snow);

  const copy=document.querySelector('#copy');
  copy.innerHTML='<h1>Hening.</h1><p>Tetap bergerak.</p>';
  return {
    update(t,u) {
      animated.forEach(s=>s.update(t));
      const contraction=bellState(t).contraction;
      jelly.position.set(1+0.06*Math.sin(t*0.7),0.1+0.08*Math.sin(TAU*t/1.85-1.1),0);
      jelly.rotation.set(0.035*Math.sin(t*0.5),0.15+0.03*Math.sin(t*0.65),-0.04+0.018*Math.sin(t*0.9));
      const ease=smoother(u);
      camera.position.set(0.08+0.24*ease,0.27+0.12*ease,8.6-1.0*ease);
      camera.lookAt(0.1,-0.88,0);
      const pos=snowGeometry.attributes.position;
      seeds.forEach(([x,y,z,speed],i)=>pos.setXYZ(i,x+0.025*Math.sin(t*0.4+i),y+t*(0.018+speed*0.025),z));
      pos.needsUpdate=true;
      copy.style.opacity=0.9+smoother(Math.min(1,u*3))*0.1;
      this.motionState={contraction,rimRadius:bellState(t).radius,tentaclePhase:t*3.4,seconds:t};
    },
    draw(){renderer.render(scene,camera);renderer.getContext().finish();},
    inspect(){
      let meshes=0;const invalid=[];
      scene.traverse(o=>{if(o.isMesh)meshes++;if(![...o.position,...o.scale,o.rotation.x,o.rotation.y,o.rotation.z].every(Number.isFinite))invalid.push(o.name||o.type);});
      return {meshes,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,invalid,camera:[...camera.position],subject:[...jelly.position],motion:this.motionState};
    }
  };
}
