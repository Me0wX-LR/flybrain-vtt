import { MODULE_ID } from "./constants.js";
import { runFlyCommand } from "./commands.js";
import { getFlyToken, getRole, setRole, tokensWithRole } from "./flags.js";
import { getLastIntent } from "./decoder.js";
import { refreshHud, toggleHud } from "./hud.js";

export function createApi(getRuntime) {
  return {
    id: MODULE_ID,
    get bridge() {
      return getRuntime().bridge;
    },
    get lastCommand() {
      return getRuntime().lastCommand;
    },
    set lastCommand(v) {
      getRuntime().lastCommand = v;
    },
    commands: { run: runFlyCommand },
    toggleHud,
    refreshHud,
    getFlyToken,
    getRole,
    setRole,
    tokensWithRole,
    getLastIntent,
    statusText() {
      const fly = getFlyToken();
      const foods = tokensWithRole("food").length;
      const threats = tokensWithRole("threat").length;
      const frame = getRuntime().bridge?.lastFrame;
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
