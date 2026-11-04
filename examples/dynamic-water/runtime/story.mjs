import {clamp, mix, progress, smoother} from './motion.mjs';
import {editorialState, paces, transitionTypes, transitionSpec, sampleCameraPath} from './editorial.mjs';
import {textPresets} from './typography.mjs';

export function validateStoryboard(story, duration) {
  if (!story || !Array.isArray(story.beats) || story.beats.length < 3) throw new Error('An explainer needs at least three authored beats');
  if (story.pace !== undefined && !paces.includes(story.pace)) throw new Error('Unknown story pace');
  if (story.version !== undefined && ![1,2].includes(story.version)) throw new Error('Unsupported storyboard version');
  const scenes = new Set();
  for (const scene of story.scenes || []) {
    if (!scene.id || typeof scene.id !== 'string' || scenes.has(scene.id)) throw new Error('Scene ids must be unique strings');
    scenes.add(scene.id);
  }
  if (story.version === 2 && !scenes.size) throw new Error('Version 2 needs named scene contexts');
  if(story.continuous!==undefined&&typeof story.continuous!=='boolean')throw new Error('continuous must be a boolean');
  if(story.continuous && !story.cameraPath)throw new Error('Continuous stories require an authored cameraPath');
  if(story.cameraPath){
    if(story.version!==2||!Array.isArray(story.cameraPath)||story.cameraPath.length<2)throw new Error('Invalid camera path');
    let previous=-1;
    for(const knot of story.cameraPath){
      if(!Number.isFinite(knot.time)||knot.time<0||knot.time<=previous||knot.time>duration||!Number.isFinite(knot.scale)||knot.scale<=0||!['position','target'].every(k=>Array.isArray(knot[k])&&knot[k].length===3&&knot[k].every(Number.isFinite))||(knot.roll!==undefined&&!Number.isFinite(knot.roll)))throw new Error('Invalid timed camera knot');
      if(Math.hypot(...knot.position.map((v,i)=>v-knot.target[i]))<.1)throw new Error('Camera must remain outside its target');
      previous=knot.time;
    }
    if(story.cameraPath[0].time!==0||story.cameraPath.at(-1).time!==duration)throw new Error('Camera path must cover the complete story');
  }
  for(const scene of story.scenes||[])if(scene.position&&(!Array.isArray(scene.position)||scene.position.length!==3||!scene.position.every(Number.isFinite)))throw new Error('Invalid world scene position');
  const ids = new Set(); let cursor = 0;
  for (const beat of story.beats) {
    if (typeof beat.id !== 'string' || !beat.id || ids.has(beat.id)) throw new Error('Storyboard beat ids must be unique');
    ids.add(beat.id);
    if (![beat.start, beat.end].every(Number.isFinite) || Math.abs(beat.start - cursor) > 1e-6 || beat.end <= beat.start || beat.end > duration + 1e-6) throw new Error(`Storyboard gap, overlap or invalid range: ${beat.id}`);
    for (const field of ['caption','detail','action','purpose']) if (typeof beat[field] !== 'string' || !beat[field].trim()) throw new Error(`Missing ${field} in beat ${beat.id}`);
    if (!beat.camera || !['x','y','scale'].every(k => Number.isFinite(beat.camera[k])) || beat.camera.scale <= 0) throw new Error(`Invalid camera in beat ${beat.id}`);
    if(beat.camera.position || beat.camera.target) for(const field of ['position','target']) if(!Array.isArray(beat.camera[field])||beat.camera[field].length!==3||!beat.camera[field].every(Number.isFinite))throw new Error(`Invalid 3D camera ${field} in beat ${beat.id}`);
    if (story.version === 2 && !scenes.has(beat.scene)) throw new Error(`Unknown scene in beat ${beat.id}`);
    if (beat.assets !== undefined && (!Array.isArray(beat.assets) || !beat.assets.length || !beat.assets.every(x=>typeof x==='string'&&x))) throw new Error(`Invalid asset references in ${beat.id}`);
    if (beat.text && (!textPresets.includes(beat.text.preset || 'words') || !['caption','hero','side'].includes(beat.text.layout || 'caption') || (beat.text.emphasis !== undefined && (!Array.isArray(beat.text.emphasis) || !beat.text.emphasis.every(x=>typeof x==='string'))))) throw new Error(`Invalid text direction in ${beat.id}`);
    for (const time of beat.markers || []) if (!Number.isFinite(time) || time < beat.start || time > beat.end) throw new Error(`Action marker outside ${beat.id}`);
    cursor = beat.end;
  }
  for (let i=1;i<story.beats.length;i++) if ((!story.continuous && story.version===2) || story.beats[i].transition) {
    const spec=transitionSpec(story,i),before=story.beats[i-1],after=story.beats[i];
    if (!transitionTypes.includes(spec.type) || !['x','y'].includes(spec.axis) || ![-1,1].includes(spec.direction) || !Number.isFinite(spec.duration) || spec.duration<=0 || spec.duration>Math.min(before.end-before.start,after.end-after.start) || !Number.isFinite(spec.travel) || spec.travel<0 || spec.travel>.2 || !Number.isFinite(spec.blur) || spec.blur<0 || spec.blur>12) throw new Error(`Invalid transition into ${after.id}`);
    if (spec.type==='camera' && before.scene!==after.scene) throw new Error(`Use a match/slide/zoom for different scene roots: ${after.id}`);
  }
  if (Math.abs(cursor - duration) > 1e-6) throw new Error('Storyboard must cover the complete video duration');
  return story;
}

export function storyState(story, seconds) {
  const time = clamp(seconds, 0, story.beats.at(-1).end);
  const index = Math.max(0, story.beats.findIndex(b => time < b.end));
  const i = time >= story.beats.at(-1).end ? story.beats.length - 1 : index;
  const beat = story.beats[i], previous = story.beats[Math.max(0, i - 1)];
  if (story.version===2) {
    const direction=story.cameraPath?{camera:sampleCameraPath(story.cameraPath,time),transition:{active:false,type:'world',x:0,y:0,scale:1,blur:0},scene:beat.scene}:editorialState(story,time,i);
    const composed=!story.continuous&&i>0&&transitionSpec(story,i).type!=='camera';
    const seam=direction.transition;
    // Clear a title's reserved space before a close-up moves into it.
    const exitingTitle=beat.text?.layout && beat.text.layout!=='caption' && seam.active && seam.type==='camera' && seam.phase==='exit';
    const captionOpacity=story.continuous&&beat.text?.layout==='hero'?1-smoother(progress(time,beat.end-.8,beat.end-.4)):exitingTitle?1-smoother(clamp(seam.progress*2)):1;
    return {beat,index:i,localTime:time-beat.start,progress:progress(time,beat.start,beat.end),captionOpacity,...direction,textComposed:composed};
  }
  const transition = Math.min(1.25, (beat.end - beat.start) * 0.25);
  const cameraProgress = smoother(progress(time, beat.start, beat.start + transition));
  const camera = Object.fromEntries(['x','y','scale'].map(k => [k, mix(previous.camera[k], beat.camera[k], cameraProgress)]));
  if(beat.camera.position) for(const key of ['position','target']) camera[key]=beat.camera[key].map((v,i)=>mix((previous.camera[key]||beat.camera[key])[i],v,cameraProgress));
  const entry = i === 0 ? 1 : smoother(progress(time, beat.start, beat.start + 0.22));
  const exit = i === story.beats.length - 1 ? 1 : 1 - smoother(progress(time, beat.end - 0.15, beat.end));
  return {beat, index:i, localTime:time - beat.start, progress:progress(time, beat.start, beat.end), camera, captionOpacity:entry * exit};
}

// Closed-form integrated ramp: particles/rotors stop with the controller, even after random seeks.
export function rampIntegral(time, start, ramp = 0.8) {
  const x = time - start;
  if (x <= 0) return 0;
  if (x >= ramp) return x - ramp / 2;
  const u = x / ramp;
  return ramp * (2.5 * u ** 4 - 3 * u ** 5 + u ** 6);
}

export function waterSystemAt(t) {
  const pump = smoother(progress(t, 8, 8.8)) - smoother(progress(t, 39.2, 40)) + smoother(progress(t, 50, 50.8));
  const travel = rampIntegral(t, 8) - rampIntegral(t, 39.2) + rampIntegral(t, 50);
  const level = 0.24 + 0.58 * smoother(progress(t, 27, 39.2)) - 0.42 * smoother(progress(t, 42, 50)) + 0.26 * smoother(progress(t, 50.8, 60));
  const draw = smoother(progress(t, 41, 42)) - smoother(progress(t, 52, 53));
  const drawTravel = rampIntegral(t, 41) - rampIntegral(t, 52);
  return {pump, travel, level, draw, drawTravel, impellerAngle:travel * 235};
}
