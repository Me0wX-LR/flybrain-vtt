import { MODULE_ID } from "./constants.js";
import { assignSelected, getRole } from "./flags.js";

function rootOf(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html[0] instanceof HTMLElement) return html[0];
  return null;
}

function openPanel() {
  import("./hud.js")
    .then((m) => m.openHud())
    .catch((err) => {
      console.error("flybrain-vtt: HUD failed", err);
      ui.notifications.error("Fly Brain panel failed to open. Press F12 and check the console.");
    });
}

function roleButton(role, active) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `flybrain-pick flybrain-pick-${role}${active ? " active" : ""}`;
  b.dataset.role = role;
  b.title = game.i18n.localize(`FLYBRAIN.Role.${role[0].toUpperCase()}${role.slice(1)}`);
  b.textContent = game.i18n.localize(`FLYBRAIN.Role.${role[0].toUpperCase()}${role.slice(1)}`);
  return b;
}

function buttonTool(name, order, title, icon, fn) {
  return {
    name,
    order,
    title,
    icon,
    button: true,
    visible: true,
    onChange: () => fn()
  };
}

function flybrainGroup() {
  return {
    name: "flybrain",
    order: 80,
    title: "FLYBRAIN.HudTitle",
    icon: "fa-solid fa-brain",
    visible: Boolean(game.user?.isGM),
    onChange: (_event, active) => {
      if (active) openPanel();
    },
    tools: {
      panel: buttonTool("panel", 1, "FLYBRAIN.Tool.Panel", "fa-solid fa-window-maximize", openPanel),
      fly: buttonTool("fly", 2, "FLYBRAIN.Tool.Fly", "fa-solid fa-bug", () => assignSelected("fly")),
      food: buttonTool("food", 3, "FLYBRAIN.Tool.Food", "fa-solid fa-lemon", () => assignSelected("food")),
      threat: buttonTool("threat", 4, "FLYBRAIN.Tool.Threat", "fa-solid fa-skull", () => assignSelected("threat")),
      sugar: buttonTool("sugar", 5, "FLYBRAIN.Cmd.Sugar", "fa-solid fa-droplet", () =>
        game.modules.get(MODULE_ID)?.api?.commands.run("sugar")
      ),
      loom: buttonTool("loom", 6, "FLYBRAIN.Cmd.Loom", "fa-solid fa-burst", () =>
        game.modules.get(MODULE_ID)?.api?.commands.run("loom")
      ),
      stop: buttonTool("stop", 7, "FLYBRAIN.Cmd.Stop", "fa-solid fa-hand", () =>
        game.modules.get(MODULE_ID)?.api?.commands.run("stop")
      )
    }
  };
}

export function registerHudButtons() {
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user?.isGM) return;
    controls.flybrain = flybrainGroup();
    const tokens = controls.tokens ?? controls.token;
    if (tokens?.tools) {
      tokens.tools.flybrainPanel = buttonTool("flybrainPanel", 90, "FLYBRAIN.Tool.Panel", "fa-solid fa-brain", openPanel);
    }
  });

  Hooks.on("renderTokenHUD", (app, html) => {
    if (!game.user.isGM) return;
    const root = rootOf(html);
    if (!root) return;
    root.querySelector(".flybrain-token-roles")?.remove();
    const token = app.object ?? canvas.tokens.get(app.object?.id ?? app.document?.id);
    if (!token) return;
    const current = getRole(token);
    const bar = document.createElement("div");
    bar.className = "flybrain-token-roles";
    for (const role of ["fly", "food", "threat"]) {
      const btn = roleButton(role, current === role);
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const next = getRole(token) === role ? "none" : role;
        await game.modules.get(MODULE_ID).api.setRole(token, next);
        ui.notifications.info(game.i18n.format("FLYBRAIN.RoleSet", { role: next }));
      });
      bar.appendChild(btn);
    }
    root.appendChild(bar);
  });
}

export function refreshSceneControls() {
  try {
    ui.controls?.render?.({ force: true });
  } catch (err) {
    console.warn("flybrain-vtt: scene controls refresh", err);
  }
}
