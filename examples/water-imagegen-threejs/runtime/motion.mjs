export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const progress = (t, start, end) => clamp((t - start) / (end - start));
export const smoother = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const easeOut = x => 1 - Math.pow(1 - clamp(x), 4);

// Analytic damped spring: the same time always gives the same position, including reverse seeks.
export function spring(seconds, frequency = 2.4, damping = 0.8) {
  if (seconds <= 0) return 0;
  if (!(frequency > 0 && damping > 0 && damping <= 1)) throw new Error('Invalid spring parameters');
  const w = frequency * Math.PI * 2;
  if (damping === 1) return 1 - (1 + w * seconds) * Math.exp(-w * seconds);
  const d = Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * seconds) * (Math.cos(w * d * seconds) + damping / d * Math.sin(w * d * seconds));
}

export function random(seed = 1) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export const profiles = {
  'cinematic-orbit': {label: 'Orbit sinematik', arc: 0.5, lift: 0.22, push: 0.1, assembly: false},
  'precision-assembly': {label: 'Rakitan presisi', arc: 0.24, lift: 0.1, push: 0.04, assembly: true},
  'macro-dolly': {label: 'Dolly makro', arc: 0.16, lift: 0.3, push: 0.24, assembly: false},
  'continuous-flow': {label: 'Aliran kontinu', arc: 0.35, lift: 0.18, push: 0.06, assembly: false},
  'editorial-spring': {label: 'Editorial spring', arc: 0.2, lift: 0.1, push: 0.08, assembly: false}
};

export function cameraMotion(camera, {u, profile, radius, target, aspect}) {
  const p = profiles[profile];
  if (!p) throw new Error(`Unknown motion profile: ${profile}`);
  const s = smoother(u);
  const angle = mix(-p.arc, p.arc * 0.65, s);
  const distance = radius * (1 - p.push * s) * (aspect < 1 ? 1.35 / aspect : 1);
  camera.position.set(target.x + Math.sin(angle) * distance, target.y + radius * (0.16 + p.lift * s), target.z + Math.cos(angle) * distance);
  camera.lookAt(target);
}
