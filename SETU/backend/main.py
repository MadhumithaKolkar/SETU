# Author: Madhumitha Kolkar
# Date: July 11, 2026
# Description: FastAPI server for Setu. Serves the frontend and handles WebSocket connections
#              between the browser and the Gemini Live API via SetuAgent.

import os
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv

# .env lives in the project root (one level above backend/)
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

app = FastAPI(title="Setu", description="An emotional language bridge.")

# Serve the frontend from /frontend — index.html loads at root
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")


@app.get("/")
async def root():
    """Redirect root to the frontend index.html."""
    from fastapi.responses import FileResponse
    return FileResponse(os.path.join(frontend_path, "index.html"))


@app.get("/health")
async def health():
    """Quick health check — confirms server is running and API key is set."""
    api_key_set = bool(os.getenv("GEMINI_API_KEY"))
    return JSONResponse({
        "status": "ok",
        "api_key_configured": api_key_set,
        "message": "Setu is ready." if api_key_set else "WARNING: GEMINI_API_KEY not set in .env"
    })


@app.websocket("/ws/setu")
async def setu_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for a Setu bridge session.
    Query params:
      - lang_a: language spoken by Person A (default: Hindi)
      - lang_b: language spoken by Person B (default: English)

    Example: ws://localhost:8000/ws/setu?lang_a=Hindi&lang_b=English
    """
    await websocket.accept()

    # Read language pair from query params
    lang_a = websocket.query_params.get("lang_a", "Hindi")
    lang_b = websocket.query_params.get("lang_b", "English")

    print(f"[Setu] New session: {lang_a} ↔ {lang_b}")

    from setu_agent import SetuAgent
    agent = SetuAgent(language_a=lang_a, language_b=lang_b)

    try:
        await agent.run(websocket)
    except WebSocketDisconnect:
        print(f"[Setu] Session ended: {lang_a} ↔ {lang_b}")
    except Exception as e:
        print(f"[Setu] Unexpected error: {e}")


if __name__ == "__main__":
    print("\n🌉 Starting Setu...")
    print("   Open your browser at: http://localhost:8000")
    print("   Health check at:      http://localhost:8000/health\n")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )
