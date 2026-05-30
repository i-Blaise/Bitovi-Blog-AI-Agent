"""Ingestion module: chunk articles and load them into ChromaDB."""

import json
import os

from dotenv import load_dotenv

load_dotenv()

from langchain_classic.retrievers import ParentDocumentRetriever
from langchain_classic.storage import LocalFileStore, create_kv_docstore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

try:
    from backend import scraper
except ImportError:
    import scraper

CHROMA_PERSIST_DIR = "./chroma_db"
DOCSTORE_DIR = "./docstore"
COLLECTION_NAME = "bitovi_blog"
ARTICLES_JSON_PATH = "./articles.json"

# Small chunks for precise vector retrieval
CHILD_SPLITTER = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=75)

# Larger chunks returned to the LLM for rich context
PARENT_SPLITTER = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")


def load_or_scrape_articles() -> list[dict]:
    """Load articles from articles.json if it exists, otherwise scrape and save.

    This avoids re-scraping the live site on every ingest run.
    """
    if os.path.exists(ARTICLES_JSON_PATH):
        print(f"Loading articles from {ARTICLES_JSON_PATH}...")
        with open(ARTICLES_JSON_PATH, "r", encoding="utf-8") as f:
            articles = json.load(f)
        print(f"Loaded {len(articles)} articles from cache.")
        return articles

    print("No articles.json found — scraping live site...")
    articles = scraper.scrape_all_articles()

    with open(ARTICLES_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(articles)} articles to {ARTICLES_JSON_PATH}.")

    return articles


def build_parent_retriever() -> ParentDocumentRetriever:
    """Build a ParentDocumentRetriever backed by ChromaDB and a local file docstore."""
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
    )
    store = create_kv_docstore(LocalFileStore(DOCSTORE_DIR))

    return ParentDocumentRetriever(
        vectorstore=vectorstore,
        docstore=store,
        child_splitter=CHILD_SPLITTER,
        parent_splitter=PARENT_SPLITTER,
    )


def ingest_with_parent_retriever(
    articles: list[dict],
    progress_callback=None,
) -> int:
    """Persist articles using ParentDocumentRetriever.

    Child chunks (400 chars) are embedded and stored in ChromaDB.
    Parent chunks (2000 chars) are stored in the local file docstore.
    Skips ingestion if ChromaDB already has documents.

    progress_callback(n: int) is called after each batch with the running
    count of articles embedded so far.

    Returns the total child chunk count in the collection after the call.
    """
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
    )
    existing_count = vectorstore._collection.count()
    if existing_count > 0:
        print(
            f"Collection already exists with {existing_count} child chunks. "
            "Skipping ingestion. Delete ./chroma_db and ./docstore to re-ingest."
        )
        return existing_count

    retriever = build_parent_retriever()

    # Full articles as Documents — the retriever handles all splitting.
    # Title is prepended to content so it appears in every chunk's embedding,
    # making proper-name queries (e.g. "Who is the CEO?") far more retrievable.
    documents = [
        Document(
            page_content=f"{article['title']}\n\n{article['content']}",
            metadata={
                "title": article["title"],
                "url": article["url"],
                "published_date": article["published_date"],
                "topics": article.get("topics", ""),
            },
        )
        for article in articles
        if article.get("content")
    ]

    total = len(documents)
    batch_size = 50
    print(f"Ingesting {total} articles (child: 400 chars, parent: 2000 chars)...")

    for start in range(0, total, batch_size):
        batch = documents[start : start + batch_size]
        retriever.add_documents(batch)
        end = min(start + batch_size, total)
        print(f"  Ingested batch {start + 1}–{end} / {total}")
        if progress_callback:
            progress_callback(end)

    final_count = vectorstore._collection.count()
    print(f"All {total} articles ingested into '{COLLECTION_NAME}'. {final_count} child chunks total.")
    return final_count


def main() -> None:
    """Run the full scrape → ingest pipeline."""
    articles = load_or_scrape_articles()
    ingest_with_parent_retriever(articles)
    print("Ingestion complete.")


if __name__ == "__main__":
    main()
