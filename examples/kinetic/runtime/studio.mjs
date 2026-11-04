import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cameraMotion, smoother, progress} from './motion.mjs';

export function mesh(geometry, material, parent, position = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export function box(size, material, parent, position = [0, 0, 0], bevel = 0.04) {
  return mesh(new RoundedBoxGeometry(...size, 3, Math.min(bevel, ...size.map(n => n / 3))), material, parent, position);
}
export const metal = (color = '#768087', roughness = 0.28) => new THREE.MeshStandardMaterial({color, metalness: 0.95, roughness});
export const matte = (color = '#10151b', roughness = 0.6) => new THREE.MeshStandardMaterial({color, metalness: 0.08, roughness});

export function createStudio(config, {background = '#0b1016', floor = '#141b22', exposure = 1.15, radius = 8.5, target = [0, 1.1, 0]} = {}) {
  const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(config.supersample); renderer.setSize(config.width, config.height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  document.querySelector('#stage').append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(background);
  scene.fog = new THREE.Fog(background, 18, 45);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment(); const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture; scene.environmentIntensity = 0.48; room.dispose(); pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(36, config.width / config.height, 0.05, 100);
  const key = new THREE.DirectionalLight('#fff1dc', 3.3); key.position.set(-3, 7, 5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -6, right: 6, top: 7, bottom: -5, near: 0.5, far: 25});
  key.shadow.normalBias = 0.025; key.shadow.bias = -0.0001; scene.add(key);
  const fill = new THREE.DirectionalLight('#b7d4ff', 2.1); fill.position.set(5, 3, -4); scene.add(fill);
  const rim = new THREE.DirectionalLight('#c2fff4', 1.1); rim.position.set(-5, 2, -2); scene.add(rim);
  mesh(new THREE.PlaneGeometry(160, 160), matte(floor, 0.5), scene).rotation.x = -Math.PI / 2;
  const group = new THREE.Group(); scene.add(group);
  const lookAt = new THREE.Vector3(...target);
  return {THREE, scene, camera, renderer, group,
    cameraAt(u) { cameraMotion(camera, {u, profile: config.motion, radius, target: lookAt, aspect: config.width / config.height}); },
    draw() { renderer.render(scene, camera); renderer.getContext().finish(); },
    inspect() {
      let meshes = 0; const invalid = [];
      scene.traverse(o => { if (o.isMesh) meshes++; if (![...o.position, ...o.scale, o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite)) invalid.push(o.name || o.type); });
      return {meshes, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, invalid, camera: [...camera.position], subject: [...group.position], rotation: [...group.quaternion]};
    }
  };
}

export function createCopy(config, lines, kicker) {
  const root = document.querySelector('#copy');
  const eyebrow = document.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = kicker;
  const heading = document.createElement('h1'); const description = document.createElement('p');
  root.replaceChildren(eyebrow, heading, description);
  let previous = -1;
  return u => {
    const index = Math.min(lines.length - 1, Math.floor(u * lines.length));
    if (index !== previous) { heading.textContent = lines[index][0]; description.textContent = lines[index][1]; previous = index; }
    const local = u * lines.length - index;
    const a = smoother(progress(local, 0, 0.12));
    const b = index === lines.length - 1 ? 1 : 1 - smoother(progress(local, 0.88, 1));
    root.style.opacity = a * b; root.style.transform = `translateY(${(1 - a) * 14}px)`;
  };
}
