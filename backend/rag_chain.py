"""RAG chain module: loads ChromaDB and exposes a query function."""

from dotenv import load_dotenv

load_dotenv()

from langchain_classic.retrievers import ParentDocumentRetriever
from langchain_classic.storage import LocalFileStore, create_kv_docstore
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnablePassthrough
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

CHROMA_PERSIST_DIR = "./chroma_db"
DOCSTORE_DIR = "./docstore"
COLLECTION_NAME = "bitovi_blog"

LISTING_KEYWORDS = [
    "show me all",
    "list all",
    "all articles",
    "all blogs",
    "all blog posts",
    "all posts",
    "every article",
    "every blog",
    "every post",
    "how many articles",
    "how many blogs",
    "how many blog posts",
    "how many posts",
]

RECENCY_KEYWORDS = [
    "latest",
    "most recent",
    "newest",
    "recent",
    "last blog",
    "last article",
    "last post",
    "new article",
    "new blog",
    "new post",
    "just published",
    "this week",
    "this month",
    "current",
    "today",
]

OLDEST_KEYWORDS = [
    "oldest",
    "earliest",
    "very first",
    "first blog",
    "first article",
    "first post",
    "first ever",
]

_SYSTEM_PROMPT = (
    "You are an AI assistant that answers questions based on Bitovi's blog articles.\n\n"
    "Use the numbered context below to answer the question. Each source is labeled [Source N].\n"
    "CITATION RULES — follow these exactly:\n"
    "- Every sentence or clause that draws on a source MUST end with its citation in square brackets, e.g. [1] or [2][3].\n"
    "- If multiple sources support the same point, cite all of them: [1][3].\n"
    "- Do not write any factual claim without a citation. If you cannot cite it, do not say it.\n"
    "- Never group all citations at the end of a paragraph — place each one immediately after the claim it supports.\n"
    "If the context partially addresses the question, share what you can find and note what's missing.\n"
    "Only say you cannot answer if there is no relevant information in the context at all.\n"
    "Be concise and helpful.\n\n"
    "Context:\n{context}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

vectorstore = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
    persist_directory=CHROMA_PERSIST_DIR,
)

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=create_kv_docstore(LocalFileStore(DOCSTORE_DIR)),
    child_splitter=RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=75),
    parent_splitter=RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200),
    search_kwargs={"k": 15},
)


def _is_listing_query(question: str) -> bool:
    """Return True if the question is asking to list all articles on a topic."""
    lowered = question.lower()
    return any(keyword in lowered for keyword in LISTING_KEYWORDS)


def _extract_topic(question: str) -> str | None:
    """Extract the topic from a listing query.

    Looks for text following 'about', 'on', or 'regarding'.
    Returns None if no topic can be extracted.
    """
    import re
    match = re.search(r"(?:about|on|regarding)\s+(.+?)(?:[?.!]|$)", question, re.IGNORECASE)
    if not match:
        return None
    return match.group(1).strip().rstrip(".,!?;:")


def _search_articles_by_topic(topic: str) -> list[dict]:
    """Scan all ChromaDB metadata and return unique articles whose title or URL contains the topic.

    Uses word boundary matching so 'AI' does not match 'training' or 'available'.
    """
    import re
    all_metadata = vectorstore._collection.get(include=["metadatas"])
    pattern = re.compile(r"\b" + re.escape(topic) + r"\b", re.IGNORECASE)

    seen_urls: set[str] = set()
    matches: list[dict] = []

    for meta in all_metadata["metadatas"]:
        url = meta.get("url", "")
        title = meta.get("title", "")
        if url in seen_urls:
            continue
        # Replace URL hyphens with spaces so "devops" matches "devops-consulting"
        url_readable = url.replace("-", " ").replace("/", " ")
        topics = meta.get("topics", "")
        if pattern.search(title) or pattern.search(url_readable) or (topics and pattern.search(topics)):
            seen_urls.add(url)
            matches.append({
                "title": title,
                "url": url,
                "published_date": meta.get("published_date", ""),
            })

    # Sort by date descending, unparseable dates go to the bottom
    matches.sort(key=lambda a: _parse_date(a["published_date"]), reverse=True)
    return matches


def _is_recency_query(question: str) -> bool:
    """Return True if the question contains any recency-related keywords."""
    lowered = question.lower()
    return any(keyword in lowered for keyword in RECENCY_KEYWORDS)


def _is_oldest_query(question: str) -> bool:
    """Return True if the question asks for the oldest/first article."""
    lowered = question.lower()
    return any(keyword in lowered for keyword in OLDEST_KEYWORDS)


def _parse_date(date_str: str):
    """Parse a date string like 'May 28, 2026' into a comparable datetime object."""
    from datetime import datetime
    try:
        return datetime.strptime(date_str.strip(), "%B %d, %Y")
    except ValueError:
        return datetime.min


def _get_chunks_by_date_extreme(oldest: bool = False) -> list:
    """Fetch all chunks belonging to the oldest or most recently published article.

    `oldest=False` returns the newest article (recency path); `oldest=True`
    returns the earliest. Chunks whose date can't be parsed are excluded so an
    unparseable date can't masquerade as the "oldest" entry.
    """
    from datetime import datetime
    all_metadata = vectorstore._collection.get(include=["metadatas", "documents"])

    # Keep only chunks with a parseable publication date
    chunks_with_dates = [
        (doc, meta)
        for doc, meta in zip(all_metadata["documents"], all_metadata["metadatas"])
        if meta.get("published_date") and _parse_date(meta["published_date"]) != datetime.min
    ]

    if not chunks_with_dates:
        return []

    pick = min if oldest else max
    target_date = pick(
        (meta["published_date"] for _, meta in chunks_with_dates),
        key=_parse_date,
    )

    # Return all chunks from that article as LangChain-style objects
    from langchain_core.documents import Document
    return [
        Document(page_content=doc, metadata=meta)
        for doc, meta in chunks_with_dates
        if meta["published_date"] == target_date
    ]


_BLOG_BASE = "https://www.bitovi.com/blog/"


def _make_slug(url: str) -> str:
    return url.replace(_BLOG_BASE, "").rstrip("/") if url.startswith(_BLOG_BASE) else url


def _make_excerpt(text: str, title: str, max_chars: int = 150) -> str:
    # Strip the injected title prefix so the excerpt starts with article prose
    if title and text.startswith(title):
        text = text[len(title):].lstrip("\n").lstrip()
    text = text.strip()
    if len(text) <= max_chars:
        return text
    trimmed = text[:max_chars]
    last_space = trimmed.rfind(" ")
    if last_space > 0:
        trimmed = trimmed[:last_space]
    return trimmed + "…"


def _build_numbered_context(docs: list) -> tuple[str, list[dict]]:
    """Build numbered context for the LLM and a parallel unique-source list.

    Each unique URL gets a source number. Chunks from the same article share
    the same number. The returned source list is indexed so that source N
    corresponds to sources[N-1].
    """
    url_to_num: dict[str, int] = {}
    sources: list[dict] = []
    parts: list[str] = []

    for doc in docs:
        url = doc.metadata.get("url", "")
        if not url:
            continue
        title = doc.metadata.get("title", "")
        if url not in url_to_num:
            url_to_num[url] = len(sources) + 1
            sources.append({
                "title": title,
                "url": url,
                "published_date": doc.metadata.get("published_date", ""),
                "excerpt": _make_excerpt(doc.page_content, title),
            })
        num = url_to_num[url]
        date = doc.metadata.get("published_date", "")
        header = f"[Source {num}: {title}"
        if date:
            header += f" — Published: {date}"
        header += "]"
        parts.append(f"{header}\n{doc.page_content}")

    return "\n\n".join(parts), sources


def _filter_cited_sources(answer: str, sources: list[dict]) -> tuple[str, list[dict]]:
    """Return only sources cited in the answer, with citations renumbered to match.

    The LLM may cite [6][7] out of 8 sources. This filters to just those two,
    then rewrites [6] → [1] and [7] → [2] in the answer so the inline numbers
    always match the displayed source cards.

    Returns (renumbered_answer, filtered_sources).
    """
    import re
    cited_nums = {int(m) for m in re.findall(r"\[(?:source\s+)?(\d+)\]", answer, re.IGNORECASE)}
    filtered = [s for i, s in enumerate(sources, 1) if i in cited_nums]

    # Build old-number → new-number mapping (order preserved from filtered list)
    url_to_new: dict[str, int] = {s["url"]: i + 1 for i, s in enumerate(filtered)}
    old_to_new: dict[int, int] = {}
    for old_i, s in enumerate(sources, 1):
        new = url_to_new.get(s["url"])
        if new is not None:
            old_to_new[old_i] = new

    def _replace(m: re.Match) -> str:
        old = int(m.group(1))
        new = old_to_new.get(old)
        return f"[{new}]" if new else ""

    renumbered = re.sub(r"\[(?:source\s+)?(\d+)\]", _replace, answer, flags=re.IGNORECASE)
    return renumbered, filtered



def build_rag_chain():
    """Build a LCEL RAG chain backed by the Bitovi ChromaDB collection.

    The chain accepts a question string and returns a dict with keys:
      - result (str): the LLM's answer
      - source_documents (list[Document]): the retrieved chunks
    """
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=_SYSTEM_PROMPT,
    )

    retrieve_step = RunnableParallel(
        source_documents=retriever,
        question=RunnablePassthrough(),
    )

    def _generate(inputs: dict) -> dict:
        context, numbered_sources = _build_numbered_context(inputs["source_documents"])
        formatted = prompt.invoke({"context": context, "question": inputs["question"]})
        answer = llm.invoke(formatted)
        return {
            "result": answer.content,
            "numbered_sources": numbered_sources,
        }

    return retrieve_step | RunnableLambda(_generate)


def _summarize_documents(question: str, source_documents: list) -> dict:
    """Generate a cited answer from a fixed set of source documents.

    Shared by the recency and oldest paths: both select a single article by
    date, then run it through the same numbered-context → generate → cite
    pipeline used for knowledge queries.
    """
    if not source_documents:
        return {"answer": "I could not find any articles with a publication date.", "sources": []}

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=_SYSTEM_PROMPT,
    )
    context, numbered_sources = _build_numbered_context(source_documents)
    formatted = prompt.invoke({"context": context, "question": question})
    answer = llm.invoke(formatted).content
    answer, sources = _filter_cited_sources(answer, numbered_sources)
    return {"answer": answer, "sources": sources}


def query_rag(question: str) -> dict:
    """Run the RAG chain for the given question and return the answer with sources.

    Routes to one of four paths: listing (exact metadata match), recency and
    oldest (single article selected by date), or semantic RAG (default).

    Returns a dict with keys:
      - answer (str): the LLM's response
      - sources (list[dict]): deduplicated list of {title, url} from retrieved docs
    """
    if _is_listing_query(question):
        topic = _extract_topic(question)
        if topic:
            matches = _search_articles_by_topic(topic)
            if matches:
                answer = f"Found {len(matches)} article(s) about '{topic}'."
            else:
                answer = f"No articles found about '{topic}'."
            return {"answer": answer, "sources": matches}
        # If no topic could be extracted fall through to normal RAG

    if _is_recency_query(question):
        return _summarize_documents(question, _get_chunks_by_date_extreme(oldest=False))

    if _is_oldest_query(question):
        return _summarize_documents(question, _get_chunks_by_date_extreme(oldest=True))

    result = rag_chain.invoke(question)
    answer = result["result"]
    numbered_sources = result.get("numbered_sources", [])
    answer, sources = _filter_cited_sources(answer, numbered_sources)

    return {"answer": answer, "sources": sources}


# Initialise once so FastAPI doesn't rebuild on every request
rag_chain = build_rag_chain()
