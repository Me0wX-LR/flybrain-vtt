import { MODULE_ID, t } from "./constants.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "autonomousMovement", {
    name: "FLYBRAIN.Setting.Autonomous",
    hint: "FLYBRAIN.Setting.AutonomousHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "overlayEnabled", {
    name: "FLYBRAIN.Setting.Overlay",
    hint: "FLYBRAIN.Setting.OverlayHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "overlayMode", {
    name: "FLYBRAIN.Setting.OverlayMode",
    hint: "FLYBRAIN.Setting.OverlayModeHint",
    scope: "client",
    config: true,
    type: String,
    default: "inset",
    choices: {
      inset: "FLYBRAIN.Setting.ModeInset",
      hud: "FLYBRAIN.Setting.ModeHud"
    }
  });

  game.settings.register(MODULE_ID, "overlayFps", {
    name: "FLYBRAIN.Setting.OverlayFps",
    hint: "FLYBRAIN.Setting.OverlayFpsHint",
    scope: "client",
    config: true,
    type: Number,
    default: 20,
    range: { min: 10, max: 30, step: 10 }
  });

  game.settings.register(MODULE_ID, "lodZoom", {
    name: "FLYBRAIN.Setting.LodZoom",
    hint: "FLYBRAIN.Setting.LodZoomHint",
    scope: "client",
    config: true,
    type: Number,
    default: 0.4,
    range: { min: 0.15, max: 1, step: 0.05 }
  });

  game.settings.register(MODULE_ID, "simMsPerTick", {
    name: "FLYBRAIN.Setting.SimMs",
    hint: "FLYBRAIN.Setting.SimMsHint",
    scope: "world",
    config: true,
    type: Number,
    default: 30,
    range: { min: 10, max: 50, step: 5 }
  });

  game.settings.register(MODULE_ID, "debugRaster", {
    name: "FLYBRAIN.Setting.Debug",
    hint: "FLYBRAIN.Setting.DebugHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "disclaimer", {
    name: "FLYBRAIN.Setting.Disclaimer",
    hint: t("FLYBRAIN.Disclaimer"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "llmApiKey", {
    name: "FLYBRAIN.Setting.ApiKey",
    hint: "FLYBRAIN.Setting.ApiKeyHint",
    scope: "client",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "llmBaseUrl", {
    name: "FLYBRAIN.Setting.ApiBase",
    hint: "FLYBRAIN.Setting.ApiBaseHint",
    scope: "client",
    config: true,
    type: String,
    default: "https://api.openai.com/v1"
  });

  game.settings.register(MODULE_ID, "llmModel", {
    name: "FLYBRAIN.Setting.ApiModel",
    hint: "FLYBRAIN.Setting.ApiModelHint",
    scope: "client",
    config: true,
    type: String,
    default: "gpt-4o-mini"
  });
}

export function getSetting(key) {
  return game.settings.get(MODULE_ID, key);
}
