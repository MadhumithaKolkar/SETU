# सेतु - Setu

**An emotionally-aware intergenerational language bridge.**

*Never Letting love get lost in translation :)*

Built for the Google DeepMind Bangalore Hackathon — Track 2: Real-Time Multimodal Interaction (Gemini Live API).

---

## What It Does

Setu listens live to two people speaking different languages — Person A and Person B, each with their own column — and for every single thing either person says:

1. **Translates** it naturally and warmly into the other person's language, spoken aloud in real time
2. **Reads the emotional tone** behind the words — not just what was said, but how
3. **Reports it plainly**, every time, as *"Setu feels: ..."* above that person's column

*"Setu feels: She sounds angry, but she's just concerned — talk to her gently."*
*"Setu feels: He's asking because he's worried, not judging you — reassure him."*

This is the gap that exists in every Indian multigenerational family — grandparent and grandchild, different languages, and the emotional register that gets lost in translation between them. Setu bridges both the words and the feeling behind them.

---

## Tech Stack

- **Gemini 2.5 native-audio (Live API, `v1alpha`)** — continuous, bidirectional audio streaming with **Affective Dialog** (native vocal-tone understanding)
- **Function calling** — the model reports speaker + emotional tone via a mandatory `report_tone` tool call on every turn, kept separate from the spoken translation so it never gets said aloud
- **FastAPI + WebSockets** — bridges the browser and the Gemini Live API, recycling a fresh Live session per conversational turn (this preview model doesn't reliably listen for a second utterance within one session)
- **Vanilla JS + Web Audio API** — real-time mic capture (16kHz PCM in), audio playback (24kHz PCM out), no frameworks

---

## Author

**Madhumitha Kolkar** — Senior Machine Learning Engineer
[linkedin.com/in/madhumithakolkar](https://linkedin.com/in/madhumithakolkar) | [github.com/MadhumithaKolkar](https://github.com/MadhumithaKolkar)

*Built on a belief that AI should understand how people feel, not just what they say.*

---

## How to Run

See [How_to_run.md](How_to_run.md) for full setup and run instructions.
