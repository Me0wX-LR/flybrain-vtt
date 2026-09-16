/** @module flybrain-vtt/constants */

export const MODULE_ID = "flybrain-vtt";
export const FLAG_SCOPE = MODULE_ID;
export const N_NEURONS = 138_639;
export const TABLE_TICK_MS = 200;
export const MOVE_COOLDOWN_MS = 300;
export const FOOD_RANGE_SQUARES = 2;
export const THREAT_RANGE_SQUARES = 8;
export const FEED_RANGE_SQUARES = 1;

export const ROLES = Object.freeze(["none", "fly", "food", "threat"]);

export const STIMULI = Object.freeze(["sugar", "bitter", "loom", "shock", "walk"]);

export const MOTOR_DEFAULTS = Object.freeze({
  feedHz: 0,
  escapeHz: 0,
  turn: 0,
  forward: 0
});

export const T_ESCAPE = 5;
export const T_FEED = 20;
export const T_TURN = 0.35;
export const T_FWD = 5;

export function isSimOwner() {
  if (!globalThis.game?.user?.isGM) return false;
  const gms = game.users.filter((u) => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id));
  return gms[0]?.id === game.user.id;
}

export function moduleData() {
  return game.modules.get(MODULE_ID);
}

export function t(key, data) {
  return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}
