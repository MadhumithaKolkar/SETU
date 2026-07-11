# Setu — Feasibility Check
*Research conducted: July 2026*

---

## TL;DR
The core idea is feasible, but with one important nuance: the emotion layer works differently than expected — and that's actually good news. No custom emotion classifier needed.

---

## What the Gemini Live API Can Do (Confirmed)

### 1. Continuous Real-Time Audio + Video Stream
- Accepts raw PCM audio (16kHz, 16-bit, little-endian) and images (up to 1FPS from video feed)
- Runs over a persistent **stateful WebSocket connection (WSS)**
- Continuous — not turn-by-turn. The model listens and watches at all times.
- This is the foundational capability Setu needs.

### 2. Affective Dialog ← Core Feature for Setu
- Available on **Gemini 2.5 Live** models via `v1alpha` API
- Enable with: `enable_affective_dialog: true` in session config
- Behavior: *"The model adapts its response style and tone to match the expression and tone of the input"*
- This means the model natively reads vocal tone and emotional register — without a separate classifier
- This is the Live API's closest native analogue to MoodMap's intent

### 3. Audio Emotion Classification
- Gemini's audio understanding (same model family) can classify: **happy, sad, angry, neutral**
- Also supports: speaker identification, non-speech sound understanding, multilingual processing, temporal analysis

### 4. Real-Time Translation — 70 Languages
- Live Translate is confirmed and built into the Live API
- 70 languages supported — almost certainly includes Hindi, Tamil, Telugu, Kannada, Bengali, Marathi (Google's Indian language coverage is extensive)
- Models can switch between languages naturally mid-conversation
- Language can be restricted via system instructions

### 5. Barge-In / Interruption Handling
- Users can interrupt mid-response at any time
- Makes the bridge feel like a real conversation, not a walkie-talkie
- Configurable via VAD parameters: `start_of_speech_sensitivity`, `end_of_speech_sensitivity`, `silence_duration_ms`

### 6. System Instructions Are Supported
- You can pass a system prompt to the Live API session
- This is the key architectural lever for Setu — you instruct the model to behave as an emotional interpreter, not just a translator
- Example system prompt direction:
  > *"You are Setu, an emotional bridge. You are continuously listening to two people speaking different languages. Translate what each person says. Identify if there is emotional subtext that differs from the literal meaning — worry masked as criticism, fatigue masked as rudeness, affection expressed as scolding. When you detect a gap between literal meaning and emotional intent, surface it gently: 'She sounds worried, not angry.' Be warm."*

### 7. Input/Output Transcription
- `input_audio_transcription` config gives you text of what was said
- Enables a visible subtext overlay on screen alongside the audio bridge
- Output audio transcription also available

### 8. Proactive Audio (Optional)
- Model can proactively decide not to respond if content is not relevant
- Useful for Setu — prevents the bridge from interjecting unnecessarily during pauses
- Requires `proactive_audio: true` in `v1alpha`

---

## The Key Nuance: Emotion Is Not a Raw Signal

The Live API does **not** expose a raw emotion classification score (e.g., "anger: 0.7, fear: 0.3") that you can intercept programmatically. Affective Dialog means the *model itself* reads tone and adapts — it is baked into the response, not a separate output stream.

**This is better for Setu.** It means:
- No need to build or run a separate emotion classifier (like MoodMap's LSTM-GRU-Conv1D)
- The subtext surfacing happens through **prompt engineering + Affective Dialog** working together
- The architecture is simpler, more reliable, and more demo-stable in a 6.5-hour window
- MoodMap was the prototype that proved the concept. Gemini 2.5 Live is the production version.

---

## Supported Models for Live API
| Model | Notes |
|---|---|
| `gemini-2.5-flash-live` (preview) | Best balance of speed + capability. Supports Affective Dialog. Recommended. |
| `gemini-3.1-flash-live` (preview) | Higher quality, also available |

*Note: Standard Gemini 2.5 Flash does NOT support the Live API — must use the `-live` variant.*

---

## Risk Assessment

| Component | Risk Level | Verdict |
|---|---|---|
| Real-time audio stream (WebSocket) | Low — confirmed, well-documented | ✅ Ready |
| Affective Dialog / tone reading | Low-Medium — confirmed, behavior depends on prompt quality | ✅ with good system prompt |
| Live Translate for Indian languages | Low — 70 languages, Google's Indian language support is strong | ✅ Very likely |
| Subtext overlay via system instructions | Low — system instructions confirmed supported | ✅ Ready |
| Emotion as a separate programmatic signal | High — not exposed as raw output | ⚠️ Not needed — handled by prompt |
| 6.5-hour build feasibility | Medium — WebSocket + audio pipeline has moving parts | ⚠️ Manageable with scoping |

---

## What This Means for the Build

**You do not need a custom emotion model.** The architecture is:

```
Live audio/video stream (both speakers)
        ↓
Gemini 2.5 Flash Live
  + enable_affective_dialog: true
  + system prompt as emotional interpreter
        ↓
Real-time translated speech output (Live Translate)
  + optional text overlay with subtext when emotional gap detected
```

The emotional intelligence is real — delivered through Affective Dialog + prompt engineering. That combination is cleaner and more reliable for a hackathon demo than a custom classifier pipeline.

---

## What to Verify on Hackathon Day
1. Confirm `v1alpha` API access is included in the provisioned Google accounts
2. Confirm specific Indian language support (test Hindi + one regional language immediately)
3. Test Affective Dialog with a tense/worried vocal tone — verify the model surfaces it differently than a neutral tone
4. Check latency on the Live stream — target under 1.5s end-to-end for demo to feel fluid

---

## Resources
- Live API Docs: https://ai.google.dev/gemini-api/docs/live
- Live API Guide: https://ai.google.dev/gemini-api/docs/live-guide
- Gemini API Audio: https://ai.google.dev/gemini-api/docs/audio
- Gemini Models List: https://ai.google.dev/gemini-api/docs/models
- Managed Agents Docs: https://ai.google.dev/gemini-api/docs/agents
- Gemini Cookbook: https://github.com/google-gemini/cookbook
