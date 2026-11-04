#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir, copyFile, cp, writeFile, readFile, access, rename, rm} from 'node:fs/promises';
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {profiles} from '../assets/runtime/motion.mjs';
import {loadProject, validateConfig, sourceHash} from './lib/project.mjs';
import {serve, openCapture, captureBackend} from './lib/browser.mjs';
import {runQA} from './lib/qa.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const templates = ['optical-studio', 'architectural-light', 'kinetic-editorial', 'pelagic-bloom', 'mechanical-reassembly', 'imagegen-explainer', 'water-system-explainer'];
const help = `UnrealMotion — local Three.js video production

node scripts/unrealmotion.mjs doctor
node scripts/unrealmotion.mjs templates
node scripts/unrealmotion.mjs create <dir> --prompt "brief" [--template optical-studio] [--motion cinematic-orbit] [--width 1920 --height 1080 --fps 60 --duration 12 --supersample 1.5]
node scripts/unrealmotion.mjs create <dir> --mode explainer --prompt "Jelaskan proses dalam 60 detik" [--pace dynamic|calm --assets multi|single --duration 60 --width 1080 --height 1920 --fps 30]
node scripts/unrealmotion.mjs preview <dir> [--port 0]
node scripts/unrealmotion.mjs qa <dir> [--software]
node scripts/unrealmotion.mjs render <dir> [--output video.mp4] [--audio local.wav] [--final] [--force] [--software]
node scripts/unrealmotion.mjs probe <video.mp4>

create is a scene starter. The active coding agent generates consistent ImageGen references,
reconstructs Three.js parts and authors the story/motion for the actual prompt.
The local CLI does not call an AI API or a video-generation service.
--final requires an inspected, source-matched review.json (references/quality.md).
`;

async function exists(p) { try { await access(p); return true; } catch { return false; } }
function probe(file) {
  const r = spawnSync('ffprobe', ['-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration:format=duration','-of','json',file], {encoding:'utf8'});
  if (r.error || r.status !== 0) throw new Error(r.error?.message || r.stderr || 'ffprobe failed');
  return JSON.parse(r.stdout);
}
function verifyVideo(meta, c) {
  const v = meta.streams.find(s => s.codec_type === 'video');
  const fps = v?.r_frame_rate.split('/').map(Number).reduce((a, b) => a / b);
  if (!v || v.width !== c.width || v.height !== c.height || fps !== c.fps || Number(v.nb_read_frames) !== Math.round(c.duration * c.fps) || Math.abs(Number(v.duration ?? meta.format.duration) - c.duration) > 1 / c.fps) throw new Error('Encoded video does not match project dimensions, fps, duration, or frame count');
}
async function render(project, options) {
  for (const name of ['ffmpeg', 'ffprobe']) if (spawnSync(name, ['-version']).status !== 0) throw new Error(`Missing ${name}`);
  const output = options.output ? path.resolve(options.output) : path.join(project.root, 'output/video.mp4');
  if (path.extname(output).toLowerCase() !== '.mp4') throw new Error('Output must use .mp4');
  if (await exists(output) && !options.force) throw new Error('Output exists; use --force or a new output path');
  const hash = await sourceHash(project.root);
  let qa;
  try { qa = JSON.parse(await readFile(path.join(project.root, 'output/qa/report.json'), 'utf8')); } catch {}
  if (!qa || qa.sourceHash !== hash || qa.backend !== captureBackend(options) || !qa.technicalPassed) qa = await runQA(project, options);
  if (!qa.technicalPassed) throw new Error(`QA failed: ${qa.failures.join('; ')}`);
  if (options.final) {
    const review = JSON.parse(await readFile(path.join(project.root, 'review.json'), 'utf8'));
    const required = ['subjectFidelity','materialsLighting','composition','motionContinuity','transitions','lateMotion'];
    if(project.config.mode==='explainer') required.push('explanation','causalMotion','shotContinuity');
    if(project.config.template==='imagegen-explainer') required.push('promptFidelity','assetConsistency','reconstruction3D');
    if(project.storyboard?.version===2)required.push('dynamicPacing','kineticText');
    if(project.storyboard?.version===2&&project.config.assetStrategy!=='single')required.push('multiAssetContinuity');
    if(qa.samples.some(s=>s.state.graphics?.some(g=>['bar','race','line','donut','counter'].includes(g.type))))required.push('dataAccuracy');
    if (review.sourceHash !== hash || !required.every(k => review.checks?.[k] === true) || !Array.isArray(review.evidence) || review.evidence.length < 3 || typeof review.notes !== 'string' || review.notes.length < 20) throw new Error('Final export requires a current visual review with all checks, evidence, and substantive notes');
    for (const evidence of review.evidence) if (!await exists(path.resolve(project.root, evidence))) throw new Error(`Review evidence is missing: ${evidence}`);
  }
  await mkdir(path.dirname(output), {recursive:true});
  const partial = path.join(path.dirname(output), `.${path.basename(output)}.${process.pid}.partial.mp4`);
  const c = project.config;
  const args = ['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(c.fps),'-vcodec','png','-i','pipe:0'];
  if (options.audio) { if (!await exists(path.resolve(options.audio))) throw new Error('Audio file does not exist'); args.push('-i', path.resolve(options.audio), '-map','0:v:0','-map','1:a:0','-af','apad','-c:a','aac','-b:a','192k'); }
  else args.push('-an');
  args.push('-t',String(c.duration),'-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',partial);
  const capture = await openCapture(project, options);
  const encoder = spawn('ffmpeg', args, {stdio:['pipe','ignore','pipe']}); let stderr = '', pipeError;
  encoder.stderr.on('data', b => { stderr = (stderr + b).slice(-8000); });
  encoder.stdin.on('error', e => { pipeError = e; });
  const completion = new Promise(resolve => { encoder.on('error', error => resolve({error})); encoder.on('close', code => resolve({code})); });
  const frames = Math.round(c.duration * c.fps);
  try {
    for (let f = 0; f < frames; f++) {
      const buffer = await capture.frame(f);
      if (pipeError || encoder.exitCode !== null) throw new Error(stderr || pipeError?.message || 'Encoder stopped');
      if (!encoder.stdin.write(buffer)) await Promise.race([once(encoder.stdin, 'drain'), completion.then(r => { throw new Error(stderr || r.error?.message || 'Encoder closed before input completed'); })]);
      if (f % c.fps === 0) process.stderr.write(`\rRendering ${f}/${frames}`);
    }
    encoder.stdin.end(); const done = await completion;
    if (done.error || done.code !== 0) throw new Error(stderr || done.error?.message || 'ffmpeg failed');
    if (capture.errors.length || capture.blocked.length) throw new Error([...capture.errors, ...capture.blocked].join('; '));
    if (await sourceHash(project.root) !== hash) throw new Error('Project changed during export; rerun QA and render');
    const meta = probe(partial); verifyVideo(meta, c);
    if (await exists(output) && !options.force) throw new Error('Output appeared during render; refusing overwrite');
    await rename(partial, output);
    const manifest = {output, backend:captureBackend(options), sourceHash:hash, sha256:createHash('sha256').update(await readFile(output)).digest('hex'), verified:meta, visualReview:options.final ? 'passed' : 'pending', frames, fps:c.fps};
    await writeFile(output + '.json', JSON.stringify(manifest, null, 2) + '\n');
    process.stderr.write(`\rRendered ${frames}/${frames}\n`); return manifest;
  } finally { encoder.stdin.destroy(); if (encoder.exitCode === null) encoder.kill(); await capture.close(); await rm(partial, {force:true}); }
}

async function main() {
  const {values:o, positionals:p} = parseArgs({allowPositionals:true, options:{prompt:{type:'string'},mode:{type:'string'},template:{type:'string'},motion:{type:'string',default:'cinematic-orbit'},pace:{type:'string',default:'dynamic'},assets:{type:'string',default:'multi'},width:{type:'string'},height:{type:'string'},fps:{type:'string'},duration:{type:'string'},supersample:{type:'string'},output:{type:'string'},audio:{type:'string'},port:{type:'string',default:'0'},software:{type:'boolean'},final:{type:'boolean'},force:{type:'boolean'},help:{type:'boolean'}}});
  const [command, target] = p;
  if (o.help || !command) { console.log(help); return; }
  if (command === 'templates') { console.log(JSON.stringify({scenes:templates, motion:profiles}, null, 2)); return; }
  if (command === 'doctor') {
    const checks = {node:process.version, browserExecutable:process.env.UNREALMOTION_CHROMIUM || chromium.executablePath(), browserInstalled:await exists(process.env.UNREALMOTION_CHROMIUM || chromium.executablePath()), ffmpeg:spawnSync('ffmpeg',['-version']).status === 0, ffprobe:spawnSync('ffprobe',['-version']).status === 0};
    console.log(JSON.stringify(checks, null, 2)); if (!checks.browserInstalled || !checks.ffmpeg || !checks.ffprobe) process.exitCode = 1; return;
  }
  if (!target) throw new Error(`${command} requires a path. Use --help`);
  if (command === 'probe') { console.log(JSON.stringify(probe(path.resolve(target)), null, 2)); return; }
  if (command === 'create') {
    const dir = path.resolve(target);
    if (await exists(dir)) throw new Error('Project directory already exists; choose a new path');
    const mode=o.mode || (['water-system-explainer','imagegen-explainer'].includes(o.template)?'explainer':'showcase');
    const template=o.template || (mode==='explainer'?'imagegen-explainer':'optical-studio');
    if (!templates.includes(template)) throw new Error('Unknown scene template');
    if((mode==='explainer')!==['water-system-explainer','imagegen-explainer'].includes(template))throw new Error('Explainer templates require explainer mode');
    const explainer=mode==='explainer';
    const config = validateConfig({version:1,mode,prompt:o.prompt,template,motion:o.motion,width:Number(o.width??(explainer?1080:1920)),height:Number(o.height??(explainer?1920:1080)),fps:Number(o.fps??(explainer?30:60)),duration:Number(o.duration??(explainer?60:12)),supersample:Number(o.supersample??(explainer?1:1.5)),seed:73});
    if(template==='imagegen-explainer'){config.pace=o.pace;config.assetStrategy=o.assets;validateConfig(config);}
    await mkdir(dir, {recursive:true});
    await cp(path.join(root,'assets/runtime'), path.join(dir,'runtime'), {recursive:true});
    await rename(path.join(dir,'runtime/index.html'), path.join(dir,'index.html'));
    await copyFile(path.join(root,`assets/scenes/${template}.mjs`), path.join(dir,'scene.mjs'));
    if(explainer){
      let story;
      if(template==='water-system-explainer'){
        story=JSON.parse(await readFile(path.join(root,'assets/scenes/water-system-explainer.storyboard.json'),'utf8'));
        const scale=config.duration/story.duration;story.duration=config.duration;story.beats.forEach(b=>{b.start*=scale;b.end*=scale;});
      } else {
        story={version:2,title:'AUTHOR FOR THE PROMPT',prompt:o.prompt,pace:o.pace,duration:config.duration,scenes:[{id:'overview'},{id:'mechanism'},{id:'resolution'}],beats:['question','mechanism','resolution'].map((id,i)=>({id,scene:['overview','mechanism','resolution'][i],assets:[o.assets==='single'?'reference-overview':`reference-${i+1}`],start:i*config.duration/3,end:(i+1)*config.duration/3,caption:'AUTHOR: '+id,detail:'Write concise readable copy for the actual subject.',action:'Author the visible subject action.',purpose:'Explain the causal link for this beat.',text:{preset:'words',layout:'caption'},camera:{x:0,y:1,scale:1,position:[7,5,12],target:[0,1,0]}}))};
        await mkdir(path.join(dir,'assets'));
        await writeFile(path.join(dir,'reconstruction.json'),JSON.stringify({status:'needs-imagegen-and-3d-model',reference:'',references:[],style:'simple pastel cutaway; keep identity and palette across the image bundle',parts:[],attachments:[],inferredGeometry:[],reviewViews:[]},null,2)+'\n');
        await copyFile(path.join(root,'assets/scenes/imagegen-explainer.model.mjs'),path.join(dir,'model.mjs'));
        await writeFile(path.join(dir,'asset-plan.json'),JSON.stringify({prompt:o.prompt,status:'needs-agent-authorship',strategy:o.assets,artDirection:'',assets:[],generationTool:'host image_gen (not this CLI)',provenance:[]},null,2)+'\n');
      }
      await writeFile(path.join(dir,'storyboard.json'),JSON.stringify(story,null,2)+'\n');
    }
    await writeFile(path.join(dir,'project.json'), JSON.stringify(config, null, 2) + '\n');
    await writeFile(path.join(dir,'plan.json'), JSON.stringify({prompt:o.prompt,status:'starter-needs-agent-authorship',subject:template,shots:[],datasetReferences:[],assetProvenance:[]}, null, 2) + '\n');
    console.log(JSON.stringify({project:dir,mode,next:template==='imagegen-explainer'?'Generate consistent scene references with host ImageGen; reconstruct real Three.js parts in persistent scene roots in model.mjs. Author reconstruction.json, asset-plan.json, storyboard.json and plan.json. See references/imagegen-threejs.md. Render silent.':explainer?'Author storyboard.json, scene.mjs and plan.json for the actual explanation. Render without --audio for a silent MP4.':'Author scene.mjs and plan.json for the actual subject, then preview and qa.'}, null, 2)); return;
  }
  const project = await loadProject(target);
  if (command === 'preview') { const server = await serve(project.root, Number(o.port)); console.log(server.url); for (const s of ['SIGINT','SIGTERM']) process.once(s, async () => { await server.close(); process.exit(0); }); return; }
  if (command === 'qa') { const q = await runQA(project,o); console.log(JSON.stringify({technicalPassed:q.technicalPassed,sourceHash:q.sourceHash,failures:q.failures,contactSheet:path.join(project.root,'output/qa/contact-sheet.png')},null,2)); if (!q.technicalPassed) process.exitCode = 1; return; }
  if (command === 'render') { console.log(JSON.stringify(await render(project,o),null,2)); return; }
  throw new Error(`Unknown command: ${command}`);
}
main().catch(e => { console.error(`UnrealMotion: ${e.message}`); process.exitCode = 1; });
