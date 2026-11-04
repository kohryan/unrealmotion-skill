import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateStoryboard, storyState, waterSystemAt, rampIntegral} from '../assets/runtime/story.mjs';
import {sampleFrames, validateConfig} from '../scripts/lib/project.mjs';

const story=JSON.parse(await readFile(new URL('../assets/scenes/water-system-explainer.storyboard.json',import.meta.url)));
test('storyboard covers the entire 60-second explanation with stable ids and rejects gaps, overlaps and missing causes',()=>{
  assert.equal(validateStoryboard(story,60),story);
  for(const edit of [s=>s.beats[2].start+=0.1,s=>s.beats[3].end+=1,s=>s.beats[1].id=s.beats[0].id,s=>s.beats[1].action='',s=>s.beats[0].camera.scale=0]){
    const copy=structuredClone(story);edit(copy);assert.throws(()=>validateStoryboard(copy,60));
  }
  assert.throws(()=>validateStoryboard(story,59));
});
test('camera has no position jump at beat boundaries and independently repeats after random seeks',()=>{
  for(const beat of story.beats.slice(1)){
    const a=storyState(story,beat.start-1e-7),b=storyState(story,beat.start+1e-7);
    for(const key of ['x','y','scale'])assert.ok(Math.abs(a.camera[key]-b.camera[key])<1e-5);
  }
  const direct=storyState(story,35.4);storyState(story,59);storyState(story,0);assert.deepEqual(storyState(story,35.4),direct);
  assert.equal(storyState(story,60).beat.id,'recap');assert.equal(storyState(story,0).captionOpacity,1);
});
test('Three.js camera targets and positions interpolate without boundary jumps and reject incomplete views',()=>{
  const s=structuredClone(story);s.beats.forEach((b,i)=>Object.assign(b.camera,{position:[i,2,10],target:[i,1,0]}));validateStoryboard(s,60);
  for(const b of s.beats.slice(1))for(const k of ['position','target']){
    const before=storyState(s,b.start-1e-7).camera[k],after=storyState(s,b.start+1e-7).camera[k];
    assert.ok(before.every((v,i)=>Math.abs(v-after[i])<1e-5));
  }
  delete s.beats[1].camera.target;assert.throws(()=>validateStoryboard(s,60),/Invalid 3D camera/);
});
test('controller stops rotor/transport together, level falls during use and restart continues without time-history dependence',()=>{
  const offA=waterSystemAt(41),offB=waterSystemAt(45);assert.equal(offA.pump,0);assert.equal(offA.travel,offB.travel);assert.equal(offA.impellerAngle,offB.impellerAngle);
  assert.ok(waterSystemAt(49).level<waterSystemAt(43).level);assert.equal(waterSystemAt(52).pump,1);assert.ok(waterSystemAt(55).travel>offB.travel);
  const state=waterSystemAt(58);waterSystemAt(0);assert.deepEqual(waterSystemAt(58),state);
  const h=1e-4;assert.ok((rampIntegral(8+h,8)-rampIntegral(8,8))/h<1e-8);
});
test('QA samples each real scene boundary and midpoint, including a late moving interval',()=>{
  const c=validateConfig({mode:'explainer',width:1080,height:1920,fps:30,duration:60,supersample:1,motion:'cinematic-orbit',prompt:'A silent visual explanation'});
  const frames=sampleFrames(c,story);assert.equal(frames.at(-1),1799);
  for(const b of story.beats.slice(1)){assert.ok(frames.includes(b.start*30-2));assert.ok(frames.includes(b.start*30+2));assert.ok(frames.includes(Math.round((b.start+b.end)/2*30)));}
  assert.ok(frames.includes(Math.round(1799*0.78)));assert.ok(frames.includes(Math.round(1799*0.84)));
});
