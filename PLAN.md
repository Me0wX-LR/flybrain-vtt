# Fly Brain Foundry Module — Implementation Plan

Use this file as the project spec. Implement in phase order. Do not add a WebSocket sidecar, Python process, ViZDoom, or doomfly’s C++ kernel.

## Locked decisions (do not reopen)

| Decision | Choice |
|---|---|
| Foundry version | **v14 only** (PIXI 8 / ApplicationV2 / button-only SceneControls). Not v13. |
| Runtime | Inside the installed module only |
| Extra processes | None |
| Brain engine | Dummy sparse dynamics now; JS/WASM LIF in a **Web Worker on the sim-owner GM client** when CSR exists |
| Who runs the brain | **One active GM** (lowest user id among connected GMs). Players never fetch the graph |
| Point cloud | **One** mesh. Positions uploaded once in local inset space; the container follows the fly |
| Overlay group | `CONFIG.Canvas.layers` group **`overlay`** (not PrimaryCanvasGroup) |
| Token sync | Foundry token document updates only. **No player 138k activity packets** |
| Flags | `flags.flybrain-vtt.role` = `fly` \| `food` \| `threat` \| `none` |
| Chat | `ChatLog.CHAT_COMMANDS` `/flybrain`, `/fly` alias. GM only |
| Manifest | `esmodules` only. No `scripts[]` |
| UI | ApplicationV2 + Token HUD cycle button |
| Grid | Square grids for movement in v1 |
| Official listing | Not required. Self-host GitHub |

## Non-goals (v1)

- doomfly / Brian2 / C++ kernel
- Canvas pixel photoreceptors
- 138,639 Tokens, Sprites, or Graphics circles
- Pathfinding, inventory, speech, fly as a full PC
- Claiming consciousness
- Bundled AI art/lore
- Selling the module while shipping FlyWire NC bins

## Success at the table

1. Install zip / manifest, enable, reload.
2. Token HUD brain icon → fly / food / threat.
3. Inset cloud appears for the GM and flickers.
4. `/flybrain sugar` raises feed readout.
5. Threat closing in + autonomous on → dash away, walls respected.
6. Players see the token move. No Python.

## Architecture

```
GM browser (sim owner)
├─ hooks, flags, decoder, HUD, overlay layer
└─ workers/fly.worker.js  (dummy LIF; later sparse CSR)
Players
└─ token document + optional HUD meters. No worker. No graph fetch.
```

There is **no Foundry server-side module JS**. Everything in `esmodules` runs in the browser. Gate the worker with `isSimOwner()`.

## Layout

See the repository tree. `tools/` is author-only and excluded from the GitHub release zip.

## Worker protocol

Main → worker: `init`, `setStim`, `setCurrents`, `step`, `reset`.
Worker → main: `ready`, `frame` (transferable `activity` Float32Array + motor + regions).

Main thread must not step LIF. Sparse / dummy only; never a dense 2.7M-edge × 300-dt loop in JS.

## Phases

### Phase 0 — Table fantasy (this repo)

Module loads on v14. Flags, `/flybrain`, HUD stub, fake walk toward food when autonomous.

### Phase 1 — Point mesh

Single geometry, dummy somata if bins missing, inset follows fly, LOD blobs, ≤20 fps, no per-neuron sprites.

### Phase 2 — Worker LIF

Worker loads packed graph when present; `/flybrain sugar` stimulates atlas IDs; GM-only.

### Phase 3 — Grid closed loop

Food/threat currents, decoder, walls, `/flybrain stop`.

### Phase 4 — Polish

Click-inspect, attribution, macros (no sample Actor — keep system-agnostic).

## Coding rules

1. Prefer official Foundry APIs; isolate canvas in `layer.js`.
2. No `eval`. No TensorFlow / Three / React. PIXI is already there.
3. Network: only files under this module root.
4. Worker has no Foundry globals.
5. English UI; every string in `lang/en.json`.
6. Copy: “connectome model”, “stimulus”, “motor readout.”

## Disclaimer

> This is a simplified leaky-integrate-and-fire model on published connectome wiring. It is not a living fly. Motor actions are house-ruled from a few identified cells.
