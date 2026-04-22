# AmpliMoney SDK Playground

Interactive training app for learning the Amplitude AI SDK. PMs and devs uncomment code in a live editor and instantly see the Amplitude events that get generated.

## What it does

Three-column UI:

- **Left** — AmpliMoney chatbot (functional, powered by GPT-4o-mini)
- **Middle** — Editable Python code showing the SDK integration
- **Right** — Live event stream showing Amplitude events with expandable properties

Four progressive steps. Click the step badges (or edit the code directly) to enable each one:

| Step | What it enables | Events you'll see |
|------|----------------|-------------------|
| 1. AI SDK | `amplitude_ai.patch()` — instruments all LLM calls | `[GenAI] User Message`, `[GenAI] AI Response` |
| 2. User Identity | `amplitude_user_id` — links AI events to product users | Same events, now with `user_id` |
| 3. Sessions | `agent.session()` — groups conversations | + session IDs, trace IDs, turn IDs |
| 4. Scoring | `s.score()` — captures user feedback | + `[GenAI] Score` (thumbs up/down buttons appear) |

## Local development

### Prerequisites

- Node.js 18+
- Python 3.12+
- An OpenAI API key

### Setup

```bash
# Backend
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Frontend
cd ../frontend
npm install
```

### Run

Start both servers (in separate terminals):

```bash
# Terminal 1 — backend (port 8000)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend (port 5173, proxies /api to backend)
cd frontend
npm run dev
```

Open http://localhost:5173

## Deploy to Railway

Single Dockerfile builds both frontend and backend into one service.

### 1. Push to GitHub

```bash
git init
git add -A
git commit -m "AmpliMoney SDK Playground"
gh repo create amplimoney-playground --private --source=. --push
```

### 2. Create Railway service

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select the repo — Railway auto-detects the Dockerfile

### 3. Set environment variables

In the Railway service settings:

| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `ALLOWED_ORIGINS` | `*` |

Railway deploys automatically on push. You'll get a public URL like `amplimoney-playground-production.up.railway.app`.

## Project structure

```
├── Dockerfile              # Multi-stage: builds frontend, runs backend
├── frontend/               # React + Vite + Tailwind + Monaco Editor
│   └── src/
│       ├── components/     # ChatPanel, CodeEditor, EventViewer
│       ├── lib/            # API client, code template, step parser/toggler
│       └── types.ts
├── backend/                # Python FastAPI
│   └── app/
│       ├── main.py         # Routes + static file serving
│       ├── chat.py         # OpenAI calls + conditional SDK logic
│       ├── event_capture.py # Simulated Amplitude event generation
│       ├── models.py       # Request/response schemas
│       └── system_prompt.py # AmpliMoney chatbot persona
└── README.md
```

## How it works

The code editor shows real `amplitude-ai` SDK code. Edits are parsed client-side to determine which steps are active, and that config is sent to the backend with each chat message. The backend conditionally enables SDK features and returns both the AI response and the captured events.

The OpenAI API key lives server-side only — never exposed to the browser.

## Amplitude API key (optional)

The event viewer has an optional Amplitude API key field. If provided, events are sent to your real Amplitude project in addition to displaying in the playground.
