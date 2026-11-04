import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('mechanical reassembly has stable part identities, meaningful displacement and zero final local alignment error',{timeout:180000},async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'unrealmotion-assembly-')),dir=path.join(base,'film');
  const root=fileURLToPath(new URL('../',import.meta.url));
  function cli(args){const r=spawnSync(process.execPath,['scripts/unrealmotion.mjs',...args],{cwd:root,encoding:'utf8',timeout:120000});assert.equal(r.status,0,r.stdout+r.stderr);}
  try{
    cli(['create',dir,'--prompt','Thrust bearing reassembly','--template','mechanical-reassembly','--motion','precision-assembly','--width','640','--height','360','--duration','2','--fps','30','--supersample','1']);
    cli(['qa',dir,...(process.env.CI?['--software']:[])]);
    const report=JSON.parse(await readFile(path.join(dir,'output/qa/report.json')));
    const first=report.samples[0].state.parts,last=report.samples.at(-1).state.parts;
    assert.equal(last.length,20);assert.equal(new Set(last.map(p=>p.id)).size,20);
    assert.ok(first.some(p=>p.assemblyError>1));assert.ok(last.every(p=>p.assemblyError<1e-9));
    assert.deepEqual(first.map(p=>p.id),last.map(p=>p.id));assert.ok(report.lateChange>0.12);
  }finally{await rm(base,{recursive:true,force:true});}
});
