import { MODULE_ID, TABLE_TICK_MS, isSimOwner, t } from "./constants.js";
import { registerSettings } from "./settings.js";
import { registerCommands } from "./commands.js";
import { registerHudButtons } from "./hud-buttons.js";
import { registerLayer } from "./layer.js";
import { refreshHud } from "./hud.js";
import { WorkerBridge } from "./worker-bridge.js";
import { sampleSensors, sensorCurrents } from "./sensors.js";
import { applyIntent, decodeMotor, fakeTowardFood } from "./decoder.js";
import { loadAtlas } from "./atlas.js";
import { createApi } from "./api.js";
import { getFlyToken } from "./flags.js";

const runtime = {
  bridge: null,
  lastCommand: "—",
  tickHandle: null
};

function stopLoop() {
  if (runtime.tickHandle) {
    clearInterval(runtime.tickHandle);
    runtime.tickHandle = null;
  }
  runtime.bridge?.stop();
  runtime.bridge = null;
}

async function onTableTick() {
  if (!isSimOwner() || game.paused || document.hidden) return;
  const fly = getFlyToken();
  if (!fly) return;
  const sensors = sampleSensors();
  runtime.bridge?.setCurrents(sensorCurrents(sensors));
  runtime.bridge?.step();
  const motor = runtime.bridge?.lastFrame?.motor;
  let intent = motor ? decodeMotor(motor, sensors) : { type: "idle" };
  if (!intent || intent.type === "idle") intent = fakeTowardFood(sensors);
  await applyIntent(intent);
  refreshHud();
}

function onPause(paused) {
  runtime.bridge?.setPaused(paused || document.hidden);
}

Hooks.once("init", () => {
  registerSettings();
  registerLayer();
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = createApi(() => runtime);
});

Hooks.once("setup", () => {
  registerCommands();
});

Hooks.once("ready", async () => {
  registerHudButtons();
  try {
    await loadAtlas();
  } catch (err) {
    console.warn("flybrain-vtt: atlas load failed", err);
  }
  if (game.user.isGM) {
    ui.notifications.info(t("FLYBRAIN.Ready"));
  }
});

Hooks.on("canvasReady", () => {
  stopLoop();
  if (!game.user.isGM) return;
  if (!isSimOwner()) return;
  runtime.bridge = new WorkerBridge();
  runtime.bridge.start();
  runtime.tickHandle = setInterval(() => {
    onTableTick().catch((err) => console.error("flybrain-vtt tick", err));
  }, TABLE_TICK_MS);
});

Hooks.on("canvasTearDown", () => {
  stopLoop();
});

Hooks.on("pauseGame", onPause);

Hooks.on("updateToken", () => {
  /* sensors re-read documents each tick */
});

document.addEventListener("visibilitychange", () => {
  runtime.bridge?.setPaused(document.hidden || Boolean(game.paused));
});
