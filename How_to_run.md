# How to Run Setu

*Complete setup, run, and demo guide — step by step.*
*Author: Madhumitha Kolkar*

---

## Step 1 — Get Your API Key

**Where to get it:**
1. Go to **Google AI Studio**: https://aistudio.google.com
2. Sign in with your Google account
3. Click **"Get API key"** in the top-left or go to https://aistudio.google.com/apikey
4. Click **"Create API key"** → copy the key (starts with `AIza...`)

**What you need:**
- A single Gemini API key with access to the Live API (`v1alpha`) and the `gemini-2.5-flash-native-audio-latest` model, which is required for Affective Dialog (native vocal-tone reading)

---

## Step 2 — Set Up the Project

Open a terminal in the repo root (where `backend/`, `frontend/`, and `requirements.txt` live).

### 2a. Create a Python virtual environment (recommended)
```bash
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows
```

### 2b. Install dependencies
```bash
pip install -r requirements.txt
```

### 2c. Create your `.env` file
```bash
cp .env.template .env
```

Open `.env` and replace `your_gemini_api_key_here` with your actual key:
```
GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

Save the file. **Never commit `.env` to GitHub** — `.gitignore` already excludes it.

---

## Step 3 — Run the Backend

```bash
cd backend
python main.py
```

You should see:
```
🌉 Starting Setu...
   Open your browser at: http://localhost:8000
   Health check at:      http://localhost:8000/health
```

### Verify it's working
```bash
curl http://localhost:8000/health
```
Expected response:
```json
{
  "status": "ok",
  "api_key_configured": true,
  "message": "Setu is ready."
}
```
If `api_key_configured` is `false` — check that `.env` exists in the repo root (one level above `backend/`) and the key is correct.

---

## Step 4 — Open the App

1. Open **Google Chrome** (required — best WebRTC/audio support)
2. Go to **http://localhost:8000**
3. You should see the सेतु interface, with Person A and Person B side by side (defaults to Kannada ↔ English — change via the dropdowns if needed)

---

## Step 5 — Run a Test

1. Click **"Start Bridge"** and allow microphone access when Chrome asks
2. The status dot turns green: *"Bridge live: [Language A] ↔ [Language B]"*
3. Speak a sentence in Person A's language
4. Within a couple of seconds you should hear the translated reply spoken aloud, see it typed into Person A's column, and see the tone banner above that column update to *"Setu feels: ..."*
5. Speak in Person B's language — it routes to Person B's column the same way

### Test the emotional-tone layer
Say something where the words and your tone don't match, e.g. (in a strained, worried voice):
> *"You didn't even eat anything, you just left like that."*

The tone banner should read something like *"Setu feels: She sounds angry, but she's just concerned — talk to her gently."* — Setu reports a tone on every single utterance, not just tense ones; calm, plain speech gets something like *"Calm and neutral — nothing to read into here."*

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: google.genai` | Run `pip install -r requirements.txt` again |
| `GEMINI_API_KEY not set` | Check `.env` exists in the repo root and the key is correct |
| Model not found / Live API errors on connect | Confirm your key has access to `gemini-2.5-flash-native-audio-latest` under `v1alpha` — this is set in `backend/setu_agent.py` |
| `APIError 1011: Internal error occurred` | A transient error on Google's preview model, not a bug in this code — the backend automatically opens a fresh session and recovers within ~1 second. If it persists across many consecutive attempts, wait a moment and retry |
| Chrome mic not working | Go to `chrome://settings/content/microphone` — make sure `localhost` is allowed |
| No audio output | Check system volume and that Chrome isn't blocking autoplay |
| WebSocket connection refused | Make sure the backend is running (`python main.py`) before opening the browser |
| Tone banner never updates | Speak a longer, clearer sentence and pause for a full second afterward — Setu waits for a pause before responding. Tune the `report_tone` instructions in `backend/prompts.py` if it's still too quiet |
| Translations sound robotic | In `backend/prompts.py`, strengthen the warmth instruction in the TRANSLATE section |

---

## File Map

```
(repo root)
├── backend/
│   ├── main.py          ← FastAPI server, WebSocket endpoint
│   ├── setu_agent.py    ← Gemini Live API session logic (per-turn session recycling, report_tone tool)
│   └── prompts.py       ← System prompt — tune this for translation warmth / tone-reporting style
├── frontend/
│   ├── index.html       ← App shell — two person-columns with tone banners
│   ├── style.css        ← Visual design
│   └── app.js            ← Audio pipeline, WebSocket handling, UI routing by speaker
├── .env.template         ← Copy to .env and add your API key here
├── .env                  ← YOUR KEY GOES HERE (never commit this)
├── .gitignore
├── requirements.txt
├── README.md
└── How_to_run.md         ← You are here
```

---

## Submission Checklist

- [ ] GitHub repo is public
- [ ] README explains what Setu is and how to run it
- [ ] 1-minute demo video recorded (live, unedited — multiple takes is fine, heavy editing is not)
- [ ] Demo video link is publicly accessible
- [ ] `.env` is NOT in the repo (`.gitignore` handles this, but verify with `git ls-files | grep .env`)
