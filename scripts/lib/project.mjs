import {readFile, readdir, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {profiles} from '../../assets/runtime/motion.mjs';
import {validateStoryboard} from '../../assets/runtime/story.mjs';

export function validateConfig(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error('project.json must be an object');
  for (const k of ['width', 'height']) if (!Number.isInteger(c[k]) || c[k] < 64 || c[k] > 4096 || c[k] % 2) throw new Error(`${k} must be an even integer from 64 to 4096`);
  if (![24, 25, 30, 50, 60].includes(c.fps)) throw new Error('fps must be 24, 25, 30, 50, or 60');
  if (!Number.isFinite(c.duration) || c.duration <= 0 || c.duration > 600 || Math.abs(c.duration * c.fps - Math.round(c.duration * c.fps)) > 1e-6) throw new Error('duration must be 0–600 seconds and contain a whole number of frames');
  if (!Number.isFinite(c.supersample) || c.supersample < 1 || c.supersample > 2) throw new Error('supersample must be 1–2');
  if (!Object.hasOwn(profiles, c.motion)) throw new Error('Unknown motion profile');
  if (typeof c.prompt !== 'string' || !c.prompt.trim()) throw new Error('A prompt is required');
  if (c.mode !== undefined && !['showcase','explainer'].includes(c.mode)) throw new Error('mode must be showcase or explainer');
  return c;
}
export async function loadProject(dir) {
  const root = await realpath(dir);
  const config = validateConfig(JSON.parse(await readFile(path.join(root, 'project.json'), 'utf8')));
  const storyboard = config.mode === 'explainer' ? validateStoryboard(JSON.parse(await readFile(path.join(root,'storyboard.json'),'utf8')), config.duration) : undefined;
  if(config.template==='imagegen-explainer'){
    const reconstruction=JSON.parse(await readFile(path.join(root,'reconstruction.json'),'utf8'));
    if(reconstruction.status!=='authored'||!reconstruction.reference||!Array.isArray(reconstruction.parts)||reconstruction.parts.length<1)throw new Error('ImageGen-to-Three.js reconstruction is not authored: generate the reference, specify named 3D parts and author model.mjs (references/imagegen-threejs.md)');
    if(!/^assets\/[\w./-]+\.(png|jpe?g|webp)$/i.test(reconstruction.reference)||reconstruction.reference.split('/').includes('..'))throw new Error('Reference must be a local image under assets/');
    await confinedFile(root,reconstruction.reference);
    await confinedFile(root,'model.mjs');
    if(!storyboard.beats.every(b=>b.camera.position&&b.camera.target))throw new Error('Three.js explainers require 3D storyboard camera position and target');
  }
  return {root, config, storyboard};
}
export async function sourceHash(root) {
  const h = createHash('sha256');
  async function visit(dir) {
    for (const entry of (await readdir(dir, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
      if (['output', 'node_modules', '.git', '.cache'].includes(entry.name) || entry.name === 'review.json') continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Project sources must be local files, not symlinks: ${full}`);
      if (entry.isDirectory()) await visit(full);
      else { h.update(path.relative(root, full)); h.update(await readFile(full)); }
    }
  }
  await visit(root); return h.digest('hex');
}
export async function confinedFile(root, relative) {
  const canonicalRoot = await realpath(root);
  const target = await realpath(path.resolve(canonicalRoot, relative));
  if (target !== canonicalRoot && !target.startsWith(canonicalRoot + path.sep)) throw new Error('Path outside served root');
  if (!(await stat(target)).isFile()) throw new Error('Not a file');
  return target;
}
export function sampleFrames(c, storyboard) {
  const n = Math.round(c.duration * c.fps);
  // Include both sides of the starter's three beats and a moving interval in the second half.
  const frames=[0, Math.min(n - 1, Math.round(c.fps * 0.4)), ...[0.16, 0.32, 0.34, 0.5, 0.65, 0.67, 0.78, 0.84, 0.94, 1].map(u => Math.round(u * (n - 1)))];
  for(const beat of storyboard?.beats || []) frames.push(Math.round((beat.start+beat.end)/2*c.fps),Math.round(beat.start*c.fps)-2,Math.round(beat.start*c.fps)+2,Math.round((beat.start+Math.min(1.3,(beat.end-beat.start)/3))*c.fps));
  return [...new Set(frames.map(f=>Math.min(n-1,Math.max(0,f))))].sort((a,b)=>a-b);
}
