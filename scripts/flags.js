import { FLAG_SCOPE, MODULE_ID, ROLES } from "./constants.js";

export function getRole(token) {
  const doc = token?.document ?? token;
  if (!doc?.getFlag) return "none";
  return doc.getFlag(FLAG_SCOPE, "role") || "none";
}

export async function setRole(token, role) {
  const doc = token?.document ?? token;
  if (!ROLES.includes(role)) role = "none";
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("FLYBRAIN.GmOnly"));
    return;
  }
  if (role === "fly") await ensureSingleFly(doc);
  await doc.setFlag(FLAG_SCOPE, "role", role);
}

export function getStrength(token) {
  const doc = token?.document ?? token;
  const v = Number(doc.getFlag(FLAG_SCOPE, "strength"));
  return Number.isFinite(v) ? Math.clamped?.(v, 0, 1) ?? Math.min(1, Math.max(0, v)) : 1;
}

export function getChannel(token) {
  const doc = token?.document ?? token;
  return doc.getFlag(FLAG_SCOPE, "channel") || null;
}

export function sceneTokens() {
  return canvas.tokens?.placeables ?? [];
}

export function getFlyToken() {
  const flies = sceneTokens().filter((t) => getRole(t) === "fly");
  return flies[0] ?? null;
}

export function tokensWithRole(role) {
  return sceneTokens().filter((t) => getRole(t) === role);
}

async function ensureSingleFly(nextDoc) {
  for (const token of sceneTokens()) {
    const doc = token.document;
    if (doc.id !== nextDoc.id && getRole(token) === "fly") {
      ui.notifications.warn(game.i18n.localize("FLYBRAIN.OneFly"));
      await doc.setFlag(FLAG_SCOPE, "role", "none");
    }
  }
}

export function describeToken(token) {
  const doc = token?.document ?? token;
  return {
    id: doc.id,
    name: doc.name,
    role: getRole(doc),
    strength: getStrength(doc),
    channel: getChannel(doc)
  };
}

export { MODULE_ID };
