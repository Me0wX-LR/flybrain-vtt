import { FLAG_SCOPE } from "./constants.js";
import { getFlyToken } from "./flags.js";

const lastHp = new Map();

function num(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function pack(value, max) {
  const m = num(max);
  const v = num(value);
  if (!Number.isFinite(m) || m <= 0) return null;
  return { value: Number.isFinite(v) ? Math.max(0, v) : m, max: m };
}

function hpBag(actor) {
  const sys = actor?.system ?? {};
  return [sys.attributes?.hp, sys.hp, sys.attribs?.hp, sys.health, sys.attributes?.health, actor?.hitPoints];
}

function flagHp(doc) {
  if (!doc?.getFlag) return null;
  return pack(doc.getFlag(FLAG_SCOPE, "hpValue"), doc.getFlag(FLAG_SCOPE, "hpMax"));
}

function barHp(token) {
  const obj = token?.document ? token : canvas.tokens?.get(token?.id);
  if (!obj?.getBarAttribute && !obj?.document?.getBarAttribute) return null;
  for (const key of ["bar1", "bar2", "bar3"]) {
    try {
      const attr = obj.getBarAttribute?.(key) ?? obj.document?.getBarAttribute?.(key);
      const p = pack(attr?.value, attr?.max);
      if (p) return p;
    } catch {
      /* skip */
    }
  }
  return null;
}

function actorHp(actor) {
  if (!actor) return null;
  for (const hp of hpBag(actor)) {
    if (!hp || typeof hp !== "object") continue;
    const p = pack(hp.value, hp.max);
    if (p) return p;
  }
  return null;
}

/** Prefer token flags (panel), then token bars, then actor HP with max > 0. Never treat 0/0 stubs as death. */
export function readHp(tokenOrActor) {
  const fly = tokenOrActor?.document ? tokenOrActor : getFlyToken();
  const fromFlags = flagHp(fly?.document ?? fly);
  if (fromFlags) return fromFlags;
  const fromBar = barHp(fly);
  if (fromBar) return fromBar;
  return actorHp(fly?.actor ?? (tokenOrActor?.system ? tokenOrActor : null));
}

export async function setFlyHp(value, max) {
  const fly = getFlyToken();
  if (!fly || !game.user.isGM) return;
  const packed = pack(value, max) ?? pack(value, 10) ?? { value: 10, max: 10 };
  await fly.document.update({
    [`flags.${FLAG_SCOPE}.hpValue`]: packed.value,
    [`flags.${FLAG_SCOPE}.hpMax`]: packed.max
  });
}

/**
 * Map a 10 HP pool onto any max:
 * missing 1/10 of max → pain, 5/10 → very painful, 0 HP → death (silent until HP ≥ 1).
 * HP increase since last sample → reward pulse.
 */
export function flyHealth() {
  const fly = getFlyToken();
  const hp = readHp(fly);
  if (!hp) {
    return {
      present: false,
      value: 10,
      max: 10,
      dead: false,
      pain: 0,
      very: false,
      reward: 0,
      lostTenths: 0,
      label: "—",
      pct: 100,
      state: "unknown"
    };
  }
  const actor = fly?.actor;
  const key = actor?.uuid ?? actor?.id ?? fly?.id;
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
  const hp = readHp(getFlyToken());
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
