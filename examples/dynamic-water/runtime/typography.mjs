import {clamp} from './motion.mjs';

export const textPresets = ['words', 'characters', 'wipe', 'impact', 'none'];

export function splitText(text, preset = 'words') {
  if (preset === 'characters') {
    const chars = [...new Intl.Segmenter('id', {granularity:'grapheme'}).segment(text)].map(x => x.segment);
    if (chars.length <= 24) return chars;
  }
  return String(text).trim().split(/\s+/u).filter(Boolean);
}

export function fragmentState(seconds, start, index, count, preset = 'words') {
  if (preset === 'none') return {opacity:1, y:0, scale:1, weight:750, clip:0};
  const stagger = Math.min(preset === 'characters' ? .025 : .045, .28 / Math.max(1, count - 1));
  const t = clamp((seconds - start - index * stagger) / .22), e = 1 - (1 - t) ** 5;
  return {opacity:t > 0 ? 1 : 0, y:(1 - e) * .85,
    scale:preset === 'impact' ? 1 + .10 * (1 - e) : 1,
    weight:Math.round(650 + 150 * e), clip:preset === 'wipe' ? 100 * (1 - e) : 0};
}

export function createKineticText(element) {
  let key, spans = [], windows = [], tokens = [], preset;
  function set(text, options = {}) {
    const next = JSON.stringify([text, options]); if (next === key) return;
    key = next; preset = options.preset || 'words'; tokens = splitText(text, preset); spans = []; windows = [];
    element.replaceChildren(); element.setAttribute('aria-label', text);
    const emphasis = new Set((options.emphasis || []).map(x => x.toLocaleLowerCase('id')));
    tokens.forEach((word, i) => {
      const mask = document.createElement('span'), span = document.createElement('span');
      mask.className = 'um-word-window'; span.className = 'um-word'; span.setAttribute('aria-hidden', 'true');
      span.textContent = word; span.style.fontVariationSettings = '"wght" 850';
      if (emphasis.has(word.toLocaleLowerCase('id').replace(/[^\p{L}\p{N}]/gu, ''))) span.classList.add('um-emphasis');
      mask.append(span); element.append(mask); spans.push(span); windows.push(mask);
      if (preset !== 'characters' && i < tokens.length - 1) element.append(document.createTextNode(' '));
    });
    // Reserve the final glyph width before changing weight, so line breaks do not jitter.
    spans.forEach((span, i) => {windows[i].style.width = `${span.offsetWidth+1}px`;});
  }
  function update(seconds, start, composed = false) {
    spans.forEach((span, i) => {
      const f = fragmentState(seconds, start, i, spans.length, composed ? 'none' : preset);
      span.style.opacity = f.opacity;
      span.style.transform = `translate3d(0,${f.y}em,0) scale(${f.scale})`;
      span.style.fontVariationSettings = `"wght" ${span.classList.contains('um-emphasis') ? 850 : f.weight}`;
      windows[i].style.clipPath = preset === 'wipe' ? `inset(0 ${f.clip}% 0 0)` : 'none';
    });
  }
  return {set, update, inspect:() => ({tokens:tokens.length, preset, text:element.getAttribute('aria-label')})};
}
