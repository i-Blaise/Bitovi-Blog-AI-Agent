"""Ingestion module: chunk articles and load them into ChromaDB."""

import sys
import os

from dotenv import load_dotenv

load_dotenv()

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

try:
    from backend import scraper  # when imported as backend.ingest
except ImportError:
    import scraper  # when run directly: python ingest.py

CHROMA_PERSIST_DIR = "./chroma_db"
COLLECTION_NAME = "bitovi_blog"

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")


def chunk_articles(articles: list[dict]) -> list[Document]:
    """Split article dicts into LangChain Document chunks.

    Uses RecursiveCharacterTextSplitter with chunk_size=1000 and
    chunk_overlap=150. Metadata (title, url, published_date) is preserved
    on every chunk.
    """
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    all_chunks: list[Document] = []

    for article in articles:
        doc = Document(
            page_content=article["content"],
            metadata={
                "title": article["title"],
                "url": article["url"],
                "published_date": article["published_date"],
            },
        )
        chunks = splitter.split_documents([doc])
        all_chunks.extend(chunks)

    return all_chunks


def ingest_to_chroma(documents: list[Document]) -> None:
    """Persist Document chunks into the ChromaDB collection.

    Skips ingestion if the collection already contains documents. Delete
    the ./chroma_db directory to force a fresh ingest.
    """
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
    )

    existing_count = vectorstore._collection.count()
    if existing_count > 0:
        print(
            f"Collection already exists with {existing_count} documents. "
            "Skipping ingestion. Delete ./chroma_db to re-ingest."
        )
        return

    total = len(documents)
    batch_size = 100
    print(f"Ingesting {total} chunks in batches of {batch_size}...")

    for start in range(0, total, batch_size):
        batch = documents[start : start + batch_size]
        vectorstore.add_documents(batch)
        end = min(start + batch_size, total)
        print(f"  Ingested batch {start + 1}–{end} / {total}")

    print(f"All {total} chunks ingested into '{COLLECTION_NAME}'.")


def main() -> None:
    """Run the full scrape → chunk → ingest pipeline."""
    articles = scraper.scrape_all_articles()
    documents = chunk_articles(articles)
    print(f"Total chunks: {len(documents)}")
    ingest_to_chroma(documents)
    print("Ingestion complete.")


if __name__ == "__main__":
    main()
