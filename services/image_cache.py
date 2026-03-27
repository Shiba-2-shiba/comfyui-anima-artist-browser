import os
import threading
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from .artist_sync import download_artists
from .artist_repository import load_artists
from .preview_files import artist_image_path

ARTIST_IMAGE_BASE_URL = "https://thetacursed.github.io/Anima-Style-Explorer/images"

_download_status = {
    "active": False,
    "total": 0,
    "done": 0,
    "phase": "idle",
    "message": "",
    "mode": "download_images",
}
_download_lock = threading.Lock()


def image_target(item):
    page_id = item.get("p", 1)
    artist_id = str(item.get("id", "") or "")
    if not artist_id:
        return "", "", ""

    url = f"{ARTIST_IMAGE_BASE_URL}/{page_id}/{artist_id}.webp"
    path = artist_image_path(page_id, artist_id)
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
    return _start_download(refresh_artists=False)


def start_local_snapshot_sync():
    return _start_download(refresh_artists=True)


def _start_download(*, refresh_artists):
    global _download_status

    with _download_lock:
        if _download_status["active"]:
            return False
        artists = load_artists()
        _download_status = {
            "active": True,
            "total": len(artists),
            "done": 0,
            "phase": "preparing",
            "message": "Preparing local snapshot...",
            "mode": "sync_local_snapshot" if refresh_artists else "download_images",
        }

    def _run():
        try:
            if refresh_artists:
                with _download_lock:
                    _download_status["phase"] = "artist_data"
                    _download_status["message"] = "Downloading artist data..."

                if not download_artists():
                    with _download_lock:
                        _download_status["phase"] = "failed"
                        _download_status["message"] = "Could not download artist data."
                    return

            artists = load_artists()
            if not artists:
                with _download_lock:
                    _download_status["phase"] = "failed"
                    _download_status["message"] = "No local artist data is available."
                return

            with _download_lock:
                _download_status["phase"] = "preview_images"
                _download_status["message"] = "Downloading preview images..."
                _download_status["total"] = len(artists)
                _download_status["done"] = 0

            with ThreadPoolExecutor(max_workers=10) as executor:
                executor.map(_download_one, artists)

            with _download_lock:
                _download_status["phase"] = "complete"
                _download_status["message"] = "Local snapshot is ready."
        finally:
            with _download_lock:
                _download_status["active"] = False

    threading.Thread(target=_run, daemon=True).start()
    return True


def get_artist_image_download_status():
    with _download_lock:
        return dict(_download_status)
