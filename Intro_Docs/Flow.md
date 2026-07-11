# Setu — Hackathon Day Flow
*Everything you need, in order. Read this on the new laptop before you start.*

---

## Part 1 — New Laptop Setup
*Do this first, before anything else.*

### Apps to install

| App | Why | Download |
|---|---|---|
| **Python 3.10+** | Runs the backend | https://www.python.org/downloads/ |
| **Google Chrome** | Only browser with reliable Web Audio API support for the demo | https://www.google.com/chrome |
| **VS Code** | Code editor | https://code.visualstudio.com |
| **Git** | Version control | https://git-scm.com/downloads |
| **Loom** | Screen record the demo video in one click | https://www.loom.com/download |

### Verify installs (open Terminal and run these)
```bash
python3 --version      # must say 3.10 or higher
git --version          # any version fine
```

### Chrome settings to check
- Go to `chrome://settings/content/microphone` — make sure microphone is **not blocked**
- Chrome must be set as your default browser for the demo

---

## Part 2 — Transfer the Project
*Get the SETU folder onto the new laptop.*

**Easiest options (pick one):**
- Copy via USB drive
- AirDrop (Mac to Mac)
- Upload to Google Drive from this laptop, download on the new one

**What to transfer — the full SETU folder:**
```
SETU/
├── backend/
│   ├── main.py
│   ├── setu_agent.py
│   └── prompts.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.template
├── .gitignore
├── requirements.txt
└── README.md
```

Also transfer the **SUBMISSION/** and **IntroDocs/** folders — you'll need them for the demo script and submission details.

---

## Part 3 — Create the GitHub Repo
*Keep it private until final submission.*

```bash
# On the new laptop, navigate to wherever you put the SETU folder
cd /path/to/SETU

# Initialise git
git init
git add .
git commit -m "Initial commit — Setu emotional language bridge"
```

Then on GitHub (github.com):
1. Click **New repository**
2. Name: `setu-bridge`
3. Set to **Private**
4. Do NOT initialise with README (you already have one)
5. Copy the remote URL it gives you

```bash
# Back in terminal
git remote add origin https://github.com/MadhumithaKolkar/setu-bridge.git
git branch -M main
git push -u origin main
```

**Do not push again until you're ready to submit.** Code stays private and local until 4:30 PM.

---

## Part 4 — Get the API Key & Run the App
*Follow How_to_run.md — these are the key steps.*

### 4a. Get your Gemini API key
1. Open Chrome → go to **https://aistudio.google.com**
2. Sign in with the Google account provisioned at the hackathon
3. Click **"Get API key"** → **"Create API key"** → copy it (starts with `AIza...`)

### 4b. Set up the environment
```bash
cd /path/to/SETU

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.template .env
```

Open `.env` in VS Code and replace `your_gemini_api_key_here` with your actual key:
```
GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

### 4c. Run the app
```bash
cd backend
python main.py
```

Open Chrome → `http://localhost:8000`

Run the health check to confirm everything is working:
```bash
curl http://localhost:8000/health
# Should return: "api_key_configured": true
```

---

## Part 5 — Tune & Test
*This is your creative build time during the hackathon.*

**The one file you'll be editing:** `SETU/backend/prompts.py`

Tune the system prompt until the emotional subtext surfaces naturally and warmly.

**Test scenarios:**
- Speak with worry/urgency → Setu notice should appear
- Speak warmly and plainly → no notice (model should be selective)
- Try Hindi ↔ English, then another Indian language pair

**If the model never surfaces subtext** — loosen the prompt, add:
> *"Pay close attention to vocal tone. A strained or urgent voice often carries more than the words."*

**If it surfaces subtext too often** — tighten the prompt, add:
> *"Only surface subtext when it would genuinely change how the listener receives the words. When in doubt, omit it."*

Full troubleshooting table in `SETU/How_to_run.md`.

---

## Part 6 — Final Push to GitHub
*Do this at ~4:15 PM — after building, before recording the video.*

### 6a. Swap in the proper README
Copy the GitHub README from the SUBMISSION folder:
```bash
cp /path/to/SUBMISSION/README_github.md /path/to/SETU/README.md
```

### 6b. Make sure .env is NOT included
```bash
# Confirm .env is gitignored
cat /path/to/SETU/.gitignore   # should list .env

# Double-check it won't be staged
git status   # .env must NOT appear in the list
```

### 6c. Stage and push
```bash
cd /path/to/SETU
git add .
git status   # read this carefully — confirm .env is absent
git commit -m "Setu — Google DeepMind Bangalore Hackathon submission"
git push
```

### 6d. Make the repo public
1. Go to your GitHub repo → **Settings**
2. Scroll to **Danger Zone**
3. **Change visibility** → **Make public**
4. Confirm

### 6e. Verify
Open the repo URL in an **incognito window** — confirm it loads without login.

---

## Part 7 — Record the Demo Video
*1 minute max. Do this at ~4:20 PM.*

**Using Loom (recommended — instant public link):**
1. Open Loom → **New Recording**
2. Select **Screen + Camera**
3. Record yourself doing the demo flow from `SUBMISSION/demo_script.md`
4. Stop recording → Loom gives you an instant shareable link
5. Copy the link

**Using QuickTime (alternative):**
1. QuickTime → File → New Screen Recording
2. Record the demo
3. Upload to YouTube as **Unlisted** → copy the link

---

## Part 8 — Submit
*Do this at ~4:40 PM. Don't leave it to the last minute.*

Submission URL: **https://cerebralvalley.ai/e/google-deepmind-bangalore-hackathon/hackathon/submit**

Fill in using details from `SUBMISSION/submission_details.md`:
- **Project name:** Setu
- **Track:** Track 2 — Gemini Live API & Live Translate
- **Description:** copy from submission_details.md
- **GitHub link:** your public repo URL
- **Demo video link:** your Loom or YouTube link

### Before hitting submit — verify in incognito:
- [ ] GitHub repo opens without login
- [ ] Demo video plays without login
- [ ] README looks correct on the GitHub page

---

## Part 9 — The Live Demo
*5:00 – 6:45 PM. Full script in `SUBMISSION/demo_script.md`.*

Quick reminders:
- App open at `localhost:8000`, fullscreen (F11), transcript cleared
- Backend running in a terminal window (keep it open, don't close it)
- Languages pre-set to your demo pair
- Second person ready for the two-party exchange
- When the Setu notice appears — **point at it, pause, don't explain it**

---

## Pages to Keep Open During the Hackathon

| Page | Why |
|---|---|
| `http://localhost:8000` | The running app |
| `http://localhost:8000/health` | Quick sanity check if something feels off |
| https://aistudio.google.com | API key, model info |
| https://ai.google.dev/gemini-api/docs/live | Live API reference if you hit issues |
| https://github.com/google-gemini/cookbook | Code examples for the Live API |
| Discord `#questions` channel | Ping @Google DeepMind for API access issues |
| `SUBMISSION/demo_script.md` | Your demo script |
| `SETU/How_to_run.md` | Troubleshooting |

---

## The Full Day in One View

```
9:00 AM   Arrive. Breakfast. Find a table. Settle in.
9:00–10:00  Part 1 + 2 + 3 — Laptop setup, transfer files, create GitHub repo
10:00–10:30  Part 4 — Get API key, install dependencies, run health check
10:30 AM  Hackathon officially starts
10:30–1:00  Part 5 — Build, tune prompts, test emotion surfacing
1:00–1:30  Lunch. Step away. Rest your brain.
1:30–3:00  Part 5 continued — more tuning, test language pairs
3:00–3:15  Final code check. Stop adding features.
3:15–4:15  Rehearse the demo 5+ times end to end
4:15 PM   Part 6 — Final git push, README swap, make repo public
4:20 PM   Part 7 — Record demo video (Loom)
4:40 PM   Part 8 — Submit the form
4:50 PM   Verify both links in incognito
5:00 PM   Submissions close. You're done building.
5:00–6:45  First round judging — your live demo
7:00–8:00  Finals (if you make it)
8:15 PM   Winners announced
```

---

*Read the demo script tonight. Sleep well. Tomorrow is just execution.*
