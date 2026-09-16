import { MODULE_ID, N_NEURONS } from "./constants.js";
import { getFlyToken } from "./flags.js";
import { getDummySomata, loadSomataBin, REGION_LAYOUT } from "./somata.js";
import { createPointMesh, setPointScale, uploadActivity } from "./shader.js";
import { getSetting } from "./settings.js";

const INSET = 400;

export let FlyBrainLayer;

export function registerLayer() {
  const Base = foundry.canvas?.layers?.CanvasLayer ?? globalThis.CanvasLayer;
  if (!Base) {
    console.error("flybrain-vtt: CanvasLayer is not available");
    return;
  }

  class Impl extends Base {
    static get layerOptions() {
      return foundry.utils.mergeObject(super.layerOptions, {
        name: "flybrain",
        zIndex: 999
      });
    }

    constructor() {
      super();
      this.mesh = null;
      this.lod = null;
      this.cloud = null;
      this.positions = null;
      this.region = null;
      this.activity = null;
      this.n = N_NEURONS;
      this._raf = 0;
      this._lastDraw = 0;
    }

    async _draw() {
      await super._draw?.();
      this.visible = Boolean(getSetting("overlayEnabled") && game.user.isGM);
      this.eventMode = "static";
      this.cursor = "pointer";
      this.on("pointertap", (ev) => this._onTap(ev));

      const bin = await loadSomataBin(`modules/${MODULE_ID}/data/somata.xy.bin`);
      if (bin) {
        this.n = bin.length / 2;
        this.positions = bin;
        this.region = new Float32Array(this.n);
        for (let i = 0; i < this.n; i++) this.region[i] = i % REGION_LAYOUT.length;
      } else {
        const dummy = getDummySomata(N_NEURONS);
        this.n = N_NEURONS;
        this.positions = dummy.xy;
        this.region = dummy.region;
      }
      this.activity = new Float32Array(this.n);

      const local = new Float32Array(this.n * 2);
      for (let i = 0; i < this.n; i++) {
        local[i * 2] = this.positions[i * 2] * INSET;
        local[i * 2 + 1] = this.positions[i * 2 + 1] * INSET;
      }

      this.cloud = this.addChild(new PIXI.Container());
      this.mesh = createPointMesh(local, this.activity, this.region);
      if (this.mesh) this.cloud.addChild(this.mesh);
      this.lod = this.cloud.addChild(new PIXI.Graphics());
      this._layout();
      this._tick = this._tick.bind(this);
      this._raf = requestAnimationFrame(this._tick);
    }

    async _tearDown(options) {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
      this.removeAllListeners?.();
      this.removeChildren().forEach((c) => {
        try {
          c.destroy({ children: true });
        } catch {
          /* already destroyed */
        }
      });
      this.mesh = null;
      this.lod = null;
      this.cloud = null;
      await super._tearDown?.(options);
    }

    setActivity(activity) {
      if (!activity || activity.length !== this.n) return;
      this.activity.set(activity);
      if (this.mesh) uploadActivity(this.mesh, this.activity);
    }

    _insetRect() {
      const fly = getFlyToken();
      const origin = fly?.center ?? {
        x: (canvas.dimensions?.width ?? 0) / 2,
        y: (canvas.dimensions?.height ?? 0) / 2
      };
      return { x: origin.x + 80, y: origin.y - INSET / 2, w: INSET, h: INSET };
    }

    _layout() {
      if (!this.cloud) return;
      const mode = getSetting("overlayMode");
      const rect = this._insetRect();
      this.cloud.position.set(rect.x, rect.y);
      this.cloud.visible = mode === "inset" || this._useLod();
      if (this.mesh) {
        this.mesh.visible = mode === "inset" && !this._useLod();
        setPointScale(this.mesh, canvas.stage?.scale?.x ?? 1);
      }
      this._drawLod();
    }

    _useLod() {
      const scale = canvas.stage?.scale?.x ?? 1;
      return scale < (getSetting("lodZoom") ?? 0.4);
    }

    _drawLod() {
      if (!this.lod) return;
      this.lod.clear();
      const show = this._useLod() || !this.mesh;
      this.lod.visible = show;
      if (!show) return;
      const sums = new Float32Array(REGION_LAYOUT.length);
      const counts = new Float32Array(REGION_LAYOUT.length);
      for (let i = 0; i < this.n; i++) {
        const r = this.region[i] | 0;
        sums[r] += this.activity[i];
        counts[r] += 1;
      }
      for (let r = 0; r < REGION_LAYOUT.length; r++) {
        const c = REGION_LAYOUT[r];
        const mean = counts[r] ? sums[r] / counts[r] : 0;
        const x = c.x * INSET;
        const y = c.y * INSET;
        const rad = 8 + mean * 28;
        const color = 0x66ccff + r * 0x0a1200;
        const g = this.lod;
        if (g.beginFill) {
          g.beginFill(color, 0.25 + mean * 0.6);
          g.drawCircle(x, y, rad);
          g.endFill();
        } else if (g.circle && g.fill) {
          g.circle(x, y, rad);
          g.fill({ color, alpha: 0.25 + mean * 0.6 });
        }
      }
    }

    _tick(ts) {
      this._raf = requestAnimationFrame(this._tick);
      if (!this.visible) return;
      const fps = getSetting("overlayFps") || 20;
      if (ts - this._lastDraw < 1000 / fps) return;
      this._lastDraw = ts;
      const frame = game.modules.get(MODULE_ID)?.api?.bridge?.lastFrame;
      if (frame?.activity && frame.activity.length === this.n) this.setActivity(frame.activity);
      else this._pulseDummy(ts);
      this._layout();
    }

    _pulseDummy(ts) {
      const t = ts / 400;
      for (let i = 0; i < this.n; i += 97) {
        this.activity[i] = 0.5 + 0.5 * Math.sin(t + i * 0.01);
      }
      if (this.mesh) uploadActivity(this.mesh, this.activity);
    }

    _onTap(ev) {
      const global = ev.global ?? ev.data?.global;
      if (!global) return;
      const world = canvas.stage.toLocal(global);
      const hit = this.inspectAt(world);
      if (hit) {
        ui.notifications.info(`neuron ${hit.index} · ${hit.region} · a=${hit.activity.toFixed(2)}`);
      }
    }

    inspectAt(world) {
      const rect = this._insetRect();
      const u = (world.x - rect.x) / rect.w;
      const v = (world.y - rect.y) / rect.h;
      if (u < 0 || v < 0 || u > 1 || v > 1) return null;
      let best = -1;
      let bestD = 0.0009;
      for (let i = 0; i < this.n; i++) {
        const dx = this.positions[i * 2] - u;
        const dy = this.positions[i * 2 + 1] - v;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) return null;
      const r = this.region[best] | 0;
      return { index: best, region: REGION_LAYOUT[r]?.name ?? String(r), activity: this.activity[best] };
    }
  }

  FlyBrainLayer = Impl;
  CONFIG.Canvas.layers.flybrain = { layerClass: Impl, group: "overlay" };
}
