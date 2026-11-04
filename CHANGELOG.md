# Changelog

## [1.2.0] — 2026-11-05

- New explainers use a continuous world-space camera path with velocity-continuous position, target, logarithmic zoom and restrained roll. Scene roots persist throughout; camera travel replaces canvas-wrapper handoffs.
- World-anchored data panels follow the same projection and remain in place as the camera moves between subjects.
- Revised demo slows from 24 to 32 seconds (0.75×), connects the house/pump/meter physically, and adds axial bearing → rotor → gasket → bezel → bolt assembly before operation.
- Improved mesh details: volumetric pump cover, shaft/rotor bores, grooved bearing race, perforated cage, bezel holes and individual fasteners.
- Camera-knot QA, continuous-camera/assembly review gates, arbitrary-seek checks and legacy-runtime coverage. No new dependency or art direction.

## [1.1.0] — 2026-11-04

### Added

- Version 2 storyboards with persistent Three.js scene roots and reference-to-beat bindings. New explainers default to multiple consistent ImageGen references and dynamic pacing; calm pacing and explicit single-reference authoring remain available.
- Frame-driven camera, slide, push, pull and match handoffs, with mirrored partial-travel movement, controlled blur, and additional seam/action QA samples.
- Kinetic word/grapheme reveals, wipes, impact emphasis and caption/hero/side layouts using the existing local Inter font.
- Native SVG bar, line, donut, counter and bar-chart race graphics from local CSV/JSON, with fixed domains, stable category IDs, gap handling, numeric formatting, source labels and optional model-bound values.
- Multi-reference provenance checks and final-review gates for pacing, text, reference continuity and data accuracy.
- A 24-second silent portrait example, **Aliran Jadi Data**, with three ImageGen references, two 3D contexts, ten story beats, sensor reassembly and four chart forms.
- Authoring guides for dynamic stories, kinetic text and data motion, plus new unit and browser integration coverage.

### Improved

- Part labels respect hidden scene ancestors; reserved text widths remain stable in scaled previews.
- QA distinguishes intentional entry masks from persistent clipping, checks chart labels and active scene roots, and ignores macOS Finder metadata in source hashes.
- English and Indonesian README sections document the new workflow and example.

### Compatibility

- The deterministic local Three.js → Chromium → FFmpeg renderer, simple pastel cutaway style and silent default remain unchanged. No runtime dependency was added.
- Version 1 storyboards and existing standalone example runtimes remain supported. New capabilities require authored scenes and references; the CLI scaffold does not interpret a prompt by itself.

## [1.0.0] — 2026-11-04

- Initial public baseline: prompt-directed ImageGen references, actual Three.js reconstruction, cutaway/reassembly motion, deterministic MP4 rendering and source-matched visual review.
- CCORE scene and NVIDIA SimReady metadata retrieval, bounded reference downloads, local showcase/explainer templates, Codex installation guidance, bilingual README and token-usage charts.

[1.1.0]: https://github.com/kohryan/unrealmotion-skill/compare/12fc787dfb4d4c6e46ba441f6426c5f2c4112b72...v1.1.0
[1.0.0]: https://github.com/kohryan/unrealmotion-skill/tree/12fc787dfb4d4c6e46ba441f6426c5f2c4112b72

[1.2.0]: https://github.com/kohryan/unrealmotion-skill/compare/v1.1.0...v1.2.0
