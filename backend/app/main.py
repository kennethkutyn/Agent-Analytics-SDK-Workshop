from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .config import ALLOWED_ORIGINS, OPENAI_API_KEY
from .models import ChatRequest, ChatResponse, ScoreRequest, CapturedEvent
from .chat import handle_chat, handle_score

app = FastAPI(title="AmpliMoney SDK Playground")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "openai_configured": bool(OPENAI_API_KEY),
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return handle_chat(request)


@app.post("/api/score")
def score(request: ScoreRequest) -> list[CapturedEvent]:
    return handle_score(request)


# Serve frontend static files in production
# Works both locally (backend/../frontend/dist) and in Docker (/app/frontend/dist)
for candidate in [
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"),
    os.path.join(os.getcwd(), "frontend", "dist"),
]:
    if os.path.isdir(candidate):
        app.mount("/", StaticFiles(directory=candidate, html=True), name="frontend")
        break
