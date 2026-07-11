/**
 * Author: Madhumitha Kolkar
 * Date: July 11, 2026
 * Description: Setu frontend audio pipeline.
 *   - Captures mic audio via Web Audio API
 *   - Converts to raw 16-bit PCM at 16kHz (what Gemini Live API expects)
 *   - Streams PCM chunks over WebSocket to the FastAPI backend
 *   - Receives translated audio (PCM 24kHz) and plays it back
 *   - Receives parsed JSON text (translation + optional subtext notice) and updates the UI
 */

// ── State ──────────────────────────────────────────────────────────────────
let ws = null;
let audioContext = null;
let processorNode = null;
let mediaStream = null;
let noticeTimer = null;

const INPUT_SAMPLE_RATE  = 16000;  // Gemini Live API expects 16kHz PCM input
const OUTPUT_SAMPLE_RATE = 24000;  // Gemini Live API outputs 24kHz PCM

// ── DOM refs ───────────────────────────────────────────────────────────────
const startBtn      = document.getElementById('start-btn');
const stopBtn       = document.getElementById('stop-btn');
const statusDot     = document.getElementById('status-dot');
const statusText    = document.getElementById('status-text');
const transcript    = document.getElementById('transcript');
const setuNotices   = document.getElementById('setu-notices');
const langASelect   = document.getElementById('lang-a');
const langBSelect   = document.getElementById('lang-b');

// ── Init: show placeholder in transcript ──────────────────────────────────
addEmptyState();

// ── Button handlers ────────────────────────────────────────────────────────
startBtn.addEventListener('click', startSession);
stopBtn.addEventListener('click', stopSession);


// ── Session start ──────────────────────────────────────────────────────────
async function startSession() {
  const langA = langASelect.value;
  const langB = langBSelect.value;

  if (langA === langB) {
    setStatus('error', 'Please select two different languages.');
    return;
  }

  setStatus('connecting', 'Connecting to Setu...');
  startBtn.disabled = true;
  stopBtn.disabled  = false;
  clearTranscript();

  // Open WebSocket to backend with language pair as query params
  const wsUrl = `ws://localhost:8000/ws/setu?lang_a=${encodeURIComponent(langA)}&lang_b=${encodeURIComponent(langB)}`;
  ws = new WebSocket(wsUrl);
  ws.binaryType = 'arraybuffer';

  ws.onopen = async () => {
    setStatus('live', `Bridge live: ${langA} ↔ ${langB}`);
    await startMicrophone();
  };

  ws.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      // Binary = PCM audio response from Gemini — play it
      playAudioResponse(event.data);
    } else {
      // Text = JSON with translation + optional notice
      try {
        const data = JSON.parse(event.data);
        handleTextResponse(data);
      } catch {
        // Fallback: raw text
        addTranscriptLine(event.data);
      }
    }
  };

  ws.onerror = () => {
    setStatus('error', 'Connection error. Is the backend running?');
  };

  ws.onclose = () => {
    if (statusDot.className === 'live') {
      setStatus('', 'Session ended.');
    }
    // Pass true so stopSession doesn't try to close ws again (already closed)
    stopSession(true);
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
    const source = audioContext.createMediaStreamSource(mediaStream);

    // ScriptProcessor captures raw float32 audio samples
    // Buffer size 4096 = ~256ms chunks at 16kHz — good balance of latency vs overhead
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);

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
function handleTextResponse(data) {
  if (data.error) {
    addTranscriptLine(`⚠ ${data.error}`, true);
    return;
  }

  if (data.translation) {
    addTranscriptLine(data.translation);
  }

  if (data.notice) {
    showNotice(data.notice);
  }
}


// ── Transcript helpers ─────────────────────────────────────────────────────
function addTranscriptLine(text, isError = false) {
  // Remove empty state placeholder if present
  const empty = transcript.querySelector('.transcript-empty');
  if (empty) empty.remove();

  const p = document.createElement('p');
  p.className = isError ? 'transcript-line error-line' : 'transcript-line';
  p.textContent = text;
  transcript.appendChild(p);
  transcript.scrollTop = transcript.scrollHeight;
}

function clearTranscript() {
  transcript.innerHTML = '';
}

function addEmptyState() {
  const p = document.createElement('p');
  p.className = 'transcript-empty';
  p.textContent = 'Translations will appear here once the bridge is live.';
  transcript.appendChild(p);
}


// ── Setu notices (emotional subtext) ──────────────────────────────────────
function showNotice(text) {
  // Clear any existing fade-out timer
  if (noticeTimer) clearTimeout(noticeTimer);

  setuNotices.textContent = '✦  ' + text;
  setuNotices.classList.add('visible');

  // Auto-hide after 7 seconds
  noticeTimer = setTimeout(() => {
    setuNotices.classList.remove('visible');
  }, 7000);
}


// ── Status helpers ─────────────────────────────────────────────────────────
function setStatus(state, message) {
  statusDot.className  = state;  // '', 'connecting', 'live', 'error'
  statusText.textContent = message;
}
