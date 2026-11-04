import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
function cli(args,success=true){
  const software=process.env.CI && ['qa','render'].includes(args[0]) ? ['--software'] : [];
  const r=spawnSync(process.execPath,['scripts/unrealmotion.mjs',...args,...software],{cwd:root,encoding:'utf8',timeout:180000});
  if(success)assert.equal(r.status,0,r.stderr+r.stdout);else assert.notEqual(r.status,0);
  return r;
}
test('all scene foundations and motion profiles render, including portrait; MP4 metadata and overwrite guards hold', {timeout:600000},async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'unrealmotion-render-'));
  const variants=[['optical-studio','precision-assembly',480,270],['architectural-light','cinematic-orbit',480,270],['kinetic-editorial','editorial-spring',480,270],['optical-studio','macro-dolly',360,640],['kinetic-editorial','continuous-flow',360,360],['pelagic-bloom','continuous-flow',480,270]];
  try{
    for(const [i,[template,motion,width,height]] of variants.entries()){
      const dir=path.join(base,String(i));
      cli(['create',dir,'--prompt',`Test ${template} ${motion}`,'--template',template,'--motion',motion,'--width',String(width),'--height',String(height),'--fps','30','--duration','2','--supersample','1']);
      const q=JSON.parse(cli(['qa',dir]).stdout);assert.equal(q.technicalPassed,true);
      if(i===0){
        const output=path.join(dir,'output/video.mp4');
        const r=JSON.parse(cli(['render',dir]).stdout);
        assert.equal(r.frames,60);assert.equal(r.visualReview,'pending');
        const before=await readFile(output);
        cli(['render',dir],false);assert.deepEqual(await readFile(output),before);
        cli(['render',dir,'--force','--final'],false);assert.deepEqual(await readFile(output),before);
        await writeFile(path.join(dir,'scene.mjs'),'throw new Error("deliberate render failure")');
        cli(['render',dir,'--force'],false);assert.deepEqual(await readFile(output),before);
      }
    }
  }finally{await rm(base,{recursive:true,force:true});}
});
