import { getFlyToken } from "./flags.js";

const lastHp = new Map();

function hpBag(actor) {
  const sys = actor?.system ?? {};
  return [
    sys.attributes?.hp,
    sys.hp,
    sys.attribs?.hp,
    sys.health,
    sys.attributes?.health,
    actor?.hitPoints
  ];
}

export function readHp(actor) {
  if (!actor) return null;
  for (const hp of hpBag(actor)) {
    if (!hp || typeof hp !== "object") continue;
    const value = Number(hp.value);
    const max = Number(hp.max);
    if (!Number.isFinite(value) && !Number.isFinite(max)) continue;
    const v = Number.isFinite(value) ? value : 0;
    const m = Number.isFinite(max) && max > 0 ? max : Math.max(v, 1);
    return { value: v, max: m };
  }
  return null;
}

/**
 * Map a 10 HP pool onto any max:
 * missing 1/10 of max → pain, 5/10 → very painful, 0 HP → death (silent until HP ≥ 1).
 * HP increase since last sample → reward pulse.
 */
export function flyHealth() {
  const fly = getFlyToken();
  const actor = fly?.actor;
  const hp = readHp(actor);
  if (!hp) {
    return {
      present: false,
      value: 0,
      max: 0,
      dead: false,
      pain: 0,
      very: false,
      reward: 0,
      lostTenths: 0,
      label: "—",
      pct: 0,
      state: "unknown"
    };
  }
  const key = actor.uuid ?? actor.id ?? fly.id;
  const prev = lastHp.get(key);
  lastHp.set(key, hp.value);
  const dead = hp.value < 1;
  const lostTenths = hp.max > 0 ? ((hp.max - hp.value) / hp.max) * 10 : 0;
  const gain = prev != null ? hp.value - prev : 0;
  let pain = 0;
  let very = false;
  let state = "ok";
  if (dead) state = "dead";
  else if (lostTenths >= 5) {
    pain = 1;
    very = true;
    state = "very";
  } else if (lostTenths >= 1) {
    pain = Math.min(1, lostTenths / 5);
    state = "pain";
  }
  const reward = !dead && gain > 0 ? Math.min(1, gain / Math.max(hp.max / 10, 1)) : 0;
  if (reward > 0 && state === "ok") state = "reward";
  return {
    present: true,
    value: hp.value,
    max: hp.max,
    dead,
    pain,
    very,
    reward,
    lostTenths,
    label: `${hp.value} / ${hp.max}`,
    pct: Math.max(0, Math.min(100, (hp.value / hp.max) * 100)),
    state
  };
}

export function isFlySilenced() {
  const hp = readHp(getFlyToken()?.actor);
  return Boolean(hp && hp.value < 1);
}

export function hpCurrents(health) {
  const pairs = [];
  if (!health?.present) return pairs;
  if (health.dead) {
    pairs.push(["dead", 1]);
    return pairs;
  }
  if (health.pain > 0.02) pairs.push(["pain", health.very ? 1 : health.pain]);
  if (health.reward > 0.02) pairs.push(["reward", health.reward]);
  return pairs;
}
