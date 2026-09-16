import { MODULE_ID } from "./constants.js";
import { runFlyCommand } from "./commands.js";
import { assignSelected, getFlyToken, getRole, setRole, tokensWithRole } from "./flags.js";
import { getLastIntent } from "./decoder.js";
import { openHud, refreshHud, toggleHud } from "./hud.js";

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
    toggleHud,
    openHud,
    refreshHud,
    getFlyToken,
    getRole,
    setRole,
    assignSelected,
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
