# सेतु — Setu

**An emotionally-aware intergenerational language bridge.**

> *Not just a translator. An emotional interpreter.*

Built for the Google DeepMind Bangalore Hackathon — Track 2: Real-Time Multimodal Interaction (Gemini Live API).

---

## What It Does

Setu listens continuously to two people speaking different languages and does three things:

1. **Translates** what each person says, warmly and naturally
2. **Reads emotional tone** from the voice — not just the words
3. **Surfaces subtext** when what someone says and how they say it don't match

*"She sounds worried, not angry."*
*"He's asking because he cares, not because he's judging."*

This is the gap that exists in every Indian multigenerational family — and what Setu bridges.

---

## Tech Stack

- **Gemini 2.5 Flash Live** — continuous multimodal audio stream with Affective Dialog
- **FastAPI** — WebSocket backend bridging browser ↔ Gemini
- **Vanilla JS + Web Audio API** — real-time mic capture and audio playback

---

## Author

**Madhumitha Kolkar** — Senior Machine Learning Engineer  
[linkedin.com/in/madhumithakolkar](https://linkedin.com/in/madhumithakolkar) | [github.com/MadhumithaKolkar](https://github.com/MadhumithaKolkar)

*Built on a belief that AI should understand how people feel, not just what they say.*

---

## How to Run

See [How_to_run.md](How_to_run.md) for full setup and run instructions.
