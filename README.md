# Fly Brain

A [Foundry Virtual Tabletop](https://foundryvtt.com/) module that runs a **connectome model on the GM client only**.

Select tokens, mark them **Fly / Food / Threat** from the left **brain** toolbar (or the three buttons on the Token HUD). The Fly Brain panel is a toolbar window, not a token sheet. Poke **Sugar / Loom / Walk** on that panel — you do not need to type `/flybrain`.

v0.2. Optional OpenAI-compatible API key in the same panel makes the fly *speak* flavor text. The key never chooses movement.

Compatible with Foundry **v13+**. System-agnostic.

## At the table

1. Left toolbar → **brain** icon → **Open Fly Brain panel**.
2. Select a token → click **Fly**. A cyan **FLY** tag appears on the token. Select others → **Food** (gold) or **Threat** (red). One click sets the role; click again to clear.
3. Tick **Walk on grid** in the panel (on by default for new worlds).
4. Place food a few squares away, or click **Loom** with a threat on the scene. The fly steps on the **grid**, not free-pixel slides.
5. To talk: paste an OpenAI-compatible API key in the panel, Save key, then type `sugar` / `loom` / a short line and Send.

Toolbar tools on the brain control: open panel, mark Fly / Food / Threat, Sugar, Loom, Stop.

## Speak API (optional)

Stored **on this client only** (Game Settings → Fly Brain, or the panel fields):

| Field | Example |
| --- | --- |
| API key | `sk-…` |
| Base URL | `https://api.openai.com/v1` or `https://openrouter.ai/api/v1` |
| Model | `gpt-4o-mini` |

The narrator may describe rates. It must not pick the next square. Keywords still poke stimuli with no key.

## House-rule decoder

| Condition | Token action |
| --- | --- |
| Loom button, or threat within 8 squares, or escape readout high | dash **2 grid squares** away (or reverse facing) |
| Sugar + food more than 1 square away | walk **1 square** toward food |
| Feed high and food adjacent | stay |
| Walk button | 1 square toward food, else facing |
| Destination blocked | try a slide; else skip |

## Install / update

Manifest:

```
https://raw.githubusercontent.com/Me0wX-LR/flybrain-vtt/main/module.json
```

Or copy this folder to `Data/modules/flybrain-vtt`.

## License

MIT for original code. See [ATTRIBUTION.md](ATTRIBUTION.md). Dummy worker in v0.2 is not a living fly.
