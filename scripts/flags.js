import { FLAG_SCOPE, MODULE_ID, ROLES, t } from "./constants.js";

export const ROLE_ART = Object.freeze({
  fly: `modules/${MODULE_ID}/assets/fly.png`,
  food: `modules/${MODULE_ID}/assets/food.png`,
  threat: `modules/${MODULE_ID}/assets/threat.png`
});

export function getRole(token) {
  const doc = token?.document ?? token;
  if (!doc?.getFlag) return "none";
  return doc.getFlag(FLAG_SCOPE, "role") || "none";
}

export async function setRole(token, role) {
  const doc = token?.document ?? token;
  if (!ROLES.includes(role)) role = "none";
  if (!game.user.isGM) {
    ui.notifications.warn(t("FLYBRAIN.GmOnly"));
    return;
  }
  if (role === "fly") await ensureSingleFly(doc);
  await applyRoleAppearance(doc, role);
}

export async function assignSelected(role) {
  const tokens = canvas.tokens?.controlled ?? [];
  if (!tokens.length) {
    ui.notifications.warn(t("FLYBRAIN.SelectToken"));
    return;
  }
  for (const token of tokens) {
    const next = getRole(token) === role ? "none" : role;
    await setRole(token, next);
    ui.notifications.info(t("FLYBRAIN.RoleSet", { role: next }));
  }
}

export function getStrength(token) {
  const doc = token?.document ?? token;
  const v = Number(doc.getFlag(FLAG_SCOPE, "strength"));
  return Number.isFinite(v) ? Math.clamp(v, 0, 1) : 1;
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

function currentSrc(doc) {
  return doc.texture?.src ?? doc.img ?? "";
}

function isModuleArt(src) {
  return String(src).includes(`modules/${MODULE_ID}/assets/`);
}

async function applyRoleAppearance(doc, role) {
  const srcNow = currentSrc(doc);
  let originalSrc = doc.getFlag(FLAG_SCOPE, "originalSrc");
  if (!originalSrc && srcNow && !isModuleArt(srcNow)) originalSrc = srcNow;
  const nextSrc = ROLE_ART[role] ?? originalSrc;
  const data = {
    [`flags.${FLAG_SCOPE}.role`]: role
  };
  if (originalSrc) data[`flags.${FLAG_SCOPE}.originalSrc`] = originalSrc;
  if (nextSrc && nextSrc !== srcNow) data["texture.src"] = nextSrc;
  if (role === "fly") {
    const hasFlagHp = Number(doc.getFlag(FLAG_SCOPE, "hpMax")) > 0;
    const sysHp = doc.actor?.system?.attributes?.hp ?? doc.actor?.system?.hp;
    const hasActorHp = Number(sysHp?.max) > 0;
    if (!hasFlagHp && !hasActorHp) {
      data[`flags.${FLAG_SCOPE}.hpValue`] = 10;
      data[`flags.${FLAG_SCOPE}.hpMax`] = 10;
    }
  }
  await doc.update(data);
}

export async function syncSceneAppearance() {
  if (!game.user?.isGM) return;
  for (const token of sceneTokens()) {
    const role = getRole(token);
    const doc = token.document;
    if (role === "fly") {
      const hasFlagHp = Number(doc.getFlag(FLAG_SCOPE, "hpMax")) > 0;
      const sysHp = doc.actor?.system?.attributes?.hp ?? doc.actor?.system?.hp;
      if (!hasFlagHp && !(Number(sysHp?.max) > 0)) {
        await doc.update({
          [`flags.${FLAG_SCOPE}.hpValue`]: 10,
          [`flags.${FLAG_SCOPE}.hpMax`]: 10
        });
      }
    }
    if (!ROLE_ART[role]) continue;
    if (currentSrc(doc) === ROLE_ART[role]) continue;
    await applyRoleAppearance(doc, role);
  }
}

async function ensureSingleFly(nextDoc) {
  for (const token of sceneTokens()) {
    const doc = token.document;
    if (doc.id !== nextDoc.id && getRole(token) === "fly") {
      ui.notifications.warn(t("FLYBRAIN.OneFly"));
      await applyRoleAppearance(doc, "none");
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
