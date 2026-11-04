import {clamp, mix, progress, smoother} from './motion.mjs';

export function validateStoryboard(story, duration) {
  if (!story || !Array.isArray(story.beats) || story.beats.length < 3) throw new Error('An explainer needs at least three authored beats');
  const ids = new Set(); let cursor = 0;
  for (const beat of story.beats) {
    if (typeof beat.id !== 'string' || !beat.id || ids.has(beat.id)) throw new Error('Storyboard beat ids must be unique');
    ids.add(beat.id);
    if (![beat.start, beat.end].every(Number.isFinite) || Math.abs(beat.start - cursor) > 1e-6 || beat.end <= beat.start || beat.end > duration + 1e-6) throw new Error(`Storyboard gap, overlap or invalid range: ${beat.id}`);
    for (const field of ['caption','detail','action','purpose']) if (typeof beat[field] !== 'string' || !beat[field].trim()) throw new Error(`Missing ${field} in beat ${beat.id}`);
    if (!beat.camera || !['x','y','scale'].every(k => Number.isFinite(beat.camera[k])) || beat.camera.scale <= 0) throw new Error(`Invalid camera in beat ${beat.id}`);
    cursor = beat.end;
  }
  if (Math.abs(cursor - duration) > 1e-6) throw new Error('Storyboard must cover the complete video duration');
  return story;
}

export function storyState(story, seconds) {
  const time = clamp(seconds, 0, story.beats.at(-1).end);
  const index = Math.max(0, story.beats.findIndex(b => time < b.end));
  const i = time >= story.beats.at(-1).end ? story.beats.length - 1 : index;
  const beat = story.beats[i], previous = story.beats[Math.max(0, i - 1)];
  const transition = Math.min(1.25, (beat.end - beat.start) * 0.25);
  const cameraProgress = smoother(progress(time, beat.start, beat.start + transition));
  const camera = Object.fromEntries(['x','y','scale'].map(k => [k, mix(previous.camera[k], beat.camera[k], cameraProgress)]));
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
