# Author: Madhumitha Kolkar
# Date: July 11, 2026
# Description: SetuAgent — manages the persistent WebSocket session with the Gemini Live API.
#              Handles bidirectional audio streaming and text response parsing.

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


class SetuAgent:
    """
    Manages a single Setu bridge session between two speakers.
    Opens a persistent connection to Gemini Live API, streams PCM audio in,
    and streams translated audio + parsed text back to the frontend WebSocket.
    """

    def __init__(self, language_a: str = "Hindi", language_b: str = "English"):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        # Use gemini-2.5-flash-live for speed. Switch to gemini-3.1-flash-live for higher quality.
        self.model = "gemini-2.5-flash-live-preview"

        self.language_a = language_a
        self.language_b = language_b
        self.system_prompt = get_prompt(language_a, language_b)

    async def run(self, websocket):
        """
        Main session loop. Runs two concurrent tasks:
          - send_audio: reads binary PCM frames from the browser WebSocket and forwards to Gemini
          - receive_responses: reads Gemini's responses and forwards audio + text back to browser
        """

        # Session config: enable Affective Dialog (Gemini 2.5 only, v1alpha)
        # This makes Gemini adapt its response to the emotional tone of the speaker's voice.
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO", "TEXT"],
            system_instruction=self.system_prompt,
            enable_affective_dialog=True,  # KEY: reads vocal tone and emotion
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
                )
            ),
        )

        try:
            async with self.client.aio.live.connect(
                model=self.model,
                config=config,
                api_version="v1alpha",  # required for enable_affective_dialog
            ) as session:
                print(f"[Setu] Live API session open | {self.language_a} ↔ {self.language_b}")

                async def send_audio():
                    """Reads raw PCM bytes from the browser and forwards to Gemini."""
                    try:
                        async for message in websocket.iter_bytes():
                            await session.send(
                                input=types.LiveClientRealtimeInput(
                                    audio=types.Blob(
                                        data=message,
                                        mime_type="audio/pcm;rate=16000"
                                    )
                                )
                            )
                    except Exception as e:
                        print(f"[Setu] Audio send stopped: {e}")

                async def receive_responses():
                    """Receives Gemini responses and forwards audio bytes + parsed text to browser."""
                    try:
                        async for response in session.receive():
                            # Audio response — check server_content for audio parts
                            if (hasattr(response, 'server_content')
                                    and response.server_content
                                    and hasattr(response.server_content, 'model_turn')
                                    and response.server_content.model_turn):
                                for part in response.server_content.model_turn.parts:
                                    if hasattr(part, 'inline_data') and part.inline_data:
                                        await websocket.send_bytes(part.inline_data.data)
                                    if hasattr(part, 'text') and part.text:
                                        parsed = parse_response(part.text)
                                        await websocket.send_text(json.dumps(parsed))

                            # Fallback: older SDK shape exposes .data / .text directly
                            elif hasattr(response, 'data') and response.data:
                                await websocket.send_bytes(response.data)
                            elif hasattr(response, 'text') and response.text:
                                parsed = parse_response(response.text)
                                await websocket.send_text(json.dumps(parsed))

                    except Exception as e:
                        print(f"[Setu] Response receive stopped: {e}")

                await asyncio.gather(send_audio(), receive_responses())

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


def parse_response(text: str) -> dict:
    """
    Parses Gemini's structured text response into translation and optional subtext notice.

    Expected format from the model:
      [Translation]: <translated text>
      [Setu notices]: <optional subtext — only present when model detects emotional gap>

    Returns a dict with keys: translation, notice (notice is None if absent).
    """
    result = {"translation": None, "notice": None, "raw": text}

    lines = text.strip().split("\n")
    for line in lines:
        if line.startswith("[Translation]:"):
            result["translation"] = line.replace("[Translation]:", "").strip()
        elif line.startswith("[Setu notices]:"):
            result["notice"] = line.replace("[Setu notices]:", "").strip()

    # Fallback: if model didn't follow format, use raw text as translation
    if not result["translation"] and text.strip():
        result["translation"] = text.strip()

    return result
