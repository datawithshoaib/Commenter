# Commenter — Product Plan

Turn the current single-endpoint Gemini prototype into an end-to-end AI comment studio for
LinkedIn and X: paste a post **or** drop a link, get several comments in different styles,
then copy, regenerate or refine each one.

## Where we start

| Area | Today | Problems |
|---|---|---|
| Backend | One FastAPI route calling Gemini over raw HTTP | API key hardcoded in source, brittle regex parsing of numbered lines, one tone for all 3 comments, no link extraction |
| Desktop | `linkedin_commenter.py` Tkinter app | Duplicate logic, Gemini only, not part of the product |
| Frontend | Single `page.tsx` with inline state | Hardcoded API URL, no streaming, no design system, minimal UX |

## Target architecture

```
frontend/ (Next.js App Router + TS + Tailwind v4 + shadcn/ui + motion)
   │  REST + Server-Sent Events
   ▼
backend/ (FastAPI, managed with uv)
   ├── api/            routes: /extract, /generate, /generate/stream, /comments/regenerate, /comments/refine
   ├── extractors/     LinkedIn, X, generic web page → normalized Post
   ├── graph/          LangGraph workflow: resolve_input → analyze_post → generate_comment (fan-out per style) → finalize
   ├── chains/         LangChain prompts + structured output (Pydantic) on ChatGroq
   └── core/           settings (pydantic-settings), LLM factory, errors
```

**LLM:** `langchain-groq` `ChatGroq`, model set by `GROQ_MODEL` (default `llama-3.3-70b-versatile`).
Gemini is removed completely.

### Comment styles

Each style is its own prompt persona, so every comment in a batch reads differently.

| Key | Name | What it does |
|---|---|---|
| `insightful` | Thought Leader | Adds a non-obvious insight or second-order take |
| `supportive` | Cheerleader | Specific, genuine appreciation (not "Great post!") |
| `curious` | Conversation Starter | Asks one thoughtful question that invites a reply |
| `storyteller` | Storyteller | A short, relatable first-person experience |
| `contrarian` | Devil's Advocate | Respectful pushback or a missing nuance |
| `witty` | Wit | Light, clever humor that still relates to the point |
| `expert` | Value Adder | A practical tip, framework, or resource |
| `concise` | One-Liner | A punchy, high-signal reaction |

Modifiers applied on top of any style: **length** (short / medium / long), **emojis** on/off,
optional **persona** ("I'm a data engineer…") and the **platform** (X comments are kept under 280 chars).

---

## Phase 0 — Cleanup & foundations

- [x] Remove all Gemini code and the hardcoded API key.
- [x] Delete the Tkinter desktop app (`linkedin_commenter.py`) and the stray `requirements.txt` files.
- [x] Convert `backend/` to a **uv** project (`pyproject.toml`, `uv.lock`, `.venv`).
- [x] Add `backend/.env.example` (`GROQ_API_KEY`, `GROQ_MODEL`, `CORS_ORIGINS`, …).
- [x] Tighten `.gitignore` (`.venv`, `.env` everywhere).
- [x] Regenerate `frontend/` on the current Next.js (16) — the old scaffold was on 15.4.2 and had no custom code worth keeping.

**Done when:** no reference to Gemini remains, `uv sync` installs the backend.

## Phase 1 — Backend core

- [x] `core/config.py`: typed settings via `pydantic-settings` (key, model, temperature, timeouts, CORS).
- [x] `core/llm.py`: cached `ChatGroq` factory; clear error when `GROQ_API_KEY` is missing.
- [x] `schemas.py`: request/response models (`Post`, `PostAnalysis`, `Comment`, `GenerateRequest`, …).
- [x] `styles.py`: single source of truth for comment styles (exposed at `/api/styles`; the frontend mirrors the keys with icons and colours in `lib/catalog.ts`).
- [x] Consistent JSON error envelope (`{"error": {"code", "message"}}`) with app-specific exceptions.

**Done when:** app boots, `/api/health` and `/api/styles` respond.

## Phase 2 — Content extraction (links → post text)

- [x] Platform detection from URL (`linkedin.com`, `x.com`, `twitter.com`, other).
- [x] **X:** status-id parsing → public tweet APIs (FxTwitter → syndication CDN → oEmbed fallback chain).
- [x] **LinkedIn:** public post pages (`/posts/…`, `/feed/update/urn:li:activity:…`, `/pulse/…`) →
      JSON-LD `articleBody` / `og:description`, falling back to the public `/embed/feed/update/` endpoint.
- [x] **Generic:** OpenGraph + JSON-LD + main-text heuristic for any other page.
- [x] Normalize to `Post {platform, url, author, text}`; clean whitespace and tracking junk.
- [x] Friendly errors for private / login-walled posts ("paste the text instead").

**Done when:** `POST /api/extract` returns post text for public LinkedIn and X links.

## Phase 3 — LangGraph workflow

- [x] State: input (text or url), options, `post`, `analysis`, `comments` (reducer that appends).
- [x] `resolve_input` node: extract from URL when given, else use pasted text; auto-detect platform.
- [x] `analyze_post` node: LangChain structured output → topic, summary, sentiment, key points, author intent.
- [x] `generate_comment` node: **fan-out with `Send`** — one parallel run per selected style, each with its
      own style prompt, returning `{text, rationale}`.
- [x] `finalize` node: order comments by requested styles. Platform limits and cleanup (quotes, labels, hashtags, em dashes, emojis) run per comment in `chains/postprocess.py`.
- [x] A failing style returns a `comment_error` for that card only; the rest of the batch still completes.
- [x] Standalone chains for **regenerate** (one style again, different wording) and **refine**
      (shorter, longer, more casual, more professional, add a question, custom instruction).

**Done when:** the compiled graph turns a URL or text into N styled comments.

## Phase 4 — API layer

- [x] `POST /api/extract` — link → post.
- [x] `POST /api/generate` — full result in one response.
- [x] `POST /api/generate/stream` — **SSE**: `post` → `analysis` → `comment` (as each finishes) → `done` / `error`.
- [x] `POST /api/comments/regenerate`, `POST /api/comments/refine`.
- [x] Input validation (length limits, style keys, URL format) and CORS from settings.

**Done when:** every endpoint works from `curl` and the interactive `/docs`.

## Phase 5 — Frontend foundation

- [x] Add **shadcn/ui** (button, card, tabs, textarea, input, switch, badge, tooltip, sheet, dropdown, sonner…).
- [x] Add **motion** (Framer Motion) for animation, **lucide-react** icons, **next-themes** for dark/light.
- [x] Design tokens: dark-first palette, gradient accents, Geist fonts, glass panels.
- [x] `lib/api.ts` typed client + SSE stream reader; `NEXT_PUBLIC_API_URL` config.

## Phase 6 — Frontend product features

- [x] **Hero**: animated aurora background, headline, platform badges.
- [x] **Composer**: tabs for *Paste text* / *From link*; live platform detection on the URL; fetched post
      shown as an editable preview card.
- [x] **Style picker**: multi-select animated cards with icons and descriptions; quick presets.
- [x] **Controls**: platform, length segmented control, emoji switch, persona input.
- [x] **Results**: skeleton placeholders per style, comments stream in with staggered spring animations;
      each card has copy, regenerate, refine menu, char counter (X limit warning), and the "why it works" rationale.
- [x] **Post analysis panel**: topic, sentiment, key points.
- [x] **History** drawer (localStorage) to restore past generations.
- [x] Toasts for errors/copy, keyboard shortcut (Ctrl/⌘ + Enter to generate).

## Phase 7 — Animation & polish

- [x] Page-load stagger, hover lift/tilt on cards, layout animations when cards are replaced.
- [x] Shimmer skeletons, word-by-word blur-in reveal for new comments, cursor spotlight on cards, animated gradient on the generate button.
- [x] Respect `prefers-reduced-motion`; responsive down to phone width; accessible labels and focus rings.

## Phase 8 — Testing & QA

- [x] Backend unit tests (pytest): URL detection, HTML parsing fixtures, comment post-processing.
- [x] Graph tests with a fake chat model (no network) covering fan-out and ordering.
- [x] API tests with FastAPI `TestClient` (validation, error envelope, SSE event order).
- [x] Frontend: `npm run lint` + `npm run build` clean.
- [x] Manual run of backend + frontend together: health, CORS, live LinkedIn/X extraction, SSE error path.
- [ ] Live generation against Groq with a real `GROQ_API_KEY` (pending a key).

## Phase 9 — Docs & delivery

- [x] Rewrite `README.md`: architecture, setup with uv / npm, env vars, API reference.
- [x] `Dockerfile`s for backend and frontend + `docker-compose.yml` for one-command startup (compose config validated).
- [ ] Build and run the images (the Docker daemon was not running during development).

## Later (not in this iteration)

- Accounts + saved history in a database, usage quotas.
- Browser extension that injects comments directly into LinkedIn / X.
- More platforms (Reddit, Threads, Bluesky) via new extractor classes.
- Per-user "voice" learned from past comments.
