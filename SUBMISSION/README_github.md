# सेतु &nbsp;/&nbsp; Setu

*A bridge between the people you love.*

---

Two years ago I built a project called MoodMap - a multimodal emotion recognition system I trained on a gaming laptop with 5,000 audio samples from Kaggle. The whole point was simple: I felt that AI could hear what people were saying but not *how* they were saying it. I wanted to fix that.

I never got to take it further than a POC.

Today I did :D

---

## What is Setu?

Setu (Sanskrit: सेतु, *bridge*) is a real-time emotional language interpreter built on the Gemini Live API.

It listens continuously to two people having a conversation in different languages. It translates. But it also does something no standard translator does — it pays attention to the feeling underneath the words, and when what someone *says* and how they *say it* don't match, it quietly names that gap.

*"She sounds worried, not angry."*
*"He's asking because he cares."*

---

## Why this exists

Every Indian family I know has some version of this. A grandparent who speaks Telugu or Tamil or Kannada. A grandchild who grew up speaking English. They love each other. But year by year, the conversations get shorter because the effort gets harder.

And the problem isn't just vocabulary. It's register. It's tone. It's the way worry in one language lands as criticism in another. Dadi says something with fear in her voice and it gets translated flat, and the warmth disappears somewhere between the languages.

Setu tries to carry that warmth across.

---

## How it works

```
You speak
    ↓
Gemini Live API listens — not just to the words but to the tone, pace, and weight of your voice
    ↓
It translates into the other language, naturally, the way a person would
    ↓
If it hears something beneath the surface — worry, hurt, exhaustion masked as something else —
it surfaces it gently on screen
    ↓
The other person hears the translation and sees what Setu noticed
```

No button pressing. No typing. No turn-taking. Just a conversation, with a bridge in the middle.

---

## Tech

- **Gemini 2.5 Flash Live** — continuous multimodal audio stream with Affective Dialog (`enable_affective_dialog: true`), which lets the model adapt to the emotional tone of a speaker's voice rather than just the literal content
- **Live Translate** — real-time cross-language translation built into the Live API
- **FastAPI** — lightweight Python backend, WebSocket bridge between browser and Gemini
- **Web Audio API** — raw PCM mic capture at 16kHz, PCM playback at 24kHz, no external libraries

---

## Run it yourself

**Requirements:** Python 3.10+, a Gemini API key with Live API access

```bash
git clone https://github.com/MadhumithaKolkar/setu-bridge
cd setu-bridge

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

cp .env.template .env
# open .env and paste your Gemini API key

cd backend
python main.py
```

Open **Chrome** at `http://localhost:8000`, allow mic access, select two languages, click Start Bridge.

Full setup guide in [How_to_run.md](How_to_run.md).

---

## Languages supported

Hindi, English, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Punjabi, Malayalam — and the Gemini Live API supports 70 languages total, so the dropdown is easy to extend.

---

## Built at

Google DeepMind × Cerebral Valley Bangalore Hackathon, July 2026.
Track 2 — Gemini Live API & Live Translate.

---

## About me

I'm Madhumitha - a machine learning engineer who has spent the last few years working on speech, emotion, and multimodal AI. I made a two-minute short film about MoodMap once. I believe the most interesting thing AI can do is understand not just what people say, but what they mean.

Emotions are what make us human, and if AI can understand that and bridge the gap between us and the humans we love, isn't that a win for humanity ?

[LinkedIn](https://linkedin.com/in/madhumithakolkar) &nbsp;·&nbsp; [GitHub](https://github.com/MadhumithaKolkar)
