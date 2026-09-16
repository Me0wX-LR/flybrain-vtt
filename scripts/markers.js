import { getRole } from "./flags.js";

export const ROLE_VISUAL = {
  fly: { color: 0x33d6ff, fill: 0x082028, label: "FLY", css: "#33d6ff" },
  food: { color: 0xffc43a, fill: 0x2a2208, label: "FOOD", css: "#ffc43a" },
  threat: { color: 0xff4d6a, fill: 0x2a080e, label: "THREAT", css: "#ff4d6a" }
};

function tokenSize(token) {
  const w = token.w ?? token.document?.width * (canvas.grid?.sizeX ?? canvas.grid?.size ?? 100);
  const h = token.h ?? token.document?.height * (canvas.grid?.sizeY ?? canvas.grid?.size ?? 100);
  return { w: w || 100, h: h || 100 };
}

function strokeRect(g, x, y, w, h, color) {
  g.setStrokeStyle({ width: 4, color, alpha: 0.95 });
  g.roundRect(x, y, w, h, 10);
  g.stroke();
}

export function refreshMarker(token) {
  if (!token) return;
  const old = token.children?.find?.((c) => c.name === "flybrainMarker");
  if (old) {
    token.removeChild(old);
    old.destroy?.({ children: true });
  }
  const role = getRole(token);
  const vis = ROLE_VISUAL[role];
  if (!vis || !token.addChild) return;

  const { w, h } = tokenSize(token);
  const g = new PIXI.Graphics();
  g.name = "flybrainMarker";
  g.eventMode = "none";
  g.interactive = false;
  strokeRect(g, 3, 3, Math.max(8, w - 6), Math.max(8, h - 6), vis.color);
  token.addChild(g);
}

export function refreshAllMarkers() {
  for (const token of canvas.tokens?.placeables ?? []) refreshMarker(token);
}

export function registerMarkers() {
  Hooks.on("drawToken", (token) => refreshMarker(token));
  Hooks.on("refreshToken", (token) => refreshMarker(token));
  Hooks.on("updateToken", (doc) => {
    const token = canvas.tokens?.get(doc.id);
    if (token) refreshMarker(token);
  });
  Hooks.on("canvasReady", () => refreshAllMarkers());
}
