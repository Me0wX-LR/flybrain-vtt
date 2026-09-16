import { MODULE_ID, t } from "./constants.js";

export function registerSettings() {
  const { BooleanField, NumberField, StringField } = foundry.data.fields;

  game.settings.register(MODULE_ID, "autonomousMovement", {
    name: "FLYBRAIN.Setting.Autonomous",
    hint: "FLYBRAIN.Setting.AutonomousHint",
    scope: "world",
    config: true,
    type: new BooleanField({ required: true, initial: true })
  });

  game.settings.register(MODULE_ID, "overlayEnabled", {
    name: "FLYBRAIN.Setting.Overlay",
    hint: "FLYBRAIN.Setting.OverlayHint",
    scope: "client",
    config: true,
    type: new BooleanField({ required: true, initial: true })
  });

  game.settings.register(MODULE_ID, "overlayMode", {
    name: "FLYBRAIN.Setting.OverlayMode",
    hint: "FLYBRAIN.Setting.OverlayModeHint",
    scope: "client",
    config: true,
    type: new StringField({
      required: true,
      initial: "inset",
      choices: {
        inset: "FLYBRAIN.Setting.ModeInset",
        hud: "FLYBRAIN.Setting.ModeHud"
      }
    })
  });

  game.settings.register(MODULE_ID, "overlayFps", {
    name: "FLYBRAIN.Setting.OverlayFps",
    hint: "FLYBRAIN.Setting.OverlayFpsHint",
    scope: "client",
    config: true,
    type: new NumberField({ required: true, nullable: false, integer: true, min: 10, max: 30, step: 10, initial: 20 })
  });

  game.settings.register(MODULE_ID, "lodZoom", {
    name: "FLYBRAIN.Setting.LodZoom",
    hint: "FLYBRAIN.Setting.LodZoomHint",
    scope: "client",
    config: true,
    type: new NumberField({ required: true, nullable: false, min: 0.15, max: 1, step: 0.05, initial: 0.4 })
  });

  game.settings.register(MODULE_ID, "simMsPerTick", {
    name: "FLYBRAIN.Setting.SimMs",
    hint: "FLYBRAIN.Setting.SimMsHint",
    scope: "world",
    config: true,
    type: new NumberField({ required: true, nullable: false, integer: true, min: 10, max: 50, step: 5, initial: 30 })
  });

  game.settings.register(MODULE_ID, "debugRaster", {
    name: "FLYBRAIN.Setting.Debug",
    hint: "FLYBRAIN.Setting.DebugHint",
    scope: "client",
    config: true,
    type: new BooleanField({ required: true, initial: false })
  });

  game.settings.register(MODULE_ID, "disclaimer", {
    name: "FLYBRAIN.Setting.Disclaimer",
    hint: t("FLYBRAIN.Disclaimer"),
    scope: "world",
    config: true,
    type: new BooleanField({ required: true, initial: true })
  });

  game.settings.register(MODULE_ID, "llmApiKey", {
    name: "FLYBRAIN.Setting.ApiKey",
    hint: "FLYBRAIN.Setting.ApiKeyHint",
    scope: "client",
    config: true,
    type: new StringField({ required: true, blank: true, initial: "" })
  });

  game.settings.register(MODULE_ID, "llmBaseUrl", {
    name: "FLYBRAIN.Setting.ApiBase",
    hint: "FLYBRAIN.Setting.ApiBaseHint",
    scope: "client",
    config: true,
    type: new StringField({ required: true, initial: "https://api.openai.com/v1" })
  });

  game.settings.register(MODULE_ID, "llmModel", {
    name: "FLYBRAIN.Setting.ApiModel",
    hint: "FLYBRAIN.Setting.ApiModelHint",
    scope: "client",
    config: true,
    type: new StringField({ required: true, initial: "gpt-4o-mini" })
  });
}

export function getSetting(key) {
  return game.settings.get(MODULE_ID, key);
}
