import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {loadProject} from '../scripts/lib/project.mjs';
import {openCapture} from '../scripts/lib/browser.mjs';
import {difference} from '../scripts/lib/qa.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));

test('multi-reference stories, chart geometry, typography and scene roots seek and encode on the current runtime',{timeout:300000},async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'unrealmotion-dynamic-')),dir=path.join(base,'film'),software=Boolean(process.env.CI);
  function cli(args,success=true){const r=spawnSync(process.execPath,['scripts/unrealmotion.mjs',...args,...(software?['--software']:[])],{cwd:root,encoding:'utf8',timeout:240000});if(success)assert.equal(r.status,0,r.stderr+r.stdout);else assert.notEqual(r.status,0);return r;}
  try{
    await cp(path.join(root,'examples/dynamic-water'),dir,{recursive:true,filter:src=>!['output','.DS_Store'].includes(path.basename(src))});
    await cp(path.join(root,'assets/runtime'),path.join(dir,'runtime'),{recursive:true});
    const config=JSON.parse(await readFile(path.join(dir,'project.json')));Object.assign(config,{duration:6,width:360,height:640,fps:24});await writeFile(path.join(dir,'project.json'),JSON.stringify(config));
    const story=JSON.parse(await readFile(path.join(dir,'storyboard.json')));story.duration=6;
    for(const beat of story.beats){beat.start*=6/32;beat.end*=6/32;beat.markers=beat.markers?.map(t=>t*6/32);if(beat.transition)beat.transition.duration*=6/32;}
    for(const knot of story.cameraPath)knot.time*=6/32;
    await writeFile(path.join(dir,'storyboard.json'),JSON.stringify(story));
    const model=await readFile(path.join(dir,'model.mjs'),'utf8');
    await writeFile(path.join(dir,'model.mjs'),model.replace('const note=document.createElement',`await createDataGraphic(stage,{id:'rank-test',type:'race',title:'Rank fixture',unit:'L/hari',data:'data/race.json',domain:[0,200],illustrative:true,scene:'system',beats:['pressure'],start:byId.pressure.start,end:byId.pressure.end,enter:.1,timeScale:32/6});\n  const note=document.createElement`));
    cli(['qa',dir]);const qa=JSON.parse(await readFile(path.join(dir,'output/qa/report.json')));
    assert.equal(qa.technicalPassed,true);assert.ok(qa.seekDifference<=.05);assert.equal(new Set(qa.samples.map(s=>s.state.beat)).size,10);assert.ok(qa.samples.every(s=>s.state.activeScenes.length===2&&s.state.cameraMode==='continuous-world'));
    assert.deepEqual(new Set(qa.samples.flatMap(s=>s.state.graphics.filter(g=>g.active).map(g=>g.type))),new Set(['race','counter','bar','line','donut']));
    const capture=await openCapture(await loadProject(dir),{software});
    try{
      const a=await capture.frame(96);await capture.frame(12);await capture.frame(130);const b=await capture.frame(96);assert.ok(difference(a,b)<=.05);
      const bars=await capture.page.evaluate(()=>[...document.querySelectorAll('[data-chart-id="daily-use"] g[data-id]')].map(g=>({id:g.dataset.id,value:Number(g.dataset.value),width:Number(g.querySelector('rect').getAttribute('width')),label:g.querySelectorAll('text')[1].textContent})));
      assert.equal(bars[0].value,180);assert.equal(bars[0].label,'180');assert.ok(Math.abs(bars[0].width/bars[1].width-2)<1e-10);
      await capture.frame(59);const meter=await capture.page.evaluate(()=>window.__unrealmotion.inspect());assert.deepEqual(meter.activeScenes,['system','meter']);assert.ok(meter.meterBezelOpen>1);
      await capture.frame(77);const closing=await capture.page.evaluate(()=>window.__unrealmotion.inspect());assert.equal(closing.meterFlow,0);assert.ok(closing.assembly.some(p=>p.assemblyError>0));
      await capture.frame(81);assert.ok((await capture.page.evaluate(()=>window.__unrealmotion.inspect())).meterAlignmentError<1e-9);assert.ok((await capture.page.evaluate(()=>window.__unrealmotion.inspect())).assembly.every(p=>p.assemblyError<1e-9));
      await capture.frame(36);const race=await capture.page.evaluate(()=>window.__unrealmotion.inspect().graphics.find(g=>g.id==='rank-test'));assert.ok(race.values.some(v=>v.rank>0&&v.rank<1));
      await capture.frame(100);const spatial=await capture.page.evaluate(()=>({transform:document.querySelector('#story-visual').style.transform,x:document.querySelector('[data-chart-id="daily-use"]').getBoundingClientRect().x}));
      await capture.frame(109);const next=await capture.page.evaluate(()=>({transform:document.querySelector('#story-visual').style.transform,x:document.querySelector('[data-chart-id="daily-use"]').getBoundingClientRect().x}));
      assert.equal(spatial.transform,next.transform);assert.ok(Math.abs(spatial.x-next.x)>1);
      // Preview scales the whole stage. Reserved word widths must remain in design pixels.
      await capture.page.setViewportSize({width:240,height:430});await capture.frame(74);
      const words=await capture.page.evaluate(()=>[...document.querySelectorAll('#copy .um-word')].every(e=>e.offsetWidth<=e.parentElement.offsetWidth+1));assert.equal(words,true);assert.equal(await capture.page.evaluate(()=>getComputedStyle(document.querySelector('.um-kinetic')).display),'none');
    }finally{await capture.close();}
    const result=JSON.parse(cli(['render',dir]).stdout);assert.equal(result.frames,144);assert.equal(result.verified.streams.filter(s=>s.codec_type==='audio').length,0);
    const before=await readFile(path.join(dir,'output/video.mp4'));
    const checks=Object.fromEntries(['subjectFidelity','materialsLighting','composition','motionContinuity','transitions','lateMotion','explanation','causalMotion','shotContinuity','promptFidelity','assetConsistency','reconstruction3D','dynamicPacing','kineticText','multiAssetContinuity','continuousCamera','assemblyFit'].map(k=>[k,true]));
    await writeFile(path.join(dir,'review.json'),JSON.stringify({sourceHash:qa.sourceHash,checks,evidence:qa.samples.slice(0,3).map(s=>'output/qa/'+s.file),notes:'Negative fixture: deliberately omits dataAccuracy despite registered chart graphics.'}));
    cli(['render',dir,'--final','--force'],false);assert.deepEqual(await readFile(path.join(dir,'output/video.mp4')),before);
  }finally{await rm(base,{recursive:true,force:true});}
});
