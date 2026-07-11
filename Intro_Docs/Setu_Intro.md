# Setu — Project Brief
*Sanskrit: bridge*

---

## Context: The Hackathon

**Event:** Google DeepMind Bangalore Hackathon
**Date:** One-day hackathon (~6.5 hours of build time, 10:30 AM – 5:00 PM)
**Track:** Track 2 — Real-Time Multimodal Interaction (Gemini Live API / Live Translate)
**Submission:** Public GitHub repo + 1-minute demo video + live 3-minute demo to judges

### Judging Criteria
| Criterion | Weight |
|---|---|
| Creativity & Originality | 35% |
| Impact in India | 25% |
| Live Demo quality | 25% |
| Technical Depth | 15% |

### Hard Rules
- No RAG-only apps, no Streamlit, no chatbots, no dashboards as the main feature
- Must use Google's stack (Gemini Live API is the primary focus for Track 2)
- New work only, built during the hackathon
- The bar set by organizers: *"If your application works just as well typed into a chatbox, you aren't leveraging the Live API's true potential."*

---

## The Builder: Madhumitha Kolkar

**Role:** Senior Machine Learning Engineer (currently at Solarwinds, previously Nokia, Mercedes-Benz R&D, Deloitte)

**Relevant background:**
- Built **MoodMap** — a personal project: a multimodal real-time emotion recognition system using a custom LSTM-GRU-Conv1D classifier trained on ~5–6k audio samples (Kaggle), combined with DeepFace for facial emotion detection. The goal was to make LLMs emotionally aware — feeding user emotion + text into the LLM so it could respond with empathy calibrated to the user's actual state. Built on a personal gaming laptop, limited data, no fancy infrastructure. Achieved 0.86 F1-score.
- Made a **2-minute cinematic short film** about MoodMap (on YouTube) — this is a unique personal artifact that can be used during the demo pitch to create emotional resonance with the judges.
- At Powerweave: built a production Speech Emotion Detection pipeline (Conv1D/BiLSTM/GRU, F1 0.86) on TESS, RAVDESS, CREMA-D, Surrey AV datasets. 300% dataset expansion via augmentation.
- At Mercedes-Benz: fine-tuned BERT for intent classification (F1 0.93), led YOLOv5-based automation.
- At Nokia: designed multi-agent AI frameworks with RAG, session/long-term memory.
- Presented on AI Safety at Google Dev Fest Bengaluru 2023 (700+ audience).
- Interests beyond code: cinematography, filmmaking, photography, 3D printing. Directed the world's only short film on Data Structures and Algorithms.

**The narrative arc:** Two years ago, Madhumitha built MoodMap on a gaming laptop because she felt AI was emotionally blind. She was right — she was just early. Setu is the project MoodMap was always trying to become, now that the tools have caught up.

---

## The Idea: Setu

### One-Line Pitch
An emotionally-aware intergenerational language bridge — not just a translator, but an emotional interpreter for the families that language has quietly been pulling apart.

### The Problem (deeply, authentically Indian)
Every Indian multigenerational family lives this gap. Grandparent speaks Kannada, Telugu, Tamil, Marathi, Bengali. Grandchild speaks English or Hindi. They love each other but the wall between them grows slowly, year by year — not from lack of love, but from lack of a shared language.

And it's not just words. It's emotional register. It's cultural subtext. Dadi says something with worry in her voice and it lands as nagging. The grandchild brushes it off in English and dadi hears coldness. Neither person meant what the other received. **The misunderstanding isn't linguistic — it's emotional.**

India has 22 official languages and hundreds of dialects. This problem lives in virtually every multigenerational Indian household.

### What Setu Does
Setu uses the Gemini Live API to watch and listen to a conversation between two people **continuously** — no turn-taking, no buttons, no waiting.

It:
1. **Translates in real time** across languages (Live Translate capability)
2. **Reads vocal tone and emotional register** — not just what is said, but *how* it is said (Live API's multimodal audio understanding)
3. **Surfaces subtext** — gentle overlays or voice notes like: *"She's not scolding you — she's scared"* / *"He's not being rude — he sounds exhausted and overwhelmed"*
4. **Adapts the bridge in real time** — if frustration or emotional shutdown is detected in either party, it reframes the translation to de-escalate before the conversation breaks

This is not a translator. **This is an emotional translator.** That category does not exist yet.

### Why It's Not Just a Chatbot
- The Live API runs continuously — it doesn't wait to be queried
- It responds to things neither person has explicitly said — it notices emotional undercurrents from vocal tone, pace, pitch, and visual cues
- The value is in the *relationship* it enables, not the output it generates
- Removing the live feed degrades the product entirely — it cannot work as a chatbox

### The Emotional Angle (important for the pitch)
Setu isn't just technically interesting. It's warm. The pitch should open with the MoodMap short film (2 minutes), framing the human journey: *"I've spent years trying to make AI understand how people feel. Today I get to build the thing I always wanted to build."*

This gives judges a protagonist with a journey — not a coder showing off a demo, but a person who genuinely believes AI should be emotionally intelligent and has been working toward that for years.

---

## Technical Stack (to be built during hackathon)

**Core:**
- Gemini Live API (primary) — continuous multimodal audio + video stream
- Live Translate — real-time cross-language translation
- Gemini's native emotion/tone understanding from audio (no custom model needed — Live API handles this)

**Supporting:**
- Python backend (FastAPI or lightweight server)
- Minimal frontend — clean, warm UI focused on the two people and the bridge between them (not a dashboard)
- WebRTC or browser mic/camera feed into Live API

**What NOT to build:**
- A custom emotion classifier (MoodMap was the prototype; Gemini Live API now does this natively and better)
- A RAG layer (not needed here)
- A Streamlit UI (explicitly banned and wrong vibe for this project)

---

## Demo Flow (3 minutes)
1. Two people (or one person + judge volunteer) begin a conversation in different languages
2. Setu's bridge activates — translations appear/speak in real time
3. One person shifts tone — speaks with frustration or worry — Setu surfaces the subtext overlay
4. Show the moment the other person *understands* something they would have missed
5. Close: *"This is what I built MoodMap for. AI that doesn't just translate words — it translates people."*

---

## What to Ask an AI Assistant
When using this document to get help from an AI (Claude, ChatGPT, Gemini, etc.), you can ask for:
- Architecture design and API integration help (Gemini Live API, WebRTC setup)
- Frontend UI/UX ideas that feel warm, not clinical
- How to structure the subtext/emotion overlay in real time
- Demo script and pitch narrative refinement
- Debugging help during the build
- Suggestions for what to cut if time is short (MVP scoping)

Always remind the AI: **6.5 hours total build time, one person (or small team), must be demo-ready, must feel warm not techy, must push Live API's true multimodal potential.**
