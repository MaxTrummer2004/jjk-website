"""Query Met API: for each search term, list public-domain objects with images."""
import json, sys, time, urllib.request, urllib.parse

BASE = "https://collectionapi.metmuseum.org/public/collection/v1"

def get(url):
    for _ in range(3):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                return json.load(r)
        except Exception:
            time.sleep(1)
    return None

def scan(term, limit=25):
    q = urllib.parse.quote(term)
    data = get(f"{BASE}/search?hasImages=true&q={q}")
    ids = (data or {}).get("objectIDs") or []
    print(f"\n=== {term} ({len(ids)} hits, showing up to {limit}) ===")
    for oid in ids[:limit]:
        o = get(f"{BASE}/objects/{oid}")
        if not o or not o.get("isPublicDomain") or not o.get("primaryImage"):
            continue
        print(f"{oid} | {o.get('objectDate','?')} | {o.get('artistDisplayName','?')} | "
              f"{o.get('title','?')[:80]} | {o.get('classification','?')}")

if __name__ == "__main__":
    for t in sys.argv[1:]:
        scan(t)
