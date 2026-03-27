import os

from ..stores import favorites_store

MAX_LOCAL_FAVORITES = int(os.getenv("ANIMA_MAX_LOCAL_FAVORITES", "2000"))


def favorite_key_for_item(item):
    if not isinstance(item, dict):
        return ""

    tag = str(item.get("tag") or "").strip().replace(" ", "_").lower()
    return f"style:{tag}" if tag else ""


def normalize_local_favorite(item):
    if not isinstance(item, dict):
        return None

    key = favorite_key_for_item(item)
    if not key:
        return None

    added_at = str(item.get("addedAt") or item.get("createdAt") or favorites_store.now_iso())
    tag = str(item.get("tag") or "").strip().replace(" ", "_")
    if not tag:
        return None
    try:
        page_id = max(1, int(item.get("p") or 1))
    except Exception:
        page_id = 1
    try:
        works = int(item.get("works") or 0)
    except Exception:
        works = 0
    try:
        uniqueness_score = float(item.get("uniqueness_score") or 0)
    except Exception:
        uniqueness_score = 0.0

    return {
        "key": key,
        "kind": "style",
        "tag": tag,
        "id": str(item.get("id") or "").strip(),
        "p": page_id,
        "works": works,
        "uniqueness_score": uniqueness_score,
        "name": str(item.get("name") or "").strip(),
        "localPreviewCached": bool(item.get("localPreviewCached") or False),
        "addedAt": added_at,
    }


def _normalize_entries(items):
    normalized = []
    seen = set()
    for item in items:
        entry = normalize_local_favorite(item)
        if not entry:
            continue
        key = entry.get("key")
        if not key or key in seen:
            continue
        seen.add(key)
        normalized.append(entry)
    return normalized


def list_local_favorites():
    return _normalize_entries(favorites_store.load_favorites_items())


def save_local_favorites(items):
    normalized = _normalize_entries(items)
    favorites_store.save_favorites_items(normalized)
    return normalized


def has_local_favorite(key):
    target = str(key or "").strip()
    if not target:
        return False
    return any(str(item.get("key") or "") == target for item in list_local_favorites())


def upsert_local_favorite(item):
    entry = normalize_local_favorite(item)
    if not entry:
        return None

    items = [candidate for candidate in list_local_favorites() if str(candidate.get("key") or "") != entry.get("key")]
    items.append(entry)
    max_items = max(100, MAX_LOCAL_FAVORITES)
    if len(items) > max_items:
        items = items[-max_items:]
    save_local_favorites(items)
    return entry


def remove_local_favorite(key="", item=None):
    target = str(key or "").strip() or favorite_key_for_item(item or {})
    if not target:
        return False

    items = list_local_favorites()
    kept = [candidate for candidate in items if str(candidate.get("key") or "") != target]
    changed = len(kept) != len(items)
    if changed:
        save_local_favorites(kept)
    return changed


def clear_local_favorites():
    favorites_store.save_favorites_items([])
    return []
