#!/usr/bin/env python3
"""Neon Waypoint: sync public YouTube videos into data/videos.json.

Source: the channel's public RSS feeds (no API key, no quota, no cost).
Shorts vs long: the channel's auto playlists. UUSH... = Shorts, UULF... = long videos.
Fallback if those feeds fail: main feed + a check of youtube.com/shorts/<id>.
Only PUBLIC videos appear in the feeds, so scheduled/private ones are never shown.

Each Short is linked to its full guide in this order:
  1. data/funnel.json "overrides": {"<shortId>": "<longId>"}
  2. first youtu.be / watch?v= link in the Short's description that points at a long video
  3. funnel.json "default_long", else the newest long video
"""
import json, os, re, sys, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

CHANNEL_ID = "UC72GnGlxY2Y8Sbrt71WDqLA"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "videos.json")
FUNNEL = os.path.join(ROOT, "data", "funnel.json")
MAX_SHORTS, MAX_LONGS = 24, 12
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
      "m": "http://search.yahoo.com/mrss/"}
ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
LINK_RE = re.compile(r"(?:youtu\.be/|youtube\.com/watch\?v=)([A-Za-z0-9_-]{11})")
TEST_DIR = os.environ.get("NW_FEED_DIR")  # tests only: read local xml instead of the network


def fetch(name, url):
    if TEST_DIR:
        p = os.path.join(TEST_DIR, name + ".xml")
        return open(p, "rb").read() if os.path.exists(p) else None
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (NeonWaypoint site sync)"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"WARN feed '{name}' failed: {e}", file=sys.stderr)
        return None


def parse(data):
    out = []
    if not data:
        return out
    for e in ET.fromstring(data).findall("a:entry", NS):
        vid = e.findtext("yt:videoId", "", NS)
        if not ID_RE.match(vid):
            continue
        out.append({"id": vid, "title": (e.findtext("a:title", "", NS) or "").strip(),
                    "published": e.findtext("a:published", "", NS),
                    "desc": e.findtext("m:group/m:description", "", NS) or ""})
    return out


def is_short(vid):
    """Fallback: /shorts/<id> answers 200 for a Short and redirects for a normal video."""
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    try:
        op = urllib.request.build_opener(NoRedirect)
        r = op.open(urllib.request.Request(f"https://www.youtube.com/shorts/{vid}",
                    method="HEAD", headers={"User-Agent": "Mozilla/5.0"}), timeout=20)
        return r.status == 200
    except urllib.error.HTTPError:
        return False
    except Exception:
        return None


def main():
    uc = CHANNEL_ID[2:]
    base = "https://www.youtube.com/feeds/videos.xml?"
    shorts = parse(fetch("shorts", base + "playlist_id=UUSH" + uc))
    longs = parse(fetch("long", base + "playlist_id=UULF" + uc))
    method = "playlists"
    if not shorts and not longs:
        method = "main-feed + shorts check"
        allv = parse(fetch("main", base + "channel_id=" + CHANNEL_ID))
        if not allv:
            print("ERROR: no feed returned anything. Keeping the old videos.json.", file=sys.stderr)
            return 1
        for v in allv:
            s = is_short(v["id"])
            if s is None:
                continue
            (shorts if s else longs).append(v)
    print(f"method={method} shorts={len(shorts)} longs={len(longs)}")

    old = {"shorts": [], "longs": []}
    if os.path.exists(OUT):
        old = json.load(open(OUT))

    def merge(new, prev, cap):
        seen = {v["id"]: v for v in prev}          # keep older ones the 15-item feed forgot
        for v in new:
            seen[v["id"]] = v
        return sorted(seen.values(), key=lambda v: v["published"], reverse=True)[:cap]

    new_longs = [{k: v[k] for k in ("id", "title", "published")} for v in longs]
    longs_all = merge(new_longs, old.get("longs", []), MAX_LONGS)
    long_ids = {v["id"] for v in longs_all}
    fun = json.load(open(FUNNEL)) if os.path.exists(FUNNEL) else {}
    overrides, default_long = fun.get("overrides", {}), fun.get("default_long")
    newest_long = longs_all[0]["id"] if longs_all else None
    prev_parent = {v["id"]: v.get("parent") for v in old.get("shorts", [])}

    cards = []
    for v in shorts:
        parent = overrides.get(v["id"])
        if not parent:
            parent = next((m for m in LINK_RE.findall(v["desc"]) if m in long_ids), None)
        parent = parent or default_long or newest_long or prev_parent.get(v["id"])
        cards.append({"id": v["id"], "title": v["title"], "published": v["published"], "parent": parent})
    shorts_all = merge(cards, old.get("shorts", []), MAX_SHORTS)

    doc = {"channel": CHANNEL_ID, "shorts": shorts_all, "longs": longs_all}
    if {k: old.get(k) for k in doc} == doc:
        print("No change.")
        return 0
    doc["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(OUT, "w") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
