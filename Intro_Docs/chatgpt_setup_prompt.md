# ChatGPT Setup Prompt
*Copy everything inside the box below and paste it into ChatGPT on your other laptop.*

---

```
I need help setting up my laptop for a hackathon project I'm building today. 
The project is called Setu — a Python + FastAPI backend with a vanilla JS frontend. 
I need you to walk me through the full setup step by step, one thing at a time, 
and help me fix any errors that come up.

Here is everything about the setup:

---

WHAT THE PROJECT IS:
Setu is a web app with:
- A Python FastAPI backend that connects to the Gemini Live API over WebSockets
- A vanilla HTML/CSS/JS frontend served by FastAPI
- No database, no Docker, no complex infrastructure — just Python + a browser

---

WHAT I NEED INSTALLED (on macOS):

1. Python 3.10 or higher
   - Check if already installed: python3 --version
   - If not: download from https://www.python.org/downloads/
   - After install, verify: python3 --version

2. Git
   - Check: git --version
   - If not installed, macOS will prompt to install Xcode Command Line Tools — say yes
   - Verify: git --version

3. Google Chrome
   - Must use Chrome specifically (not Safari, not Firefox)
   - Download from https://www.google.com/chrome if not installed

4. VS Code (code editor)
   - Download from https://code.visualstudio.com if not installed
   - After install, open it and install the Python extension (search "Python" in Extensions)

5. Loom (for recording the demo video later)
   - Download from https://www.loom.com/download

---

PYTHON PACKAGES NEEDED:
Once Python is installed, I need to create a virtual environment and install these:

google-genai>=0.8.0
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
websockets>=12.0
python-dotenv>=1.0.0

The commands to do this (run inside the project folder):
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt

---

CHROME SETTINGS TO CHECK:
- Go to chrome://settings/content/microphone
- Make sure localhost is NOT blocked
- Microphone access must be allowed for the app to work

---

FOLDER STRUCTURE OF MY PROJECT (already written, just needs to run):
setu-bridge/
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

---

HOW TO RUN IT:
1. Copy .env.template to .env
2. Open .env and add the Gemini API key: GEMINI_API_KEY=AIza...
3. cd into the backend folder
4. Run: python main.py
5. Open Chrome at http://localhost:8000
6. Run health check: curl http://localhost:8000/health
   - Should return: {"status": "ok", "api_key_configured": true}

---

GIT SETUP:
I need to initialise a git repo and push to GitHub (repo not yet created):
  git init
  git add .
  git commit -m "Initial commit — Setu"
  git remote add origin https://github.com/MadhumithaKolkar/setu-bridge.git
  git branch -M main
  git push -u origin main

The repo should be PRIVATE until submission time.

---

COMMON ERRORS TO WATCH OUT FOR:
- "python3 not found" → Python not installed or not in PATH
- "pip not found" → use pip3 instead
- "ModuleNotFoundError: google.genai" → virtual environment not activated, run: source venv/bin/activate
- "Address already in use" on port 8000 → something else is on port 8000, kill it: lsof -ti:8000 | xargs kill
- Chrome mic blocked → fix in chrome://settings/content/microphone

---

Please start by checking what's already installed on my machine, 
then walk me through installing anything that's missing, one step at a time.
```
