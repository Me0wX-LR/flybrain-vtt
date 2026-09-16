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

function clickTool(fn) {
  return {
    button: true,
    onChange: () => fn()
  };
}

function flybrainTools() {
  return {
    select: {
      name: "select",
      order: 0,
      title: "FLYBRAIN.Tool.Panel",
      icon: "fa-solid fa-brain"
    },
    panel: {
      name: "panel",
      order: 1,
      title: "FLYBRAIN.Tool.Panel",
      icon: "fa-solid fa-window-maximize",
      ...clickTool(openPanel)
    },
    fly: {
      name: "fly",
      order: 2,
      title: "FLYBRAIN.Tool.Fly",
      icon: "fa-solid fa-bug",
      ...clickTool(() => assignSelected("fly"))
    },
    food: {
      name: "food",
      order: 3,
      title: "FLYBRAIN.Tool.Food",
      icon: "fa-solid fa-lemon",
      ...clickTool(() => assignSelected("food"))
    },
    threat: {
      name: "threat",
      order: 4,
      title: "FLYBRAIN.Tool.Threat",
      icon: "fa-solid fa-skull",
      ...clickTool(() => assignSelected("threat"))
    },
    sugar: {
      name: "sugar",
      order: 5,
      title: "FLYBRAIN.Cmd.Sugar",
      icon: "fa-solid fa-droplet",
      ...clickTool(() => game.modules.get(MODULE_ID)?.api?.commands.run("sugar"))
    },
    loom: {
      name: "loom",
      order: 6,
      title: "FLYBRAIN.Cmd.Loom",
      icon: "fa-solid fa-burst",
      ...clickTool(() => game.modules.get(MODULE_ID)?.api?.commands.run("loom"))
    },
    stop: {
      name: "stop",
      order: 7,
      title: "FLYBRAIN.Cmd.Stop",
      icon: "fa-solid fa-hand",
      ...clickTool(() => game.modules.get(MODULE_ID)?.api?.commands.run("stop"))
    }
  };
}

function flybrainGroup() {
  return {
    name: "flybrain",
    order: 80,
    title: "FLYBRAIN.HudTitle",
    icon: "fa-solid fa-brain",
    visible: Boolean(game.user?.isGM),
    activeTool: "select",
    onChange: (_event, active) => {
      if (active) openPanel();
    },
    tools: flybrainTools()
  };
}

function injectTokenTool(controls) {
  const tokens = controls.tokens ?? controls.token;
  if (!tokens?.tools) return;
  tokens.tools.flybrainPanel = {
    name: "flybrainPanel",
    order: 90,
    title: "FLYBRAIN.Tool.Panel",
    icon: "fa-solid fa-brain",
    button: true,
    visible: Boolean(game.user?.isGM),
    onChange: () => openPanel()
  };
}

function applySceneControls(controls) {
  if (!game.user?.isGM) return;
  const group = flybrainGroup();
  if (Array.isArray(controls)) {
    group.tools = Object.values(group.tools);
    const i = controls.findIndex((c) => c.name === "flybrain");
    if (i >= 0) controls[i] = group;
    else controls.push(group);
    return;
  }
  controls.flybrain = group;
  injectTokenTool(controls);
}

export function registerHudButtons() {
  Hooks.on("getSceneControlButtons", applySceneControls);

  Hooks.on("renderTokenHUD", (app, html) => {
    if (!game.user.isGM) return;
    const root = rootOf(html);
    if (!root) return;
    root.querySelector(".flybrain-token-roles")?.remove();
    const token = app.object ?? canvas.tokens.get(app.object?.id);
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
