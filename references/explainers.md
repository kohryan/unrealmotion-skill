# Silent motion-graphics explainers

Use this route for an explanation, process, mechanism, educational story, or a reference that advances an idea across scenes. A longer turntable or a stack of slogans is not an explainer. The deliverable is still a finished video and editable source, with no audio unless the user explicitly requests it.

## Start from what the viewer should understand

Write the question and the causal answer first. Build a sequence such as **question → context → mechanism → consequence → control/exception → resolution**. Choose the number of beats and duration from the content, not a fixed quota. For an unspecified explainer, start with 60 seconds, 1080×1920, 30 fps, silent. Honor a user-specified format, duration and FPS. Short product showcases retain their existing defaults.

Every beat needs a purpose, a visible action and readable on-screen explanation. The action does the explaining: fluid follows a pipe, a rotor transfers energy, a level triggers a controller, a diagram changes with its quantity. Swapping captions while a generic object rotates does not qualify. Keep factual values sourced; label illustrative models. The current agent authors this content; the CLI is not a semantic prompt classifier.

Without narration, the text is the explanation rather than a transcript. Use a short main statement and one concise supporting line. Leave enough time to read them at phone size; simplify language before speeding text up. Use annotation near the relevant part, with hierarchy and no overlap. Do not insert music, sound effects, TTS setup or narration approval steps into a silent request.

## Create and author

```sh
node <skill>/scripts/unrealmotion.mjs create <project> --mode explainer --prompt "Jelaskan perjalanan air dari sumur ke toren. Tanpa suara/musik."
```

This creates a prompt-neutral ImageGen-to-Three.js authoring starter. Complete the saved reference, `reconstruction.json`, `model.mjs` and `storyboard.json` using [imagegen-threejs.md](imagegen-threejs.md). The default final image is rendered from actual Three.js geometry in the same simple pastel cutaway style as the reference. The earlier `--template water-system-explainer` SVG project remains a motion study; it is not the final reconstruction pipeline and should not be reused as unrelated content.

Each storyboard beat has unique `id`, contiguous `start/end` in seconds, `caption`, `detail`, `purpose`, `action`, and camera `{x,y,scale,position:[x,y,z],target:[x,y,z]}` for Three.js. The older SVG study uses only `{x,y,scale}`. Cover the whole duration without gaps/overlaps. `story.duration` records intended duration; project format is authoritative. Re-author the content and read time for the requested duration.

`runtime/story.mjs` validates the timeline and returns current beat, local progress and an eased camera from absolute time. Assign the visual state from that time. The bundled water-system model demonstrates an integrated motion clock: rotor and rising stream stop together, tank level drives its float, use drains the tank and the lower threshold restarts filling. These are illustrative levels/times, not a calibrated hydraulic simulator.

## Continuity and illustration

Keep stable object identities, visual vocabulary, material/color roles, physical relationships and one coordinate system. A persistent world with motivated camera travel works well for mechanisms: establish the whole system, travel into the active part, follow the result, then return to the complete explanation. A liquid packet, signal, shape or data mark can carry the eye across a handoff. Avoid random pans and repeated fade-to-blank cards.

For actual scene cuts, plan the outgoing/incoming direction and velocity together. Match the carrier where useful. An opaque stage prevents white flashes. Use only a small transition vocabulary. A camera stop can be deliberate for reading while the mechanism continues explaining; do not fill a finished beat with idle wobble.

Author silhouettes and details that survive close-up: connected pipes, motor casing, rotor, tank walls/level, supports, labels and consistent strokes. Show cutaway/diagram intent honestly; do not claim a 2D drawing is a reconstructed 3D mesh. Keep detail relevant to the concept, with legible contrast and protected caption space.

## Review the whole story

QA now samples every authored beat midpoint and both sides of its boundary, in addition to start/end and a late moving interval. Native SVG scenes report their vector elements; Three.js scenes retain mesh/triangle checks. Both use the same deterministic capture and MP4 verification.

For `render --final` in explainer mode, the normal visual attestation also requires:

- `explanation`: the question is answered, each beat advances understanding, copy is readable without audio, facts match the cited sources/model.
- `causalMotion`: visible movement/changes demonstrate the statement; controls and diagrams agree with the same model state.
- `shotContinuity`: identities, layout, annotation and the viewer's attention remain coherent through the scene/camera handoffs.

Inspect all beat frames, cutaway/action extremes, and adjacent encoded frames through at least one transition and one later mechanism event. Verify no audio stream for a silent delivery. Keep a source-matched review; a 60-second duration and many different pixels do not prove a useful explanation.

## Reference inspection

The user's [Threads reference](https://www.threads.com/@haadziq_f/post/DfOqlnZE_Kd/media) was inspected through the browser: approximately 60 seconds, portrait cutaway illustration, whole-house context, pump close-up, tank fill/control, and a return to the system, with short text annotations. This informs narrative/camera principles; no frames, footage, characters, captions or artwork from that post are redistributed. The water demo uses original vector artwork/copy and a level-controller variant, rather than claiming to duplicate the reference's pressure-switch mechanism.
