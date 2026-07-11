# How to Run Setu

*Complete setup, run, and demo guide — step by step.*
*Author: Madhumitha Kolkar | July 11, 2026*

---

## Step 1 — Get Your API Key

**Where to get it:**
1. Go to **Google AI Studio**: https://aistudio.google.com
2. Sign in with the Google account provisioned for you at the hackathon
3. Click **"Get API key"** in the top-left or go to https://aistudio.google.com/apikey
4. Click **"Create API key"** → copy the key (starts with `AIza...`)

**What you need:**
- A single Gemini API key
- The key must have access to `gemini-2.5-flash-live-preview` (Live API)
- If Live API access is missing, ping `@Google DeepMind` in Discord `#questions` immediately

---

## Step 2 — Set Up the Project

Open a terminal. Run these commands from inside the `SETU/` folder.

### 2a. Create a Python virtual environment (recommended)
```bash
cd /path/to/SETU
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

Now open `.env` in any editor and replace `your_gemini_api_key_here` with your actual key:
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
Open a second terminal tab and run:
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

If `api_key_configured` is `false` — check that your `.env` file is saved correctly and that you ran `python main.py` from inside the `backend/` folder.

---

## Step 4 — Open the App

1. Open **Google Chrome** (required — best WebRTC/audio support)
2. Go to: **http://localhost:8000**
3. You should see the Setu interface with the Sanskrit header सेतु

---

## Step 5 — Run a Test

1. Select two languages (e.g. **English** ↔ **Hindi**)
2. Click **"Start Bridge"**
3. Chrome will ask for microphone permission — click **Allow**
4. The status dot turns green: *"Bridge live: English ↔ Hindi"*
5. Speak into your mic in English
6. You should hear a Hindi translation through your speakers within ~1–2 seconds
7. The translation also appears as text in the transcript panel

### Test the emotion / subtext layer
Try speaking with a worried or urgent tone:
- *"Did you eat? Are you sure? You really ate?"* (in a concerned, slightly strained voice)
- Watch for the golden `✦` notice to appear: *"She sounds worried, not just asking"*

Try speaking warmly and plainly:
- *"I'll be home by 7."*
- No notice should appear — Setu is selective

---

## Step 6 — Demo Run (3-minute flow)

This is the exact order to follow for the hackathon demo:

| Time | What to do |
|---|---|
| 0:00 | Open Setu fullscreen (F11 in Chrome), show the interface |
| 0:20 | Narrate the problem: *"Every Indian family has this gap..."* |
| 0:45 | Select Hindi ↔ English. Click Start Bridge. |
| 1:00 | Speak a worried sentence in English — show the translation + Setu notice |
| 1:30 | Speak a warm sentence — show just the translation (no notice — selective) |
| 2:00 | Speak with frustration/tiredness — show another subtext notice |
| 2:30 | Pause. Let judges read the notice. Then: *"This is what I built MoodMap for."* |
| 2:50 | Close: *"Setu. A bridge between the people you love."* |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: google.genai` | Run `pip install -r requirements.txt` again |
| `GEMINI_API_KEY not set` | Check `.env` file exists in `SETU/` and key is correct |
| `gemini-2.5-flash-live-preview not found` | Try model name `gemini-2.5-flash-live` (without `-preview`) in `setu_agent.py` line 24 |
| Affective Dialog config error | Remove `api_version="v1alpha"` and `enable_affective_dialog=True` from `setu_agent.py` — translation still works |
| Chrome mic not working | Go to `chrome://settings/content/microphone` — make sure localhost is allowed |
| No audio output | Make sure system volume is up; check Chrome isn't blocking autoplay |
| WebSocket connection refused | Make sure the backend is running (`python main.py`) before opening the browser |
| `[Setu notices]` overlay never appears | Try speaking with more emotional intensity, or loosen the prompt in `backend/prompts.py` |
| Translations sound robotic | In `backend/prompts.py`, add more warmth instruction to the TRANSLATE section |

---

## File Map (What Is Where)

```
SETU/
├── backend/
│   ├── main.py          ← FastAPI server, WebSocket endpoint
│   ├── setu_agent.py    ← Gemini Live API session logic
│   └── prompts.py       ← System prompt — tune this for better emotion surfacing
├── frontend/
│   ├── index.html       ← App shell
│   ├── style.css        ← Visual design
│   └── app.js           ← Audio pipeline and UI logic
├── .env.template        ← Copy to .env and add your API key here
├── .env                 ← YOUR KEY GOES HERE (never commit this)
├── .gitignore
├── requirements.txt
├── README.md
└── How_to_run.md        ← You are here
```

---

## Making the Repo Public (Before Submission)

1. Push your code:
```bash
git init
git add .
git commit -m "Setu — emotional language bridge for Google DeepMind Hackathon"
git remote add origin https://github.com/MadhumithaKolkar/setu-bridge.git
git push -u origin main
```

2. Go to your GitHub repo → **Settings** → scroll to **Danger Zone** → **Change visibility** → **Make public**

3. Double-check: your `.env` file is NOT in the repo (`.gitignore` handles this, but always verify)

---

## Submission Checklist

- [ ] GitHub repo is public
- [ ] README explains what Setu is and how to run it
- [ ] 1-minute demo video recorded (Loom or QuickTime screen record)
- [ ] Demo video link is publicly accessible
- [ ] Submitted at: https://cerebralvalley.ai/e/google-deepmind-bangalore-hackathon/hackathon/submit
