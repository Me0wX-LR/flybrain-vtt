# Attribution

Original module code is MIT (see LICENSE).

This module is a **simplified leaky-integrate-and-fire model** on published fruit-fly wiring ideas. It is not a living fly. Motor actions at the table are house-ruled from a few identified cell types (feed, escape, turn, walk). Do not describe the token as conscious, trained, or “playing the TTRPG.”

## Citations

- Dorkenwald, S. et al. Neuronal wiring diagram of an adult brain. *Nature* (2024). FlyWire whole-brain connectome.
- Schlegel, P. et al. Whole-brain annotation and mapping of the adult *Drosophila* connectome. *Nature* (2024).
- Shiu, P. K. et al. A leaky integrate-and-fire model of the *Drosophila* brain. *Nature* (2024). Default LIF constants used when a packed graph is present.

## Data license

Public FlyWire FAFB v783 connectivity, if you pack and redistribute `data/graph.csr.bin.gz`, should be treated as **CC BY-NC 4.0** until FlyWire states otherwise. **Do not sell this module** while shipping those bins. Dummy runtime layout in v0.1 does not include FlyWire edge lists.

## Reference software (ideas only; not vendored)

- fly-brain-bench — packed ≥5-synapse graph and sparse LIF timing
- satorunet/hae flybrain — small WASM Shiu LIF API shape
- nftechie/doomfly — sensor → descending-neuron readout *idea* only

No Doom / id Software assets. No Foundry VTT source is republished.

## Token presets

`assets/fly.png`, `assets/food.png`, and `assets/threat.png` are bundled table-token stills generated for this module. They are not FlyWire imagery and are not claimed as scientific figures. Clearing a role restores the token’s previous `texture.src`.
