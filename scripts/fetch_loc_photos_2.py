import json, time, requests

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}

QUERIES = [
    "Rockaway Beach postcard New York",
    "Rockaway Beach pavilion",
    "Rockaway Beach pier",
    "Rockaway Beach surf bathing",
    "Rockaway Beach hotel pier",
    "Rockaway Beach 1900",
    "Rockaway Beach 1910",
    "Rockaway Beach 1920",
    "Rockaway Beach bungalows",
    "Rockaway Beach street scene",
    "Iron Pier Rockaway",
    "Rockaway Beach train station",
    "Arverne Queens New York",
    "Rockaway Point New York",
    "Jamaica Bay Rockaway",
]

def fetch_query(q, count=50):
    url = "https://www.loc.gov/photos/"
    params = {"q": q, "fo": "json", "c": count}
    r = requests.get(url, params=params, headers=HEADERS, timeout=40)
    r.raise_for_status()
    return r.json()

def main():
    try:
        existing = json.load(open("seed_data/loc_raw.json"))
    except Exception:
        existing = []
    all_items = {it["loc_id"]: it for it in existing}

    for q in QUERIES:
        print(f"Querying: {q}")
        try:
            data = fetch_query(q)
        except Exception as e:
            print(f"  failed: {e}")
            continue
        results = data.get("results", [])
        print(f"  got {len(results)} results")
        for item in results:
            item_id = item.get("id")
            if not item_id or item_id in all_items:
                continue
            if "image_url" not in item or not item.get("image_url"):
                continue
            title = item.get("title") or (item.get("item", {}) or {}).get("call_number", "Untitled")
            date = item.get("date") or (item.get("item", {}) or {}).get("date", "")
            desc = item.get("description")
            if isinstance(desc, list):
                desc = " ".join(desc)
            call_number = (item.get("item", {}) or {}).get("call_number", "")
            image_urls = item.get("image_url", [])
            best_image = image_urls[-1] if image_urls else None
            thumb = image_urls[0] if image_urls else None
            all_items[item_id] = {
                "loc_id": item_id,
                "title": title,
                "date": date,
                "description": desc or "",
                "call_number": call_number,
                "image_url": best_image,
                "thumbnail_url": thumb,
                "source_url": item_id,
                "matched_query": q,
            }
        time.sleep(2)

    print(f"\nTotal unique items collected: {len(all_items)}")
    with open("seed_data/loc_raw.json", "w") as f:
        json.dump(list(all_items.values()), f, indent=2)

if __name__ == "__main__":
    main()
