import json
import os
import threading

from .preview_files import artist_image_exists, artist_image_url, artist_image_version

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ARTISTS_DATA_PATH = os.path.join(BASE_DIR, "data", "artists.json")

_cache = []
_cache_mtime = 0
_cache_lock = threading.Lock()


def get_artists_data_path():
    return ARTISTS_DATA_PATH


def normalize_artist_record(item):
    if not isinstance(item, dict):
        return None

    normalized = dict(item)
    if "id" in normalized:
        normalized["id"] = str(normalized.get("id", ""))
    normalized.setdefault("tag", normalized.get("name", ""))
    normalized.setdefault("works", normalized.get("post_count", 0))
    normalized.setdefault("p", 1)
    normalized.setdefault("uniqueness_score", 0)
    preview_cached = artist_image_exists(normalized.get("p", 1), normalized.get("id", ""))
    normalized["localPreviewCached"] = preview_cached
    if preview_cached:
        image_url = artist_image_url(normalized.get("p", 1), normalized.get("id", ""))
        image_version = artist_image_version(normalized.get("p", 1), normalized.get("id", ""))
        normalized["localImageUrl"] = f"{image_url}?v={image_version}" if image_version else image_url
    else:
        normalized["localImageUrl"] = ""
    return normalized


def save_artists(artists):
    global _cache, _cache_mtime

    normalized = [entry for entry in (normalize_artist_record(item) for item in artists) if entry]

    os.makedirs(os.path.dirname(ARTISTS_DATA_PATH), exist_ok=True)
    with open(ARTISTS_DATA_PATH, "w", encoding="utf-8") as handle:
        json.dump(normalized, handle, indent=2, ensure_ascii=False)

    mtime = os.path.getmtime(ARTISTS_DATA_PATH)
    with _cache_lock:
        _cache = normalized
        _cache_mtime = mtime

    return normalized


def load_artists():
    global _cache, _cache_mtime

    if not os.path.exists(ARTISTS_DATA_PATH):
        return []

    mtime = os.path.getmtime(ARTISTS_DATA_PATH)
    with _cache_lock:
        if _cache and _cache_mtime == mtime:
            return _cache

    try:
        with open(ARTISTS_DATA_PATH, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception:
        payload = []

    normalized = [entry for entry in (normalize_artist_record(item) for item in payload) if entry]
    with _cache_lock:
        _cache = normalized
        _cache_mtime = mtime

    return normalized
