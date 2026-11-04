# Motion recipes

These recipes alter camera trajectory or assembly/entrance behavior in the starters. Author subject-specific action in `scene.mjs`; selecting a profile alone is not a finished film.

| Profile | Useful for | Bundled behavior | Add for a finished story |
| --- | --- | --- | --- |
| `cinematic-orbit` | Hero product, material/architecture studies | Eased camera arc, rising view, restrained push | Operate/reveal an actual feature; avoid endless turntables |
| `precision-assembly` | Mechanical, construction, cutaway | Short arc; optical layers/roof separate and return | Part-specific offsets along assembly axes, stagger, alignment and final lock |
| `macro-dolly` | Surface or mechanism detail | Smaller arc, stronger push, rising camera | A planned close detail with focus/near-plane checks, then a payoff |
| `continuous-flow` | Energy, biology, particles, networks | Gentle continuous camera motion | Analytic paths, phase-offset cycles and a transport/deformation action |
| `editorial-spring` | Type, diagram labels, graphic symbols | Tight camera; analytic staggered spring on kinetic bands | Semantic text handoffs, motion hierarchy and disciplined overshoot |

The studio's shared camera uses a quintic smootherstep; its velocity and acceleration reach zero at the endpoints. Springs are analytic damped oscillators, evaluated from absolute time. Use `spring(t - delay, frequency, damping)`; avoid springs on loaded real machinery unless elasticity is intended. Rigid precision parts should use critically damped or quintic alignment, not bounce through their mount.

## Author a useful timeline

For a 12-second example, a natural rhythm might be a 0–2s recognition/reveal, 2–7s primary action, 7–10s detail transformation, and 10–12s resolved product state with residual meaningful action. Adapt to the narrative; do not repeat a fixed title-card pattern. The first frame should be composed, even before text arrives.

At least one interval in the latter half must show subject change, not only text/noise. Examples: an aperture cycles as an optical stack closes; a gate transports water; a biological surface pulses with phase-lagged tentacles; data marks transform with their mapping preserved. Keep the camera subordinate to those events.

## Smooth transitions

- **Continuous camera:** share the boundary camera pose and tangent. Evaluate one spline or matching Hermite segments; avoid lookAt target jumps and independent eased shots that unexpectedly stop.
- **Matched directional handoff:** move the outgoing composition along an axis, switch while the movement is fast, and let the incoming composition continue with the same screen-space velocity. Match the sign for zooms as well as x/y slides.
- **Occlusion cut:** let an actual foreground object cover the frame, change scene while covered, then reveal. Check both sides of the hidden cut.
- **Focus handoff:** preserve composition while changing focus/emphasis. Blur is purposeful, short and bounded; keep typography readable.
- **Stagger:** offset elements by causal order and weight, not arbitrary randomness. Heavy structure settles before small details; a title can cascade faster than a mechanism.

Use anticipation and follow-through when supported by the subject. Avoid equal-duration, equal-speed movement on every part. For loops, match both position and velocity at the seam; `sin(2π*t/period + phase)` is seekable. For physics, precompute a fixed-timestep seeded simulation, cache states and interpolate; never advance it from the last requested frame.

Motion blur is optional and is not enabled in the baseline renderer. Proper temporal supersampling requires resetting the complete scene at every sub-frame, accumulating in linear space and keeping crisp typography separate. Do not describe a 60fps export as motion-blurred unless it is.

New explainer choreography uses [dynamic-story.md](dynamic-story.md) for camera/slide/push/pull/match handoffs, [text-motion.md](text-motion.md) for readable kinetic copy, and [data-motion.md](data-motion.md) for quantity-driven graphics. Keep the same rest poses and causal clock across these editorial layers.
