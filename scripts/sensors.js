import { FEED_RANGE_SQUARES, FOOD_RANGE_SQUARES, THREAT_RANGE_SQUARES } from "./constants.js";
import { getChannel, getFlyToken, getStrength, tokensWithRole } from "./flags.js";
import { gridSquares } from "./grid.js";

function hasLOS(a, b) {
  const origin = a.center ?? { x: a.x, y: a.y };
  const dest = b.center ?? { x: b.x, y: b.y };
  try {
    const test =
      CONFIG.Canvas?.polygonBackends?.sight?.testCollision ??
      canvas.walls?.checkCollision;
    if (typeof test === "function") {
      const RayCls = foundry.canvas?.geometry?.Ray ?? globalThis.Ray;
      const ray = new RayCls(origin, dest);
      const hits = test.call(CONFIG.Canvas?.polygonBackends?.sight ?? canvas.walls, ray, {
        type: "sight",
        mode: "any"
      });
      return !hits;
    }
  } catch {
    /* open LOS if the backend is unavailable */
  }
  return true;
}

const lastThreatDist = new Map();

export function sampleSensors() {
  const fly = getFlyToken();
  const foods = tokensWithRole("food");
  const threats = tokensWithRole("threat");
  const result = {
    sugar: 0,
    bitter: 0,
    loom: 0,
    shock: 0,
    nearestFood: null,
    nearestThreat: null,
    approaching: false,
    foodInFeedRange: false
  };
  if (!fly) return result;

  let bestFood = Infinity;
  for (const food of foods) {
    const d = gridSquares(fly, food);
    if (d < bestFood) {
      bestFood = d;
      result.nearestFood = food;
    }
    if (d <= FOOD_RANGE_SQUARES && hasLOS(fly, food)) {
      const mag = (1 / (1 + d)) * getStrength(food);
      if (getChannel(food) === "bitter") result.bitter += mag;
      else result.sugar += mag;
    }
    if (d <= FEED_RANGE_SQUARES) result.foodInFeedRange = true;
  }

  let bestThreat = Infinity;
  for (const threat of threats) {
    const d = gridSquares(fly, threat);
    if (d < bestThreat) {
      bestThreat = d;
      result.nearestThreat = threat;
    }
    const prev = lastThreatDist.get(threat.id);
    const approaching = Number.isFinite(prev) && d < prev - 0.15;
    lastThreatDist.set(threat.id, d);
    if (d <= THREAT_RANGE_SQUARES && hasLOS(fly, threat)) {
      let mag = (1 / (1 + d)) * getStrength(threat);
      if (approaching) {
        mag *= 1.8;
        result.approaching = true;
      }
      result.loom += mag;
    }
    if (d < 1) result.shock += getStrength(threat);
  }

  result.sugar = Math.min(1, result.sugar);
  result.loom = Math.min(1, result.loom);
  result.shock = Math.min(1, result.shock);
  result.bitter = Math.min(1, Math.max(0, result.bitter));
  return result;
}

export function sensorCurrents(sample) {
  const pairs = [];
  if (sample.sugar > 0.02) pairs.push(["sugar", sample.sugar]);
  if (sample.bitter > 0.02) pairs.push(["bitter", sample.bitter]);
  if (sample.loom > 0.02) pairs.push(["loom", sample.loom]);
  if (sample.shock > 0.02) pairs.push(["shock", sample.shock]);
  return pairs;
}

export { gridSquares };
