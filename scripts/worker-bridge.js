import { MODULE_ID, N_NEURONS, isSimOwner } from "./constants.js";
import { getSetting } from "./settings.js";

export class WorkerBridge {
  constructor() {
    this.worker = null;
    this.lastFrame = null;
    this.paused = false;
    this.ready = false;
    this._listeners = new Set();
  }

  start() {
    if (!isSimOwner()) return;
    if (this.worker) return;
    try {
      const url = new URL("../workers/fly.worker.js", import.meta.url);
      this.worker = new Worker(url, { type: "module", name: "flybrain-vtt" });
    } catch (err) {
      console.error("flybrain-vtt: worker spawn failed", err);
      ui.notifications.error(game.i18n.localize("FLYBRAIN.WorkerFail"));
      return;
    }
    this.worker.onmessage = (ev) => this._onMessage(ev.data);
    this.worker.onerror = (err) => {
      console.error("flybrain-vtt: worker error", err);
    };
    this.worker.postMessage({ type: "init", n: N_NEURONS, graphUrl: `modules/${MODULE_ID}/data/graph.csr.bin.gz` });
  }

  stop() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.lastFrame = null;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
  }

  onFrame(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  step() {
    if (!this.worker || this.paused || document.hidden) return;
    if (game.paused) return;
    this.worker.postMessage({ type: "step", simMs: getSetting("simMsPerTick") });
  }

  setStim(name, on, hz) {
    this.worker?.postMessage({ type: "setStim", name, on, hz });
  }

  setCurrents(pairs) {
    this.worker?.postMessage({ type: "setCurrents", pairs });
  }

  reset() {
    this.worker?.postMessage({ type: "reset" });
  }

  _onMessage(data) {
    if (!data) return;
    if (data.type === "ready") {
      this.ready = true;
      return;
    }
    if (data.type === "frame") {
      this.lastFrame = data;
      for (const fn of this._listeners) fn(data);
    }
  }
}
