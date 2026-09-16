import { createState, nextActivityBuffer, resetState, setCurrents, setStim, stepDummy } from "./lif.js";

let state = createState();
let ready = false;

self.onmessage = (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case "init": {
      state = createState(msg.n ?? state.n);
      ready = true;
      self.postMessage({ type: "ready", n: state.n, mode: "dummy" });
      break;
    }
    case "setStim": {
      setStim(state, msg.name, msg.on, msg.hz ?? 0);
      break;
    }
    case "setCurrents": {
      setCurrents(state, msg.pairs ?? []);
      break;
    }
    case "step": {
      if (!ready) break;
      const t0 = performance.now();
      const stats = stepDummy(state, msg.simMs ?? 30);
      const activity = nextActivityBuffer(state);
      const wallMs = performance.now() - t0;
      self.postMessage(
        {
          type: "frame",
          activity,
          motor: stats.motor,
          regions: stats.regions,
          simMs: msg.simMs ?? 30,
          wallMs,
          nActive: stats.nActive,
          mode: state.mode
        },
        [activity.buffer]
      );
      break;
    }
    case "reset": {
      resetState(state);
      self.postMessage({ type: "reset-ok" });
      break;
    }
    default:
      break;
  }
};
