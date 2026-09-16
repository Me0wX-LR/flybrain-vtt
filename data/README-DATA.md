# Connectome data files

v0.1 ships **without** FlyWire CSR bins. The overlay generates a dummy 138,639-point layout at runtime (or from `somata.xy.bin` if you run `node tools/pack-somata.mjs`).

## What belongs here

| File | Role |
| --- | --- |
| `atlas.json` | Named stimuli and motor cell types. `ids` filled by `tools/pack-graph.mjs`. |
| `regions.json` | Overlay region names for LOD blobs. |
| `somata.xy.bin` | `Float32` little-endian `x,y` pairs in `[0,1]²`. Length `2 * n`. |
| `graph.csr.bin.gz` | Packed CSR (`FB01` magic). Not required for dummy mode. |

## Building real FlyWire v783 bins (author machine only)

Public connectivity and annotations are documented by FlyWire / Codex. Typical author steps:

1. `node tools/fetch-flywire.mjs` — records source URLs; does not scrape from Foundry.
2. `node tools/pack-graph.mjs` — keep edges with synapse count ≥ 5, dense-index root IDs, gzip CSR.
3. `node tools/pack-somata.mjs` — 2D layout (dummy clusters until a published projection is frozen).
4. `node tools/validate-sugar.mjs` — dummy motor: sugar raises feed readout. With a real graph, assert MN9 vs baseline.

Do not run these tools inside a Foundry world. Players never need Node.

Treat redistributed v783 connectivity as **CC BY-NC 4.0** until FlyWire says otherwise. Cite Dorkenwald 2024, Schlegel 2024, Shiu 2024 in ATTRIBUTION.md.
