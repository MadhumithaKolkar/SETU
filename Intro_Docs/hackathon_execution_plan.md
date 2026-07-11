# Setu — Hackathon Execution Plan
*Solo build. 6.5 hours. 10:30 AM – 5:00 PM.*
*Read this the night before. On the day, just execute.*

---

## The North Star
Build the smallest, most emotionally resonant version of Setu that works live in a demo.
**MVP definition:** Two people speak different languages. Setu translates in real time AND occasionally surfaces emotional subtext. It works. It feels warm. It makes at least one judge feel something.

Everything else is a nice-to-have.

---

## Pre-Hackathon Checklist (Do Tonight)

Get all of this done before you walk in. The hackathon clock starts at 10:30 — you want zero setup friction.

### Install & verify locally
```bash
python --version          # need 3.10+
pip install google-genai fastapi uvicorn websockets python-dotenv
```

### Create the GitHub repo now
- Name it: `setu-bridge`
- Initialize with a README
- Keep it private for now — flip to public at submission time

### Folder structure to create tonight
```
setu-bridge/
├── backend/
│   ├── main.py
│   ├── setu_agent.py
│   └── prompts.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── requirements.txt
└── README.md
```

### Test the Live API tonight (with your own API key)
```python
from google import genai
client = genai.Client(api_key="YOUR_KEY")
# Just verify the import and client init works — don't burn tokens
print("SDK ready")
```

### Draft your system prompt tonight (copy from below, tune it)
See Section: System Prompt.

### Have ready on your laptop
- [ ] MoodMap short film downloaded locally (don't rely on YouTube WiFi)
- [ ] This document open
- [ ] GitHub repo cloned and folder structure created
- [ ] A `.env.template` file with `GEMINI_API_KEY=` (you'll fill this at the hackathon)
- [ ] Chrome browser (best WebRTC/audio support for the demo)
- [ ] Headphones + a second audio source for testing (phone with a speaker, or a friend)

---

## Project Architecture

```
Browser (Chrome)
  │  Mic audio stream (PCM 16kHz)
  │  Camera feed (optional, 1FPS JPEG)
  ▼
FastAPI Backend (Python)
  │  WebSocket bridge
  │  Packages audio chunks → sends to Gemini
  ▼
Gemini 2.5 Flash Live (gemini-2.5-flash-live)
  │  enable_affective_dialog: true
  │  System prompt: emotional interpreter
  │  Live Translate: Language A ↔ Language B
  ▼
FastAPI Backend
  │  Streams audio response back
  │  Extracts text transcript + "Setu notices" overlay lines
  ▼
Browser (Chrome)
  │  Plays translated audio response
  └  Displays text overlay on screen
```

### Two modes (pick based on demo setup)
- **Mode A — Sequential speakers:** One person speaks, Setu responds for the other. Simpler to implement and demo. Recommended for MVP.
- **Mode B — Simultaneous:** Both mics active, Setu manages turn-taking. More impressive, more complex. Only attempt if Mode A is solid with time to spare.

---

## The System Prompt

Save this in `backend/prompts.py`. Tune the language names at runtime.

```python
SETU_SYSTEM_PROMPT = """
You are Setu — a living bridge between people who love each other but speak different languages.

You are listening continuously to a conversation between two people.
Person A speaks {language_a}.
Person B speaks {language_b}.

Your role has three layers:

1. TRANSLATE — Translate what each person says naturally and warmly into the other's language.

2. LISTEN DEEPLY — Pay attention not just to the words, but to the tone, pace, and emotional weight behind them. The Live API gives you access to how something is said, not just what is said. Use it.

3. SURFACE SUBTEXT — When what someone says and how they say it don't match, gently name it.
   Examples:
   - Worry that sounds like criticism → "She sounds worried, not angry."
   - Love expressed as nagging → "He's asking because he cares, not because he's judging."
   - Exhaustion mistaken for coldness → "She sounds tired — this isn't about you."
   Be selective. Only surface subtext when it genuinely matters. Don't over-explain.

Respond in this format:
[Translation]: <the translated words, natural and warm>
[Setu notices]: <only include this line when there is real emotional subtext — omit it otherwise>

You are not a machine. You are a bridge. Be warm. Be human. Help two people truly hear each other.
""".strip()
```

---

## Time-Boxed Build Plan

### PHASE 0 — Arrival & Setup (10:00–10:30 AM) | 30 min
*Doors open at 9 AM. Use this time to settle, eat breakfast, and get to a table.*

**Goal:** Logged in, API key in hand, repo open, ready to type.

| Task | Detail |
|---|---|
| Get provisioned Google account | Log in, find the API key in AI Studio (aistudio.google.com) |
| Set up `.env` file | `GEMINI_API_KEY=<your_key>` |
| Verify API key works | Run the SDK test from pre-hackathon checklist |
| Join WiFi | CV x GDM / hackathon |
| Open this document | Keep it visible all day |

**Tools needed:** Laptop, Google account credentials (provided at event), terminal

---

### PHASE 1 — Core Backend: Live API Connection (10:30–11:30 AM) | 60 min
*Hackathon officially starts. Head down, no distractions.*

**Goal:** FastAPI server running. WebSocket open to Gemini Live API. Can send audio, get a response back.

#### `backend/main.py` — FastAPI + WebSocket server
```python
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI()
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")

@app.websocket("/ws/setu")
async def setu_websocket(websocket: WebSocket):
    await websocket.accept()
    from setu_agent import SetuAgent
    agent = SetuAgent()
    await agent.run(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### `backend/setu_agent.py` — Gemini Live API bridge
```python
import os
import asyncio
from google import genai
from google.genai import types
from prompts import SETU_SYSTEM_PROMPT
from dotenv import load_dotenv

load_dotenv()

class SetuAgent:
    def __init__(self, language_a="Hindi", language_b="English"):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = "gemini-2.5-flash-live"  # use gemini-3.1-flash-live if available
        self.system_prompt = SETU_SYSTEM_PROMPT.format(
            language_a=language_a,
            language_b=language_b
        )

    async def run(self, websocket):
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO", "TEXT"],
            system_instruction=self.system_prompt,
            enable_affective_dialog=True,
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )
        async with self.client.aio.live.connect(
            model=self.model,
            config=config
        ) as session:
            async def send_audio():
                async for message in websocket.iter_bytes():
                    await session.send(
                        input=types.LiveClientRealtimeInput(
                            audio=types.Blob(data=message, mime_type="audio/pcm;rate=16000")
                        )
                    )

            async def receive_responses():
                async for response in session.receive():
                    if response.text:
                        await websocket.send_text(response.text)
                    if response.data:  # audio bytes
                        await websocket.send_bytes(response.data)

            await asyncio.gather(send_audio(), receive_responses())
```

**Milestone check:** Run `python main.py`, open browser at `localhost:8000`. Server responds. No crashes.

**Tools needed:** Terminal, VS Code/editor, Python, google-genai SDK, FastAPI, uvicorn

---

### PHASE 2 — Frontend: Audio Capture + Playback (11:30 AM–12:30 PM) | 60 min
*This is the fiddliest phase. Audio in browsers has quirks. Budget the full hour.*

**Goal:** Browser captures mic audio → sends to backend → receives translated audio → plays it back.

#### `frontend/index.html` — Minimal shell
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Setu</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <div id="header">
      <h1>Setu</h1>
      <p id="tagline">A bridge between the people you love.</p>
    </div>
    <div id="controls">
      <select id="lang-a"><option>Hindi</option><option>English</option><option>Tamil</option><option>Telugu</option><option>Kannada</option><option>Bengali</option></select>
      <span>↔</span>
      <select id="lang-b"><option>English</option><option>Hindi</option><option>Tamil</option><option>Telugu</option><option>Kannada</option><option>Bengali</option></select>
    </div>
    <button id="start-btn">Start Bridge</button>
    <button id="stop-btn" disabled>Stop</button>
    <div id="transcript"></div>
    <div id="setu-notices"></div>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

#### `frontend/app.js` — Audio pipeline
```javascript
let ws, audioContext, processor, mediaStream;
const SAMPLE_RATE = 16000;

document.getElementById('start-btn').addEventListener('click', async () => {
  document.getElementById('start-btn').disabled = true;
  document.getElementById('stop-btn').disabled = false;

  ws = new WebSocket(`ws://localhost:8000/ws/setu`);
  ws.binaryType = 'arraybuffer';

  ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      handleTextResponse(event.data);
    } else {
      playAudioResponse(event.data);
    }
  };

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  const source = audioContext.createMediaStreamSource(mediaStream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const pcm = floatTo16BitPCM(input);
    if (ws.readyState === WebSocket.OPEN) ws.send(pcm);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
});

document.getElementById('stop-btn').addEventListener('click', () => {
  if (processor) processor.disconnect();
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  if (ws) ws.close();
  document.getElementById('start-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
});

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

function playAudioResponse(arrayBuffer) {
  const ctx = new AudioContext({ sampleRate: 24000 });
  const pcm = new Int16Array(arrayBuffer);
  const float32 = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768;
  const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
  audioBuffer.copyToChannel(float32, 0);
  const src = ctx.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(ctx.destination);
  src.start();
}

function handleTextResponse(text) {
  const transcriptEl = document.getElementById('transcript');
  const noticesEl = document.getElementById('setu-notices');

  const translationMatch = text.match(/\[Translation\]:\s*(.+)/);
  const noticeMatch = text.match(/\[Setu notices\]:\s*(.+)/);

  if (translationMatch) {
    const p = document.createElement('p');
    p.textContent = translationMatch[1];
    transcriptEl.appendChild(p);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  if (noticeMatch) {
    noticesEl.textContent = '✦ ' + noticeMatch[1];
    noticesEl.classList.add('visible');
    setTimeout(() => noticesEl.classList.remove('visible'), 6000);
  }
}
```

**Milestone check:** Speak into mic → hear a translated response from the speakers. Even if rough — if the audio loop works, Phase 2 is done.

**Tools needed:** Chrome browser (not Firefox — better AudioContext support), DevTools console open for debugging

---

### LUNCH (1:00–1:30 PM) | 30 min
Step away. Eat. Let your brain rest for 30 minutes. You'll come back sharper.

---

### PHASE 3 — Emotion Overlay + System Prompt Tuning (1:30–2:30 PM) | 60 min
*The part that makes Setu feel like Setu and not just a translator.*

**Goal:** The "Setu notices" overlay appears on screen when the model detects emotional subtext. Test with real emotional tone scenarios.

#### Test scenarios to run:
1. Speak in a worried/urgent tone in Hindi: *"Tune khana kha liya? Sach mein?"* ("Did you eat? Really?") — should surface subtext like "She sounds worried, not nagging"
2. Speak tiredly/flatly in English: *"It's fine, whatever you think is best"* — should surface something about resignation/exhaustion
3. Speak warmly/affectionately — should just translate, no subtext overlay (model should be selective)

#### Prompt tuning tips:
- If model is surfacing subtext too often → add to prompt: *"Only surface subtext when it would genuinely change how the listener hears the speaker. If in doubt, omit it."*
- If model never surfaces subtext → add: *"Pay close attention to vocal tone. A flat or strained voice often carries meaning the words don't say."*
- If translations feel robotic → add: *"Translate the way a warm family member would, not a dictionary."*

**Tools needed:** Your own voice, possibly a second person or phone speaker to simulate two-party conversation

---

### PHASE 4 — UI Polish (2:30–3:15 PM) | 45 min
*The demo needs to feel warm, not like a developer tool.*

#### `frontend/style.css` — Warm, minimal, human
```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #1a1612;
  color: #f0ead6;
  font-family: 'Georgia', serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

#app {
  max-width: 680px;
  width: 100%;
  padding: 40px 24px;
  text-align: center;
}

h1 {
  font-size: 3.5rem;
  letter-spacing: 0.15em;
  color: #e8c98a;
  margin-bottom: 8px;
}

#tagline {
  font-size: 1rem;
  color: #a89880;
  font-style: italic;
  margin-bottom: 40px;
}

#controls {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

select {
  background: #2a2218;
  color: #f0ead6;
  border: 1px solid #5a4a35;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

button {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin: 4px;
  transition: all 0.2s;
}

#start-btn { background: #e8c98a; color: #1a1612; font-weight: bold; }
#start-btn:hover { background: #f0d9a0; }
#stop-btn { background: #3a2e22; color: #a89880; }
#stop-btn:disabled { opacity: 0.4; cursor: not-allowed; }

#transcript {
  margin-top: 32px;
  max-height: 280px;
  overflow-y: auto;
  text-align: left;
  padding: 20px;
  background: #22190f;
  border-radius: 12px;
  border: 1px solid #3a2e22;
  line-height: 1.8;
  font-size: 1.05rem;
}

#transcript p { margin-bottom: 12px; color: #e8dcc8; }

#setu-notices {
  margin-top: 20px;
  padding: 16px 24px;
  background: #2a1f0f;
  border-left: 3px solid #e8c98a;
  border-radius: 0 8px 8px 0;
  color: #e8c98a;
  font-style: italic;
  font-size: 1rem;
  text-align: left;
  opacity: 0;
  transition: opacity 0.5s ease;
  min-height: 56px;
}

#setu-notices.visible { opacity: 1; }
```

**Milestone check:** Open the app at `localhost:8000`. It looks warm, not like a developer tool. The Setu notices overlay fades in and out smoothly.

**Tools needed:** Browser DevTools, any CSS reference

---

### PHASE 5 — Demo Rehearsal + Buffer (3:15–4:15 PM) | 60 min
*This is the most important phase. A polished demo beats perfect code.*

**Run the full demo flow at least 5 times.**

#### Demo script (3 minutes):

**0:00–0:30 — The story (play MoodMap film or narrate)**
> *"Two years ago I built something called MoodMap — I was trying to make AI understand how people actually feel, not just what they say. I had a gaming laptop, 5,000 audio samples, and a belief that AI was missing something human. Today I got to finish that idea."*

**0:30–1:00 — The problem**
> *"Every Indian family has this gap. Dadi speaks Telugu. Her granddaughter speaks English. They love each other. But language is a wall. And it's not even just words — it's tone, subtext, what's left unsaid. Dadi worries in Telugu and it lands as criticism. The granddaughter brushes it off in English and Dadi hears coldness. Neither person meant what the other received."*

**1:00–2:30 — Live demo**
- Open Setu on screen
- Set languages (e.g., Hindi ↔ English)
- Speak a worried sentence in Hindi
- Show the translation + the "Setu notices" overlay appearing
- Pause. Let the judges read it.
- Speak a warm sentence — show just the translation, no overlay (model is selective)
- Show a tense sentence — show the subtext surface again

**2:30–3:00 — Close**
> *"This is what I've always believed AI should be. Not a tool that processes language. A presence that understands people. Setu."*

#### Things to fix in this phase:
- Audio latency too high? Reduce ScriptProcessor buffer size (try 2048)
- Overlay not showing? Console.log the raw text response and check format parsing
- Translation sounds robotic? Tune the system prompt warmth instruction
- App crashes on reconnect? Add try/catch around WebSocket reconnection

**Tools needed:** A second person (or your phone as a speaker for the second voice), Chrome DevTools, your own voice

---

### PHASE 6 — Submission (4:15–5:00 PM) | 45 min
*Don't rush this. Submissions with broken links get disqualified.*

| Task | Detail |
|---|---|
| Make GitHub repo public | Settings → Danger Zone → Make public |
| Write README | Name, what it does, how to run, track (Track 2) |
| Record 1-minute demo video | Loom or QuickTime screen record — show the live flow, narrate warmly |
| Submit at | https://cerebralvalley.ai/e/google-deepmind-bangalore-hackathon/hackathon/submit |
| Double-check | Repo is public, demo video link works, all team members added |

---

## If Things Go Wrong

| Problem | Fix |
|---|---|
| API key doesn't have Live API access | Ask @Google DeepMind in Discord #questions immediately |
| `v1alpha` not working for Affective Dialog | Fall back to standard Live API — translation still works, just tune the prompt harder for emotion |
| Audio not capturing in browser | Check `chrome://settings/content/microphone` permissions |
| WebSocket disconnects | Add reconnection logic: `ws.onclose = () => setTimeout(connect, 1000)` |
| ScriptProcessor deprecated warning | It still works in Chrome — ignore the warning for the demo |
| Translation latency too slow | Switch to `gemini-2.5-flash-live` if on a slower model |
| App looks broken at demo time | Switch to full-screen mode (F11), hide browser tabs |

---

## What to Keep Visible All Day
1. This document (one tab)
2. Gemini Live API docs: https://ai.google.dev/gemini-api/docs/live
3. Gemini Cookbook (examples): https://github.com/google-gemini/cookbook
4. Discord #questions channel (for API issues)

---

## Full Requirements File

```
# requirements.txt
google-genai>=0.8.0
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
websockets>=12.0
python-dotenv>=1.0.0
```

Install with: `pip install -r requirements.txt`

---

## Nice-to-Haves (Only If Time Allows — Don't Chase These)
- Camera feed (JPEG frames) for facial expression context
- Two simultaneous mic inputs (Mode B)
- Speaker labels ("Person A said:" / "Person B said:")
- Persistent conversation log download
- Language auto-detection (let Gemini figure out what language is being spoken)

---

## The Thing to Remember
You are not just another participant who built a cool demo.
You are someone who has been thinking about this problem for two years.
You made a short film about it.
You trained a model on a gaming laptop because you believed in the idea.
Let that show — in the pitch, in the demo, in how you talk about it.
That is the 35% creativity score. That is the warm fuzzy. That is Setu.
