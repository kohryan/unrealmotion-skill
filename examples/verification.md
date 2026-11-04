# Verification record

Date: 4 November 2026. Host: macOS arm64, Node 22.23.1, Python 3.12, Chromium 156 / Playwright 1.64.1, Three.js 0.187.0, local FFmpeg/ffprobe.

## Automated checks

- Unit checks: format/frame validation; smooth analytic motion, springs, seeded construction and random-seek equivalence; source hashing and filesystem boundaries; pixel statistics; complete catalog checksum and split counts; relevance/voxel filtering; code extraction excluding reasoning; corrupted cache rejection.
- Browser integration: five showcase foundations and two explainer routes, all five showcase motion profiles across selected scenes, landscape/portrait/square formats, repeated-frame seek, clipped copy and browser/asset failures. The check samples configurations; it is not a complete scene × profile × format matrix.
- Encode checks: H.264 MP4 dimensions, FPS, duration, frame count; existing-output refusal; a failed forced render preserves the old MP4; final export rejects missing visual review.
- Live HF retrieval: camera `scene-002322`, pavilion `scene-002699` and jellyfish `scene-000006`, with pinned shards and checksums. The full 4,146-row catalog was built from all five dataset Parquet shards; no reasoning traces are distributed in the catalog.
- NVIDIA SimReady: all 2,677 directory metadata entries paginated and catalog checksum verified; one bearing reference retrieved within a 2MiB budget (591,209 bytes including license), no USD/texture payloads. ImageGen reference generated through the built-in tool and inspected. Native teardown V8 film build + Metal GPU still captured successfully.
- Reassembly checks: stable ids/local rest transforms, dependency order, arbitrary seek consistency and zero final local alignment error; the integrated mechanical scene is checked separately.

## Demonstration projects

| Project | Brief and motion | Export format |
| --- | --- | --- |
| `optic/` | Concept camera, coated optics, material microdetail, controlled optical stack separation/reassembly | 1920×1080, 60 fps, 6 s / 360 frames |
| `pavilion/` | Architectural material/structure study, roof lift and return, coherent supports/glazing | 1920×1080, 60 fps, 6 s / 360 frames |
| `kinetic/` | Indonesian typography, five metal spline bands, staggered analytic spring and continuing deformation | 1920×1080, 60 fps, 6 s / 360 frames |
| `jellyfish/` | Independent prompt-driven organic scene, pulsing bell, attached phase-lagged tentacles, continuous dolly | 960×540, 30 fps, 4 s / 120 frames |
| `reassembly/` | Appearance-guided bearing; balls seat in cage, carrier seats, upper race closes, rotation ramps up | 1920×1080, 60 fps, 6 s / 360 frames |
| `water-imagegen-threejs/` | Simple ImageGen cutaway reconstructed into named Three.js volumes; pump opens/reassembles, rotor/flow/level/float/controller share one state; a complete silent explanation | 1080×1920, 30 fps, 60 s / 1,800 frames |
| `dynamic-water/` | Three consistent ImageGen references, persistent system/meter contexts, ten short beats, rotor/bezel reassembly, kinetic copy and illustrative counter/bar/line/donut graphics | 1080×1920, 30 fps, 32 s / 960 frames |
| House lighting (media only) | Prompt-specific pastel house cutaway; window placement, solar direction, shades, skylight, ambient/task lighting and day/night comparison | 1080×1920, 30 fps, 60 s / 1,800 frames |

The editable projects retain `project.json`, `plan.json`, `scene.mjs`, runtime and reviewed-source attestations. Delivery MP4s and representative PNGs are in `media/`. Recreate QA evidence with `node scripts/unrealmotion.mjs qa examples/<name>`. Full transient QA images and per-frame reports are ignored by Git. Reviews preserve the actual source hash and file names from the inspection run; regenerate QA before re-rendering a clean clone.

The independent agent read the skill, retrieved the organic reference, authored a new scene rather than relabeling a starter, inspected native frames 0/19/60/119 and encoded adjacent frames 72–80, and exported a reviewed MP4. It reported no blocking workflow bug. Its observed initialization delay led to the loading indicator added to the player. No paid API was used.

## ImageGen → Three.js explainer

The built-in ImageGen tool generated the saved simple pastel reference (about 1.3 MB); its exact prompt and hash are in `water-imagegen-threejs/asset-plan.json`. The final renderer builds 3D walls/slabs, half-cylinder cutaway shells, a motor, extruded impeller blades, connected tube geometry and named cover parts. No generated-image plane or raster-layer compositor is used. The earlier `water-explainer/` project is the original SVG motion study, kept distinct from this final mesh route.

The 1.0 baseline checks covered 11 JS unit checks, five Python checks and four browser integration groups. The new integration exercises saved-reference reconstruction, volume diagnostics, 11 story beats, random seeking, pump cutoff/restart, cover seating, a silent encoded smoke test, and rejection of final export without a reconstruction review. QA samples 55 native frames through the complete 60-second timeline; the source-matched visual review includes beat boundaries, levels, open/closed pump and encoded adjacent intervals. No audio is synthesized or muxed.

An independent review inspected a second oblique view and found that matching a declared rest pose alone did not seal the housing. The casing rim now meets the cover face; closed-state axial gap is zero within floating point tolerance. Part labels fade before leaving the protected content area during camera travel. Controller copy describes the threshold rule consistently with the visible ON/OFF state. These checks establish an illustrative visual mechanism, not OEM mechanical accuracy.


### House lighting delivery

The [Rumah, Ramah Cahaya MP4](media/rumah-ramah-cahaya.mp4) is the reviewed delivery from a separate prompt, published here as media. Its editable source was delivered separately and is not bundled as an example project in this repository. ffprobe confirms H.264, 1080×1920, 30 fps, 60 seconds, 1,800 frames and no audio. The published file matches the reviewed export byte for byte: SHA-256 `2701d2b128984b2250881015890b43dddced3eba9184768b3862976a973db2c3`. The poster is extracted from the encoded video. Recorded review covered 51 native frames, an opposite oblique view, adjacent encoded-frame intervals and a complete FFmpeg decode. The lighting explanation is qualitative rather than a calibrated lighting simulation.

## Version 1.2 continuous world camera — 5 November 2026

Local checks cover **23 JavaScript unit tests, five Python tests and five browser integration groups**. The continuous-camera test verifies velocity agreement through knots, logarithmic zoom/roll, complete-path validation and seek invariance. Browser checks cover persistent scene roots, stationary canvas transforms, camera-projected chart positions, five chart types including race, numeric/bar-width agreement, scaled typography, silent encoding and final-review guards. The meter must remain off while fasteners are still seating; every reported part reaches its captured local rest pose before operation. The version 1 mesh film remains tested against the latest runtime.

The revised [Aliran Jadi Data example](media/dynamic-water.mp4) lasts **32 seconds** (0.75× the former 24-second pacing). It retains the same three ImageGen references and pastel style. A camera follows a continuous route through one connected house/pump/meter world; SVG data panels remain anchored in that space. There are no full-canvas slide/zoom handoffs. Reassembly uses a grooved bearing race, perforated cage, shaft/rotor bores, gasket, bezel holes and individually seated bolts. These are illustrative inferred internals, not recovered CAD. [Reference prompts and provenance](dynamic-water/asset-plan.json) · [Camera and assembly method](../references/continuous-camera.md).

Native QA samples **154 frames**, including camera knots and their neighbors, beat boundaries and authored action markers. Review covers paged sheets, native opening/assembly/chart frames, opposing oblique views along the camera arc, connected-camera travel and sequential axial insertion. Data remains explicitly illustrative: use is 180/90/30 L per day (total 300), recorded line values are 6/16/10/18/8 L/min, and the live counter and meter share the same valve/flow clock. The delivery is H.264, 1080×1920, 30 fps, 32 seconds, 960 frames and **no audio stream**. Full FFmpeg decode passed; adjacent encoded intervals 313–330, 372–389, 462–479, 507–524 and 718–735 were inspected. Published media matches the reviewed export: SHA-256 `ccb9bdccc6a30596824df78502b970f3d79c28f32ffac7a17e04b67c3d851073`. Source-matched review and encoded verification are recorded in [review.json](dynamic-water/review.json).

## Practical limits

The demonstrations are coherent procedural concept/illustrative studies, not industrial measurements, architectural engineering or species-accurate photoreal animals. Optical shading uses a procedural coating map and controlled reflective shell. Pavilion glazing is a raster approximation. Jellyfish oral membranes can look planar and fine filaments expose antialiasing limits at 540p. Bearing internals/clearances are authored approximations rather than extracted CAD or a validated service sequence. None of these demos proves arbitrary prompt parity with upstream showcase videos.

Remotion and HyperFrames skill bundles are installed and their source contracts were studied; their native executables are not integration-tested by this repo's test suite. MuAPI, Tripo, Gemini and ElevenLabs provider generation was not called. Native full playback and interactive scrubbing were not exhaustively verified; deterministic seek, encoded metadata, full decode, native stills and selected adjacent-frame intervals are the recorded evidence. Linux CI results are separate from local macOS results and must be read from the actual GitHub Actions run.
