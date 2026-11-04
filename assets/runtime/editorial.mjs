import {clamp, mix, smoother} from './motion.mjs';

export const transitionTypes = ['camera', 'slide', 'push', 'pull', 'match'];
export const paces = ['dynamic', 'calm'];

export function transitionSpec(story, index) {
  if (index < 1 || index >= story.beats.length) return null;
  const before = story.beats[index - 1], after = story.beats[index];
  const spec = after.transition || {};
  return {
    type: spec.type || (before.scene === after.scene ? 'camera' : 'slide'),
    duration: spec.duration ?? (story.pace === 'calm' ? .9 : .48),
    axis: spec.axis || 'x', direction: spec.direction ?? -1,
    travel: spec.travel ?? .10, blur: spec.blur ?? 6,
    cut: after.start, from: before.id, to: after.id,
  };
}

// Each side is the mirrored half of one motion: equal signed speed at the cut.
export function handoff(spec, seconds) {
  const half = spec.duration / 2, exit = seconds < spec.cut;
  const p = clamp(exit ? (seconds - spec.cut + half) / half : (seconds - spec.cut) / half);
  const tail = exit ? p ** 5 : (1 - p) ** 5;
  const sign = spec.direction, offset = spec.type === 'slide' ? (exit ? sign : -sign) * spec.travel * tail : 0;
  const scale = spec.type === 'push' ? 1 + (exit ? 1 : -1) * spec.travel * tail
    : spec.type === 'pull' ? 1 + (exit ? -1 : 1) * spec.travel * tail : 1;
  return {...spec, active: seconds >= spec.cut - half && seconds <= spec.cut + half,
    phase: exit ? 'exit' : 'entry', progress: p,
    x: spec.axis === 'x' ? offset : 0, y: spec.axis === 'y' ? offset : 0, scale,
    blur: ['camera', 'match'].includes(spec.type) ? 0 : spec.blur * (exit ? p * p : (1 - p) ** 2),
    cameraProgress: smoother(clamp((seconds - spec.cut + half) / spec.duration)),
  };
}

export function editorialState(story, seconds, index) {
  let seam = null;
  for (const next of [index, index + 1]) {
    const spec = transitionSpec(story, next);
    if (spec && next < story.beats.length && Math.abs(seconds - spec.cut) <= spec.duration / 2) {
      seam = handoff(spec, seconds); break;
    }
  }
  const camera = structuredClone(story.beats[index].camera);
  if (seam?.type === 'camera') {
    const i = story.beats.findIndex(b => b.id === seam.to), a = story.beats[i - 1].camera, b = story.beats[i].camera;
    for (const key of ['x', 'y', 'scale']) camera[key] = mix(a[key], b[key], seam.cameraProgress);
    for (const key of ['position', 'target']) if (a[key] && b[key]) camera[key] = a[key].map((v, k) => mix(v, b[key][k], seam.cameraProgress));
  }
  return {camera, transition: seam || {active:false, type:'none', x:0, y:0, scale:1, blur:0}, scene:story.beats[index].scene};
}

export function readingSeconds(text, wordsPerSecond = 3) {
  return Math.max(1.2, String(text).trim().split(/\s+/u).filter(Boolean).length / wordsPerSecond);
}

// Timed Hermite knots preserve velocity through shot boundaries and arbitrary seeks.
export function sampleCameraPath(knots, seconds) {
  const time=clamp(seconds,knots[0].time,knots.at(-1).time);
  let index=knots.findIndex(k=>k.time>time)-1;if(index<0)index=time<knots[0].time?0:knots.length-2;
  const a=knots[index],b=knots[index+1],dt=b.time-a.time,u=(time-a.time)/dt;
  const value=(k,key,j)=>key==='scale'?Math.log(k.scale):key==='roll'?(k.roll||0):k[key][j];
  const tangent=(i,key,j)=>i===0||i===knots.length-1?0:(value(knots[i+1],key,j)-value(knots[i-1],key,j))/(knots[i+1].time-knots[i-1].time);
  const at=(key,j)=>{const x=value(a,key,j),y=value(b,key,j);return (2*u**3-3*u**2+1)*x+(u**3-2*u**2+u)*dt*tangent(index,key,j)+(-2*u**3+3*u**2)*y+(u**3-u**2)*dt*tangent(index+1,key,j);};
  const target=[0,1,2].map(j=>at('target',j));
  return {position:[0,1,2].map(j=>at('position',j)),target,x:target[0],y:target[1],scale:Math.exp(at('scale')),roll:at('roll')};
}
