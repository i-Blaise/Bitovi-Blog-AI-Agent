"""Scraper module for fetching Bitovi blog articles from the sitemap."""

import re
import time

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; BitoviRAGBot/1.0; +https://github.com/bitovi)"
    )
}


def get_all_blog_urls() -> list[str]:
    """Fetch and parse Bitovi's sitemap, returning all blog article URLs.

    Filters out tag, author, and category index pages, returning only
    individual article URLs.
    """
    sitemap_url = "https://www.bitovi.com/sitemap.xml"
    print(f"Fetching sitemap: {sitemap_url}")

    response = requests.get(sitemap_url, headers=HEADERS, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, "lxml-xml")
    all_locs = [tag.get_text(strip=True) for tag in soup.find_all("loc")]
    print(f"Found {len(all_locs)} total URLs in sitemap")

    blog_urls = []
    for url in all_locs:
        if "/blog/" not in url:
            continue
        # Skip index-style pages
        if re.search(r"/blog/$", url):
            continue
        if "/blog/tag/" in url:
            continue
        if "/blog/author/" in url:
            continue
        blog_urls.append(url)

    deduplicated = list(set(blog_urls))
    print(f"Filtered to {len(deduplicated)} unique blog article URLs")
    return deduplicated


def scrape_article(url: str) -> dict | None:
    """Scrape a single Bitovi blog article and return its structured data.

    Returns a dict with keys: title, content, url, published_date.
    Returns None if the page cannot be fetched or parsed.
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"  ERROR fetching {url}: {exc}")
        return None

    soup = BeautifulSoup(response.text, "lxml")

    # --- Title ---
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"].strip()
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()
    else:
        title = url

    # --- Content ---
    element = soup.select_one("article")
    raw_text = element.get_text(separator=" ", strip=True) if element else ""

    # Collapse whitespace
    content = re.sub(r"\s+", " ", raw_text).strip()

    if not content:
        print(f"  SKIP (no <article> content): {url}")
        return None

    # --- Published date ---
    time_tag = soup.find("time")
    published_date = time_tag.get_text(strip=True) if time_tag else ""

    # --- Topics ---
    # Collect unique topic slugs from /blog/topic/ links on the page.
    # Stored as space-separated slugs (hyphens removed) for easy regex matching.
    seen_slugs: set[str] = set()
    topic_parts: list[str] = []
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if "/blog/topic/" not in href:
            continue
        slug = href.split("/blog/topic/")[-1].rstrip("/").lower()
        if slug and slug not in seen_slugs:
            seen_slugs.add(slug)
            topic_parts.append(slug.replace("-", " "))
    topics = " ".join(topic_parts)

    time.sleep(0.5)

    return {
        "title": title,
        "content": content,
        "url": url,
        "published_date": published_date,
        "topics": topics,
    }


def scrape_all_articles() -> list[dict]:
    """Scrape all Bitovi blog articles discovered in the sitemap.

    Returns a list of article dicts (title, content, url, published_date).
    """
    urls = get_all_blog_urls()
    total = len(urls)
    articles = []

    for i, url in enumerate(urls, start=1):
        print(f"Scraping {i}/{total}: {url}")
        result = scrape_article(url)
        if result is not None:
            articles.append(result)

    print(f"\nSuccessfully scraped {len(articles)}/{total} articles")
    return articles
