const failure = error => { const e = document.querySelector('#failure'); e.style.display = 'block'; e.textContent = String(error.stack || error); window.__unrealmotionError = String(error); };
try {
  const config = await (await fetch('./project.json')).json();
  const frame = document.querySelector('#frame');
  Object.assign(frame.style, {width: `${config.width}px`, height: `${config.height}px`});
  frame.classList.toggle('portrait', config.height > config.width);
  const capture = new URLSearchParams(location.search).has('capture');
  document.querySelector('#controls').hidden = capture;
  if (capture) document.querySelector('#controls').style.display = 'none';
  function resize() { frame.style.transform = `scale(${Math.min(innerWidth / config.width, innerHeight / config.height)})`; }
  resize(); addEventListener('resize', resize);
  const {createScene} = await import('../scene.mjs');
  const scene = await createScene(config); await document.fonts.ready;
  const total = Math.round(config.duration * config.fps);
  let current = 0, playing = false, startTime = 0, startFrame = 0;
  const scrub = document.querySelector('#scrub'); scrub.max = total - 1;
  async function renderFrame(f) {
    if (!Number.isInteger(f) || f < 0 || f >= total) throw new Error(`Frame outside range: ${f}`);
    current = f; await scene.update(f / config.fps, f / Math.max(1, total - 1)); scene.draw();
    scrub.value = f; document.querySelector('#time').textContent = `${(f / config.fps).toFixed(2)} / ${config.duration.toFixed(2)}s`;
  }
  window.__unrealmotion = {config, renderFrame, inspect: () => ({...scene.inspect(), copy: document.querySelector('#copy').textContent}), ready: false};
  await renderFrame(0); document.querySelector('#loading')?.remove(); window.__unrealmotion.ready = true;
  // Only the preview uses a wall clock. Captures call renderFrame with an explicit integer.
  async function tick(now) {
    if (!playing) return;
    await renderFrame(Math.floor(startFrame + (now - startTime) / 1000 * config.fps) % total);
    requestAnimationFrame(tick);
  }
  document.querySelector('#play').onclick = () => { playing = !playing; document.querySelector('#play').textContent = playing ? 'Jeda' : 'Putar'; if (playing) { startTime = performance.now(); startFrame = current; requestAnimationFrame(tick); } };
  scrub.oninput = async () => { playing = false; document.querySelector('#play').textContent = 'Putar'; await renderFrame(Number(scrub.value)); };
} catch (error) { failure(error); throw error; }
