# Runtime contract

`create` copies the runtime into a standalone editable project. Its browser imports resolve Three.js/addons from the skill's pinned local `node_modules`. Serve it through the CLI; opening `index.html` with `file://` is unsupported.

```js
export async function createScene(config) {
  // Build meshes and load/decode all local assets here.
  return {
    async update(seconds, normalizedTime) { /* assign ALL state from time */ },
    draw() { /* renderer.render(scene, camera), finish GPU submission */ },
    inspect() { /* meshes, triangles, invalid transforms, camera, subject */ }
  };
}
```

The page exposes `window.__unrealmotion.ready`, `.renderFrame(integer)`, `.inspect()` and `.config`. `renderFrame` awaits the scene update, then draws and returns after GPU completion. Capture mode disables the preview clock. Frames are `[0, duration*fps)`; the last normalized time is exactly 1. Use seconds for physical animation and normalized time for editorial beats.

All asynchronous assets must finish inside `createScene`. Use `GLTFLoader.loadAsync`, texture load/decode promises and `document.fonts.ready`. Keep files below the project directory and use relative paths. Network assets are blocked during QA/render. Do not start late async scene mutations from an update and return early.

`update` must be safe for requests such as `[300, 1, 180, 20, 180]`. Set `rotation.y = t * rate`, not `rotation.y += delta`. Retain a rest buffer for deformations. Sample particle paths from initial seed/index/time. Seek animation mixers with absolute `setTime`, taking care with loops and root motion; do not call `update(delta)`. Precompute simulations once with fixed timestep and cache enough state to seek.

The renderer captures PNGs and streams them to FFmpeg with backpressure at the requested FPS. It does not record playback, skip frames, or depend on wall-clock performance. It validates encoded dimensions, frame count, FPS and duration with ffprobe before atomically replacing the chosen MP4. A failed export leaves an existing MP4 intact. A source hash and video checksum accompany exports. Output is H.264, yuv420p, BT.709, CRF 17, faststart. There is no audio unless a local audio file is supplied.

## Troubleshooting

- Missing browser: `npx playwright install chromium`. Linux may need `npx playwright install --with-deps chromium`.
- Existing compatible browser: set `UNREALMOTION_CHROMIUM` to its absolute executable. This is explicit; the CLI does not search or change another browser profile.
- No GPU/WebGL in a container: try `qa/render --software`. SwiftShader is slow; reduce preview size before final resolution. Do not quietly reduce the requested final format.
- On macOS the capture browser requests ANGLE Metal to use the GPU; `--software` explicitly selects SwiftShader. QA/export records the backend. Small raster differences across GPUs are expected; repeat visual review after a backend change when they matter.
- Errors or missing local assets: inspect `output/qa/report.json` and the browser errors; fix the source rather than hiding console failures.
- Long render: run commands asynchronously and report progress; quality and frame count are independent of render wall time.

Supported baseline: local Three.js WebGL with DOM/SVG overlays, and full native SVG/DOM illustration in Chromium. A vector scene returns `renderer: 'svg'`, a positive `elements` count and `invalid` state in `inspect()`; mesh/triangle checks remain required for Three.js scenes. Both retain `update/draw/inspect` and the same frame capture. WebGPU, temporal motion blur, skeletal IK, path-traced realism and external TTS are not built-in services.

Explainer mode loads and validates `storyboard.json`, samples actual beat boundaries/midpoints and emits paged contact sheets. The bundled Inter font is local and retains SIL OFL licensing under `runtime/fonts/`. Camera, captions, diagram quantities and controller/flow clocks remain independently seekable. See [explainers.md](explainers.md).

The default `imagegen-explainer` uses `runtime/explainer3d.mjs` and a prompt-specific `model.mjs`. Its orthographic camera interpolates 3D `position`/`target` and zoom from the storyboard; named-part labels project from the actual mesh transforms. Inspection reports rendered Three.js meshes/volumes/triangles and model state. `reconstruction.json` must identify a saved local reference and authored parts. No raster-layer compositor or image-to-plane replacement is used for this route; see [imagegen-threejs.md](imagegen-threejs.md).
