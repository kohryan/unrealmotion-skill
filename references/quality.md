# Review and export

Run `qa <project>` after editing. It saves a contact sheet, native PNGs and `output/qa/report.json`. Its automatic checks cover page/network failures, finite state, nonempty geometry/vector artwork, near-uniform frames, clipped copy, repeated-frame seek consistency and visible late-frame change. Explainers sample each real storyboard boundary and midpoint. `contact-sheet.png` summarizes the beats; numbered sheets contain all samples, with their frame lists in the report. These tests are technical evidence, not a perceptual quality score.

Inspect the contact sheet and individual full-size frames near start, middle, end, major action extremes, and both sides of each transition. Starter beat boundaries are included automatically. Add captures around custom transition times through `window.__unrealmotion.renderFrame(f)` when the default sampling misses them. Play the encoded output when a media viewer is available. Inspect a short adjacent-frame interval where fast or articulated motion could hide defects; sparse stills cannot prove smoothness.

Review these dimensions independently:

| Check | Passing evidence |
| --- | --- |
| `subjectFidelity` | Requested subject and identity details; credible silhouette, attachments/anatomy, no substituted generic hero |
| `materialsLighting` | Coherent physical materials, scale, contact, shadows, reflections and color management |
| `composition` | Intentional hierarchy, safe framing for requested aspect, legible unclipped copy, no placeholder content |
| `motionContinuity` | Natural acceleration, continuous paths, stable identities, appropriate pivots, no pops or rigid puppet action |
| `transitions` | Both sides inspected; matching movement, intentional occlusion or a deliberate resolved beat |
| `lateMotion` | A subject/structural change is visible in the latter half, beyond camera/text/particle noise |

After actually inspecting evidence, write `<project>/review.json`:

```json
{
  "sourceHash": "copy the current hash from output/qa/report.json",
  "checks": {
    "subjectFidelity": true,
    "materialsLighting": true,
    "composition": true,
    "motionContinuity": true,
    "transitions": true,
    "lateMotion": true
  },
  "evidence": [
    "output/qa/frame-000000.png",
    "output/qa/frame-000180.png",
    "output/qa/frame-000359.png"
  ],
  "notes": "Describe observed geometry, action, transitions and any real limits. Use actual frame filenames."
}
```

This is a reviewer attestation, not machine vision. Never populate it before inspecting frames or pass a failed criterion to unlock a render. Editing source invalidates both reports. `render --final` checks source-matched technical and visual reports; ordinary `render` is allowed for review drafts and is marked `visualReview: pending` in its manifest.

Explainer mode additionally requires `explanation`, `causalMotion` and `shotContinuity` in `checks`. Inspect the complete narrative, legibility without audio, alignment between model and claims, and scene handoffs. Follow [explainers.md](explainers.md). For a silent request, verify the encoded file has no audio stream.

The default `imagegen-explainer` also requires `promptFidelity`, `assetConsistency` and `reconstruction3D`: compare the actual prompt and generated reference against native renders, verify the established simple style, and inspect named mesh volumes and attachments from at least two oblique views. A rotating plane or animated image crops fail this review. Save the multi-angle/action evidence; geometry counts alone cannot establish fidelity. See [imagegen-threejs.md](imagegen-threejs.md).

Repair observed failures in source. If a material constraint cannot be met, deliver an honest draft with the specific limitation; do not claim final photoreal quality. One successful demo verifies only that demo and tested configurations, not arbitrary prompt coverage or every host/engine/GPU.

Version 2 final review also requires `dynamicPacing` (purposeful, readable beats at the selected pace) and `kineticText` (settled glyphs complete, reading time and model framing checked). Multi-reference projects require `multiAssetContinuity`: compare the image bundle and its rendered scenes for palette, silhouette, part identity and a motivated handoff. Any registered data chart additionally requires `dataAccuracy`: compare local values, units, domain, source/illustrative label, rank identity and rendered geometry. QA samples cuts, seam edges and authored markers with neighbors, and checks exactly one active scene root. Intentional glyph masking during entry is allowed; persistent clipped copy is not.
