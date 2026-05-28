"""RAG chain module: loads ChromaDB and exposes a query function."""

from dotenv import load_dotenv

load_dotenv()

from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnablePassthrough
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

CHROMA_PERSIST_DIR = "./chroma_db"
COLLECTION_NAME = "bitovi_blog"

_SYSTEM_PROMPT = (
    "You are an AI assistant that answers questions based solely on Bitovi's blog articles.\n"
    "Use only the provided context to answer. If the context does not contain enough information\n"
    "to answer the question, say so clearly. Always be concise and helpful.\n\n"
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

retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5},
)


def _format_docs(docs: list) -> str:
    """Join document page_content strings for use as prompt context."""
    return "\n\n".join(doc.page_content for doc in docs)


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
        context = _format_docs(inputs["source_documents"])
        formatted = prompt.invoke({"context": context, "question": inputs["question"]})
        answer = llm.invoke(formatted)
        return {
            "result": answer.content,
            "source_documents": inputs["source_documents"],
        }

    return retrieve_step | RunnableLambda(_generate)


def query_rag(question: str) -> dict:
    """Run the RAG chain for the given question and return the answer with sources.

    Returns a dict with keys:
      - answer (str): the LLM's response
      - sources (list[dict]): deduplicated list of {title, url} from retrieved docs
    """
    result = rag_chain.invoke(question)

    answer: str = result["result"]

    seen_urls: set[str] = set()
    sources: list[dict] = []
    for doc in result.get("source_documents", []):
        url = doc.metadata.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            sources.append(
                {
                    "title": doc.metadata.get("title", ""),
                    "url": url,
                }
            )

    return {"answer": answer, "sources": sources}


# Initialise once so FastAPI doesn't rebuild on every request
rag_chain = build_rag_chain()
