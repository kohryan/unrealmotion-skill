import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, mkdir, symlink, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PNG} from 'pngjs';
import {smoother, spring, random, cameraMotion, profiles} from '../assets/runtime/motion.mjs';
import {validateConfig, sourceHash, confinedFile, sampleFrames} from '../scripts/lib/project.mjs';
import {difference, imageStats} from '../scripts/lib/qa.mjs';

const config = {width:1920,height:1080,fps:60,duration:12,supersample:1.5,motion:'cinematic-orbit',prompt:'A detailed camera'};
test('format validation prevents fractional frames, unsafe dimensions and unknown profiles', () => {
  assert.equal(validateConfig(config),config);
  for (const bad of [{width:1919},{fps:0},{duration:0.001},{duration:NaN},{supersample:3},{motion:'toString'},{prompt:''}]) assert.throws(() => validateConfig({...config,...bad}));
  const frames=sampleFrames(config);assert.equal(frames[0],0);assert.equal(frames.at(-1),719);
});
test('easing has smooth endpoints and analytic springs settle without requiring earlier frames', () => {
  assert.equal(smoother(0),0);assert.equal(smoother(1),1);
  assert.ok(smoother(0.001)<1e-7);assert.ok(1-smoother(0.999)<1e-7);
  assert.equal(spring(-1),0);assert.ok(Math.abs(spring(3)-1)<1e-9);
  assert.ok(Math.abs(spring(3,2,1)-1)<1e-9);
  const direct=spring(0.6);spring(0.9);spring(0.1);assert.equal(spring(0.6),direct);
  assert.throws(() => spring(1,0,0));
});
test('seeded construction repeats and camera state is independently seekable for every profile', () => {
  const a=random(73),b=random(73);assert.deepEqual(Array.from({length:10},a),Array.from({length:10},b));
  for (const profile of Object.keys(profiles)) {
    let position;const camera={position:{set(...v){position=v;}},lookAt(){}};
    const options={profile,radius:9,target:{x:0,y:1,z:0},aspect:16/9};
    cameraMotion(camera,{...options,u:0.7});const expected=[...position];
    cameraMotion(camera,{...options,u:0});cameraMotion(camera,{...options,u:0.7});
    assert.deepEqual(position,expected);assert.ok(position.every(Number.isFinite));
  }
});
test('source hash ignores generated output, detects source edits and rejects symlink escapes', async () => {
  const dir=await mkdtemp(path.join(tmpdir(),'um-hash-'));
  try {
    await writeFile(path.join(dir,'scene.mjs'),'first');const first=await sourceHash(dir);
    await mkdir(path.join(dir,'output'));await writeFile(path.join(dir,'output/video.mp4'),'video');assert.equal(await sourceHash(dir),first);
    await writeFile(path.join(dir,'scene.mjs'),'second');assert.notEqual(await sourceHash(dir),first);
    assert.equal(await confinedFile(dir,'scene.mjs'),path.join(await realpath(dir),'scene.mjs'));
    await assert.rejects(confinedFile(dir,'../outside'));
    await symlink('/etc/hosts',path.join(dir,'escape'));await assert.rejects(confinedFile(dir,'escape'));await assert.rejects(sourceHash(dir));
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('pixel checks distinguish blank, visible and changed frames', () => {
  const p=new PNG({width:8,height:8,fill:true});p.data.fill(255);const white=PNG.sync.write(p);
  assert.ok(imageStats(white).deviation<1e-5);assert.equal(difference(white,white),0);
  p.data.fill(0);for(let i=3;i<p.data.length;i+=4)p.data[i]=255;const black=PNG.sync.write(p);
  assert.equal(difference(white,black),255);
});
