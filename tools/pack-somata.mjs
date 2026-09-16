#!/usr/bin/env node
/**
 * Author-only. Writes a dummy somata.xy.bin (Float32 x,y in [0,1]^2).
 * Does not download FlyWire.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateDummySomata } from "../scripts/somata.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { xy } = generateDummySomata();
const out = join(root, "data", "somata.xy.bin");
writeFileSync(out, Buffer.from(xy.buffer));
console.log(`wrote ${out} (${xy.length / 2} points, ${xy.byteLength} bytes)`);
