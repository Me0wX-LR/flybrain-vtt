import { MOVE_COOLDOWN_MS, T_ESCAPE, T_FEED, T_FWD, isSimOwner } from "./constants.js";
import { getFlyToken } from "./flags.js";
import { isFlySilenced } from "./hp.js";
import { getSetting } from "./settings.js";
import { gridSquares, stepAway, stepFacing, stepToward } from "./grid.js";

let lastMoveAt = 0;
let lastIntent = { type: "idle" };

export const boosts = {
  escapeUntil: 0,
  walkUntil: 0,
  sugarUntil: 0
};

export function pulseBoost(kind, ms = 2500) {
  const until = Date.now() + ms;
  if (kind === "loom" || kind === "shock" || kind === "escape") boosts.escapeUntil = until;
  if (kind === "walk") boosts.walkUntil = until;
  if (kind === "sugar") boosts.sugarUntil = until;
}

function isDragging(token) {
  return Boolean(token?._dragHandle || token?._original || token?.isDragging);
}

function blocked(token, dest) {
  try {
    if (typeof token.checkCollision === "function") {
      return token.checkCollision(dest, { type: "move", mode: "any" });
    }
  } catch {
    /* ignore */
  }
  return false;
}

function slide(token, dest) {
  const ox = token.document.x;
  const oy = token.document.y;
  const horiz = { x: dest.x, y: oy };
  const vert = { x: ox, y: dest.y };
  if (!blocked(token, horiz)) return horiz;
  if (!blocked(token, vert)) return vert;
  return null;
}

export function decodeMotor(motor, sensors) {
  const fly = getFlyToken();
  if (!fly) return { type: "idle" };
  if (isFlySilenced()) return { type: "idle", reason: "dead" };
  const feedHz = motor?.feedHz ?? 0;
  const escapeHz = motor?.escapeHz ?? 0;
  const forward = motor?.forward ?? 0;
  const now = Date.now();
  const escape = escapeHz > T_ESCAPE || now < boosts.escapeUntil;
  const walkBoost = now < boosts.walkUntil;
  const sugarBoost = now < boosts.sugarUntil;

  if (escape) {
    if (sensors.nearestThreat) {
      return { type: "dash", target: sensors.nearestThreat, steps: 2, reason: "escape" };
    }
    return { type: "dash", reverse: true, steps: 2, reason: "escape-facing" };
  }
  if (feedHz > T_FEED && sensors.foodInFeedRange) {
    return { type: "feed", reason: "feed" };
  }
  if (walkBoost || forward > T_FWD) {
    if (sensors.nearestFood && gridSquares(fly, sensors.nearestFood) > 1) {
      return { type: "walk", target: sensors.nearestFood, steps: 1, reason: "forward-food" };
    }
    return { type: "walk", facing: true, steps: 1, reason: "forward" };
  }
  if (sugarBoost && sensors.nearestFood && gridSquares(fly, sensors.nearestFood) > 1) {
    return { type: "walk", target: sensors.nearestFood, steps: 1, reason: "sugar-seek" };
  }
  return { type: "idle" };
}

export function fakeTowardFood(sensors) {
  const fly = getFlyToken();
  if (!fly || isFlySilenced() || !sensors.nearestFood) return { type: "idle" };
  const d = gridSquares(fly, sensors.nearestFood);
  if (d <= 1) return { type: "feed", reason: "food-adjacent" };
  return { type: "walk", target: sensors.nearestFood, steps: 1, reason: "seek-food" };
}

function destFor(fly, intent) {
  if (intent.target && intent.type === "dash") return stepAway(fly, intent.target, intent.steps ?? 2);
  if (intent.target && intent.type === "walk") return stepToward(fly, intent.target, intent.steps ?? 1);
  if (intent.facing || intent.reverse) return stepFacing(fly, intent.steps ?? 1, Boolean(intent.reverse));
  return null;
}

export async function applyIntent(intent) {
  lastIntent = intent ?? { type: "idle" };
  if (!isSimOwner()) return lastIntent;
  if (!getSetting("autonomousMovement")) return lastIntent;
  const fly = getFlyToken();
  if (!fly || isDragging(fly)) return lastIntent;
  const now = Date.now();
  if (now - lastMoveAt < MOVE_COOLDOWN_MS) return lastIntent;
  if (!intent || intent.type === "idle") return lastIntent;
  if (isFlySilenced()) {
    lastIntent = { type: "idle", reason: "dead" };
    return lastIntent;
  }

  if (intent.type === "feed") {
    lastMoveAt = now;
    return lastIntent;
  }

  if (intent.type === "walk" || intent.type === "dash") {
    const dest = destFor(fly, intent);
    if (!dest) return lastIntent;
    if (dest.x === fly.document.x && dest.y === fly.document.y) return lastIntent;
    const finalDest = blocked(fly, dest) ? slide(fly, dest) : dest;
    if (!finalDest || !Number.isFinite(finalDest.x) || !Number.isFinite(finalDest.y)) return lastIntent;
    lastMoveAt = now;
    await fly.document.update(
      { x: finalDest.x, y: finalDest.y },
      { animation: { duration: intent.type === "dash" ? 140 : 240 } }
    );
  }
  return lastIntent;
}

export function getLastIntent() {
  return lastIntent;
}
