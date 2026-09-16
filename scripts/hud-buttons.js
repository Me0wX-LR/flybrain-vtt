import { MODULE_ID, t } from "./constants.js";
import { assignSelected, getRole } from "./flags.js";
import { openHud } from "./hud.js";

function rootOf(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html[0] instanceof HTMLElement) return html[0];
  return null;
}

function roleButton(role, active) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `flybrain-pick flybrain-pick-${role}${active ? " active" : ""}`;
  b.dataset.role = role;
  b.title = t(`FLYBRAIN.Role.${role[0].toUpperCase()}${role.slice(1)}`);
  b.textContent = t(`FLYBRAIN.Role.${role[0].toUpperCase()}${role.slice(1)}`);
  return b;
}

export function registerHudButtons() {
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
        ui.notifications.info(t("FLYBRAIN.RoleSet", { role: next }));
      });
      bar.appendChild(btn);
    }
    root.appendChild(bar);
  });

  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM) return;
    const toolsObj = {
      panel: {
        name: "panel",
        order: 1,
        title: t("FLYBRAIN.Tool.Panel"),
        icon: "fa-solid fa-window-maximize",
        button: true,
        onClick: () => openHud(),
        onChange: () => openHud()
      },
      fly: {
        name: "fly",
        order: 2,
        title: t("FLYBRAIN.Tool.Fly"),
        icon: "fa-solid fa-bug",
        button: true,
        onClick: () => assignSelected("fly"),
        onChange: () => assignSelected("fly")
      },
      food: {
        name: "food",
        order: 3,
        title: t("FLYBRAIN.Tool.Food"),
        icon: "fa-solid fa-lemon",
        button: true,
        onClick: () => assignSelected("food"),
        onChange: () => assignSelected("food")
      },
      threat: {
        name: "threat",
        order: 4,
        title: t("FLYBRAIN.Tool.Threat"),
        icon: "fa-solid fa-skull",
        button: true,
        onClick: () => assignSelected("threat"),
        onChange: () => assignSelected("threat")
      },
      sugar: {
        name: "sugar",
        order: 5,
        title: t("FLYBRAIN.Cmd.Sugar"),
        icon: "fa-solid fa-droplet",
        button: true,
        onClick: () => game.modules.get(MODULE_ID)?.api?.commands.run("sugar"),
        onChange: () => game.modules.get(MODULE_ID)?.api?.commands.run("sugar")
      },
      loom: {
        name: "loom",
        order: 6,
        title: t("FLYBRAIN.Cmd.Loom"),
        icon: "fa-solid fa-burst",
        button: true,
        onClick: () => game.modules.get(MODULE_ID)?.api?.commands.run("loom"),
        onChange: () => game.modules.get(MODULE_ID)?.api?.commands.run("loom")
      },
      stop: {
        name: "stop",
        order: 7,
        title: t("FLYBRAIN.Cmd.Stop"),
        icon: "fa-solid fa-hand",
        button: true,
        onClick: () => game.modules.get(MODULE_ID)?.api?.commands.run("stop"),
        onChange: () => game.modules.get(MODULE_ID)?.api?.commands.run("stop")
      }
    };
    const toolsArr = Object.values(toolsObj);
    const group = {
      name: "flybrain",
      order: 80,
      title: t("FLYBRAIN.HudTitle"),
      icon: "fa-solid fa-brain",
      layer: "flybrain",
      visible: true,
      activeTool: "panel",
      tools: Array.isArray(controls) ? toolsArr : toolsObj
    };

    if (Array.isArray(controls)) {
      const i = controls.findIndex((c) => c.name === "flybrain");
      if (i >= 0) controls[i] = group;
      else controls.push(group);
      return;
    }
    controls.flybrain = group;
  });
}
