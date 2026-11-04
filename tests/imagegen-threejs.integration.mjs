import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {loadProject} from '../scripts/lib/project.mjs';
import {openCapture} from '../scripts/lib/browser.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
test('saved ImageGen reference becomes seekable Three.js volumes, a complete silent story and reassembled mechanism',{timeout:240000},async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'unrealmotion-imagegen3d-')),dir=path.join(base,'film');
  const software=Boolean(process.env.CI);
  function cli(args,success=true){const r=spawnSync(process.execPath,['scripts/unrealmotion.mjs',...args,...(software?['--software']:[])],{cwd:root,encoding:'utf8',timeout:180000});if(success)assert.equal(r.status,0,r.stderr+r.stdout);else assert.notEqual(r.status,0);return r;}
  try{
    await cp(path.join(root,'examples/water-imagegen-threejs'),dir,{recursive:true,filter:src=>path.basename(src)!=='output'});
    await cp(path.join(root,'assets/runtime'),path.join(dir,'runtime'),{recursive:true});
    const c=JSON.parse(await readFile(path.join(dir,'project.json')));Object.assign(c,{width:360,height:640,fps:24,duration:6,supersample:1});await writeFile(path.join(dir,'project.json'),JSON.stringify(c));
    const story=JSON.parse(await readFile(path.join(dir,'storyboard.json')));story.duration=6;story.beats.forEach(b=>{b.start/=10;b.end/=10;});await writeFile(path.join(dir,'storyboard.json'),JSON.stringify(story));
    cli(['qa',dir]);const q=JSON.parse(await readFile(path.join(dir,'output/qa/report.json')));
    assert.equal(q.technicalPassed,true);assert.ok(q.seekDifference<=.05);assert.equal(new Set(q.samples.map(s=>s.state.beat)).size,11);
    assert.ok(q.samples.every(s=>s.state.renderer==='threejs'&&s.state.volumes>20&&s.state.modelKind==='named-threejs-volumes'));
    const capture=await openCapture(await loadProject(dir),{software});
    try{
      await capture.frame(32);const open=await capture.page.evaluate(()=>window.__unrealmotion.inspect());assert.ok(open.coverOpen>.9);assert.equal(open.impellerBlades,6);
      await capture.frame(100);const off=await capture.page.evaluate(()=>window.__unrealmotion.inspect());assert.equal(off.system.pump,0);assert.equal(off.coverAlignmentError,0);assert.ok(off.coverAxialGap<1e-9);
      await capture.frame(126);const restart=await capture.page.evaluate(()=>window.__unrealmotion.inspect());assert.ok(restart.system.pump>.99);assert.ok(restart.system.level<off.system.level);assert.equal(restart.coverAlignmentError,0);
    }finally{await capture.close();}
    const result=JSON.parse(cli(['render',dir]).stdout);assert.equal(result.frames,144);assert.equal(result.verified.streams.filter(s=>s.codec_type==='audio').length,0);
    const before=await readFile(path.join(dir,'output/video.mp4'));
    const checks=Object.fromEntries(['subjectFidelity','materialsLighting','composition','motionContinuity','transitions','lateMotion','explanation','causalMotion','shotContinuity','promptFidelity','assetConsistency'].map(k=>[k,true]));
    await writeFile(path.join(dir,'review.json'),JSON.stringify({sourceHash:q.sourceHash,checks,evidence:q.samples.slice(0,3).map(s=>'output/qa/'+s.file),notes:'Synthetic negative fixture: deliberately missing the required multi-angle 3D reconstruction review.'}));
    cli(['render',dir,'--final','--force'],false);assert.deepEqual(await readFile(path.join(dir,'output/video.mp4')),before);
  }finally{await rm(base,{recursive:true,force:true});}
});
