#!/usr/bin/env node
/**
 * Author-only sugar protocol. Dummy mode: feedHz must rise vs baseline.
 * When graph.csr.bin.gz exists, extend this to stimulate atlas sugar IDs
 * for 200 ms and assert MN9 rate.
 */
import { createState, setStim, stepDummy } from "../workers/lif.js";

const baseline = createState();
const sugar = createState();
setStim(sugar, "sugar", true, 150);

for (let i = 0; i < 8; i++) {
  stepDummy(baseline, 30);
  stepDummy(sugar, 30);
}

const b = baseline.motor.feedHz;
const s = sugar.motor.feedHz;
console.log(`baseline feedHz=${b.toFixed(2)}  sugar feedHz=${s.toFixed(2)}`);
if (!(s > b * 2 && s > 10)) {
  console.error("validate-sugar: feed readout did not rise");
  process.exit(1);
}
console.log("validate-sugar: ok (dummy motor)");
