/** PIXI 7 (drawCircle/lineStyle) and PIXI 8 (circle/setStrokeStyle) both show up in Foundry builds. */

export function fillCircle(g, x, y, rad, color, alpha) {
  if (!g) return;
  if (typeof g.circle === "function" && typeof g.fill === "function") {
    g.circle(x, y, rad);
    g.fill({ color, alpha });
    return;
  }
  if (typeof g.drawCircle === "function") {
    g.beginFill?.(color, alpha);
    g.drawCircle(x, y, rad);
    g.endFill?.();
  }
}

export function strokeRoundRect(g, x, y, w, h, color) {
  if (!g) return;
  if (typeof g.setStrokeStyle === "function" && typeof g.roundRect === "function" && typeof g.stroke === "function") {
    g.setStrokeStyle({ width: 4, color, alpha: 0.95 });
    g.roundRect(x, y, w, h, 10);
    g.stroke();
    return;
  }
  if (typeof g.lineStyle === "function") {
    g.lineStyle(4, color, 0.95);
    g.drawRoundedRect?.(x, y, w, h, 10);
  }
}
