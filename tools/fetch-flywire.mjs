#!/usr/bin/env node
/**
 * Author-only. Does not run in Foundry.
 * Records public FlyWire / Codex entry points. Implement downloads here later;
 * never fetch connectome files from a world load.
 */
const URLS = {
  flywire: "https://flywire.ai/",
  codex: "https://codex.flywire.ai/",
  natureShiu2024: "https://www.nature.com/articles/s41586-024-07354-8"
};

console.log("FlyWire pack sources (author machine):");
for (const [k, v] of Object.entries(URLS)) console.log(`  ${k}: ${v}`);
console.log("\nNot fetching. See data/README-DATA.md.");
