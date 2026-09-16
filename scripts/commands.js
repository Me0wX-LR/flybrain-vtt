import { MODULE_ID, STIMULI, t } from "./constants.js";
import { pulseBoost } from "./decoder.js";

const ATLAS_HZ = {
  sugar: 150,
  bitter: 150,
  loom: 80,
  shock: 40,
  walk: 40
};

function parseArgs(raw) {
  const parts = String(raw ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const verb = (parts[0] || "status").toLowerCase();
  const rest = parts.slice(1);
  return { verb, rest };
}

export async function runFlyCommand(raw, { silent = false } = {}) {
  const api = game.modules.get(MODULE_ID)?.api;
  if (!api) return;
  if (!game.user.isGM) {
    ui.notifications.warn(t("FLYBRAIN.GmOnly"));
    return;
  }
  const { verb, rest } = parseArgs(raw);

  if (verb === "panel" || verb === "hud" || verb === "open") {
    game.modules.get(MODULE_ID)?.api?.openHud?.();
    return;
  }
  if (verb === "status") {
    const text = api.statusText();
    if (!silent) ui.notifications.info(text);
    return text;
  }
  if (verb === "stop") {
    for (const name of STIMULI) api.bridge?.setStim(name, false, 0);
    api.bridge?.setCurrents([]);
    if (!silent) ui.notifications.info(t("FLYBRAIN.Stopped"));
    api.refreshHud();
    return;
  }
  if (verb === "reset") {
    api.bridge?.reset();
    if (!silent) ui.notifications.info(t("FLYBRAIN.Reset"));
    api.refreshHud();
    return;
  }
  if (STIMULI.includes(verb)) {
    const flag = (rest[0] || "on").toLowerCase();
    const on = flag !== "off";
    api.bridge?.setStim(verb, on, ATLAS_HZ[verb]);
    api.lastCommand = `${verb} ${on ? "on" : "off"}`;
    if (on) pulseBoost(verb);
    if (!silent) ui.notifications.info(t("FLYBRAIN.Stimulus", { name: verb, state: on ? "on" : "off" }));
    api.refreshHud();
    return;
  }
  ui.notifications.warn(t("FLYBRAIN.UnknownCommand", { verb }));
}

function registerOne(ChatLog, name) {
  const entry = {
    rgx: new RegExp(`^/${name}(?:\\s+(.*))?$`, "i"),
    fn: async function (_command, match) {
      const payload = Array.isArray(match) ? match[1] ?? match[3] ?? "" : "";
      await runFlyCommand(payload);
      return false;
    }
  };
  ChatLog.CHAT_COMMANDS[name] = entry;
  ChatLog.CHAT_COMMANDS[`/${name}`] = entry;
}

export function registerCommands() {
  const ChatLog =
    foundry.applications?.sidebar?.tabs?.ChatLog ??
    globalThis.CONFIG?.ui?.chat ??
    globalThis.ChatLog;

  if (ChatLog?.CHAT_COMMANDS) {
    registerOne(ChatLog, "flybrain");
    registerOne(ChatLog, "fly");
    return;
  }

  Hooks.on("chatMessage", (_log, message) => {
    const m = message.match(/^\/(flybrain|fly)(?:\s+(.*))?$/i);
    if (!m) return;
    runFlyCommand(m[2] ?? "");
    return false;
  });
}
