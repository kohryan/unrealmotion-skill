import * as THREE from 'three';
import {createStudio, box, mesh, metal, matte, createCopy} from './runtime/studio.mjs';
import {smoother, progress} from './runtime/motion.mjs';

export async function createScene(config) {
  const studio = createStudio(config, {radius: 15, target: [-0.8, 2.1, 0], background: '#1c2529', floor: '#293238', exposure: 1.05});
  const {scene, group} = studio;
  const stone = matte('#b6b7ad', 0.9), concrete = matte('#c7c6ba', 0.78), bronze = metal('#8a7150', 0.32), timber = matte('#5c4130', 0.65);
  group.position.set(0.8, 0, 0);
  box([7.6, 0.25, 5.4], stone, group, [0, 0.125, 0], 0.07);
  box([6.2, 0.2, 3.9], concrete, group, [0, 0.35, 0], 0.03);
  for (let i = 0; i < 3; i++) box([3.6, 0.09, 0.42], concrete, group, [0, 0.07 + i * 0.09, 2.7 - i * 0.32], 0.018);
  const structure = new THREE.Group(); group.add(structure);
  for (const x of [-2.6, 2.6]) for (const z of [-1.5, 1.5]) {
    box([0.15, 2.65, 0.15], bronze, structure, [x, 1.76, z], 0.018);
    box([0.32, 0.06, 0.32], bronze, structure, [x, 0.47, z], 0.01);
  }
  const roof = new THREE.Group(); structure.add(roof);
  box([6.6, 0.18, 4.25], concrete, roof, [0, 3.16, 0], 0.05);
  box([6.4, 0.08, 4.05], timber, roof, [0, 3.04, 0], 0.025);
  for (let i = 0; i < 24; i++) box([0.055, 0.1, 3.9], timber, roof, [-3.02 + i * 0.263, 2.96, 0], 0.008);
  // Thin, partially reflective glazing reads as a coherent wall without excessive refractive layers.
  const glass = new THREE.MeshPhysicalMaterial({color: '#9cbdbe', metalness: 0.12, roughness: 0.1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false});
  box([5.08, 2.5, 0.025], glass, structure, [0, 1.74, -1.5], 0.006);
  box([0.025, 2.5, 2.86], glass, structure, [-2.6, 1.74, 0], 0.006);
  for (const x of [-1.3, 0, 1.3]) box([0.035, 2.5, 0.04], bronze, structure, [x, 1.74, -1.48], 0.006);
  for (let i = 0; i < 22; i++) box([0.07, 2.46, 0.15], timber, structure, [2.6, 1.74, -1.38 + i * 0.131], 0.012);
  box([2.4, 0.12, 0.75], timber, structure, [-0.2, 0.92, -0.3], 0.045);
  for (const x of [-1.1, 0.7]) box([0.09, 0.46, 0.54], bronze, structure, [x, 0.66, -0.3], 0.02);
  box([1.1, 0.55, 0.72], matte('#d0c3a8', 0.92), structure, [-1.4, 0.73, 0.7], 0.09);
  const water = mesh(new THREE.PlaneGeometry(1.1, 4.6, 16, 64), new THREE.MeshPhysicalMaterial({color:'#24494b', metalness:0.4, roughness:0.16, clearcoat:1}), group, [-3.14, 0.264, 0]); water.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 7; i++) box([0.7, 0.04, 0.28], stone, group, [-3.14, 0.3, -1.95 + i * 0.64], 0.02);
  const plants = new THREE.Group(); group.add(plants);
  for (let k = 0; k < 3; k++) {
    const x = -2.2 + k * 1.9;
    box([0.65, 0.28, 0.55], matte('#484b40', 0.9), plants, [x, 0.38, -2.23], 0.04);
    for (let j = 0; j < 12; j++) {
      const a = j * 2.4 + k;
      const leaf = mesh(new THREE.SphereGeometry(0.18, 16, 12), matte(j % 2 ? '#445c43' : '#728263', 0.9), plants, [x + Math.cos(a) * 0.2, 0.63 + j % 4 * 0.11, -2.23 + Math.sin(a) * 0.16]);
      leaf.scale.set(0.35, 1.8, 0.6); leaf.rotation.z = Math.cos(a) * 0.6;
    }
  }
  const copy = createCopy(config, config.copy || [['Ruang untuk\nbernapas.', 'Cahaya, material, dan ritme.'], ['Cahaya.\nRuang hidup.', 'Terbuka untuk kemungkinan.'], ['Tenang.\nTerukur.', 'PAVILION / Studi arsitektur konseptual']], 'PAVILION / LIGHT STUDY');
  return {...studio, update(t, u) {
    studio.cameraAt(u); group.rotation.y = -0.1 + smoother(u) * 0.08;
    roof.position.y = config.motion === 'precision-assembly' ? Math.sin(Math.PI * smoother(progress(u, 0.1, 0.9))) * 0.85 : 0;
    water.material.roughness = 0.15 + 0.025 * Math.sin(t * 1.8); copy(u * 0.999999);
  }};
}
