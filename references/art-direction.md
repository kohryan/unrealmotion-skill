# Art direction and subject fidelity

Choose the visual language from the subject, not from a fixed aesthetic. Product: measured industrial design and deliberate highlights. Architecture: scale, grounded structure, warm/cool light and a coherent site. Biology: organic surfaces, articulated/continuous deformation, credible anatomy. Data: accurate mappings and units. Kinetic type: authored typography and one spatial motif.

## Geometry before decoration

Write a subject contract in `plan.json` before the final render:

- **Identity:** 3–6 visible features that make this exact class of object recognizable; their proportions and relationships.
- **Structure:** parents, pivots, fixed anchors, contact points, moving degrees of freedom and clearances.
- **Surfaces:** material family, roughness, metalness, opacity/IOR where meaningful, texture scale and variation.
- **Shots:** which feature/action each shot reveals, how the viewer follows it and the expected final state.

Block out the actual silhouette, then refine structure, meso details, surfaces, lighting and action. A wide hero shot and a close detail shot should agree on the same object. Do not compensate for weak geometry with particles, glow or large text.

Use rounded/extruded/lathed geometry and genuine connected topology when the shape needs it. TubeGeometry follows curves; LatheGeometry gives continuous turned surfaces; skinning or vertex deformation is appropriate for soft bodies. Instancing helps repeated foliage/hardware. Give thin parts a plausible thickness. Repeated details follow the surface and remain attached during movement. Freeze original vertex/transform arrays and recompute deformations from them each frame.

## Physically coherent shading

The bundled studio uses sRGB output, ACES filmic tone mapping, a locally generated PMREM room environment, warm key/cool fill, shadow-receiving ground and finite perspective. Keep one pipeline throughout the film.

| Material | Starting point | Evidence to inspect |
| --- | --- | --- |
| Machined metal | metalness 0.9–1, roughness 0.22–0.45 | Broad highlights reveal bevels; no flat white silhouette |
| Painted/polymer | metalness 0–0.1, roughness 0.35–0.65 | Body color survives highlight rolloff |
| Rubber | metalness 0, roughness 0.7–0.95 | Dark but readable, grooves connected to body |
| Stone/concrete | metalness 0, roughness 0.7–0.95 | Scale-appropriate texture, softened edges |
| Optical glass | IOR/clearcoat or controlled physical transmission | Correct background visibility, thickness and sorting |
| Fabric | nonmetal, roughness, nonblack sheenColor when sheen > 0 | Weave direction and coherent folds |

These are starting ranges, not measurements. Transmission is not a substitute for skin translucency. Layered transparent meshes can sort incorrectly; inspect several views. The optical demo deliberately uses a recessed reflective coated surface instead of pretending it is a volumetric lens simulation.

Use a key/rim that reveals form, not multiple unrelated colored glows. Keep blacks readable and highlights below detail-destroying clipping. Soft ambient contact and cast shadows should agree on the ground plane. Add postprocessing only when it solves an observed issue; bloom cannot repair geometry. For near-realistic environments, locally acquired HDRIs and PBR maps with known licenses often improve fidelity more than more triangles.

## Characters and realism

For a realistic person/animal, use an appropriate rigged asset or a proper procedural anatomy model, not cylinders with a sphere head. Load a glTF once, retain the skeleton and bind pose, and seek its AnimationMixer from absolute time. Attach props to actual sockets/bones. Check planted feet, joint arcs, jaw/eye consistency, intersections and silhouettes at action extremes. For locomotion, root movement and stride length must agree. If the necessary asset is missing, locate suitable licensed assets or ask only for the reference needed for exact likeness; continue independent scene work.

## Framing and language

Keep the hero at a deliberate scale, with safe areas appropriate to the requested aspect ratio. Recompose a portrait film instead of cropping a landscape one. Use concise professional Indonesian copy, with technical English only where useful. Avoid meta copy about how the skill works. Fictional demonstrations must not imply measured performance specifications or real brands. Include on-screen source/units for factual/data claims.
