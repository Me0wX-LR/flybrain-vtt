import { N_NEURONS } from "./constants.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng) {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Region ids 0..11 matching data/regions.json order. */
export const REGION_LAYOUT = [
  { x: 0.22, y: 0.42, z: 0.62, sx: 0.07, sy: 0.11, sz: 0.08, w: 0.16, name: "opticL" },
  { x: 0.78, y: 0.42, z: 0.62, sx: 0.07, sy: 0.11, sz: 0.08, w: 0.16, name: "opticR" },
  { x: 0.38, y: 0.32, z: 0.48, sx: 0.06, sy: 0.06, sz: 0.05, w: 0.08, name: "alL" },
  { x: 0.62, y: 0.32, z: 0.48, sx: 0.06, sy: 0.06, sz: 0.05, w: 0.08, name: "alR" },
  { x: 0.42, y: 0.18, z: 0.4, sx: 0.08, sy: 0.05, sz: 0.05, w: 0.09, name: "mbL" },
  { x: 0.58, y: 0.18, z: 0.4, sx: 0.08, sy: 0.05, sz: 0.05, w: 0.09, name: "mbR" },
  { x: 0.5, y: 0.48, z: 0.5, sx: 0.07, sy: 0.06, sz: 0.06, w: 0.1, name: "cx" },
  { x: 0.5, y: 0.66, z: 0.42, sx: 0.09, sy: 0.06, sz: 0.05, w: 0.08, name: "sez" },
  { x: 0.5, y: 0.84, z: 0.38, sx: 0.1, sy: 0.045, sz: 0.04, w: 0.06, name: "dn" },
  { x: 0.3, y: 0.58, z: 0.55, sx: 0.05, sy: 0.05, sz: 0.04, w: 0.04, name: "lhL" },
  { x: 0.7, y: 0.58, z: 0.55, sx: 0.05, sy: 0.05, sz: 0.04, w: 0.04, name: "lhR" },
  { x: 0.5, y: 0.36, z: 0.5, sx: 0.04, sy: 0.04, sz: 0.04, w: 0.02, name: "other" }
];

export function generateDummySomata(n = N_NEURONS, seed = 783) {
  const rng = mulberry32(seed);
  const xy = new Float32Array(n * 2);
  const xyz = new Float32Array(n * 3);
  const region = new Float32Array(n);
  const weights = REGION_LAYOUT.map((c) => c.w);
  const sum = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    let r = rng() * sum;
    let idx = weights.length - 1;
    for (let k = 0; k < weights.length; k++) {
      r -= weights[k];
      if (r <= 0) {
        idx = k;
        break;
      }
    }
    const c = REGION_LAYOUT[idx];
    let x = c.x + gauss(rng) * c.sx;
    let y = c.y + gauss(rng) * c.sy;
    let z = (c.z ?? 0.5) + gauss(rng) * (c.sz ?? 0.05);
    x = Math.min(0.995, Math.max(0.005, x));
    y = Math.min(0.995, Math.max(0.005, y));
    z = Math.min(0.995, Math.max(0.005, z));
    xy[i * 2] = x;
    xy[i * 2 + 1] = y;
    xyz[i * 3] = (x - 0.5) * 2;
    xyz[i * 3 + 1] = (0.5 - y) * 2;
    xyz[i * 3 + 2] = (z - 0.5) * 2;
    region[i] = idx;
  }
  return { xy, xyz, region };
}

let memo = null;

export function getDummySomata(n = N_NEURONS) {
  if (memo && memo.xy.length === n * 2) return memo;
  memo = generateDummySomata(n);
  return memo;
}

export async function loadSomataBin(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const xy = new Float32Array(buf);
    if (xy.length < 2 || xy.length % 2 !== 0) return null;
    return xy;
  } catch {
    return null;
  }
}
