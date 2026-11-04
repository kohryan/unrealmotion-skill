# HF scene retrieval

The bundled `data/hf-catalog.jsonl` contains metadata and user prompts for **4,146** scenes (3,933 train, 213 validation) across the pinned dataset revision. Complexity levels 1–10 are author annotations, not measured quality scores. Voxel examples are excluded by default because this skill targets coherent near-realistic surfaces unless voxel styling is requested.

```sh
python3 <skill>/scripts/hf_dataset.py search "optical camera lens mechanism" --limit 3 --min-level 4
python3 <skill>/scripts/hf_dataset.py search "temple pavilion architecture courtyard" --limit 3 --min-level 6
python3 <skill>/scripts/hf_dataset.py search "jellyfish bell tentacles" --limit 3
python3 <skill>/scripts/hf_dataset.py fetch scene-002322 --output <project>/references/film-camera
```

Search is offline BM25 lexical retrieval. Translate Indonesian subjects into English technical terms first and search by subject, materials and mechanisms. Search does not require PyArrow or a paid embedding endpoint. `fetch` needs the optional `requirements-dataset.txt`, downloads one pinned 7–34MB Parquet shard over verified HTTPS, checks its SHA-256, caches it under `<skill>/.cache/hf`, and extracts only the assistant's HTML response. Use `--cache <dir>` before the subcommand to choose another cache. It refuses an existing output directory.

`data/hf-source.json` records revision, shard checksums, counts and catalog hash. `data/CCORE-LICENSE` carries the dataset's MIT notice. Raw reasoning traces are not in the catalog, exported HTML, or provenance. The original downloaded Parquet cache still contains the upstream columns; it is ignored by Git and never passed to a model as hidden reasoning.

## What to study in retrieved JS

Identify the mesh hierarchy, characteristic dimensions, curved/lathed/tubular shape construction, repeated structural details, shading and motion relationships. Prefer the structure that explains the requested object; copying an entire showcase with unrelated UI is rarely useful.

Upstream examples use mixed Three.js versions, CDN imports, orbit UI, `Clock`, unseeded randomness, CSS animations, incremental rotations and mutable particle state. They are **reference source**, not files ready for this renderer. Inspect before executing; replace network dependencies with pinned local assets, discard unrelated UI, preserve required license notices, and convert all visible state to absolute-time evaluation. Do not import an old Three.js core beside the pinned core: duplicate versions can break materials and loaders.

Use the optional HF `previews` configuration when exact reference-image comparison matters; those image shards total about 1.37GB and are not automatically downloaded. Dataset inclusion does not prove photorealism, smooth video motion or correct mechanics. The shipped examples use original geometry informed by these construction patterns, not redistributed upstream scene HTML.
