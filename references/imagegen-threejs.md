# ImageGen → Three.js → silent explainer

This is the default explainer production route. Keep the user's established style: simple pastel cutaways, clear silhouettes, restrained ink edges, orthographic depth, concise labels and purposeful motion. Do not add photoreal architecture, complex textures, a new palette or decoration to improve a simplicity brief. A future prompt changes the subject and explanation; it does not silently change the art direction.

## Reference and reconstruction

1. Read the prompt for the subject, intended understanding, action and requested format. Write the causal answer and storyboard. Choose a motion recipe below for that explanation, not the topic of a bundled demo.
2. For industrial parts, search the small SimReady catalog and fetch only a bounded thumbnail/license when relevant; follow [simready-imagegen.md](simready-imagegen.md). Search HF for useful geometry/mechanism construction. Do not force an unrelated NVIDIA asset onto a house or science topic. No whole USD/texture library download.
3. Generate a **simple ImageGen reference for this prompt**, using the supplied example as style reference when available. Request consistent assembled/cutaway views only when they help specify the necessary parts. Use the host's built-in image tool; the local CLI never calls an AI API. Save the selected image under `<project>/assets/`, and exact prompt, tool, reference role, file hash and attribution in `asset-plan.json`. If the tool is unavailable, report the missing step; do not silently substitute a new provider or claim generation succeeded.
4. Inspect the image. Author `reconstruction.json`: reference path, named parts, silhouette/proportions, material/color roles, hierarchy, attachments, pivots, clearances, inferred hidden geometry and review views. Resolve contradictions between generated views before modeling. Keep the reference's deliberate simplicity. Extra primitive pieces do not improve fidelity.
5. **Rebuild actual Three.js volumes in `model.mjs`**, using the img2threejs staged discipline: blockout → structure/attachments → form → flat material → soft light → mechanism → review. Use lathe/extrude/tube/custom geometry as appropriate. An image on a plane, animated crops or a raster-layer compositor is not this route. The whole generated image guides the mesh; separate generated textures/decals are optional when needed.
6. Verify silhouette and depth from a front oblique and a second oblique view. Inspect the moving mechanism and reassembled state. Retain one model and stable named parts across all shots. Record approximations honestly: ImageGen is appearance guidance, not CAD extraction or a measured digital twin.

The reference study and verification artifacts for `examples/water-imagegen-threejs/` show this route. The water topic is an example, not the default content. `create --mode explainer` creates an unrenderable authoring starter so unrelated prompts cannot quietly produce the water film.

## Project contract

```sh
node <skill>/scripts/unrealmotion.mjs create <project> --mode explainer --prompt "Your explanation; no sound/music"
```

The agent completes these files before QA:

- `asset-plan.json`: actual brief, locked art direction, saved ImageGen prompt/files/provenance.
- `reconstruction.json`: `status: "authored"`, local `reference: "assets/reference.png"`, nonempty `parts`, attachments and inferred geometry.
- `model.mjs`: exports `createModel(stage,config) → {update(seconds,u,state),inspect()}`. The stage exposes `THREE`, `group`, `scene`, `camera` and `label({node,offset,text,beats})`. All moving meshes and labels read the same absolute-time state.
- `storyboard.json`: contiguous beats with question, mechanism and resolution; each camera includes `x`, `y`, `scale`, plus `position: [x,y,z]` and `target: [x,y,z]`. `cameraSpan` optionally controls the orthographic world height. `runtime/story.mjs` interpolates the camera continuously; `runtime/explainer3d.mjs` renders the mesh and projects part labels.
- `plan.json`: explanation, actions, motion recipe, sources and fidelity limits.

The starter defaults to 60 seconds, portrait 1080×1920, 30 fps. Honor the user's duration/format. No audio is added. The coding agent authors the prompt-specific reference/model/story; this is not an automatic CLI text-to-mesh service.

## Motion recipes, one established style

| Recipe | When to use | Motion that explains |
| --- | --- | --- |
| Follow the flow | Water, energy, signals, material transport | Follow a carrier through attached paths; quantities change with the same state |
| Cutaway operation | Pumps, motors, anatomy, mechanisms | Establish the whole, open the active part, show its causal action, return to context |
| Explode → reassemble → run | Products, assemblies, service explanations | Separate stable parts, seat dependencies before closing the shell, then operate |
| Accumulate → threshold → response | Storage, controls, capacity | Fill/drain one state, trigger the control, show both cause and response |
| Compare → transform → resolve | Before/after or conceptual change | Preserve shared anchors and scale; animate the actual property being compared |

Use [reassembly.md](reassembly.md) for rest poses, dependency order and quintic insertion. Apply the learned Remotion/HyperFrames motion principles: absolute frame time, ready assets, acceleration/deceleration, motivated stagger, coherent direction/carriers and opaque seams. Camera travel supports the mechanism; it cannot replace the explanation. Do not add idle wobble, constant orbits or disconnected title slides to fill time.

## Review

Run QA and inspect all beat frames, boundaries and action extremes. For this route the renderer checks that Three.js volumes were rendered; this alone cannot prove model fidelity. Final review adds `promptFidelity` (subject and explanation match the actual brief), `assetConsistency` (reference style and part identities persist) and `reconstruction3D` (multi-angle volumes, attachments and moving parts inspected). Follow [quality.md](quality.md). Verify an encoded moving interval and **no audio stream** before delivery.
