import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
test('explainer defaults to a full silent story; vector beats seek/render and final review requires narrative evidence',{timeout:240000},async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'unrealmotion-explainer-'));
  function cli(args,success=true){
    const flags=process.env.CI&&['qa','render'].includes(args[0])?['--software']:[];
    const r=spawnSync(process.execPath,['scripts/unrealmotion.mjs',...args,...flags],{cwd:root,encoding:'utf8',timeout:180000});
    if(success)assert.equal(r.status,0,r.stderr+r.stdout);else assert.notEqual(r.status,0);return r;
  }
  try{
    const defaults=path.join(base,'defaults');cli(['create',defaults,'--mode','explainer','--prompt','Explain a pump silently']);
    const c=JSON.parse(await readFile(path.join(defaults,'project.json')));assert.deepEqual([c.duration,c.width,c.height,c.fps],[60,1080,1920,30]);
    assert.equal(c.template,'imagegen-explainer');assert.match(cli(['qa',defaults],false).stderr,/ImageGen-to-Three.js reconstruction is not authored/);
    const dir=path.join(base,'smoke');cli(['create',dir,'--template','water-system-explainer','--prompt','Silent process explainer','--duration','6','--width','360','--height','640','--fps','24']);
    cli(['qa',dir]);const q=JSON.parse(await readFile(path.join(dir,'output/qa/report.json')));
    assert.equal(q.technicalPassed,true);assert.equal(q.seekDifference,0);assert.equal(new Set(q.samples.map(s=>s.state.beat)).size,11);assert.ok(q.samples.every(s=>s.state.renderer==='svg'&&s.state.elements>50));assert.ok(q.contactSheets.length>1);
    const result=JSON.parse(cli(['render',dir]).stdout);assert.equal(result.frames,144);assert.equal(result.verified.streams.filter(s=>s.codec_type==='audio').length,0);
    const output=path.join(dir,'output/video.mp4'),before=await readFile(output);
    const checks=Object.fromEntries(['subjectFidelity','materialsLighting','composition','motionContinuity','transitions','lateMotion'].map(k=>[k,true]));
    await writeFile(path.join(dir,'review.json'),JSON.stringify({sourceHash:q.sourceHash,checks,evidence:q.samples.slice(0,3).map(s=>'output/qa/'+s.file),notes:'Synthetic test fixture deliberately missing the three required narrative checks.'}));
    cli(['render',dir,'--final','--force'],false);assert.deepEqual(await readFile(output),before);
    const story=JSON.parse(await readFile(path.join(dir,'storyboard.json')));story.beats[2].start+=0.1;await writeFile(path.join(dir,'storyboard.json'),JSON.stringify(story));
    cli(['render',dir,'--force'],false);assert.deepEqual(await readFile(output),before);
  }finally{await rm(base,{recursive:true,force:true});}
});
