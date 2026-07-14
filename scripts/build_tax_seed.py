import json

data = json.load(open("seed_data/tax_photos_full.json"))
out = []
for item in data:
    io_id = item["io_id"]
    out.append({
        "title": item["title"] if item["title"] else item["pluto_address"].title(),
        "description": f"Tax photograph. Block {item['block']} Lot {item['lot']}. Address on file: {item['pluto_address']}.",
        "display_date": "1980s (tax photo survey)",
        "neighborhood": item["neighborhood"],
        "latitude": round(item["latitude"], 6),
        "longitude": round(item["longitude"], 6),
        "location_precision": "exact_address",
        "location_note": "Geocoded from the property's Borough-Block-Lot via NYC's PLUTO tax lot database — this pin marks the actual building.",
        "image_url": f"https://nycrecords.access.preservica.com/download/file/{io_id}",
        "thumbnail_url": item["thumbnail_url"],
        "source": "NYC Municipal Archives",
        "source_url": item["detail_url"],
        "call_number": f"Block {item['block']} Lot {item['lot']}",
    })

json.dump(out, open("seed_data/tax_photos_seed.json", "w"), indent=2)
print(f"{len(out)} tax photo entries ready")
from collections import Counter
print(Counter(o["neighborhood"] for o in out))
