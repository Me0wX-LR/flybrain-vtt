import {
  MOVE_COOLDOWN_MS,
  T_ESCAPE,
  T_FEED,
  T_FWD,
  T_TURN,
  isSimOwner
} from "./constants.js";
import { getFlyToken } from "./flags.js";
import { getSetting } from "./settings.js";
import { gridDistance } from "./sensors.js";

let lastMoveAt = 0;
let lastIntent = { type: "idle" };

function gridSize() {
  return canvas.grid?.size ?? canvas.grid?.sizeX ?? canvas.dimensions?.size ?? 100;
}

function isDragging(token) {
  return Boolean(token?._dragHandle || token?._original || token?.isDragging);
}

function translate(token, radians, steps) {
  const size = gridSize();
  const dx = Math.cos(radians) * size * steps;
  const dy = Math.sin(radians) * size * steps;
  let x = token.document.x + dx;
  let y = token.document.y + dy;
  if (canvas.grid?.getSnappedPoint) {
    const snapped = canvas.grid.getSnappedPoint({ x, y }, { mode: 1 });
    x = snapped.x;
    y = snapped.y;
  } else if (canvas.grid?.getSnappedPosition) {
    const snapped = canvas.grid.getSnappedPosition(x, y, 1);
    x = snapped.x;
    y = snapped.y;
  }
  return { x, y };
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

function angleTo(from, to) {
  const a = from.center ?? { x: from.x, y: from.y };
  const b = to.center ?? { x: to.x, y: to.y };
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function decodeMotor(motor, sensors) {
  const feedHz = motor?.feedHz ?? 0;
  const escapeHz = motor?.escapeHz ?? 0;
  const turn = motor?.turn ?? 0;
  const forward = motor?.forward ?? 0;
  const fly = getFlyToken();
  if (!fly) return { type: "idle" };

  if (escapeHz > T_ESCAPE && sensors.nearestThreat) {
    const away = angleTo(fly, sensors.nearestThreat) + Math.PI;
    return { type: "dash", dir: away, steps: 2, reason: "escape" };
  }
  if (feedHz > T_FEED && sensors.foodInFeedRange) {
    return { type: "feed", reason: "feed" };
  }
  if (Math.abs(turn) > T_TURN) {
    const target = turn > 0 ? sensors.nearestFood : sensors.nearestThreat;
    if (target) {
      const rot = (angleTo(fly, target) * 180) / Math.PI;
      return { type: "turn", rotation: rot, reason: "turn" };
    }
  }
  if (forward > T_FWD) {
    const facing = ((fly.document.rotation ?? 0) * Math.PI) / 180;
    return { type: "walk", dir: facing, steps: 1, reason: "forward" };
  }
  return { type: "idle" };
}

export function fakeTowardFood(sensors) {
  const fly = getFlyToken();
  if (!fly || !sensors.nearestFood) return { type: "idle" };
  const d = gridDistance(fly, sensors.nearestFood);
  if (d <= 1) return { type: "feed", reason: "food-adjacent" };
  return { type: "walk", dir: angleTo(fly, sensors.nearestFood), steps: 1, reason: "seek-food" };
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

  if (intent.type === "feed") {
    lastMoveAt = now;
    fly.document.setFlag?.("flybrain-vtt", "lastCue", "feed").catch?.(() => null);
    return lastIntent;
  }

  if (intent.type === "turn") {
    lastMoveAt = now;
    await fly.document.update({ rotation: intent.rotation });
    return lastIntent;
  }

  if (intent.type === "walk" || intent.type === "dash") {
    const dest = translate(fly, intent.dir, intent.steps ?? 1);
    const finalDest = blocked(fly, dest) ? slide(fly, dest) : dest;
    if (!finalDest) return lastIntent;
    lastMoveAt = now;
    await fly.document.update(
      { x: finalDest.x, y: finalDest.y },
      { animation: { duration: intent.type === "dash" ? 120 : 220 } }
    );
  }
  return lastIntent;
}

export function getLastIntent() {
  return lastIntent;
}
