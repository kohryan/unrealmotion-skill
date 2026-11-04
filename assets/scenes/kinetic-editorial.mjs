import * as THREE from 'three';
import {createStudio, mesh, metal, createCopy} from './runtime/studio.mjs';
import {spring, smoother, progress} from './runtime/motion.mjs';

export async function createScene(config) {
  const studio = createStudio(config, {radius: 10, target: [-0.5, 1.8, 0], background: '#10151c', floor:'#18212a'});
  const {group} = studio; group.position.set(1.35, 1.9, 0);
  const bands = [];
  for (let i = 0; i < 5; i++) {
    const path = new THREE.CatmullRomCurve3(Array.from({length: 121}, (_, j) => {
      const a = j / 120 * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * (1.2 + i * 0.16), Math.sin(a) * (1.2 + i * 0.16), Math.sin(a * 3 + i * 0.55) * 0.22);
    }), true);
    const band = mesh(new THREE.TubeGeometry(path, 240, 0.055, 12, true), metal(i % 2 ? '#bccdc9' : '#4f918f', 0.22), group);
    bands.push(band);
  }
  const copy = createCopy(config, config.copy || [['Ide bergerak.\nDampak terasa.', 'Dari sinyal menjadi bentuk.'], ['Ritme yang\nterarah.', 'Setiap transisi punya tujuan.'], ['Bentuk baru.\nEnergi baru.', 'UNREALMOTION / Kinetic study']], 'UNREALMOTION / MOTION SYSTEM');
  return {...studio, update(t, u) {
    studio.cameraAt(u);
    group.rotation.set(0.35 + Math.sin(t * 0.45) * 0.18, t * 0.14, -0.12 + Math.sin(t * 0.3) * 0.12);
    bands.forEach((b, i) => {
      const entry = config.motion === 'editorial-spring' ? spring(Math.max(0, t - i * 0.08), 1.6, 0.88) : smoother(progress(u, i * 0.015, 0.22 + i * 0.015));
      b.scale.setScalar(0.65 + 0.35 * entry); b.rotation.y = Math.sin(t * 0.6 + i * 0.45) * 0.18; b.rotation.x = Math.cos(t * 0.4 + i * 0.25) * 0.1;
    }); copy(u * 0.999999);
  }};
}
