# Fly Brain

A [Foundry Virtual Tabletop](https://foundryvtt.com/) module that runs a **connectome model on the GM client only**.

Mark one token as the fly, others as food or threat. Chat `/flybrain sugar` drives a named stimulus. A single GPU point-cloud inset (not 138k tokens) flickers with activity. If **Autonomous movement** is on, the fly token may take short house-ruled steps. Players never install Python; they just see the token move.

v0.1 ships a **dummy sparse worker** so the table loop works before FlyWire CSR bins are packed. It is not a living fly.

Compatible with Foundry **v13+** (verified 13). System-agnostic. Square grids only for movement.

## What this is not

- Not doomfly, Brian2, or a C++ kernel
- Not photoreceptors sampled from the canvas
- Not 138,639 tokens or sprites
- Not a full player character (no pathfinding, inventory, or speech)
- Not biological consciousness or validated learning

## Install

Copy this repository into `Data/modules/flybrain-vtt` so that `module.json` sits at the module root. Enable **Fly Brain** in the world and reload.

Manifest URL (after the GitHub repo is public):

```
https://raw.githubusercontent.com/Me0wX-LR/flybrain-vtt/main/module.json
```

## At the table

1. Place a token. On the Token HUD, click the brain icon to cycle **none → fly → food → threat**. Only one fly per scene.
2. Place food and threat tokens the same way.
3. GM chat:
   - `/flybrain sugar [on|off]`
   - `/flybrain loom`
   - `/flybrain walk`
   - `/flybrain stop`
   - `/flybrain reset`
   - `/flybrain status`
   - `/fly` is an alias if nothing else claimed it
4. Open the Fly Brain panel from the token scene-control brain button.
5. Optional world setting **Autonomous movement** lets the active GM client step the fly toward food or dash from a closing threat. Walls are respected; moves are rate-limited.

Token flags live under `flags.flybrain-vtt` (`role`, `strength`, `channel`).

## Overlay

GM-only by default. **Inset** mode parks a 400×400 world-unit cloud beside the fly token. Zoomed out, it collapses to a dozen region blobs. Activity is never sent over the Foundry socket.

## House-rule decoder

Published so it is not a hidden brain:

| Condition | Token action |
| --- | --- |
| escape readout high and a threat exists | dash 2 squares away |
| feed readout high and food in 1 square | stay, feed cue |
| otherwise, food on the scene and autonomous on | walk 1 square toward nearest food |
| destination blocked | try a slide; else skip |

## Hardware

The GM laptop runs a Web Worker. Overlay target is about 20 fps. If the point mesh shader fails on a given PIXI version, region blobs still draw.

## Citations and license

MIT for original code. FlyWire-derived bins, if you add them later, stay non-commercial. See [ATTRIBUTION.md](ATTRIBUTION.md) and [LICENSE](LICENSE).

This is a simplified leaky-integrate-and-fire model on published connectome wiring. It is not a living fly. Motor actions are house-ruled from a few identified cells.

## Development

| Path | Role |
| --- | --- |
| `scripts/module.js` | Foundry entry (hooks) |
| `workers/` | GM-only worker + dummy LIF |
| `tools/` | Author packing scripts; not needed by players |
| `PLAN.md` | Implementation spec |

```
node tools/validate-sugar.mjs
node tools/pack-somata.mjs
```

Point Foundry at a symlink of this folder named `flybrain-vtt` inside `Data/modules`.
