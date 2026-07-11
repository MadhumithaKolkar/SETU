/**
 * Author: Madhumitha Kolkar
 * Date: July 11, 2026
 * Description: Setu frontend audio pipeline.
 *   - Captures mic audio via Web Audio API
 *   - Converts to raw 16-bit PCM at 16kHz (what Gemini Live API expects)
 *   - Streams PCM chunks over WebSocket to the FastAPI backend
 *   - Receives translated audio (PCM 24kHz) and plays it back
 *   - Receives parsed JSON text ({ speaker, translation, tone }) and routes it to that
 *     person's column — Person A and Person B each get their own transcript + tone banner
 */

// ── State ──────────────────────────────────────────────────────────────────
let ws = null;
let audioContext = null;
let processorNode = null;
let mediaStream = null;
let userInitiatedStop = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const INPUT_SAMPLE_RATE  = 16000;  // Gemini Live API expects 16kHz PCM input
const OUTPUT_SAMPLE_RATE = 24000;  // Gemini Live API outputs 24kHz PCM

// ── DOM refs ───────────────────────────────────────────────────────────────
const startBtn      = document.getElementById('start-btn');
const stopBtn       = document.getElementById('stop-btn');
const statusDot     = document.getElementById('status-dot');
const statusText    = document.getElementById('status-text');
const langASelect   = document.getElementById('lang-a');
const langBSelect   = document.getElementById('lang-b');

// Per-person column refs, keyed by speaker id ('A' / 'B') for easy routing.
const columns = {
  A: {
    tone: document.getElementById('tone-a'),
    label: document.getElementById('label-a'),
    transcript: document.getElementById('transcript-a'),
  },
  B: {
    tone: document.getElementById('tone-b'),
    label: document.getElementById('label-b'),
    transcript: document.getElementById('transcript-b'),
  },
};

// Note: initial empty-state placeholders are already in index.html markup.

// ── Button handlers ────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => { userInitiatedStop = false; startSession(); });
stopBtn.addEventListener('click', () => { userInitiatedStop = true; stopSession(); });


// ── Session start ──────────────────────────────────────────────────────────
async function startSession(isReconnect = false) {
  const langA = langASelect.value;
  const langB = langBSelect.value;

  if (langA === langB) {
    setStatus('error', 'Please select two different languages.');
    return;
  }

  setStatus('connecting', isReconnect ? 'Reconnecting...' : 'Connecting to Setu...');
  startBtn.disabled = true;
  stopBtn.disabled  = false;
  columns.A.label.textContent = `Person A · ${langA}`;
  columns.B.label.textContent = `Person B · ${langB}`;
  if (!isReconnect) { clearTranscript('A'); clearTranscript('B'); }

  // Open WebSocket to backend with language pair as query params
  const wsUrl = `ws://localhost:8000/ws/setu?lang_a=${encodeURIComponent(langA)}&lang_b=${encodeURIComponent(langB)}`;
  ws = new WebSocket(wsUrl);
  ws.binaryType = 'arraybuffer';

  ws.onopen = async () => {
    reconnectAttempts = 0;
    setStatus('live', `Bridge live: ${langA} ↔ ${langB}`);
    await startMicrophone();
  };

  ws.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      // Binary = PCM audio response from Gemini — play it
      playAudioResponse(event.data);
    } else {
      // Text = JSON with { speaker, translation, tone } for one turn
      try {
        const data = JSON.parse(event.data);
        handleTextResponse(data);
      } catch (err) {
        console.error('[Setu] Failed to parse ws text message:', err, event.data);
      }
    }
  };

  ws.onerror = () => {
    setStatus('error', 'Connection error. Is the backend running?');
  };

  ws.onclose = () => {
    // Pass true so stopSession doesn't try to close ws again (already closed)
    stopSession(true);

    if (userInitiatedStop) {
      setStatus('', 'Session ended.');
      return;
    }

    // Unexpected close (e.g. a transient Live API error) — the preview model
    // occasionally drops the session; auto-reconnect so the demo self-heals
    // instead of going silently dead.
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      setStatus('connecting', `Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(() => startSession(true), 800);
    } else {
      setStatus('error', 'Bridge lost connection. Click Start Bridge to retry.');
    }
  };
}


// ── Session stop ───────────────────────────────────────────────────────────
function stopSession(silent = false) {
  if (processorNode) { processorNode.disconnect(); processorNode = null; }
  if (mediaStream)   { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (audioContext && audioContext.state !== 'closed') { audioContext.close(); audioContext = null; }
  if (playbackCtx && playbackCtx.state !== 'closed')  { playbackCtx.close(); playbackCtx = null; playbackNextTime = 0; }
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  ws = null;

  startBtn.disabled = false;
  stopBtn.disabled  = true;

  if (!silent) setStatus('', 'Ready to connect.');
}


// ── Microphone capture ─────────────────────────────────────────────────────
async function startMicrophone() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    // AudioContext at 16kHz — Gemini Live API's required input rate
    audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    // Chrome can create this suspended (autoplay policy) since we're not in a
    // synchronous click handler — resume explicitly or onaudioprocess never fires.
    if (audioContext.state === 'suspended') await audioContext.resume();
    const source = audioContext.createMediaStreamSource(mediaStream);

    // ScriptProcessor captures raw float32 audio samples
    // Buffer size 2048 = ~128ms chunks at 16kHz — smaller chunks reach the backend sooner
    processorNode = audioContext.createScriptProcessor(2048, 1, 1);

    processorNode.onaudioprocess = (e) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const float32 = e.inputBuffer.getChannelData(0);
      const pcm16   = float32ToPCM16(float32);
      ws.send(pcm16);
    };

    source.connect(processorNode);
    // Connect to destination so the ScriptProcessor fires — but we don't want mic echo.
    // Mute the gain node that feeds the speakers so only Gemini's audio plays back.
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    processorNode.connect(silentGain);
    silentGain.connect(audioContext.destination);

  } catch (err) {
    setStatus('error', 'Microphone access denied. Please allow mic permissions in Chrome.');
    stopSession(true);
  }
}


// ── Audio conversion: float32 → 16-bit PCM ────────────────────────────────
function float32ToPCM16(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view   = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to signed 16-bit int, little-endian (Gemini's expected format)
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
  }
  return buffer;
}


// ── Shared playback AudioContext (reused — browsers block multiple contexts) ──
let playbackCtx = null;
let playbackNextTime = 0;  // schedule chunks end-to-end so there are no gaps

function getPlaybackCtx() {
  if (!playbackCtx || playbackCtx.state === 'closed') {
    playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    playbackNextTime = 0;
  }
  return playbackCtx;
}

// ── Audio playback: PCM 24kHz → speaker ───────────────────────────────────
function playAudioResponse(arrayBuffer) {
  // We don't know which person is speaking until the tool call resolves near the
  // end of the turn, so show a pulsing indicator in both columns as soon as audio
  // starts flowing — gives visible "Setu is working" activity during the wait.
  startTyping();

  try {
    const ctx     = getPlaybackCtx();
    const pcm16   = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(pcm16.length);

    // Convert 16-bit PCM back to float32 for Web Audio
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    audioBuffer.copyToChannel(float32, 0);

    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);

    // Schedule this chunk immediately after the previous one — prevents choppy playback
    const startAt = Math.max(ctx.currentTime, playbackNextTime);
    src.start(startAt);
    playbackNextTime = startAt + audioBuffer.duration;
  } catch (err) {
    console.error('[Setu] Audio playback error:', err);
  }
}


// ── Text response handler ──────────────────────────────────────────────────
// Each backend message is one full turn: { speaker: 'A'|'B', translation, tone }.
// speaker tells us whose column this turn belongs to.
function handleTextResponse(data) {
  stopTyping(); // turn resolved (or errored) — clear the pulsing indicators either way

  if (data.error) {
    // No speaker known yet (or session-level failure) — surface in both columns.
    addTranscriptLine('A', `⚠ ${data.error}`, true);
    addTranscriptLine('B', `⚠ ${data.error}`, true);
    return;
  }

  const speaker = data.speaker === 'A' || data.speaker === 'B' ? data.speaker : null;
  if (!speaker) return; // can't route without knowing who spoke

  if (data.translation) {
    addTranscriptLine(speaker, data.translation, false, /* animate */ true);
  }
  if (data.tone) {
    setTone(speaker, data.tone);
  }
}


// ── Transcript helpers ─────────────────────────────────────────────────────
function addTranscriptLine(speaker, text, isError = false, animate = false) {
  const col = columns[speaker].transcript;
  const empty = col.querySelector('.transcript-empty');
  if (empty) empty.remove();

  const p = document.createElement('p');
  p.className = isError ? 'transcript-line error-line' : 'transcript-line';
  col.appendChild(p);
  col.scrollTop = col.scrollHeight;

  if (!animate) {
    p.textContent = text;
    return;
  }

  // Typewriter reveal — we only get the translation as one finished block (the
  // speaker isn't known until the turn resolves), so this fakes a "live" feel
  // instead of the text just appearing all at once. Reveals a few chars per tick
  // so it reads as fast/live rather than adding noticeable delay.
  let i = 0;
  const charsPerTick = 3;
  const speed = 10; // ms per tick
  const timer = setInterval(() => {
    i += charsPerTick;
    p.textContent = text.slice(0, i);
    col.scrollTop = col.scrollHeight;
    if (i >= text.length) { p.textContent = text; clearInterval(timer); }
  }, speed);
}


// ── Typing indicator (shown in both columns while a turn is in flight) ─────
let typingActive = false;

function startTyping() {
  if (typingActive) return;
  typingActive = true;
  for (const speaker of ['A', 'B']) {
    const col = columns[speaker].transcript;
    const empty = col.querySelector('.transcript-empty');
    if (empty) empty.remove();
    const p = document.createElement('p');
    p.className = 'transcript-typing';
    p.textContent = '···';
    col.appendChild(p);
    col.scrollTop = col.scrollHeight;
  }
}

function stopTyping() {
  if (!typingActive) return;
  typingActive = false;
  for (const speaker of ['A', 'B']) {
    const el = columns[speaker].transcript.querySelector('.transcript-typing');
    if (el) el.remove();
  }
}

function clearTranscript(speaker) {
  columns[speaker].transcript.innerHTML = '';
  addEmptyState(speaker);
}

function addEmptyState(speaker) {
  const p = document.createElement('p');
  p.className = 'transcript-empty';
  p.textContent = `Person ${speaker}'s translated speech will appear here.`;
  columns[speaker].transcript.appendChild(p);
}


// ── Tone banner (Setu's emotional read, shown above each person's column) ──
function setTone(speaker, tone) {
  const el = columns[speaker].tone;
  el.textContent = 'Setu feels: ' + tone;
  el.classList.remove('updated');
  // Force reflow so the pulse animation replays even for back-to-back identical tones.
  void el.offsetWidth;
  el.classList.add('updated');
}


// ── Status helpers ─────────────────────────────────────────────────────────
function setStatus(state, message) {
  statusDot.className  = state;  // '', 'connecting', 'live', 'error'
  statusText.textContent = message;
}
