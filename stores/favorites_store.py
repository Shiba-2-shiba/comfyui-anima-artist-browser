import json
import os
import threading
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
LOCAL_FAVORITES_FILE = os.path.join(BASE_DIR, "data", "favorites.json")

_favorites_lock = threading.Lock()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_favorites_file_path():
    return LOCAL_FAVORITES_FILE


def _safe_json_load(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return {}


def _safe_json_save(path, data):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
    except Exception as error:
        print(f" [AnimaArtistBrowser] Failed to persist favorites file: {error}")


def _extract_items(raw):
    if isinstance(raw, dict):
        if isinstance(raw.get("items"), list):
            return raw.get("items")
        if isinstance(raw.get("favorites"), list):
            return raw.get("favorites")
    if isinstance(raw, list):
        return raw
    return []


def load_favorites_items():
    with _favorites_lock:
        raw = _safe_json_load(LOCAL_FAVORITES_FILE)
        return list(_extract_items(raw))


def save_favorites_items(items):
    payload = {
        "items": list(items or []),
        "updatedAt": now_iso(),
    }
    with _favorites_lock:
        _safe_json_save(LOCAL_FAVORITES_FILE, payload)
