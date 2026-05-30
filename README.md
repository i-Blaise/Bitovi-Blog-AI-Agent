# Bitovi Blog AI Agent

A Retrieval-Augmented Generation (RAG) app that answers natural-language questions about Bitovi's engineering blog. It scrapes all ~460 articles into a persistent vector store and serves grounded, citation-backed answers via a FastAPI backend and React UI.

Its defining decision: **knowledge** questions ("what does Bitovi recommend for E2E testing?") use semantic retrieval + an LLM, while **discovery** questions ("how many AI articles are there?") use deterministic metadata filtering over Bitovi's topic tags — each routed to the strategy that produces a correct, verifiable answer.

## Live Demo

- **Frontend:** https://bitovi.artfricastudio.com/
- **Backend API (interactive docs):** https://api-bitovi.artfricastudio.com/docs
- **Demo video:** _TODO_

---

## Features

- **Automated ingestion** — One `POST /ingest` discovers every article from `sitemap.xml` (filtering tag/author/index pages) and scrapes it in a background thread with live progress. Idempotent: skips re-ingest if the index is already populated.
- **Content extraction** — Title (`og:title`), body (`<article>` only, to drop nav/footer noise), published date (`<time>`), and **topic tags** (`/blog/topic/...` links). Empty pages are skipped.
- **Parent/child chunking** — 600-char child chunks embedded for precise search; 2000-char parents returned to the LLM for context.
- **Citations** — The LLM must cite every claim as `[N]`; the backend drops uncited sources, renumbers the rest, and the UI renders each `[N]` as a link to the source article.
- **Discovery & recency paths** — Listing/count questions and "latest" questions bypass the LLM for exact, deterministic answers.
- **UI** — Split-pane chat + ingestion panel with source cards and an observability strip (indexed count, last-indexed time, models in use).

---

## Architecture Overview

Three stages: an **offline ingestion pipeline** that builds the index, an **online query path** that routes each question to one of three strategies, and a **React UI** driving both.

```mermaid
flowchart TD
    subgraph Ingestion["Ingestion Pipeline (offline, idempotent)"]
        SM[bitovi.com/sitemap.xml] --> SC[Scraper<br/>BeautifulSoup + lxml]
        SC -->|title, body, date, topics| AJ[(articles.json cache)]
        AJ --> CH[ParentDocumentRetriever<br/>child 600 / parent 2000]
        CH -->|child chunks embedded| EMB[OpenAI text-embedding-3-small]
        EMB --> VS[(ChromaDB)]
        CH -->|parent docs| DS[(LocalFileStore)]
    end

    subgraph Query["Query Path (online)"]
        Q[User question] --> R{Router<br/>keyword heuristics}
        R -->|"show me all / how many"| MD[Metadata scan<br/>title · URL · topic tags]
        R -->|"latest / most recent"| RC[Most-recent-by-date]
        R -->|everything else| SEM[Semantic retrieval<br/>top-k = 15]
        SEM --> VS
        RC --> VS
        MD --> VS
        SEM --> CTX[Numbered context] --> LLM[gpt-4o-mini · temp 0]
        RC --> CTX
        LLM --> CITE[Citation filter + renumber]
        MD --> LIST[Exact count / listing]
    end

    subgraph UI["React + Vite UI"]
        CITE --> ANS[Answer + clickable citations]
        LIST --> ANS
        ANS --> CARDS[Source cards → Open Article]
    end
```

---

## Design Decisions

**Why RAG.** The corpus changes and answers must be *attributable*. Fine-tuning gives no provenance and a stale snapshot; a long-context dump is costly per query and dilutes relevance. RAG keeps knowledge external, swappable on re-ingest, and points every answer back to its source.

**Dual-path routing — the core idea.** A blog Q&A system serves two different question shapes, and one pipeline can't do both well:

- *Knowledge queries* ("what testing tools does Bitovi recommend?") need **semantic retrieval**. The relevant passage rarely shares vocabulary with the question — an article recommends Cypress without saying "recommend" — so embedding similarity beats keyword matching. These run the full retrieve → ground → generate pipeline.
- *Discovery queries* ("how many DevOps articles?") need **exact metadata filtering**. Vector search returns the `k` *most similar* chunks — it has no notion of "all" or "how many," so asking it to count is a category error. Instead, a deterministic regex scan runs over **every** article's title, URL slug, and Bitovi `/blog/topic/` tags. Reusing Bitovi's own taxonomy catches articles *tagged* DevOps even when the word isn't in the title; word-boundary matching (`\bAI\b`) avoids false hits like `available`. No LLM, no embeddings, exact results.

A third path handles *recency* ("latest post") by sorting on parsed `published_date` — the right signal for "newest," which similarity is not.

*Tradeoff:* routing is keyword-heuristic, not an LLM classifier — fast, free, deterministic, but brittle on phrasings without a trigger word ("which posts cover X?"). An LLM router is the planned upgrade.

**Parent/child chunking.** Small chunks embed precisely but lack context; large chunks carry context but embed fuzzily. `ParentDocumentRetriever` decouples the two — search over 600-char children (sharp similarity), generate over their 2000-char parents (full argument). The article title is prepended to its content before chunking so proper-name queries ("what is BitOps?") stay retrievable.

**Source attribution.** The prompt makes citation a hard contract. Context is numbered `[Source N]` blocks (chunks from one article share a number). After generation, `_filter_cited_sources` drops every source the model didn't cite and renumbers the rest — so if the model cites sources 6 and 7 of 8, those become `[1]` and `[2]` in both text and cards, never drifting out of sync.

**Hallucination prevention (defense in depth).** Temperature 0; a strict "cite or don't say it" prompt with a partial-answer escape hatch ("note what's missing"); citation filtering so visible sources are the ones actually used; and routing factual counts out of the LLM entirely so they're computed, never generated.

**Retrieval confidence (honest limitation).** Retrieval is a fixed top-`k` of 15 with no similarity threshold or reranker. Confidence today is behavioral — the prompt answers only from context and flags gaps; empty citations are treated as "no usable answer." A score-based gate is a deliberate next step, not an overclaim.

---

## Technology Stack

| Technology | Why |
|---|---|
| **FastAPI + Uvicorn** | Async, Pydantic-validated, auto OpenAPI docs; background tasks drive long-running ingestion. |
| **LangChain** (`langchain-classic`) | Provides `ParentDocumentRetriever` and LCEL for composing the retrieve→generate chain. |
| **ChromaDB** | Persistent, embedded, local-first — no separate server; swappable for a hosted store without touching chain logic. |
| **OpenAI `text-embedding-3-small`** | Strong retrieval at low cost; the small tier is ample for ~460 articles. |
| **OpenAI `gpt-4o-mini` (temp 0)** | Cheap and strong enough for grounded summarization. RAG makes model *quality*, not size, the lever. |
| **BeautifulSoup + lxml** | Forgiving HTML/XML parsing for the sitemap and article pages. |
| **React 19 + Vite + TypeScript** | Fast builds; type-safe API contracts shared with backend response shapes. |
| **Tailwind CSS** | Inline, reviewable styling. |

---

## Installation

**Prerequisites:** Python 3.11+, Node.js 18+, an OpenAI API key.

```bash
# Clone
git clone <repository-url>
cd "Bitovi Blog AI Agent"

# Backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env  # set OPENAI_API_KEY=sk-...

# Frontend
cd frontend
npm install
cp .env.example .env                  # VITE_API_URL defaults to http://localhost:8000
cd ..
```

**Configuration**

| Variable | Location | Required | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | `backend/.env` | **Yes** | Used for embeddings and generation. |
| `VITE_API_URL` | `frontend/.env` | No | Backend base URL (default `http://localhost:8000`). |

Tunables (chunk sizes, `k`, model names) are constants at the top of `backend/ingest.py` and `backend/rag_chain.py`.

---

## Running the Application

```bash
# 1. Backend  (http://localhost:8000)
source .venv/bin/activate && cd backend && python main.py

# 2. Ingest (first run only) — from the UI button, or:
curl -X POST http://localhost:8000/ingest
curl http://localhost:8000/ingest/status   # poll progress
# or standalone: python ingest.py

# 3. Frontend  (http://localhost:5173)
cd frontend && npm run dev
```

Ingestion is **idempotent** — it skips if the index is populated. Articles are cached to `backend/articles.json` so reruns don't re-hit the site. To force a rebuild, delete `backend/chroma_db/`, `backend/docstore/`, and `backend/articles.json`.

---

## Deployment

Hosted on an **Ubuntu VPS (DigitalOcean)** behind two TLS-terminated Apache2 vhosts: the frontend serves the static Vite build, and `api-bitovi.artfricastudio.com` reverse-proxies to Uvicorn on `127.0.0.1:8001` (run as a `systemd` service with auto-restart). The backend is never exposed directly.

**CI/CD:** pushes to `main` trigger a **GitHub Actions** workflow that deploys to the server over SSH.

---

## Retrieval & Citation Workflow

For a knowledge query: **route** (no listing/recency keyword → semantic) → **retrieve** top-15 child chunks, resolve each to its parent → **build** numbered `[Source N]` context (chunks from one article share a number) → **generate** with `gpt-4o-mini` under the citation contract → **filter & renumber** citations to drop unused sources → **return** `{ answer, sources, generation_time }`, which the UI renders with clickable citations and source cards.

---

## Testing

Validated manually but systematically across all three routing paths.

- **Assignment queries** verified end-to-end (latest / discovery / count / knowledge). Discovery counts cross-checked by independently scanning `articles.json` with the same matching logic.
- **Hallucination:** confirmed the model abstains when context lacks the answer, and counts are computed in code so they can't drift.
- **Edge cases fixed:** trailing-punctuation topics (`DevOps.` matched nothing); citation/source number mismatch (`[6][7]` vs cards `[1][2]`); word-boundary matching; empty-body pages skipped at scrape time.

A formal automated eval harness is intentional future work.

---

## Example Queries

| Question | Path | Result |
|---|---|---|
| `What is Bitovi's latest blog post about?` | Recency | Summary of the newest article. |
| `Show me all Bitovi articles about DevOps.` | Discovery | Exact, exhaustive tagged list, newest first. |
| `How many articles does Bitovi have about AI?` | Discovery | Exact count, including topic-tag-only matches. |
| `What testing tools does Bitovi recommend?` | Knowledge | Grounded, citation-backed answer. |
| `What is BitOps?` | Knowledge | Cited definition synthesized from relevant articles. |

---

## Future Improvements

- **LLM-based routing** — replace keyword heuristics so phrasing variants route correctly.
- **Reranking** — a cross-encoder over the top-`k` to improve which passages reach the LLM.
- **Hybrid search** — dense + sparse (BM25) to catch exact terms, acronyms, and product names.
- **Confidence thresholds** — drop low-similarity chunks and abstain when nothing clears the bar.
- **Evaluation framework** — labeled Q/A/source set with recall@k, citation accuracy, faithfulness metrics.
- **Incremental ingestion** — diff the sitemap and ingest only new/changed articles for cheap scheduled refreshes.

---

## Submission Notes

Implements the exercise end-to-end: automated sitemap ingestion (~460 articles with structured metadata), parent/child chunking into a persistent vector store, semantic RAG with fully cited answers, and **deterministic** metadata/tag filtering for discovery queries rather than approximate vector search. The central decision is the **dual-path design** — routing "answer this" and "enumerate matching articles" to the strategy correct for each — with tradeoffs (heuristic routing, no reranker, no score threshold) documented rather than hidden.
