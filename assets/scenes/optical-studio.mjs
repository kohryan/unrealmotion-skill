import * as THREE from 'three';
import {createStudio, box, mesh, metal, matte, createCopy} from './runtime/studio.mjs';
import {smoother, progress} from './runtime/motion.mjs';
import {microSurface, opticalCoating, labelTexture, contactShadow} from './runtime/surfaces.mjs';

export async function createScene(config) {
  const studio = createStudio(config, {radius: 10.7, target: [-0.45, 2.05, 0]});
  const {scene, group} = studio;
  const dark = matte('#192126', 0.48), rubber = matte('#0b1014', 0.8);
  const titanium = metal('#8e9da6', 0.24), blackMetal = metal('#263039', 0.32);
  const accent = metal('#bdcdbb', 0.27);
  dark.roughnessMap = microSurface(config.seed); dark.bumpMap = dark.roughnessMap; dark.bumpScale = 0.006;
  rubber.bumpMap = microSurface(config.seed + 1); rubber.bumpScale = 0.012;
  titanium.roughnessMap = microSurface(config.seed + 2, true);
  const pedestal = mesh(new THREE.CylinderGeometry(2.5, 2.6, 0.22, 128), matte('#1a242b', 0.42), scene, [0.7, 0.11, 0]);
  group.position.set(0.7, 0.22, 0);
  contactShadow(scene, {x:0.7,y:0.006,width:6.2,depth:5,opacity:0.38});
  contactShadow(group, {y:0.008,width:3.9,depth:1.7,opacity:0.7});
  for (const x of [-1.25, 1.25]) for (const z of [-0.3, 0.3]) box([0.36,0.14,0.24], rubber, group, [x,0.07,z],0.025);
  box([3.5, 2.12, 1.08], dark, group, [0, 1.2, 0], 0.16);
  box([0.8, 2.15, 1.48], rubber, group, [1.37, 1.2, 0.14], 0.18);
  box([3.28, 0.22, 1.03], titanium, group, [-0.02, 2.24, -0.01], 0.07);
  box([3.28, 0.16, 1.03], blackMetal, group, [-0.02, 0.17, -0.01], 0.05);
  box([0.8, 0.4, 0.83], dark, group, [-0.12, 2.43, -0.13], 0.1);
  box([0.54, 0.22, 0.025], matte('#02070b', 0.08), group, [-0.12, 2.43, -0.56], 0.04);
  // Finite, repeated surface detail follows the camera shell rather than floating independently.
  for (let i = 0; i < 19; i++) box([0.026, 1.61, 0.018], matte('#232c30', 0.8), group, [1.12 + i * 0.027, 1.19, 0.886], 0.006);
  for (const x of [-1.55, 1.53]) {
    box([0.18, 0.14, 0.18], titanium, group, [x, 2.08, 0.18], 0.04);
    const lug = mesh(new THREE.TorusGeometry(0.12, 0.026, 10, 32), titanium, group, [x, 2.01, 0.29]); lug.rotation.y = 0.15;
  }
  for (const x of [-1.26, 1.08]) {
    mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.17, 64), blackMetal, group, [x, 2.41, 0]);
    mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.035, 64), titanium, group, [x, 2.51, 0]);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      const tooth = box([0.019, 0.12, 0.025], titanium, group, [x + Math.sin(a) * 0.306, 2.41, Math.cos(a) * 0.306], 0.004); tooth.rotation.y = a;
    }
  }
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 32), accent, group, [1.36, 2.4, 0.43]);
  const lens = new THREE.Group(); lens.position.set(-0.32, 1.19, 0.57); group.add(lens);
  const rings = [];
  const ringSpecs = [[0.88,0.13],[0.79,0.2],[0.83,0.15],[0.78,0.32],[0.8,0.16],[0.75,0.21],[0.78,0.1]];
  let z = 0;
  for (let i = 0; i < ringSpecs.length; i++) {
    const [radius, depth] = ringSpecs[i];
    const part = new THREE.Group(); lens.add(part); part.userData.baseZ = z + depth / 2;
    const barrel = mesh(new THREE.CylinderGeometry(radius, radius, depth, 96, 1, true), i === 0 ? titanium : blackMetal, part);
    barrel.rotation.x = Math.PI / 2;
    for (const dz of [-depth / 2, depth / 2]) mesh(new THREE.TorusGeometry(radius - 0.012, 0.014, 8, 96), i === 0 ? titanium : blackMetal, part, [0, 0, dz]);
    if (i === 3 || i === 5) for (let j = 0; j < 72; j++) {
      const a = j / 72 * Math.PI * 2;
      const ridge = box([0.016, 0.025, depth * 0.88], rubber, part, [Math.sin(a) * radius, Math.cos(a) * radius, 0], 0.004); ridge.rotation.z = -a;
    }
    rings.push(part); z += depth;
  }
  // Recessed, opaque optical surface avoids screen-space transmission sorting through the barrel.
  const glass = new THREE.MeshPhysicalMaterial({map:opticalCoating(), color: '#9bbfc9', metalness: 0.32, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.45, iridescenceIOR: 1.35});
  const optic = mesh(new THREE.CircleGeometry(0.69, 128), glass, lens, [0, 0, z - 0.04]);
  const curvedHighlight = mesh(new THREE.SphereGeometry(0.68,96,48,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:'#8eacba',transparent:true,opacity:0.1,metalness:0.5,roughness:0.08,clearcoat:1,depthWrite:false}),lens,[0,0,z-0.04]);
  curvedHighlight.rotation.x=Math.PI/2;curvedHighlight.scale.y=0.14;
  const frontRim = mesh(new THREE.TorusGeometry(0.73, 0.032, 16, 96), accent, lens, [0, 0, z + 0.05]);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i / 4 * Math.PI * 2;
    mesh(new THREE.CircleGeometry(0.035, 20), titanium, group, [-0.32 + Math.cos(a) * 1.01, 1.19 + Math.sin(a) * 1.01, 0.553]);
  }
  mesh(new THREE.PlaneGeometry(0.67,0.084),new THREE.MeshBasicMaterial({map:labelTexture('O P T I C'),transparent:true}),group,[-1.12,1.91,0.56]);
  mesh(new THREE.PlaneGeometry(0.6,0.075),new THREE.MeshBasicMaterial({map:labelTexture('S T U D I O  /  0 1'),transparent:true}),group,[-1.05,0.4,0.56]);
  const copy = createCopy(config, config.copy || [
    ['Presisi.\nTanpa kompromi.', 'Bentuk yang terukur. Detail yang berbicara.'],
    ['Setiap lapisan.\nSatu visi.', 'Dari mekanisme menuju pengalaman.'],
    ['Fokus pada\nyang berarti.', 'OPTIC / Studi produk konseptual']
  ], 'OPTIC / DESIGN STUDY');
  return {...studio,
    update(t, u) {
      const s = smoother(u); studio.cameraAt(u);
      group.rotation.y = -0.08 + 0.14 * s;
      const explode = config.motion === 'precision-assembly' ? Math.sin(Math.PI * smoother(progress(u, 0.12, 0.88))) : 0;
      rings.forEach((part, i) => { part.position.z = part.userData.baseZ + explode * (i + 1) * 0.09; part.rotation.z = (i === 3 ? 0.3 : 0) * s; });
      optic.position.z = z - 0.04 + explode * 0.64; optic.rotation.z=0.06*Math.sin(t*0.7); curvedHighlight.position.z=optic.position.z;
      frontRim.position.z = z + 0.05 + explode * 0.64;
      pedestal.rotation.y = 0; copy(u * 0.999999);
    }
  };
}
