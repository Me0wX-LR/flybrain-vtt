/**
 * Sparse-ish dummy LIF stand-in.
 * Real CSR integration lands when graph.csr.bin.gz is packed; until then this
 * decays an activity buffer and drives a handful of motor leaky integrators
 * so sugar → feed and loom → escape are visible at the table.
 */

export const N_DEFAULT = 138639;

export function createState(n = N_DEFAULT) {
  return {
    n,
    v: new Float32Array(n),
    activity: new Float32Array(n),
    activityAlt: new Float32Array(n),
    useAlt: false,
    stimHz: Object.create(null),
    currents: Object.create(null),
    motor: { feedHz: 0, escapeHz: 0, turn: 0, forward: 0 },
    regions: { optic: 0, al: 0, mb: 0, cx: 0, sez: 0, dn: 0 },
    nActive: 0,
    mode: "dummy"
  };
}

function decay(arr, factor) {
  for (let i = 0; i < arr.length; i++) arr[i] *= factor;
}

function sprinkle(state, count, amplitude, offset) {
  const n = state.n;
  let spikes = 0;
  const start = Math.abs(offset) % n;
  for (let k = 0; k < count; k++) {
    const i = (start + k * 97) % n;
    state.activity[i] = Math.min(1, state.activity[i] + amplitude);
    state.v[i] = 1;
    spikes++;
  }
  return spikes;
}

export function setStim(state, name, on, hz) {
  state.stimHz[name] = on ? hz : 0;
}

export function setCurrents(state, pairs) {
  state.currents = Object.create(null);
  for (const [name, mag] of pairs ?? []) {
    state.currents[name] = mag;
  }
}

export function resetState(state) {
  state.v.fill(0);
  state.activity.fill(0);
  state.activityAlt.fill(0);
  state.stimHz = Object.create(null);
  state.currents = Object.create(null);
  state.motor = { feedHz: 0, escapeHz: 0, turn: 0, forward: 0 };
  state.nActive = 0;
}

/**
 * Advance dummy dynamics. simMs is wall-sim time requested by the table tick.
 * Real Shiu dt is 0.1 ms; we do not visit 2.7M edges here.
 */
export function stepDummy(state, simMs = 30) {
  const dt = Math.max(1, simMs) / 1000;
  const dead = (state.currents.dead || 0) > 0.5;
  decay(state.activity, dead ? 0.55 : Math.pow(0.12, dt / 0.03));
  decay(state.v, 0.85);

  if (dead) {
    state.motor.feedHz = 0;
    state.motor.escapeHz = 0;
    state.motor.turn = 0;
    state.motor.forward = 0;
    state.regions.optic = 0.02;
    state.regions.al = 0;
    state.regions.mb = 0;
    state.regions.cx = 0;
    state.regions.sez = 0;
    state.regions.dn = 0;
    state.nActive = 0;
    return { motor: { ...state.motor }, regions: { ...state.regions }, nActive: 0, dead: true };
  }

  const sugar = (state.stimHz.sugar || 0) / 150 + (state.currents.sugar || 0);
  const bitter = (state.stimHz.bitter || 0) / 150 + (state.currents.bitter || 0);
  const loom = (state.stimHz.loom || 0) / 80 + (state.currents.loom || 0);
  const shock = (state.stimHz.shock || 0) / 40 + (state.currents.shock || 0);
  const walk = (state.stimHz.walk || 0) / 40;
  const pain = state.currents.pain || 0;
  const reward = state.currents.reward || 0;

  let spikes = 0;
  if (sugar > 0.02) spikes += sprinkle(state, Math.floor(180 * sugar), 0.85, 1200);
  if (bitter > 0.02) spikes += sprinkle(state, Math.floor(80 * bitter), 0.6, 8800);
  if (loom > 0.02) spikes += sprinkle(state, Math.floor(220 * loom), 0.9, 24000);
  if (shock > 0.02) spikes += sprinkle(state, Math.floor(400 * shock), 1, 50000);
  if (walk > 0.02) spikes += sprinkle(state, Math.floor(90 * walk), 0.5, 90000);
  if (pain > 0.02) spikes += sprinkle(state, Math.floor(280 * pain), 0.95, 61000);
  if (reward > 0.02) spikes += sprinkle(state, Math.floor(200 * reward), 0.9, 1400);

  const leak = Math.exp(-simMs / 40);
  state.motor.feedHz = state.motor.feedHz * leak + sugar * 80 + reward * 70;
  state.motor.escapeHz = state.motor.escapeHz * leak + (loom * 40 + shock * 25 + pain * 18);
  state.motor.turn = state.motor.turn * leak + (sugar - loom) * 0.8;
  state.motor.forward = state.motor.forward * leak + (walk * 20 + sugar * 8 + reward * 10);

  state.regions.optic = Math.min(1, loom * 0.9 + 0.05);
  state.regions.al = Math.min(1, sugar * 0.8 + bitter * 0.5 + reward * 0.6);
  state.regions.mb = Math.min(1, sugar * 0.4 + reward * 0.7);
  state.regions.cx = Math.min(1, walk * 0.6);
  state.regions.sez = Math.min(1, sugar * 0.7 + pain * 0.8);
  state.regions.dn = Math.min(1, loom * 0.7 + walk * 0.3 + shock * 0.4 + pain * 0.5);
  state.nActive = spikes;

  return {
    motor: { ...state.motor },
    regions: { ...state.regions },
    nActive: spikes,
    dead: false
  };
}

export function nextActivityBuffer(state) {
  return state.activity.slice();
}
