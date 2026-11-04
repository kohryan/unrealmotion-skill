# Text that carries the explanation

Keep the established local Inter font and pastel/ink palette. Headlines should identify an action or conclusion; avoid a paragraph competing with the mechanism. Motion is absolute-time and seekable, with no CSS keyframe clocks, timers or incremental text append.

For version 2 beats, supply `text: {preset, layout, emphasis}`:

- `words`: masked word cascade, the default. Most entries settle within half a second.
- `characters`: grapheme-aware reveal for short words/numbers; more than 24 graphemes falls back to words.
- `wipe`: restrained directional reveal.
- `impact`: brief 1.1 → 1 settling emphasis.
- `none`: immediately composed copy.

Layouts are `caption` (bottom card), `hero` (upper title), and `side` (left text). Reframe the model to reserve that space. Emphasis is an array of words, case-insensitive with punctuation ignored; use it for a useful keyword, not every word. Width is reserved at the maximum variable-font weight before animation to prevent line reflow. The full text is exposed as an ARIA label.

For a purposeful in-scene title:

```js
stage.kinetic({
  id:'measurement-title', text:'JADI ANGKA.',
  preset:'impact', emphasis:['ANGKA'],
  scene:'meter', beats:['measurement'], start:9.2, end:11.4,
  rect:{x:7,y:14,width:86}, fontSize:8 // cqw; rectangle is frame percent
});
```

This registers a graphic with the stage; do not call its update independently. Headline masks deliberately crop entering glyphs, but a settled word must be fully visible. Review at native output size and a scaled preview, including long Indonesian words and the actual aspect ratio. During a non-camera incoming handoff, the caption arrives composed so the scene seam and word reveal do not fight each other. Hero/side titles clear their reserved space before an outgoing camera close-up occupies it. Keep reading time after the reveal; dynamic pacing does not mean unreadable copy.
