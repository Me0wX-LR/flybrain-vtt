import { MODULE_ID, ROLES, t } from "./constants.js";
import { getRole, setRole } from "./flags.js";

function rootOf(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html[0] instanceof HTMLElement) return html[0];
  return null;
}

export function registerHudButtons() {
  Hooks.on("renderTokenHUD", (app, html) => {
    if (!game.user.isGM) return;
    const root = rootOf(html);
    if (!root) return;
    const col = root.querySelector(".col.left") ?? root;
    if (col.querySelector(".flybrain-role")) return;
    const token = app.object ?? canvas.tokens.get(app.object?.id);
    if (!token) return;
    const wrap = document.createElement("div");
    wrap.className = "control-icon flybrain-role";
    wrap.title = t("FLYBRAIN.TokenRole");
    wrap.innerHTML = `<i class="fa-solid fa-brain"></i>`;
    wrap.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const current = getRole(token);
      const idx = Math.max(0, ROLES.indexOf(current));
      const next = ROLES[(idx + 1) % ROLES.length];
      await setRole(token, next);
      ui.notifications.info(t("FLYBRAIN.RoleSet", { role: next }));
    });
    col.appendChild(wrap);
  });

  Hooks.on("getSceneControlButtons", (controls) => {
    const tools = {
      name: "flybrain",
      title: t("FLYBRAIN.HudTitle"),
      icon: "fa-solid fa-brain",
      button: true,
      onClick: () => game.modules.get(MODULE_ID)?.api?.toggleHud?.()
    };
    if (Array.isArray(controls)) {
      const token = controls.find((c) => c.name === "token");
      token?.tools?.push?.(tools);
    } else if (controls?.tokens?.tools) {
      controls.tokens.tools.flybrain = tools;
    }
  });
}
