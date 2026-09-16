/** Grid helpers for Foundry v14 (offset i/j). */

export function tokenCenter(token) {
  return token.center ?? {
    x: token.document.x + (token.w ?? 0) / 2,
    y: token.document.y + (token.h ?? 0) / 2
  };
}

export function getOffset(point) {
  const grid = canvas.grid;
  const p = point.center ? tokenCenter(point) : point;
  if (typeof grid?.getOffset === "function") {
    const o = grid.getOffset(p);
    return { i: o.i ?? o.row ?? 0, j: o.j ?? o.col ?? 0 };
  }
  if (grid?.grid?.getGridPositionFromPixels) {
    const pos = grid.grid.getGridPositionFromPixels(p.x, p.y);
    if (Array.isArray(pos)) return { i: pos[0], j: pos[1] };
    return { i: pos.r ?? pos.y ?? 0, j: pos.c ?? pos.x ?? 0 };
  }
  const size = grid?.size ?? grid?.sizeX ?? 100;
  return { i: Math.round(p.y / size), j: Math.round(p.x / size) };
}

export function topLeftFromOffset(offset) {
  const grid = canvas.grid;
  const o = { i: offset.i, j: offset.j };
  if (typeof grid?.getTopLeftPoint === "function") return grid.getTopLeftPoint(o);
  if (grid?.grid?.getPixelsFromGridPosition) {
    const pix = grid.grid.getPixelsFromGridPosition(o.i, o.j);
    if (Array.isArray(pix)) return { x: pix[0], y: pix[1] };
    return { x: pix.x, y: pix.y };
  }
  const size = grid?.size ?? grid?.sizeX ?? 100;
  return { x: o.j * size, y: o.i * size };
}

/** Chebyshev squares (king-move). Prefer Foundry measurePath.spaces when present. */
export function gridSquares(a, b) {
  try {
    const path = canvas.grid?.measurePath?.([tokenCenter(a), tokenCenter(b)]);
    if (Number.isFinite(path?.spaces)) return path.spaces;
    const dist = path?.distance;
    const unit = canvas.scene?.grid?.distance;
    if (Number.isFinite(dist) && unit) return dist / unit;
  } catch {
    /* fall through */
  }
  const A = getOffset(a);
  const B = getOffset(b);
  return Math.max(Math.abs(A.i - B.i), Math.abs(A.j - B.j));
}

export function stepOffset(fromToken, di, dj, steps = 1) {
  const from = getOffset(fromToken);
  return topLeftFromOffset({
    i: from.i + Math.sign(di) * steps,
    j: from.j + Math.sign(dj) * steps
  });
}

export function stepToward(fromToken, toToken, steps = 1) {
  const a = getOffset(fromToken);
  const b = getOffset(toToken);
  return stepOffset(fromToken, b.i - a.i, b.j - a.j, steps);
}

export function stepAway(fromToken, toToken, steps = 1) {
  const a = getOffset(fromToken);
  const b = getOffset(toToken);
  let di = a.i - b.i;
  let dj = a.j - b.j;
  if (!di && !dj) di = 1;
  return stepOffset(fromToken, di, dj, steps);
}

/** Foundry 0° faces south (+i). */
export function facingDelta(rotation) {
  const r = ((Number(rotation) || 0) % 360 + 360) % 360;
  const sector = Math.round(r / 45) % 8;
  const map = [
    { i: 1, j: 0 },
    { i: 1, j: -1 },
    { i: 0, j: -1 },
    { i: -1, j: -1 },
    { i: -1, j: 0 },
    { i: -1, j: 1 },
    { i: 0, j: 1 },
    { i: 1, j: 1 }
  ];
  return map[sector];
}

export function stepFacing(token, steps = 1, reverse = false) {
  const d = facingDelta(token.document.rotation);
  const s = reverse ? -1 : 1;
  return stepOffset(token, d.i * s, d.j * s, steps);
}
