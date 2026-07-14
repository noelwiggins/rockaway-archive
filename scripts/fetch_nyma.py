import time
import json
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
}

BASE = "https://nycrecords.access.preservica.com/"


def fetch_page(query, page):
    params = {"s": query}
    if page > 1:
        params["pg"] = page
    r = requests.get(BASE, params=params, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.text


def parse_page(html):
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for card in soup.select(".result-item"):
        h5a = card.select_one("h5 a")
        if not h5a:
            continue
        title = h5a.get_text(strip=True)
        item_url = h5a["href"]
        img = card.select_one("img.thumbnail")
        thumb = img["src"] if img else None
        id_p = card.select_one(".archive_data_content p")
        identifier = id_p.get_text(strip=True) if id_p else ""
        source_p = card.select_one(".archive_description p")
        desc = source_p.get_text(strip=True) if source_p else ""
        items.append({
            "title": title,
            "item_url": item_url,
            "thumbnail_url": thumb,
            "identifier": identifier,
            "description": desc,
        })
    # total result count, if present, to know when to stop paginating
    total = None
    header = soup.find(string=lambda s: s and "total results" in s)
    if header:
        digits = "".join(c for c in header if c.isdigit())
        if digits:
            total = int(digits)
    return items, total


def scrape(query, max_pages):
    all_items = []
    for page in range(1, max_pages + 1):
        try:
            html = fetch_page(query, page)
        except Exception as e:
            print(f"  page {page} failed: {e}")
            break
        items, total = parse_page(html)
        if not items:
            print(f"  page {page}: no items, stopping")
            break
        print(f"  page {page}: {len(items)} items (total available: {total})")
        all_items.extend(items)
        time.sleep(1.5)
    return all_items


def main():
    plan = [
        ("rockaway beach", 10),
        ("rockaway park queens", 6),
        ("hammels", 6),
        ("arverne", 6),
    ]

    all_items = {}
    for query, max_pages in plan:
        print(f"=== Query: {query} ===")
        items = scrape(query, max_pages)
        for it in items:
            key = it["identifier"] or it["item_url"]
            it["matched_query"] = query
            all_items[key] = it

    print(f"\nTotal unique items: {len(all_items)}")
    with open("seed_data/nyma_raw.json", "w") as f:
        json.dump(list(all_items.values()), f, indent=2)


if __name__ == "__main__":
    main()
