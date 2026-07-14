import json
import time
import re
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
}


def fetch_item_metadata(item_url):
    r = requests.get(item_url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    meta = {}
    # Metadata rows render as "Label: value" paragraph pairs inside the metadata panel
    text = soup.get_text("\n", strip=True)

    date_match = re.search(r"Date:\s*([0-9]{4}(?:-[0-9]{2}-[0-9]{2})?)", text)
    if date_match:
        meta["date"] = date_match.group(1)

    source_match = re.search(r"Source:\s*([^\n]+)", text)
    if source_match:
        meta["source_series"] = source_match.group(1).strip()

    creator_match = re.search(r"Creator:\s*([^\n]+)", text)
    if creator_match:
        meta["creator"] = creator_match.group(1).strip()

    return meta


def main():
    items = json.load(open("seed_data/nyma_seed.json"))
    to_enrich = [it for it in items if it["latitude"] is not None or it["neighborhood"] in ("Hammels", "Arverne")]
    print(f"Enriching {len(to_enrich)} of {len(items)} items")

    for i, item in enumerate(to_enrich):
        try:
            meta = fetch_item_metadata(item["source_url"])
        except Exception as e:
            print(f"  [{i}] failed for {item['source_url']}: {e}")
            continue
        if meta.get("date"):
            item["display_date"] = meta["date"]
        if meta.get("source_series"):
            item["description"] = meta["source_series"]
        print(f"  [{i+1}/{len(to_enrich)}] {item['title'][:50]!r} -> {meta.get('date', '?')}")
        time.sleep(1.2)

    with open("seed_data/nyma_seed.json", "w") as f:
        json.dump(items, f, indent=2)
    print("Done.")


if __name__ == "__main__":
    main()
