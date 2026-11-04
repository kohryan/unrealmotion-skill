# Data visualization motion graphics

Use the native `runtime/dataviz.mjs` SVG overlay on the Three.js stage. No chart dependency or separate renderer is required. Choose bar for comparisons, line for ordered/time observations, donut for parts of a whole, counter for one quantity, and race only when rank changes explain the story. Do not invent measurements for an explanatory mechanism. Mark invented demo values `illustrative:true`; factual data needs a meaningful `source`, units and a local snapshot.

```js
import {createDataGraphic} from './runtime/dataviz.mjs';
await createDataGraphic(stage,{
  id:'usage', type:'bar', title:'Pemakaian per bagian', unit:'L/hari',
  data:'data/use.csv', domain:[0,200],
  source:'Simulasi demo', illustrative:true,
  scene:'meter', beats:['comparison'], start:12, end:16, enter:.55,
  rect:{x:7,y:38,width:86,height:31}
});
```

Load graphics inside `createModel` before readiness. The stage updates them with the same absolute seconds/story state and exposes `graphics` in inspection. Use percentage rectangles that leave room for the subject, title and source. A source URL is a caption; runtime data is always loaded from local files, never fetched remotely.

## Local data contracts

Static JSON is an array of `{id,label,value}` rows. Animated JSON is:

```json
{"frames":[
  {"time":0,"values":[{"id":"a","label":"Bagian A","value":20},{"id":"b","label":"Bagian B","value":40}]},
  {"time":2,"values":[{"id":"a","label":"Bagian A","value":70},{"id":"b","label":"Bagian B","value":50}]}
]}
```

Frame `time` is seconds relative to graphic start. `timeScale` explicitly retimes the data. Keep IDs, labels, and optional numeric `x` values stable across frames. All categories must be present in every frame. Race transitions interpolate stable rank slots, with deterministic ID-based tie order; colors belong to IDs, not rank.

CSV uses `id,label,value`, optionally `time,x`. Quoted commas/newlines are supported. Numbers use a decimal point, without currency symbols or thousands separators; localize only displayed copy. A line's `x` must increase; its labels can be timestamps. Empty CSV values or JSON `null` are accepted only for line charts and produce gaps, never false zero observations.

## Quantity and visual rules

- Fix the domain across the entire sequence. Every observation must fit; bars/races include a zero baseline. Axis ticks, geometry, numeric labels and counters use the same sampled values. Negative bars extend left of zero. Rounded/tabular digits prevent unreadable decimals and width jitter.
- A donut requires nonnegative values and a positive finite total. If `unit:'%'`, every frame must sum to 100. Maintain category identity/color between a bar and its donut. Its legend displays the original units; angular share uses the total.
- A live model binding uses `sample:seconds => [{id,value}]`, a fixed `domain` and a non-race type. This callback must be pure and read the same physical clock as the meshes; out-of-domain values fail. The short entry reveal is editorial, not additional observed data.
- Keep small charts readable: aggregate to roughly 3–6 categories or a handful of labeled time observations. Long category labels truncate with full SVG titles; never silently truncate values. For large numbers, explicitly choose a scaled unit and transform the source data consistently. Do not compress hundreds of rows into this portrait chart.
- `decimals:0..6` and `locale` control numeric display. Preserve units, observation dates and sources in the project. Do not imply that illustrative physics or simulated rates were measured.

Review chart entry, fully settled values, category crossings, extrema and missing observations. Compare shown numbers with the local data and rendered mark dimensions. Inspect reverse/random seeks and an encoded moving interval. Add `dataAccuracy:true` to final review only after this inspection. The runtime validates finite values and scales; it does not establish factual truth or statistical validity.

To place charts along the actual camera route, supply `anchor:[x,y,z]` and positive `worldWidth`, optionally `worldHeight`. The same camera projects these billboard panels; they persist in space. See [continuous-camera.md](continuous-camera.md).
