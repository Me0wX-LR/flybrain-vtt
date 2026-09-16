import { MODULE_ID } from "./constants.js";
import { runFlyCommand } from "./commands.js";
import { assignSelected, getFlyToken, getRole, setRole, syncSceneAppearance, tokensWithRole } from "./flags.js";
import { getLastIntent } from "./decoder.js";

function hudApi() {
  return import("./hud.js");
}

export function createApi(getRuntime) {
  const runtime = () => getRuntime();
  return {
    id: MODULE_ID,
    talkLog: [],
    get bridge() {
      return runtime().bridge;
    },
    get lastCommand() {
      return runtime().lastCommand;
    },
    set lastCommand(v) {
      runtime().lastCommand = v;
    },
    commands: { run: runFlyCommand },
    toggleHud() {
      return hudApi().then((m) => m.toggleHud());
    },
    openHud() {
      return hudApi().then((m) => m.openHud());
    },
    refreshHud() {
      return hudApi()
        .then((m) => m.refreshHud())
        .catch((err) => console.warn("flybrain-vtt hud", err));
    },
    getFlyToken,
    getRole,
    setRole,
    assignSelected,
    syncSceneAppearance,
    tokensWithRole,
    getLastIntent,
    statusText() {
      const fly = getFlyToken();
      const foods = tokensWithRole("food").length;
      const threats = tokensWithRole("threat").length;
      const frame = runtime().bridge?.lastFrame;
      const motor = frame?.motor;
      return [
        `fly=${fly ? fly.document.name : "none"}`,
        `food=${foods}`,
        `threat=${threats}`,
        `intent=${getLastIntent().type}`,
        motor ? `feed=${motor.feedHz.toFixed(1)}Hz escape=${motor.escapeHz.toFixed(1)}Hz` : "motor=—"
      ].join(" · ");
    }
  };
}
