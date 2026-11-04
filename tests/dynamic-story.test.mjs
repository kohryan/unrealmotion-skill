import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {handoff,readingSeconds,transitionSpec,sampleCameraPath} from '../assets/runtime/editorial.mjs';
import {fragmentState,splitText} from '../assets/runtime/typography.mjs';
import {prepareData,sampleData,linePath,parseCSV,dataFromCSV,formatValue} from '../assets/runtime/dataviz.mjs';
import {validateStoryboard,storyState} from '../assets/runtime/story.mjs';
import {loadProject,sampleFrames} from '../scripts/lib/project.mjs';

const row=(id,value)=>({id,label:id,value});
const camera=x=>({x,y:1,scale:1,position:[x,3,12],target:[x,1,0]});
const story=()=>({version:2,pace:'dynamic',duration:6,scenes:[{id:'world'}],beats:[0,1,2].map(i=>({id:`b${i}`,scene:'world',assets:[i?'detail':'overview'],start:i*2,end:i*2+2,caption:'Aliran terbaca.',detail:'Data ilustratif.',purpose:'Explain a measurement.',action:'Open, measure, close.',camera:camera(i),text:{preset:'words'},transition:{type:'camera',duration:.6}}))});

test('CSV preserves quoted fields and missing observations, and rejects malformed numeric inputs',()=>{
  const csv='\uFEFFid,label,value\r\na,"Kamar, mandi",12\r\nb,"Nama ""B""",\r\n';
  assert.deepEqual(parseCSV(csv),[{id:'a',label:'Kamar, mandi',value:'12'},{id:'b',label:'Nama "B"',value:''}]);
  const data=dataFromCSV(csv);assert.equal(data.frames[0].values[1].value,null);
  for(const bad of ['id,id\na,1','id,value\na,1,extra','id,value\na,"broken'])assert.throws(()=>parseCSV(bad));
  assert.throws(()=>dataFromCSV('id,value\na,not-a-number'));
});

test('data validation guards the zero baseline, exact domains, stable identities and donut totals',()=>{
  const input=[row('a',12),row('b',-4)];
  assert.deepEqual(prepareData(input).domain,[-4,12]);
  assert.throws(()=>prepareData(input,{domain:[0,12]}),/clipped/);
  assert.throws(()=>prepareData([row('a',12)],{domain:[5,15]}),/zero/);
  assert.throws(()=>prepareData([row('a',NaN)]),/finite/);
  assert.throws(()=>prepareData([row('a',1),row('a',2)]),/unique/);
  assert.throws(()=>prepareData({frames:[{time:0,values:[row('a',1)]},{time:1,values:[row('b',2)]}]}),/category ids/);
  assert.throws(()=>prepareData([row('a',-1),row('b',2)],{type:'donut'}),/negative/);
  assert.throws(()=>prepareData([row('a',60),row('b',30)],{type:'donut',unit:'%'}),/100/);
  assert.deepEqual(prepareData([row('a',60),row('b',40)],{type:'donut',unit:'%'}).ids,['a','b']);
});

test('unrepresentable numeric ranges and overflowing donut totals fail before drawing',()=>{
  assert.throws(()=>prepareData([{id:'a',label:'A',value:-1e308},{id:'b',label:'B',value:1e308}],{type:'bar'}),/Domain/);
  assert.throws(()=>prepareData([{id:'a',label:'A',value:1e308},{id:'b',label:'B',value:1e308}],{type:'donut'}),/finite total/);
});

test('value and rank interpolation are seekable, continuous, and keep a fixed scale',()=>{
  const data=prepareData({frames:[{time:0,values:[row('a',10),row('b',30)]},{time:2,values:[row('b',5),row('a',40)]}]},{type:'race'});
  const middle=sampleData(data,1);assert.equal(middle[0].value,25);assert.equal(middle[0].rank,.5);
  assert.deepEqual(sampleData(data,0).map(x=>x.value),[10,30]);assert.deepEqual(sampleData(data,2).map(x=>x.value),[40,5]);
  sampleData(data,9);sampleData(data,-1);assert.deepEqual(sampleData(data,1),middle);
  assert.deepEqual(data.domain,[0,40]);
  assert.ok(Math.abs(sampleData(data,1-1e-7)[0].rank-sampleData(data,1+1e-7)[0].rank)<1e-5);
});

test('line data preserves gaps instead of connecting missing values, and labels format exact rounded values',()=>{
  const data=prepareData([row('a',1),row('b',null),row('c',3)],{type:'line'});
  assert.equal(linePath(sampleData(data,0),x=>x,y=>y),'M0,1M2,3');
  assert.equal(formatValue(1287.4013),'1.287');assert.equal(formatValue(12.35,{unit:'L',decimals:1}),'12,4 L');
  assert.equal(formatValue(-.001), '0');assert.equal(formatValue(null),'—');
  assert.throws(()=>formatValue(Infinity));
});

test('mirrored slide and zoom handoffs have matching nonzero signed velocity at the cut',()=>{
  const h=1e-6,cut=2;
  for(const type of ['slide','push','pull']){
    const spec={type,cut,duration:.48,travel:.1,axis:'x',direction:-1,blur:6};
    const key=type==='slide'?'x':'scale';
    const exit=(handoff(spec,cut-h)[key]-handoff(spec,cut-2*h)[key])/h;
    const entry=(handoff(spec,cut+2*h)[key]-handoff(spec,cut+h)[key])/h;
    assert.ok(Math.abs(exit)>.5);assert.ok(Math.abs(exit-entry)<1e-3);
    assert.equal(Math.sign(entry),type==='push'?1:-1);
  }
});

test('modern camera travel starts before the boundary and remains continuous through it',()=>{
  const s=story();validateStoryboard(s,6);
  assert.equal(storyState(s,1.5).camera.x,0);assert.ok(storyState(s,1.9).camera.x>0);
  assert.equal(storyState(s,2).camera.x,.5);assert.equal(storyState(s,2.4).camera.x,1);
  assert.ok(Math.abs(storyState(s,2-1e-7).camera.x-storyState(s,2+1e-7).camera.x)<1e-5);
  assert.equal(transitionSpec(s,s.beats.length),null);
  const mid=storyState(s,3);storyState(s,0);assert.deepEqual(storyState(s,3),mid);
  assert.equal(storyState(s,6).beat.id,'b2');
  s.beats[0].text.layout='hero';assert.equal(storyState(s,1.5).captionOpacity,1);assert.equal(storyState(s,1.9).captionOpacity,0);assert.equal(storyState(s,2).captionOpacity,1);
});

test('story validation rejects unknown scenes, opposing-sign values, oversized seams and invalid text',()=>{
  for(const edit of [s=>s.beats[1].scene='missing',s=>s.beats[1].transition.direction=0,s=>s.beats[1].transition.duration=4,s=>s.beats[1].text.preset='unknown',s=>s.beats[1].markers=[0]]){
    const s=story();edit(s);assert.throws(()=>validateStoryboard(s,6));
  }
  const s=story();s.scenes.push({id:'other'});s.beats[1].scene='other';assert.throws(()=>validateStoryboard(s,6),/different scene/);
  s.beats[1].transition.type='slide';s.beats[2].transition.type='slide';validateStoryboard(s,6);
});

test('kinetic text keeps grapheme clusters intact, caps long character cascades, and ends settled',()=>{
  assert.deepEqual(splitText('A👨‍👩‍👧‍👦','characters'),['A','👨‍👩‍👧‍👦']);
  assert.deepEqual(splitText('A long headline with many characters','characters'),['A','long','headline','with','many','characters']);
  const end=fragmentState(2,0,5,6,'impact');assert.equal(end.y,0);assert.equal(end.scale,1);assert.equal(end.opacity,1);
  const start=fragmentState(0,0,0,4);assert.equal(start.opacity,0);
  const mid=fragmentState(.15,0,1,4);fragmentState(3,0,1,4);assert.deepEqual(fragmentState(.15,0,1,4),mid);
  assert.equal(readingSeconds('Satu aliran terukur'),1.2);
});

test('QA sampling includes the exact cut, both seam edges, and authored action extremes',()=>{
  const s=story();s.beats[1].markers=[3.2];const frames=sampleFrames({duration:6,fps:30},s);
  for(const f of [51,60,69,95,96,97])assert.ok(frames.includes(f),`missing ${f}`);
});

test('multi-image contracts reject duplicate images, missing prompts, bad hashes and unbound shots',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'um-multi-'));
  try{
    await mkdir(path.join(root,'assets'));
    const images=[];
    for(let i=0;i<2;i++){const png=new PNG({width:2,height:2});png.data.fill(i?120:255);const bytes=PNG.sync.write(png),file=`assets/ref-${i}.png`;await writeFile(path.join(root,file),bytes);images.push({id:i?'detail':'overview',path:file,sha256:createHash('sha256').update(bytes).digest('hex'),prompt:'Synthetic test fixture, not production artwork.'});}
    const config={mode:'explainer',template:'imagegen-explainer',assetStrategy:'multi',motion:'cinematic-orbit',prompt:'A test',width:360,height:640,duration:6,fps:30,supersample:1};
    const reconstruction={status:'authored',reference:images[0].path,parts:[{id:'hero'}],references:images.map(a=>({id:a.id,path:a.path,parts:['hero']}))};
    const save=async(name,data)=>writeFile(path.join(root,name),JSON.stringify(data));
    await save('project.json',config);await save('storyboard.json',story());await save('reconstruction.json',reconstruction);await save('asset-plan.json',{assets:images});await writeFile(path.join(root,'model.mjs'),'// synthetic fixture');
    assert.equal((await loadProject(root)).storyboard.version,2);
    await save('asset-plan.json',{assets:images.map(a=>({...a,sha256:'bad'}))});await assert.rejects(loadProject(root),/hash/);
    await save('asset-plan.json',{assets:images.map(a=>({...a,prompt:''}))});await assert.rejects(loadProject(root),/prompt/);
    await save('asset-plan.json',{assets:images});const unbound=story();unbound.beats[0].assets=['unknown'];await save('storyboard.json',unbound);await assert.rejects(loadProject(root),/Bind/);
    await save('storyboard.json',story());await writeFile(path.join(root,images[1].path),PNG.sync.write(new PNG({width:2,height:2,fill:true})));
    const duplicate=structuredClone(reconstruction);duplicate.references[1].path=duplicate.references[0].path;await save('reconstruction.json',duplicate);await assert.rejects(loadProject(root),/same image/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('continuous camera knots preserve position, zoom and roll velocity and reject incomplete paths',()=>{
  const knots=[{time:0,position:[0,3,18],target:[0,1,0],scale:1},{time:2,position:[3,4,17],target:[2,1,1],scale:2,roll:.05},{time:6,position:[8,3,18],target:[7,1,1],scale:1.2}];
  const h=1e-5;
  const a=sampleCameraPath(knots,2-h),b=sampleCameraPath(knots,2),c=sampleCameraPath(knots,2+h);
  for(const key of ['scale','roll'])assert.ok(Math.abs((b[key]-a[key])/h-(c[key]-b[key])/h)<1e-4);
  for(let i=0;i<3;i++)assert.ok(Math.abs((b.position[i]-a.position[i])/h-(c.position[i]-b.position[i])/h)<1e-4);
  assert.ok(Math.abs(c.position[0]-a.position[0])>h);sampleCameraPath(knots,0);assert.deepEqual(sampleCameraPath(knots,2),b);
  const s=story();s.continuous=true;s.cameraPath=knots;validateStoryboard(s,6);assert.equal(storyState(s,2).transition.type,'world');
  const frames=sampleFrames({duration:6,fps:30},s);for(const f of [59,60,61])assert.ok(frames.includes(f));
  s.cameraPath=knots.slice(0,2);assert.throws(()=>validateStoryboard(s,6),/complete story/);
});
