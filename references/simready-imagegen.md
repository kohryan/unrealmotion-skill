# SimReady without the full dataset

Use this route when the user wants realistic industrial/household assets without retaining NVIDIA's very large USD library. The checked snapshot contains **2,677 asset packages**. This repo bundles names/categories/tree identifiers only; root metadata was fetched with pagination, not the API's truncated 100,000-file listing.

```sh
python3 <skill>/scripts/simready.py search "bearing ball" --limit 5
python3 <skill>/scripts/simready.py reference consumable_bearing_ball_a01 --output <project>/references/simready-bearing --max-mb 2
# Maintainers only: refresh metadata for the pinned revision, no asset payloads.
python3 <skill>/scripts/simready.py refresh
```

`reference` downloads one object thumbnail plus the asset's license, checks a cumulative size budget, and records source/revision/attribution/file hashes. It never retrieves USD, payload geometry, texture packs or the entire dataset. Search is offline. Default reference budget is 2 MiB; a thumbnail/license pair over budget fails before download. The demonstrated bearing reference totals **591,209 bytes**. The full catalog is under 1 MB.

SimReady packages are USD with references to materials, textures and payloads. A single `.usd` URL is not necessarily a complete model or a browser-ready GLB. An exact geometry workflow must acquire the specific package's dependencies and convert with an appropriate USD-capable tool, preserving materials, hierarchy and licenses. That is separate from this appearance-guided route.

## ImageGen → real Three.js geometry

1. Select a relevant asset, retrieve its small reference, and inspect it. Keep its NVIDIA attribution, license and source link. Treat the thumbnail as appearance evidence, not evidence of hidden internal construction.
2. If ImageGen is requested, use the host's built-in image generation tool when available. It does not require an additional API key. Request one consistent design across assembled 3/4, top, side/cutaway and exploded views. Preserve silhouette, material roles, recognizable features and central bores; forbid extra parts/brands. Save the generated reference and exact prompt into the project.
3. Compare the generated views. ImageGen may invent different interiors, counts, clearances or topology in each view. Resolve discrepancies in an explicit part/attachment specification before modeling. An attractive image is not a 3D mesh, depth map, physically measured CAD, or a verified disassembly plan.
4. Apply the img2threejs-style staged process: identity/measurements available → hierarchy/clearances → authored volume/topology → material response → light → action. Construct or load one coherent 3D model with stable named parts. Use lathe/extrude/tube/custom geometry, not independently animated image crops. The full image stays a reference; do not project the whole product photograph onto a rotating plane and call that 3D reconstruction.
5. Animate those same parts using [reassembly.md](reassembly.md), inspect oblique views and verify contact/occlusion at start, action extremes, and final alignment. Export through the normal local renderer.

Use ImageGen for visual direction and, when useful, separate texture/decal assets. It reduces bulk asset storage; it does not preserve NVIDIA simulation metadata, collision meshes, articulation schemas, mass/inertia or hidden geometry. Label the reconstruction accurately. For exact OEM/mechanical detail, use a suitable source model/manual; do not invent dimensional readouts.

If the built-in image tool is unavailable, report that fact and continue with a clearly identified procedural/reference-driven approximation where useful. Do not silently provision an API, download a local generation model, or switch to a paid provider. An explicitly chosen provider or API path follows that environment's credential/authorization flow.

## Demonstrated reference

`assets/references/bearing/` contains the NVIDIA thumbnail, its CC BY 4.0 license/provenance, a generated appearance sheet, and the generation prompt/provenance. `mechanical-reassembly` is original Three.js geometry inspired by those references, not NVIDIA USD geometry or a certified digital twin. The model resolves its own clearances explicitly: cage/upper-race bores clear the lower hub, ball pockets exceed ball radius, and parts assemble in dependency order.

Source: [NVIDIA SimReady pinned snapshot](https://huggingface.co/datasets/nvidia/simready-assets/tree/9d4556bfe80868c1d27a7a7ba1c2774e63e8cedd). Dataset card and per-asset license declare CC BY 4.0. Preserve attribution for downloaded/adapted reference material; do not relabel it as MIT. Original code remains under this repo's license.
