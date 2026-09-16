import { MODULE_ID, t } from "./constants.js";
import { runFlyCommand } from "./commands.js";
import { getLastIntent } from "./decoder.js";
import { getFlyToken, getRole, tokensWithRole } from "./flags.js";
import { getSetting } from "./settings.js";
import { talkToFly } from "./talk.js";
import { ROLE_VISUAL } from "./markers.js";

function ApplicationV2() {
  return foundry.applications?.api?.ApplicationV2 ?? null;
}

function HandlebarsMixin() {
  return foundry.applications?.api?.HandlebarsApplicationMixin ?? ((cls) => cls);
}

function pct(v) {
  return Math.round(Math.min(1, Math.max(0, Number(v) || 0)) * 100);
}

export function hudState() {
  const api = game.modules.get(MODULE_ID)?.api;
  const frame = api?.bridge?.lastFrame;
  const fly = getFlyToken();
  const selected = canvas.tokens?.controlled?.[0];
  const motor = frame?.motor ?? { feedHz: 0, escapeHz: 0, turn: 0, forward: 0 };
  const regions = frame?.regions ?? { optic: 0, al: 0, mb: 0, cx: 0, sez: 0, dn: 0 };
  const key = String(getSetting("llmApiKey") || "");
  return {
    fly: fly ? fly.document.name : t("FLYBRAIN.NoFly"),
    flyOk: Boolean(fly),
    foodCount: tokensWithRole("food").length,
    threatCount: tokensWithRole("threat").length,
    selectedName: selected ? selected.document.name : t("FLYBRAIN.NoSelection"),
    selectedRole: selected ? getRole(selected) : "none",
    lastCommand: api?.lastCommand ?? "—",
    intent: getLastIntent()?.type ?? "idle",
    mode: frame?.mode ?? "dummy",
    autonomous: Boolean(getSetting("autonomousMovement")),
    apiKeySet: key.length > 0,
    apiKeyMasked: key ? "••••••••" : "",
    apiBase: getSetting("llmBaseUrl") || "https://api.openai.com/v1",
    apiModel: getSetting("llmModel") || "gpt-4o-mini",
    talkLog: api?.talkLog ?? [],
    motor: {
      feedHz: Number(motor.feedHz || 0).toFixed(1),
      escapeHz: Number(motor.escapeHz || 0).toFixed(1),
      turn: Number(motor.turn || 0).toFixed(2),
      forward: Number(motor.forward || 0).toFixed(1)
    },
    regions: {
      optic: pct(regions.optic),
      al: pct(regions.al),
      mb: pct(regions.mb),
      cx: pct(regions.cx),
      sez: pct(regions.sez),
      dn: pct(regions.dn)
    },
    nActive: frame?.nActive ?? 0,
    wallMs: frame?.wallMs?.toFixed?.(2) ?? "—",
    simMs: frame?.simMs ?? game.settings.get(MODULE_ID, "simMsPerTick"),
    colors: ROLE_VISUAL
  };
}

const Base = HandlebarsMixin()(ApplicationV2() ?? class {});

export class FlyBrainHud extends Base {
  static DEFAULT_OPTIONS = {
    id: "flybrain-vtt-hud",
    classes: ["flybrain-hud"],
    window: {
      title: "FLYBRAIN.HudTitle",
      icon: "fa-solid fa-brain",
      resizable: true
    },
    position: { width: 380, height: "auto" },
    actions: {
      cmd: FlyBrainHud.#onCmd,
      assign: FlyBrainHud.#onAssign
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/hud.hbs` }
  };

  static #onCmd(_event, target) {
    const cmd = target.dataset.cmd;
    if (cmd) runFlyCommand(cmd);
  }

  static async #onAssign(_event, target) {
    const role = target.dataset.role;
    await game.modules.get(MODULE_ID)?.api?.assignSelected(role);
  }

  async _prepareContext() {
    return hudState();
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    if (!root) return;
    root.querySelector("[data-flybrain=autonomous]")?.addEventListener("change", async (ev) => {
      await game.settings.set(MODULE_ID, "autonomousMovement", ev.currentTarget.checked);
      patchHud();
    });
    root.querySelector("[data-flybrain=save-key]")?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const key = root.querySelector("[data-flybrain=apikey]")?.value?.trim() ?? "";
      const base = root.querySelector("[data-flybrain=apibase]")?.value?.trim() || "https://api.openai.com/v1";
      const model = root.querySelector("[data-flybrain=apimodel]")?.value?.trim() || "gpt-4o-mini";
      await game.settings.set(MODULE_ID, "llmApiKey", key);
      await game.settings.set(MODULE_ID, "llmBaseUrl", base);
      await game.settings.set(MODULE_ID, "llmModel", model);
      ui.notifications.info(t("FLYBRAIN.Talk.KeySaved"));
      this.render({ force: true });
    });
    root.querySelector("[data-flybrain=talk-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const input = root.querySelector("[data-flybrain=talk]");
      const text = input?.value?.trim();
      if (!text) return;
      input.value = "";
      await talkToFly(text);
      this.render({ force: true });
    });
  }

  refresh() {
    this.render({ force: false });
  }
}

let hudApp = null;

export function getHud() {
  return hudApp;
}

export function openHud() {
  if (!game.user.isGM) {
    ui.notifications.warn(t("FLYBRAIN.GmOnly"));
    return;
  }
  if (!hudApp) hudApp = new FlyBrainHud();
  hudApp.render({ force: true });
}

export function toggleHud() {
  if (hudApp?.rendered) hudApp.close();
  else openHud();
}

export function patchHud() {
  if (!hudApp?.rendered || !hudApp.element) return;
  const active = document.activeElement;
  if (hudApp.element.contains(active) && /^(INPUT|TEXTAREA)$/.test(active.tagName)) return;
  const s = hudState();
  const kicker = hudApp.element.querySelector(".flybrain-kicker");
  if (kicker) kicker.textContent = `${s.fly} · ${s.intent} · food ${s.foodCount} · threat ${s.threatCount}`;
  const intent = hudApp.element.querySelector("[data-flybrain=intent]");
  if (intent) intent.textContent = s.intent;
  for (const [name, val] of Object.entries(s.regions)) {
    const bar = hudApp.element.querySelector(`[data-region="${name}"]`);
    if (bar) bar.style.width = `${val}%`;
  }
  const motors = hudApp.element.querySelector(".flybrain-motors");
  if (motors) {
    motors.innerHTML = `<li>feed ${s.motor.feedHz}</li><li>escape ${s.motor.escapeHz}</li><li>turn ${s.motor.turn}</li><li>forward ${s.motor.forward}</li>`;
  }
}

export function refreshHud() {
  patchHud();
}
