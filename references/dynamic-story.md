# Dynamic stories without a new renderer

Version 2 storyboards extend the existing frame-driven Three.js stage. Version 1 projects keep their original camera/caption behavior. New explainers default to `--pace calm --assets multi`; `--pace dynamic` and `--assets single` are deliberate alternatives.

## Story and asset plan

Start with a causal answer, then plan distinct visual questions. For a 30-second film, begin with roughly 8–12 beats of 2–4 seconds, not a fixed quota. Allow longer for numbers or unfamiliar mechanisms. Reserve at least `readingSeconds(caption + detail)` from `runtime/editorial.mjs` for reading; shorten copy before accelerating. A 60-second film needs more explanatory events, not stretched transforms.

Generate 2–4 useful ImageGen references: context, active cutaway, and another explanatory situation or measurement. Feed the approved context reference into subsequent generations. Lock silhouette, palette, proportions, part count and attachment positions. Inspect all images together; resolve contradictions before modeling. These are appearance references for actual meshes, not rendered slideshow backgrounds.

Maintain one hierarchy and stable part IDs per physical object. Multiple story contexts use persistent `stage.sceneRoot(id)` groups; all groups update from absolute time even while hidden. In the default continuous-world route, every root remains visible and the actual camera travels between them. See [continuous-camera.md](continuous-camera.md). Legacy handoff stories show one root at a time. The same object must not be rebuilt with different proportions merely because the camera changes.

```json
{
  "version": 2,
  "duration": 6,
  "pace": "dynamic",
  "scenes": [{"id":"whole"},{"id":"detail"}],
  "beats": [
    {"id":"question","scene":"whole","assets":["overview"],"start":0,"end":2,
     "caption":"Apa yang bergerak?","detail":"Ikuti bagian aktifnya.",
     "action":"Operate the mechanism.","purpose":"Establish the cause.",
     "camera":{"x":0,"y":1,"scale":1,"position":[4,3,18],"target":[0,1,0]},
     "text":{"preset":"words","layout":"hero"}},
    {"id":"answer","scene":"detail","assets":["cutaway"],"start":2,"end":4,
     "caption":"Gerak menjadi aliran.","detail":"Bagian yang sama, dilihat lebih dekat.",
     "action":"Show the flow through the active part.","purpose":"Resolve the question.",
     "camera":{"x":0,"y":1,"scale":1.3,"position":[4,3,18],"target":[0,1,0]},
     "transition":{"type":"push","duration":0.48,"travel":0.1,"blur":6},
     "text":{"preset":"impact","layout":"caption","emphasis":["aliran"]}},
    {"id":"resolution","scene":"whole","assets":["overview"],"start":4,"end":6,
     "caption":"Satu sistem yang terhubung.","detail":"Kembali ke konteks awal.",
     "action":"Return to the operating whole.","purpose":"Connect the detail to the system.",
     "camera":{"x":0,"y":1,"scale":1,"position":[4,3,18],"target":[0,1,0]},
     "transition":{"type":"pull","duration":0.48}}
  ]
}
```

Each `reconstruction.references` row has `id`, local `path`, and `parts` matching top-level authored part IDs. Each matching `asset-plan.assets` row has `id`, `path`, exact `prompt`, `sha256`, plus tool/provenance information. Bind every beat's `assets` to those IDs. Multi-reference mode checks at least two distinct image hashes; every reference must actually be used. Single-reference mode is explicit, not a workaround for an incomplete multi-scene brief.

## Legacy beat handoff choices

| Type | Use and obligation |
| --- | --- |
| `camera` | Same scene root: continuous position, target and zoom across a window centered on the cut. Maintain the mechanism state. |
| `slide` | Different contexts: matching signed lateral movement; `axis: "x"/"y"`, `direction: -1/1`. |
| `push` | Move deeper: outgoing grows, incoming starts smaller and grows to rest. Align a meaningful circular opening, part or flow carrier. |
| `pull` | Return to context: outgoing shrinks, incoming starts larger and shrinks to rest. |
| `match` | Exact cut without wrapper movement. Author matching camera framing, category colors or geometry yourself. |

The transition belongs to the incoming beat. Default duration is 0.48 seconds (dynamic) or 0.9 (calm), with roughly 10% partial travel and mirrored quintic easing. The stage uses an opaque background, an absolute transform and a single active scene; it does not overlap two translucent renders. Camera transitions cannot switch scene roots. A named transition alone does not guarantee continuity: align the actual carrier and inspect both sides plus adjacent frames.

Within beats, use timed opening, insertion, a flowing carrier, a measurement or a meaningful change in scale. No idle wobble. Seat dependencies before closing shells. Use `markers: [seconds]` for insertion/contact/data extremes; QA samples these and their neighbors as well as seam edges, cuts and beat midpoints.

Read [text-motion.md](text-motion.md), [data-motion.md](data-motion.md), and the original [reassembly.md](reassembly.md) only as needed. New productions should use continuous world-space camera travel instead of these canvas-wrapper handoffs. The complete authored example is [dynamic-water](../examples/dynamic-water), with three references, two persistent contexts, ten beats and four chart forms.
