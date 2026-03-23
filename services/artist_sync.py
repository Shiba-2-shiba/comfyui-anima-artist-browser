import json
import re
import time
import urllib.request

from .artist_repository import get_artists_data_path, save_artists

ARTIST_DATA_URL = "https://thetacursed.github.io/Anima-Style-Explorer/app/data.js"
_GALLERY_DATA_RE = re.compile(r"const galleryData\s*=\s*(\[[\s\S]*?\]);")


def build_cache_busted_url(source_url=ARTIST_DATA_URL):
    return f"{source_url}&t={int(time.time())}" if "?" in source_url else f"{source_url}?t={int(time.time())}"


def parse_remote_artist_script(script_text):
    match = _GALLERY_DATA_RE.search(script_text or "")
    if not match:
        raise ValueError("Could not find galleryData in JS file.")

    items = json.loads(match.group(1))
    return [
        {
            "id": str(item.get("id", "")),
            "tag": item.get("name", ""),
            "works": item.get("post_count", 0),
            "p": item.get("p", 1),
            "uniqueness_score": item.get("uniqueness_score", 0),
        }
        for item in items
    ]


def download_artists(source_url=ARTIST_DATA_URL):
    try:
        url_busted = build_cache_busted_url(source_url)
        print(f" [AnimaArtistBrowser] Fetching artist data from {url_busted}...")
        with urllib.request.urlopen(url_busted) as response:
            content = response.read().decode("utf-8")

        artists = parse_remote_artist_script(content)
        save_artists(artists)

        print(f" [AnimaArtistBrowser] SUCCESS: Saved {len(artists)} artists to {get_artists_data_path()}.")
        return True
    except Exception as error:
        print(f" [AnimaArtistBrowser] DOWNLOAD ERROR: {error}")
        return False
