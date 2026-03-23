import os
import threading
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from .artist_repository import load_artists

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ARTIST_IMAGE_DIR = os.path.join(BASE_DIR, "js", "images")
ARTIST_IMAGE_BASE_URL = "https://thetacursed.github.io/Anima-Style-Explorer/images"

_download_status = {"active": False, "total": 0, "done": 0}
_download_lock = threading.Lock()


def image_target(item):
    page_id = item.get("p", 1)
    artist_id = str(item.get("id", "") or "")
    if not artist_id:
        return "", "", ""

    url = f"{ARTIST_IMAGE_BASE_URL}/{page_id}/{artist_id}.webp"
    path = os.path.join(ARTIST_IMAGE_DIR, str(page_id), f"{artist_id}.webp")
    return artist_id, url, path


def ensure_artist_image_cached(item, timeout=5):
    artist_id, url, path = image_target(item or {})
    if not artist_id:
        return False

    if os.path.exists(path) and os.path.getsize(path) > 100:
        return True

    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with urllib.request.urlopen(url, timeout=timeout) as response:
            data = response.read()
        if len(data) <= 100:
            return False
        with open(path, "wb") as handle:
            handle.write(data)
        return True
    except Exception as error:
        print(f" [AnimaArtistBrowser] Could not cache preview {artist_id}: {error}")
        return os.path.exists(path) and os.path.getsize(path) > 100


def _download_one(item):
    artist_id, _, _ = image_target(item)
    if not artist_id:
        return

    ensure_artist_image_cached(item, timeout=15)
    with _download_lock:
        _download_status["done"] += 1


def start_artist_image_download():
    global _download_status

    with _download_lock:
        if _download_status["active"]:
            return False
        artists = load_artists()
        if not artists:
            return False
        _download_status = {"active": True, "total": len(artists), "done": 0}

    def _run():
        try:
            with ThreadPoolExecutor(max_workers=10) as executor:
                executor.map(_download_one, artists)
        finally:
            with _download_lock:
                _download_status["active"] = False

    threading.Thread(target=_run, daemon=True).start()
    return True


def get_artist_image_download_status():
    with _download_lock:
        return dict(_download_status)
