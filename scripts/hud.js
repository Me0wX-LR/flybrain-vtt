import { MODULE_ID, t } from "./constants.js";
import { runFlyCommand } from "./commands.js";
import { getLastIntent } from "./decoder.js";
import { getFlyToken } from "./flags.js";

function ApplicationV2() {
  return foundry.applications?.api?.ApplicationV2 ?? null;
}

function HandlebarsMixin() {
  return foundry.applications?.api?.HandlebarsApplicationMixin ?? ((cls) => cls);
}

function pct(v) {
  return Math.round(Math.min(1, Math.max(0, Number(v) || 0)) * 100);
}

function hudState() {
  const api = game.modules.get(MODULE_ID)?.api;
  const frame = api?.bridge?.lastFrame;
  const fly = getFlyToken();
  const motor = frame?.motor ?? { feedHz: 0, escapeHz: 0, turn: 0, forward: 0 };
  const regions = frame?.regions ?? { optic: 0, al: 0, mb: 0, cx: 0, sez: 0, dn: 0 };
  return {
    fly: fly ? fly.document.name : t("FLYBRAIN.NoFly"),
    lastCommand: api?.lastCommand ?? "—",
    intent: getLastIntent()?.type ?? "idle",
    mode: frame?.mode ?? "dummy",
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
    simMs: frame?.simMs ?? game.settings.get(MODULE_ID, "simMsPerTick")
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
    position: { width: 340, height: "auto" },
    actions: {
      cmd: FlyBrainHud.#onCmd
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/hud.hbs` }
  };

  static #onCmd(_event, target) {
    const cmd = target.dataset.cmd;
    if (cmd) runFlyCommand(cmd);
  }

  async _prepareContext() {
    return hudState();
  }

  refresh() {
    this.render({ force: false });
  }
}

let hudApp = null;

export function getHud() {
  return hudApp;
}

export function toggleHud() {
  if (!game.user.isGM) {
    ui.notifications.warn(t("FLYBRAIN.GmOnly"));
    return;
  }
  if (!hudApp) hudApp = new FlyBrainHud();
  if (hudApp.rendered) hudApp.close();
  else hudApp.render({ force: true });
}

export function refreshHud() {
  if (hudApp?.rendered) hudApp.refresh();
}

export function renderHudFallback(state) {
  const regionRows = Object.entries(state.regions)
    .map(([k, v]) => `<div class="flybrain-meter"><span>${k}</span><i style="width:${Math.round(v * 100)}%"></i></div>`)
    .join("");
  return `<div class="flybrain-hud-body">
    <p>${state.fly} · ${state.intent} · ${state.mode}</p>
    ${regionRows}
  </div>`;
}
