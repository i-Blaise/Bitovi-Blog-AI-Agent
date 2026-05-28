"""FastAPI application exposing the Bitovi Blog RAG query endpoint."""

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from backend.rag_chain import query_rag  # when imported as backend.main
except ImportError:
    from rag_chain import query_rag  # when run directly: python main.py

app = FastAPI(title="Bitovi Blog AI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    """Request body for the /query endpoint."""

    question: str


class Source(BaseModel):
    """A single source document reference."""

    title: str
    url: str


class QueryResponse(BaseModel):
    """Response body for the /query endpoint."""

    answer: str
    sources: list[Source]


@app.get("/health")
def health_check() -> dict:
    """Return a simple liveness check."""
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest) -> QueryResponse:
    """Run a RAG query against the Bitovi blog knowledge base.

    Accepts a JSON body with a 'question' field and returns an answer
    along with the source articles that informed the response.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    try:
        result = query_rag(request.question)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}") from exc

    return QueryResponse(
        answer=result["answer"],
        sources=[Source(**s) for s in result["sources"]],
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
