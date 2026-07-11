# Author: Madhumitha Kolkar
# Date: July 11, 2026
# Description: SetuAgent — manages the persistent WebSocket session with the Gemini Live API.
#              Handles bidirectional audio streaming, spoken-translation transcripts, and the
#              mandatory report_tone tool call used to tag each turn's speaker + emotional tone.

import os
import asyncio
import json
from pathlib import Path
from google import genai
from google.genai import types
from prompts import get_prompt
from dotenv import load_dotenv

# .env lives in the project root (one level above backend/)
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")


# Gemini can only return one response modality (AUDIO or TEXT) per Live session — not both.
# So the spoken translation comes back as AUDIO (transcribed via output_audio_transcription
# for the on-screen transcript), and the speaker + emotional tone reading are surfaced
# separately and silently via this mandatory tool call, so they never get spoken aloud.
REPORT_TONE_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="report_tone",
            description=(
                "MANDATORY: call this exactly once for every single utterance, identifying who "
                "spoke and the emotional tone you heard. Call it in addition to speaking the "
                "translation, never instead of it, and never skip it — even for plain, neutral "
                "speech, always report a tone."
            ),
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "speaker": {
                        "type": "string",
                        "enum": ["A", "B"],
                        "description": "Which person just spoke, per the language they used.",
                    },
                    "tone": {
                        "type": "string",
                        "description": (
                            "A short, warm sentence for the listener, not a bare adjective pair: "
                            "name the gap between how it sounded and what it likely means, then "
                            "give a gentle cue for how to respond. E.g. 'She sounds angry, but "
                            "she's just concerned — talk to her gently.' or 'Calm and neutral — "
                            "nothing to read into here.' Always filled in, never empty."
                        ),
                    },
                },
                "required": ["speaker", "tone"],
            },
            behavior=types.Behavior.NON_BLOCKING,
        )
    ]
)


class SetuAgent:
    """
    Manages a single Setu bridge session between two speakers.
    Opens a persistent connection to Gemini Live API, streams PCM audio in,
    and streams translated audio + transcript + subtext notices back to the frontend WebSocket.
    """

    def __init__(self, language_a: str = "Hindi", language_b: str = "English"):
        # api_version="v1alpha" is required here (not on connect()) for enable_affective_dialog
        self.client = genai.Client(
            api_key=os.getenv("GEMINI_API_KEY"),
            http_options=types.HttpOptions(api_version="v1alpha"),
        )

        # Native-audio model — required for enable_affective_dialog (vocal tone reading).
        self.model = "gemini-2.5-flash-native-audio-latest"

        self.language_a = language_a
        self.language_b = language_b
        self.system_prompt = get_prompt(language_a, language_b)

    async def run(self, websocket):
        """
        Main session loop.

        This preview native-audio model's automatic voice-activity detection does not
        reliably re-arm for a second utterance within one Live session — verified: a
        fresh session always answers its first utterance, but a second utterance in the
        SAME session gets silently ignored. So instead of one persistent Gemini session
        for the whole bridge, we recycle a fresh session per turn: a single background
        task pumps browser audio into a queue for the life of the WebSocket, and an outer
        loop drains that queue into a new Gemini session each time, closing and reopening
        the session as soon as one turn completes. The browser's WebSocket never drops.
        """

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=self.system_prompt,
            enable_affective_dialog=True,  # KEY: reads vocal tone and emotion
            tools=[REPORT_TONE_TOOL],
            output_audio_transcription=types.AudioTranscriptionConfig(),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
                )
            ),
            # NOTE: start/end-of-speech SENSITIVITY enums are intentionally left at API
            # defaults — setting them LOW previously stopped real speech from registering
            # at all. silence_duration_ms alone is a narrower, safer knob: how long a
            # pause must last before Setu decides a person is done talking and responds.
            # 500ms was too short — a normal beat between two different speakers landed
            # inside that window, so both languages got captured as one utterance and
            # merged into a single report_tone call. 1000ms (a full second, matching the
            # exact behavior requested) gives real speaker changes enough room to register
            # as separate turns.
            realtime_input_config=types.RealtimeInputConfig(
                automatic_activity_detection=types.AutomaticActivityDetection(
                    silence_duration_ms=1000,
                ),
            ),
        )

        audio_queue: asyncio.Queue = asyncio.Queue()
        stopped = asyncio.Event()

        async def pump_audio():
            """Reads binary PCM frames from the browser for the life of the connection."""
            try:
                async for message in websocket.iter_bytes():
                    audio_queue.put_nowait(message)
            except Exception as e:
                print(f"[Setu] Audio pump stopped: {e}")
            finally:
                stopped.set()

        pump_task = asyncio.create_task(pump_audio())

        try:
            while not stopped.is_set():
                # Drain stale backlog right before opening a fresh session — while Gemini
                # was speaking the previous turn's translation (can take several seconds),
                # the mic kept queuing ambient audio the whole time. Feeding that multi-second
                # backlog into a brand-new session all at once, out of real-time pace, was
                # confusing its speech detection and it would never register the next real
                # utterance. This only runs when we're actually opening a new session (i.e.
                # after real content), not on every empty/spurious in-session turn, so it
                # doesn't reintroduce the earlier bug of eating a fast-follow-up utterance.
                while not audio_queue.empty():
                    audio_queue.get_nowait()

                async with self.client.aio.live.connect(model=self.model, config=config) as session:
                    print(f"[Setu] Live API session open | {self.language_a} ↔ {self.language_b}")

                    # Stay in THIS session across turns that produce no real content — Gemini
                    # sends a turn_complete even for spurious/empty activity (background noise,
                    # etc.), and closing+reopening the session on every single one of those was
                    # both slow (a fresh handshake each time) and actively harmful: recycling
                    # meant discarding queued audio on reopen, which could eat the start of the
                    # NEXT real utterance if you started talking during the reconnect. We only
                    # recycle the session once a turn actually produces content — matching the
                    # one case we've verified needs a fresh session (a second REAL utterance
                    # doesn't reliably get heard in the same session).
                    needs_recycle = False

                    while not needs_recycle and not stopped.is_set():
                        turn_complete = asyncio.Event()
                        transcript_parts = []
                        turn_speaker = None
                        turn_tone = None

                        async def send_audio():
                            while not turn_complete.is_set() and not stopped.is_set():
                                try:
                                    message = await asyncio.wait_for(audio_queue.get(), timeout=0.2)
                                except asyncio.TimeoutError:
                                    continue
                                await session.send_realtime_input(
                                    audio=types.Blob(data=message, mime_type="audio/pcm;rate=16000")
                                )

                        async def receive_responses():
                            """
                            Forwards audio bytes immediately for responsiveness, but buffers the
                            transcript text and waits for the report_tone call so we can send ONE
                            combined {speaker, translation, tone} message per turn — the frontend
                            needs to know who spoke before it can route the line to the right column.
                            """
                            nonlocal turn_speaker, turn_tone

                            async def flush():
                                text = "".join(transcript_parts).strip()
                                if text or turn_tone:
                                    await websocket.send_text(json.dumps({
                                        "speaker": turn_speaker,
                                        "translation": text or None,
                                        "tone": turn_tone,
                                    }))

                            async for response in session.receive():
                                server_content = getattr(response, "server_content", None)
                                if server_content:
                                    model_turn = getattr(server_content, "model_turn", None)
                                    if model_turn:
                                        for part in model_turn.parts:
                                            if getattr(part, "inline_data", None):
                                                await websocket.send_bytes(part.inline_data.data)

                                    output_transcription = getattr(server_content, "output_transcription", None)
                                    if output_transcription and output_transcription.text:
                                        transcript_parts.append(output_transcription.text)

                                    if getattr(server_content, "turn_complete", False):
                                        await flush()
                                        turn_complete.set()
                                        break

                                # Speaker + tone, delivered as a mandatory tool call rather than speech.
                                tool_call = getattr(response, "tool_call", None)
                                if tool_call and tool_call.function_calls:
                                    responses = []
                                    for fc in tool_call.function_calls:
                                        if fc.name == "report_tone":
                                            args = fc.args or {}
                                            turn_speaker = args.get("speaker")
                                            turn_tone = args.get("tone")
                                            print(f"[Setu] report_tone: speaker={turn_speaker!r} tone={turn_tone!r}")
                                        responses.append(types.FunctionResponse(
                                            id=fc.id,
                                            name=fc.name,
                                            response={"result": "ok"},
                                        ))
                                    if responses:
                                        await session.send_tool_response(function_responses=responses)

                        send_task = asyncio.create_task(send_audio())
                        recv_task = asyncio.create_task(receive_responses())
                        stop_wait = asyncio.create_task(stopped.wait())
                        done, pending = await asyncio.wait(
                            {send_task, recv_task, stop_wait},
                            return_when=asyncio.FIRST_COMPLETED,
                        )
                        for t in pending:
                            t.cancel()
                        for t in done:
                            exc = t.exception() if not t.cancelled() else None
                            if exc:
                                # Transient Live API errors (e.g. 1011 Internal error) land here —
                                # this is expected and self-heals: the session is likely broken,
                                # so recycle to a fresh one for the next turn.
                                print(f"[Setu] Turn ended with error (recovering): {exc}")
                                needs_recycle = True

                        if turn_speaker or transcript_parts:
                            needs_recycle = True  # real content happened — recycle before the next turn
                        # else: empty/spurious turn — loop back and keep listening in this same session
                # session closed here (only on real recycle or disconnect) — open a fresh one

        except Exception as e:
            print(f"[Setu] Session error: {e}")
            try:
                await websocket.send_text(json.dumps({
                    "error": str(e),
                    "translation": None,
                    "notice": None
                }))
            except Exception:
                pass
        finally:
            pump_task.cancel()
            # Explicitly close so the frontend's onclose fires promptly and
            # triggers auto-reconnect, instead of leaving a dead-looking session open.
            try:
                await websocket.close()
            except Exception:
                pass
