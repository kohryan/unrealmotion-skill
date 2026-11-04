import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PNG} from 'pngjs';
import {openCapture, captureBackend} from './browser.mjs';
import {sourceHash, sampleFrames} from './project.mjs';

export function imageStats(buffer) {
  const p = PNG.sync.read(buffer); let sum = 0, sum2 = 0;
  for (let i = 0; i < p.data.length; i += 4) { const y = 0.2126 * p.data[i] + 0.7152 * p.data[i+1] + 0.0722 * p.data[i+2]; sum += y; sum2 += y * y; }
  const count = p.width * p.height, mean = sum / count;
  return {mean, deviation: Math.sqrt(Math.max(0, sum2 / count - mean * mean))};
}
export function difference(a, b) {
  const x = PNG.sync.read(a), y = PNG.sync.read(b);
  if (x.width !== y.width || x.height !== y.height) return Infinity;
  let delta = 0;
  for (let i = 0; i < x.data.length; i += 4) for (let c = 0; c < 3; c++) delta += Math.abs(x.data[i+c] - y.data[i+c]);
  return delta / (x.width * x.height * 3);
}
export function contactSheet(buffers) {
  const cellW = 480, source = PNG.sync.read(buffers[0]);
  const cellH = Math.round(cellW * source.height / source.width), columns = 3;
  const out = new PNG({width:cellW * columns, height:cellH * Math.ceil(buffers.length / columns), fill:true});
  buffers.forEach((b, i) => {
    const p = PNG.sync.read(b), ox = i % columns * cellW, oy = Math.floor(i / columns) * cellH;
    for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) {
      const a = (Math.min(p.height - 1, Math.floor(y * p.height / cellH)) * p.width + Math.min(p.width - 1, Math.floor(x * p.width / cellW))) * 4;
      p.data.copy(out.data, ((oy + y) * out.width + ox + x) * 4, a, a + 4);
    }
  });
  return PNG.sync.write(out);
}

export async function runQA(project, options = {}) {
  const initialHash = await sourceHash(project.root);
  const dir = path.join(project.root, 'output/qa'); await mkdir(dir, {recursive:true});
  const capture = await openCapture(project, options);
  const frames = sampleFrames(project.config, project.storyboard), buffers = [], samples = [];
  const failures = [];
  try {
    for (const f of frames) {
      const buffer = await capture.frame(f); buffers.push(buffer);
      const stats = imageStats(buffer);
      const state = await capture.page.evaluate(() => window.__unrealmotion.inspect());
      const overflow = await capture.page.evaluate(() => {
        const seam=window.__unrealmotion.inspect().transition;
        const moving=seam?.active&&!['camera','none'].includes(seam.type);
        return [...document.querySelectorAll('[data-safe]')].flatMap(e => {
        if(e.dataset.safe==='visual'&&moving)return [];
        if (getComputedStyle(e).opacity < 0.05) return [];
        if(!e.getClientRects().length)return [];
        return [...e.children].filter(c => { const r = c.getBoundingClientRect(); return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight || (!c.classList.contains('um-word-window') && c.scrollWidth > c.clientWidth + 2); }).map(c => c.tagName);
      }).concat([...document.querySelectorAll('[data-safe-label]')].filter(e=>{if(moving&&e.closest('#story-visual'))return false;const s=getComputedStyle(e);if(s.display==='none'||Number(s.opacity)<.05)return false;const r=e.getBoundingClientRect();return r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight;}).map(()=> 'part-label'))
        .concat([...document.querySelectorAll('.um-data svg text')].filter(e=>{if(moving||!e.getClientRects().length)return false;const a=e.getBoundingClientRect(),b=e.ownerSVGElement.getBoundingClientRect();return a.left<b.left-2||a.right>b.right+2||a.top<b.top-2||a.bottom>b.bottom+2;}).map(()=> 'chart-label'));
      });
      if (stats.deviation < 3) failures.push(`Frame ${f}: blank or almost uniform image`);
      if (state.invalid?.length || (state.renderer === 'svg' ? !state.elements : !state.meshes || !state.triangles)) failures.push(`Frame ${f}: invalid or empty scene`);
      if(project.config.template==='imagegen-explainer' && (state.renderer!=='threejs'||!state.volumes))failures.push(`Frame ${f}: ImageGen explainer requires rendered Three.js volumes`);
      if(project.storyboard?.version===2&&state.activeScenes?.length!==1)failures.push(`Frame ${f}: exactly one authored scene root must be active`);
      if(state.graphics?.some(g=>g.invalid))failures.push(`Frame ${f}: invalid chart values`);
      if (overflow.length) failures.push(`Frame ${f}: clipped copy: ${overflow.join(', ')}`);
      const file = `frame-${String(f).padStart(6, '0')}.png`; await writeFile(path.join(dir, file), buffer);
      samples.push({frame:f, seconds:f / project.config.fps, file, ...stats, state});
    }
    const middle = Math.floor(frames.length / 2);
    await capture.frame(frames[0]);
    const repeated = await capture.frame(frames[middle]);
    const seekDifference = difference(buffers[middle], repeated);
    if (seekDifference > 0.05) failures.push(`Random seek changed the same frame (mean RGB error ${seekDifference})`);
    const total=Math.round(project.config.duration*project.config.fps);
    const late = frames.indexOf(Math.round((total-1)*0.78)), later=frames.indexOf(Math.round((total-1)*0.84));
    const lateChange = difference(buffers[late], buffers[later]);
    if (lateChange < 0.12) failures.push('No meaningful visible motion in the sampled late interval');
    failures.push(...capture.errors, ...capture.blocked.map(u => `External render dependency: ${u}`));
    const overview = project.storyboard ? project.storyboard.beats.map(b=>buffers[frames.indexOf(Math.min(Math.round(project.config.duration*project.config.fps)-1,Math.round((b.start+b.end)/2*project.config.fps)))]) : buffers;
    await writeFile(path.join(dir, 'contact-sheet.png'), contactSheet(overview));
    const contactSheets=[];
    if(buffers.length>12)for(let i=0;i<buffers.length;i+=12){const file=`contact-sheet-${String(i/12+1).padStart(2,'0')}.png`;await writeFile(path.join(dir,file),contactSheet(buffers.slice(i,i+12)));contactSheets.push({file,frames:frames.slice(i,i+12)});}
    const finalHash = await sourceHash(project.root);
    if (initialHash !== finalHash) failures.push('Project sources changed during QA; rerun on the saved source');
    const report = {version:1, backend:captureBackend(options), sourceHash:finalHash, technicalPassed:failures.length === 0, visualReview:'pending-human-or-agent-inspection', seekDifference, lateChange, failures:[...new Set(failures)], contactSheets, samples};
    await writeFile(path.join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    return report;
  } finally { await capture.close(); }
}
