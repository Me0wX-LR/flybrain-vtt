import { MODULE_ID, t } from "./constants.js";
import { runFlyCommand } from "./commands.js";
import { getLastIntent } from "./decoder.js";
import { getFlyToken, getRole, tokensWithRole } from "./flags.js";
import { flyHealth } from "./hp.js";
import { getSetting } from "./settings.js";
import { talkToFly } from "./talk.js";
import { Brain3D } from "./brain3d.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function pct(v) {
  return Math.round(Math.min(1, Math.max(0, Number(v) || 0)) * 100);
}

function hpCaption(health) {
  if (!health.present) return t("FLYBRAIN.Hp.Unknown");
  if (health.dead) return t("FLYBRAIN.Hp.Dead");
  if (health.state === "reward") return t("FLYBRAIN.Hp.Reward");
  if (health.very) return t("FLYBRAIN.Hp.Very");
  if (health.pain > 0) return t("FLYBRAIN.Hp.Pain");
  return t("FLYBRAIN.Hp.Ok");
}

export function hudState() {
  const api = game.modules.get(MODULE_ID)?.api;
  const frame = api?.bridge?.lastFrame;
  const fly = getFlyToken();
  const selected = canvas.tokens?.controlled?.[0];
  const motor = frame?.motor ?? { feedHz: 0, escapeHz: 0, turn: 0, forward: 0 };
  const regions = frame?.regions ?? { optic: 0, al: 0, mb: 0, cx: 0, sez: 0, dn: 0 };
  const key = String(getSetting("llmApiKey") || "");
  const health = flyHealth();
  return {
    fly: fly ? fly.document.name : t("FLYBRAIN.NoFly"),
    flyOk: Boolean(fly),
    foodCount: tokensWithRole("food").length,
    threatCount: tokensWithRole("threat").length,
    selectedName: selected ? selected.document.name : t("FLYBRAIN.NoSelection"),
    selectedRole: selected ? getRole(selected) : "none",
    lastCommand: api?.lastCommand ?? "—",
    intent: getLastIntent()?.type ?? "idle",
    autonomous: Boolean(getSetting("autonomousMovement")),
    apiKeySet: key.length > 0,
    apiBase: getSetting("llmBaseUrl") || "https://api.openai.com/v1",
    apiModel: getSetting("llmModel") || "gpt-4o-mini",
    talkLog: api?.talkLog ?? [],
    health,
    hpCaption: hpCaption(health),
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
    }
  };
}

const Base = HandlebarsApplicationMixin(ApplicationV2);

export class FlyBrainHud extends Base {
  static DEFAULT_OPTIONS = {
    id: "flybrain-vtt-hud",
    classes: ["flybrain-hud"],
    window: {
      title: "FLYBRAIN.HudTitle",
      icon: "fa-solid fa-brain",
      resizable: true
    },
    position: { width: 440, height: 720 },
    actions: {
      cmd: FlyBrainHud.onCmd,
      assign: FlyBrainHud.onAssign
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/hud.hbs` }
  };

  static onCmd(_event, target) {
    const cmd = target.dataset.cmd;
    if (cmd) runFlyCommand(cmd);
  }

  static async onAssign(_event, target) {
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
    try {
      this._wire(root);
      this._mountBrain(root);
    } catch (err) {
      console.warn("flybrain-vtt hud render", err);
    }
  }

  _wire(root) {
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

  _mountBrain(root) {
    const canvas = root.querySelector("canvas.flybrain-3d");
    if (!canvas) return;
    try {
      this.brain3d?.destroy();
      this.brain3d = new Brain3D(canvas);
      this.brain3d.resize();
      const api = game.modules.get(MODULE_ID)?.api;
      this.brain3d.setActivity(api?.bridge?.lastFrame?.activity);
      const health = flyHealth();
      this.brain3d.setDead(health.dead);
      this.brain3d.setPain(health.pain);
    } catch (err) {
      console.warn("flybrain-vtt 3d", err);
    }
  }

  async _onClose(options) {
    this.brain3d?.destroy();
    this.brain3d = null;
    return super._onClose?.(options);
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
  try {
    if (!hudApp) hudApp = new FlyBrainHud();
    return hudApp.render({ force: true });
  } catch (err) {
    console.error("flybrain-vtt hud", err);
    ui.notifications.error("Fly Brain panel failed to open. Press F12 and check the console.");
  }
}

export function toggleHud() {
  if (hudApp?.rendered) hudApp.close();
  else openHud();
}

export function patchHud() {
  if (!hudApp?.rendered || !hudApp.element) return;
  const s = hudState();
  const root = hudApp.element;
  const kicker = root.querySelector(".flybrain-kicker");
  if (kicker) kicker.textContent = `${s.fly} · ${s.intent}`;
  const hpFill = root.querySelector("[data-flybrain=hp-fill]");
  if (hpFill) hpFill.style.width = `${s.health.pct ?? 0}%`;
  const hpLabel = root.querySelector("[data-flybrain=hp-label]");
  if (hpLabel) hpLabel.textContent = `${s.health.label} · ${s.hpCaption}`;
  const wrap = root.querySelector(".flybrain-3d-wrap");
  if (wrap) wrap.dataset.state = s.health.state;
  const intent = root.querySelector("[data-flybrain=intent]");
  if (intent) intent.textContent = s.intent;
  for (const [name, val] of Object.entries(s.regions)) {
    const bar = root.querySelector(`[data-region="${name}"]`);
    if (bar) bar.style.width = `${val}%`;
  }
  const motors = root.querySelector(".flybrain-motors");
  if (motors) {
    motors.innerHTML = `<li>feed ${s.motor.feedHz}</li><li>escape ${s.motor.escapeHz}</li><li>turn ${s.motor.turn}</li><li>forward ${s.motor.forward}</li>`;
  }
  hudApp.brain3d?.setActivity(game.modules.get(MODULE_ID)?.api?.bridge?.lastFrame?.activity);
  hudApp.brain3d?.setDead(s.health.dead);
  hudApp.brain3d?.setPain(s.health.pain);
}

export function refreshHud() {
  patchHud();
}
