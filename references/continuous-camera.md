# Continuous camera and physical reassembly

Default for new explainers: a connected 3D world and a timed camera route. Dynamic means spatial continuity and purposeful changes of view, not faster captions or a sequence of moving slide wrappers. Preserve the user's duration; allocate adequate reading/assembly time. The revised demo is 32 seconds, equivalent to 0.75× the former 24-second pacing.

## Shared world

Set `continuous:true` in a version 2 storyboard. All declared scene roots remain visible and retain stable world placements:

```js
story.scenes = [
  {id:'system',position:[0,0,0]},
  {id:'meter',position:[5.6,.9,1.3]}
];
story.continuous = true;
story.cameraPath = [
  {time:0,position:[4,5,18],target:[0,2,0],scale:1,roll:0},
  {time:4,position:[-6,3,18],target:[-1,.5,1],scale:3,roll:.03},
  {time:10,position:[12,5,18],target:[5.6,1.3,1.3],scale:1.5,roll:0}
]; // last time must equal the actual story duration
```

Place meshes under `stage.sceneRoot(id)`. Keep those root transforms fixed; animate children in their local coordinates. Connect the physical path between contexts where the explanation calls for it. Beat `scene` remains a narrative focus and label filter; it no longer swaps geometry. In this mode the visual canvas stays at its identity transform; the actual Three.js camera carries the transition.

Each camera knot supplies absolute seconds, world `position`, world `target`, positive `scale` (optical zoom), and optional `roll` in radians. The sampler uses timed cubic Hermite interpolation with continuous velocity; zoom interpolates in log space. Endpoints settle, and arbitrary/reverse seeks give the same state. Keep camera and target separated, avoid the vertical look-at pole, and inspect the route between knots for walls/occlusion. Add intermediate knots along a pipe or into an opening, not only one view at every caption boundary. Readable views can hold a gentle purposeful arc while the mechanism operates.

Use a close oblique view to reveal depth, follow a carrier to the next component, widen when the geometry requires clearance, then settle on the next action. A camera move must have a destination tied to the explanation. Do not add idle oscillation or spin an assembled model to fill a beat. Legacy beat handoffs remain available for existing films; do not use full-canvas slides/scale cuts as the default replacement for camera travel.

## Data in the same space

```js
await createDataGraphic(stage,{
  id:'usage',type:'bar',title:'Pemakaian',unit:'L/hari',
  data:'data/use.csv',domain:[0,200],illustrative:true,
  start:18.7,enter:1.1,
  anchor:[10.5,1.7,1.3],worldWidth:5
});
```

World anchors are projected by the same camera as the meshes. SVG panels face the camera and retain their positions while it travels; a protected overlay window keeps passing panels clear of the fixed header/caption. `worldHeight` optionally overrides the default 720:400 chart ratio. Introduce panels before the camera reaches them, and keep them present through the return overview. Use `beats`/`end` only if the story actually removes them. See [data-motion.md](data-motion.md) for quantity/source rules.

## Reassembly that fits

Use the existing `createReassembly` helper with captured local rest transforms, normalized insertion intervals and stable nodes. Follow the established bearing/teardown discipline: inspect bores, clearances, dependency order and the final seat; match reference proportions rather than scattering generic shapes.

For the meter example: bearing seats on the rear shaft, the annular rotor clears that shaft, the gasket seats, the bezel closes, and individual bolts enter matching holes. The race has a concave groove and the cage has actual ball pockets. The mechanism starts only after its assembly/valve sequence completes. The pump likewise stops before opening; its thick cover aligns laterally before axial insertion and bolt tightening. There is no scene replacement at completion: the same parts continue operating as the camera departs.

All drive angles, transport, assembly progress and readouts derive from absolute time. Return `assembly: assembly.inspect()` from the model so QA/review can inspect final local alignment. Zero rest-pose error alone does not prove collision-free assembly: inspect open, insertion and closed states from opposing oblique views. These example clearances are illustrative, not measured engineering specifications.

## Review

QA includes every camera knot and neighboring frames, in addition to beat/action samples. Continuous stories require all declared roots present. Inspect adjacent moving intervals along the route, not only the key views. Final review requires `continuousCamera`; models exposing assembly diagnostics additionally require `assemblyFit`. Confirm actual camera travel, no wrapper cuts, readable pacing, stable identities, dependency order, seating and operation after closure. Keep audio off unless requested.
