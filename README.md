# Commenter

AI comment studio for **LinkedIn** and **X**. Paste a post or drop its link, choose a few comment
styles, and get several distinct, human-sounding replies streamed in parallel. Then copy, regenerate
or refine each one.

- **Backend:** FastAPI · LangChain · LangGraph · Groq (`langchain-groq`) · managed with **uv**
- **Frontend:** Next.js 16 (App Router) · Tailwind CSS v4 · shadcn/ui · Motion

See [PLAN.md](PLAN.md) for the phased product plan.

## Features

- **Paste text or a link.** Public LinkedIn posts (`/posts/…`, `/feed/update/urn:li:activity:…`) and X posts
  (`x.com/…/status/…`) are extracted automatically; other web pages fall back to a generic extractor.
- **8 comment styles:** Thought Leader, Cheerleader, Conversation Starter, Storyteller, Devil's Advocate, Wit,
  Value Adder, One-Liner. Pick any mix or use a preset.
- **Modifiers:** platform (auto / LinkedIn / X with a 280-char limit), length, emojis, and an optional
  "your voice" persona.
- **Streaming:** post → analysis → each comment appears the moment its parallel branch finishes.
- **Per-comment actions:** copy, regenerate (avoids earlier drafts), refine (shorter, longer, casual,
  professional, add a question, remove emojis, or a custom instruction), and version history.
- **Post analysis:** topic, sentiment, author intent and key points.
- **History** of past generations in the browser, dark/light theme, keyboard shortcut (Ctrl/⌘ + Enter).

## How it works

```
POST /api/generate/stream
        │
        ▼
 LangGraph StateGraph
 START → resolve_input → analyze_post ─┬─ generate_comment(style 1) ─┐
        (extract URL     (structured   ├─ generate_comment(style 2) ─┼→ finalize → END
         or use text)     analysis)    └─ generate_comment(style N) ─┘
                                        fan-out with Send, run in parallel
```

Each node uses a LangChain prompt piped into `ChatGroq.with_structured_output(...)` (Pydantic schemas),
with a JSON-mode fallback. Comments then go through deterministic cleanup: quotes, labels, trailing
hashtags and em dashes are stripped, emojis are removed when disabled, and the X limit is enforced.

```
backend/
  app/
    main.py              FastAPI app, CORS, error envelope
    api/routes.py        REST + SSE endpoints
    graph/workflow.py    LangGraph workflow
    chains/              prompts, LangChain runnables, post-processing
    extractors/          linkedin.py, x.py, generic.py
    core/                settings, Groq LLM factory, errors
    schemas.py, styles.py
  tests/                 pytest (no network: fake chat model)
frontend/
  src/app/               layout + page
  src/components/studio/ composer, style picker, controls, comment cards, history…
  src/hooks/             useStudio (state + streaming), useHistory
  src/lib/               API client + SSE reader, style catalog, types
```

## Getting started

Prerequisites: [uv](https://docs.astral.sh/uv/), Node.js 20+, and a [Groq API key](https://console.groq.com/keys).

### 1. Backend

```sh
cd backend
cp .env.example .env        # then set GROQ_API_KEY
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

### 2. Frontend

```sh
cd frontend
cp .env.example .env.local  # only needed if the API is not on localhost:8000
npm install
npm run dev
```

Open http://localhost:3000.

### Docker (optional)

```sh
cp backend/.env.example backend/.env   # set GROQ_API_KEY
docker compose up --build
```

## Configuration

| Variable | Where | Default | Notes |
|---|---|---|---|
| `GROQ_API_KEY` | backend | — | Required |
| `GROQ_MODEL` | backend | `llama-3.3-70b-versatile` | Any Groq chat model with tool calling |
| `CORS_ORIGINS` | backend | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated |
| `GENERATION_TEMPERATURE` / `ANALYSIS_TEMPERATURE` | backend | `0.9` / `0.2` | |
| `LLM_TIMEOUT_SECONDS`, `HTTP_TIMEOUT_SECONDS` | backend | `45`, `15` | |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` | Inlined at build time |

## API

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/health` | — | status, model, whether a key is configured |
| GET | `/api/styles` | — | style catalog and defaults |
| POST | `/api/extract` | `{url}` | `Post` |
| POST | `/api/generate` | `{text? , url?, platform, styles[], length, use_emojis, persona?}` | `{post, analysis, comments[], model}` |
| POST | `/api/generate/stream` | same as above | SSE: `post`, `analysis`, `comment`×N, `comment_error`, `done` / `error` |
| POST | `/api/comments/regenerate` | `{post, style, length, use_emojis, persona?, analysis?, avoid[]}` | `Comment` |
| POST | `/api/comments/refine` | `{post, comment, action, instruction?}` | `Comment` |

Errors always look like `{"error": {"code": "...", "message": "..."}}`.

## Tests

```sh
cd backend && uv run pytest        # extractors, post-processing, graph fan-out, API + SSE
cd frontend && npm run lint && npm run build
```

## Limitations

- Only **public** posts can be extracted. Private, connections-only or login-walled posts return a friendly
  error; paste the text instead.
- X extraction relies on public embed endpoints (FxTwitter, the X syndication CDN, oEmbed) and LinkedIn on its
  public post pages. If either platform changes its markup, the extractors may need updating.
- Always read a generated comment before posting it.
