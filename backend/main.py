"""FastAPI application exposing the Bitovi Blog RAG query endpoint."""

import json
import os
import threading
import time
import uvicorn
from datetime import datetime
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from backend.rag_chain import query_rag
    from backend import ingest, scraper
except ImportError:
    from rag_chain import query_rag
    import ingest, scraper

app = FastAPI(title="Bitovi Blog AI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Ingest state ---
_ingest_state: dict = {"status": "idle", "scraped": 0, "total": 0, "chunks": 0, "ingested": 0, "ingesting_total": 0, "error": None}
_ingest_lock = threading.Lock()


def _run_ingest() -> None:
    """Run the full scrape → chunk → ingest pipeline in a background thread."""
    global _ingest_state
    try:
        with _ingest_lock:
            _ingest_state = {"status": "scraping", "scraped": 0, "total": 0, "chunks": 0, "ingested": 0, "ingesting_total": 0, "error": None}

        # Use cached JSON if available, otherwise scrape live
        import os
        if os.path.exists(ingest.ARTICLES_JSON_PATH):
            articles = ingest.load_or_scrape_articles()
            with _ingest_lock:
                _ingest_state["scraped"] = len(articles)
                _ingest_state["total"] = len(articles)
        else:
            urls = scraper.get_all_blog_urls()
            total = len(urls)
            with _ingest_lock:
                _ingest_state["total"] = total

            articles = []
            for i, url in enumerate(urls, start=1):
                result = scraper.scrape_article(url)
                if result is not None:
                    articles.append(result)
                with _ingest_lock:
                    _ingest_state["scraped"] = i

            import json
            with open(ingest.ARTICLES_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(articles, f, ensure_ascii=False, indent=2)

        doc_count = sum(1 for a in articles if a.get("content"))
        with _ingest_lock:
            _ingest_state["status"] = "ingesting"
            _ingest_state["ingesting_total"] = doc_count

        def _on_progress(n: int) -> None:
            with _ingest_lock:
                _ingest_state["ingested"] = n

        chunk_count = ingest.ingest_with_parent_retriever(articles, progress_callback=_on_progress)

        with _ingest_lock:
            _ingest_state["chunks"] = chunk_count
            _ingest_state["status"] = "complete"

    except Exception as exc:
        with _ingest_lock:
            _ingest_state["status"] = "error"
            _ingest_state["error"] = str(exc)


# --- Pydantic models ---

class QueryRequest(BaseModel):
    """Request body for the /query endpoint."""
    question: str


class Source(BaseModel):
    """A single source document reference."""
    title: str
    url: str
    published_date: str
    excerpt: str | None = None


class QueryResponse(BaseModel):
    """Response body for the /query endpoint."""
    answer: str
    sources: list[Source]
    generation_time: str


class IngestStatus(BaseModel):
    """Response body for the /ingest/status endpoint."""
    status: str
    scraped: int
    total: int
    chunks: int
    ingested: int
    ingesting_total: int
    error: str | None


class SystemStats(BaseModel):
    """Response body for the /stats endpoint."""
    indexed_articles: int | None
    last_indexed: str | None
    embedding_model: str
    generation_model: str


# --- Endpoints ---

@app.get("/health")
def health_check() -> dict:
    """Return a simple liveness check."""
    return {"status": "ok"}


@app.post("/ingest", status_code=202)
def start_ingest(background_tasks: BackgroundTasks) -> dict:
    """Kick off the scrape → chunk → ingest pipeline in the background.

    Returns immediately with 202 Accepted. Poll /ingest/status for progress.
    """
    with _ingest_lock:
        if _ingest_state["status"] in ("scraping", "ingesting"):
            raise HTTPException(status_code=409, detail="Ingestion already in progress.")

    background_tasks.add_task(_run_ingest)
    return {"status": "started"}


@app.get("/ingest/status", response_model=IngestStatus)
def ingest_status() -> IngestStatus:
    """Return the current state of the ingestion pipeline."""
    with _ingest_lock:
        state = _ingest_state.copy()
    return IngestStatus(**state)


@app.get("/stats", response_model=SystemStats)
def stats() -> SystemStats:
    """Return system observability metrics."""
    indexed_articles: int | None = None
    last_indexed: str | None = None

    if os.path.exists(ingest.ARTICLES_JSON_PATH):
        try:
            with open(ingest.ARTICLES_JSON_PATH, "r", encoding="utf-8") as f:
                articles = json.load(f)
            indexed_articles = sum(1 for a in articles if a.get("content"))
            mtime = os.path.getmtime(ingest.ARTICLES_JSON_PATH)
            last_indexed = datetime.fromtimestamp(mtime).strftime("%b %d, %Y %H:%M")
        except Exception:
            pass

    return SystemStats(
        indexed_articles=indexed_articles,
        last_indexed=last_indexed,
        embedding_model="text-embedding-3-small",
        generation_model="gpt-4o-mini",
    )


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest) -> QueryResponse:
    """Run a RAG query against the Bitovi blog knowledge base.

    Accepts a JSON body with a 'question' field and returns an answer
    along with the source articles that informed the response.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    try:
        t0 = time.perf_counter()
        result = query_rag(request.question)
        generation_time = f"{time.perf_counter() - t0:.1f}s"
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}") from exc

    return QueryResponse(
        answer=result["answer"],
        sources=[Source(**s) for s in result["sources"]],
        generation_time=generation_time,
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
