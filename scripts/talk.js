import { MODULE_ID, STIMULI, t } from "./constants.js";
import { getSetting } from "./settings.js";
import { runFlyCommand } from "./commands.js";
import { getFlyToken } from "./flags.js";
import { getLastIntent } from "./decoder.js";

const LEXICON = [
  { stim: "sugar", keys: ["sugar", "sweet", "food", "eat", "honey", "fruit", "nectar"] },
  { stim: "bitter", keys: ["bitter", "poison", "yuck", "nasty"] },
  { stim: "loom", keys: ["loom", "scare", "scary", "threat", "eagle", "bird", "shadow", "danger", "run", "flee"] },
  { stim: "shock", keys: ["shock", "zap", "pain", "sting"] },
  { stim: "walk", keys: ["walk", "go", "forward", "move"] },
  { stim: "stop", keys: ["stop", "halt", "quiet", "still"] }
];

export function matchLexicon(text) {
  const s = String(text || "").toLowerCase();
  for (const row of LEXICON) {
    if (row.keys.some((k) => s.includes(k))) return row.stim;
  }
  return null;
}

function stateBlurb() {
  const api = game.modules.get(MODULE_ID)?.api;
  const fly = getFlyToken();
  const frame = api?.bridge?.lastFrame;
  const motor = frame?.motor;
  return [
    `fly token: ${fly ? fly.document.name : "none"}`,
    `intent: ${getLastIntent()?.type ?? "idle"}`,
    motor
      ? `feed ${motor.feedHz.toFixed(1)} Hz, escape ${motor.escapeHz.toFixed(1)} Hz, turn ${motor.turn.toFixed(2)}, forward ${motor.forward.toFixed(1)}`
      : "motor: none yet",
    `last poke: ${api?.lastCommand ?? "—"}`
  ].join(". ");
}

function cannedReply(userText, stim) {
  if (stim === "sugar") return t("FLYBRAIN.Talk.Sugar");
  if (stim === "loom") return t("FLYBRAIN.Talk.Loom");
  if (stim === "walk") return t("FLYBRAIN.Talk.Walk");
  if (stim === "stop") return t("FLYBRAIN.Talk.Stop");
  if (stim === "bitter") return t("FLYBRAIN.Talk.Bitter");
  if (stim === "shock") return t("FLYBRAIN.Talk.Shock");
  return t("FLYBRAIN.Talk.Idle", { text: userText.slice(0, 80) });
}

async function callChatCompletions(userText) {
  const key = String(getSetting("llmApiKey") || "").trim();
  if (!key) return null;
  const base = String(getSetting("llmBaseUrl") || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = String(getSetting("llmModel") || "gpt-4o-mini");
  const body = {
    model,
    temperature: 0.7,
    max_tokens: 180,
    messages: [
      {
        role: "system",
        content:
          "You narrate a simplified fruit-fly connectome model used at a TTRPG table. It is not alive and not conscious. Reply in 1-3 short sentences of flavor from the motor readouts and the user's line. Never decide token movement. Never claim you are a real fly. Never ask for API keys."
      },
      { role: "user", content: `${stateBlurb()}\nPlayer: ${userText}` }
    ]
  };
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err.slice(0, 200) || res.statusText);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || null;
}

export async function talkToFly(userText) {
  const text = String(userText || "").trim();
  if (!text) return { stim: null, reply: "" };
  const stim = matchLexicon(text);
  if (stim && STIMULI.includes(stim)) await runFlyCommand(stim, { silent: true });
  else if (stim === "stop") await runFlyCommand("stop", { silent: true });

  let reply = cannedReply(text, stim);
  try {
    const llm = await callChatCompletions(text);
    if (llm) reply = llm;
  } catch (err) {
    console.warn("flybrain-vtt talk", err);
    reply = `${reply}\n(${t("FLYBRAIN.Talk.ApiError")})`;
  }
  const api = game.modules.get(MODULE_ID)?.api;
  if (api) {
    api.talkLog.push({ who: "you", text });
    api.talkLog.push({ who: "fly", text: reply });
    api.talkLog = api.talkLog.slice(-12);
    api.lastCommand = stim ? `${stim} via talk` : "talk";
  }
  return { stim, reply };
}
