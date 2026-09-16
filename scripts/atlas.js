import { MODULE_ID } from "./constants.js";

let cached = null;

export async function loadAtlas() {
  if (cached) return cached;
  const url = `modules/${MODULE_ID}/data/atlas.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  cached = await res.json();
  return cached;
}

export function atlasOrEmpty() {
  return cached ?? { version: 1, stimuli: {}, motors: {}, regions: {} };
}
