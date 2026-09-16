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

function makeText(label, fill = 0xffffff) {
  const style = { fontSize: 12, fill, fontWeight: "bold", fontFamily: "Signika, sans-serif" };
  try {
    return new PIXI.Text({ text: label, style });
  } catch {
    return new PIXI.Text(label, style);
  }
}

function strokeRect(g, x, y, w, h, color) {
  if (typeof g.setStrokeStyle === "function" && typeof g.roundRect === "function") {
    g.setStrokeStyle({ width: 4, color, alpha: 0.95 });
    g.roundRect(x, y, w, h, 10);
    g.stroke();
    return;
  }
  g.lineStyle?.(4, color, 0.95);
  g.drawRoundedRect?.(x, y, w, h, 10);
}

function fillRect(g, x, y, w, h, color, alpha) {
  if (typeof g.roundRect === "function" && typeof g.fill === "function") {
    g.roundRect(x, y, w, h, 4);
    g.fill({ color, alpha });
    return;
  }
  g.beginFill?.(color, alpha);
  g.drawRoundedRect?.(x, y, w, h, 4);
  g.endFill?.();
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
  fillRect(g, 3, 3, 54, 18, vis.color, 0.95);
  const text = makeText(vis.label, 0x111111);
  text.position.set(8, 4);
  text.eventMode = "none";
  g.addChild(text);
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
