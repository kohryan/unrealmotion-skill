# Teardown and reassembly choreography

Read for exploded views, disassembly, reassembly, cutaways and mechanical explainers. The installed `teardown` skill supplies a deeper machine-simulation workflow; this repo keeps the user's video brief and uses its existing frame renderer.

## Model before movement

- Identify stable part ids, parent frames, assembled local poses, mating surfaces, axes of insertion, clearances and dependency order. Retain one model throughout the film; do not regenerate each shot's parts from images.
- Use an actual source model/manual when claiming exact mechanics. Reference images and ImageGen can guide appearance, but hidden structures remain inferred. Write units and dimensions only when they are known or explicitly labeled illustrative.
- Capture local rest poses once after the model is constructed. Apply offsets relative to those rest poses on every seek; never add deltas to yesterday's transforms. Parent assembly motion and child part motion are separate local transforms.
- Plan collision-free explanation paths. First seat dependent subparts, then move the resulting assembly, then close the enclosure. Reassembly order can differ from a naive time reversal of a cinematic exploded view. A visual diagram is not automatically a manufacturable service procedure.

## Bundled deterministic helper

```js
const motion = createReassembly([
  {id:'balls-and-cage', node:carrier, offset:[0,1.1,0], start:0.34, end:0.58},
  {id:'upper-race', node:upper, offset:[0,2.65,0], start:0.61, end:0.84}
]);
// Inside update(seconds, normalizedTime):
motion.update(normalizedTime);
```

Import from `./runtime/reassembly.mjs`. `offset` is the exploded displacement in the node's **parent coordinate frame**; `start/end` are normalized closure times. At `u=0`, nodes occupy their exploded positions. At `u=1`, every registered node returns exactly to its assembled local position. Quintic easing gives zero velocity/acceleration at the insertion endpoints. `inspect()` exposes ids, positions, rest positions and alignment errors; unit checks exercise reverse/random seeking and nested assembly frames.

For rotations, author quaternion interpolation from retained rest quaternions and a defined exploded orientation; do not sum Euler angles frame by frame. Register any needed rotational invariant in the scene's `inspect()`. The helper handles translations intentionally; it does not solve constraints, collisions, IK or rigid-body physics.

## Motion options

| Recipe | Use | Requirements |
| --- | --- | --- |
| Sequential axial reassembly | Bearings, lenses, filter stacks | Clear bores/track axes; subassemblies complete before closing parts |
| Radial exploded explanation | Housings, cartridges, instruments | Separate rays and sufficient clearances; preserve orientation/pivots |
| Service loop | Show operation → open → explain → close → operate | Matching rest states and velocity at seam; do not reset visibly |
| Mechanism cutaway | Gearbox, piston, linkage | One real kinematic input drives all parts/readouts; consistent clipping and shadows |

`mechanical-reassembly` demonstrates the first recipe: balls drop into brass cage pockets, the carrier seats around the lower hub, upper race closes, and operation accelerates smoothly in the last part of the film. Choose `precision-assembly` for restrained camera motion or `macro-dolly` for a detail pass. Other camera profiles remain available; they do not change the part dependency graph.

## Review evidence

Inspect both sides of every seating event and a moving late interval. Check clearances from a second oblique angle, shared axes, no floating/duplicated parts, settled position/rotation, material continuity and shadow/contact changes. Final assembly position error should be within the scene's intended tolerance. This does not independently certify geometry intersections or mechanical engineering; record any approximation.

## Teardown source study

Studied [elvarofficial/teardown](https://github.com/elvarofficial/teardown/tree/a91262ac1109051e014662d42ecb0b7bc1f113b1): `sims/v8-shared/kin.js`, `engine.js`'s staged explosion, `sims/kit/stage3d.js`, `sims/capture.mjs`, `paths.mjs`, and the Python score organization. Its useful separation is mechanical math → geometry → stage → absolute film timeline → capture, with a single kinematic input for readouts and pose. The source was installed for Codex with dependencies; its V8 film was built and a native GPU still captured successfully. Its full sound/film pipeline has not been tested here. UnrealMotion's reassembly helper and bearing scene are original, not copied engine implementation.
