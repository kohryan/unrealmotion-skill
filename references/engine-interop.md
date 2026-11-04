# Existing Remotion / HyperFrames projects

These are adaptation recipes, not bundled alternate rendering engines. Use the locally installed upstream skill and the project's actual package versions. The native Three.js renderer is the tested default. Never claim native engine compatibility from these snippets alone.

## Remotion

Use `useCurrentFrame()` and `useVideoConfig()` as the only timeline clock. For an existing React Three Fiber composition, `@remotion/three`'s `ThreeCanvas` is the natural host; animate meshes directly from `frame / fps` or Remotion's own `spring`/`interpolate`. Await local glTF/textures through Remotion's documented readiness contract. Rebuild the shared geometry as a factory that accepts a parent group; do not mount this repo's entire player HTML inside React and expect Remotion to seek it.

```tsx
// Inside a composition's mesh component:
const frame = useCurrentFrame();
const {fps} = useVideoConfig();
const seconds = frame / fps;
return <group rotation={[0, seconds * 0.15, 0]}>{/* authored mesh hierarchy */}</group>;
```

This is a conceptual fragment, not a complete runnable Remotion project. Use matching installed versions of `remotion`, `@remotion/cli`, React and, when needed, `@remotion/three`/Fiber. Render with the project's native `remotion render`, then verify encoded metadata and visual evidence. Do not import UnrealMotion's custom spring into a Remotion project when its existing motion system already handles the shot. Check Remotion's license for the intended use.

## HyperFrames

Keep the composition's root duration and timed clip attributes. Build a local Three.js scene once. Hook absolute-time rendering into the native seek event; await asynchronous work through the event's barrier synchronously:

```js
const ready = createScene(config);
window.__hf = window.__hf || {};
window.__hf.buildReady = ready.then(() => undefined);
window.addEventListener('hf-seek', event => {
  const t = event.detail.time;
  const pending = ready.then(async scene => {
    await scene.update(t, Math.min(1, t / config.duration));
    scene.draw();
  });
  event.detail.waitUntil(pending);
});
```

Adapt `createScene`'s DOM mounts/import map to the existing composition root. Copy dependencies and assets locally using that project's runtime rules. HTML/GSAP motion uses a paused timeline registered under `window.__timelines[compositionId]`; Three.js still seeks from `hf-seek`. Do not add an autoplay `requestAnimationFrame` loop. Run the native check/snapshot/render workflow in the installed HyperFrames skill, then verify the actual export. The recipe itself has not been integration-tested against every upstream release.
