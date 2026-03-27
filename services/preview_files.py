import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ARTIST_IMAGE_DIR = os.path.join(BASE_DIR, "js", "images")


def normalize_page_id(value, default=1):
    try:
        page_id = int(value)
    except Exception:
        page_id = default
    return max(1, page_id)


def normalize_artist_id(value):
    artist_id = str(value or "").strip()
    return artist_id if artist_id.isdigit() else ""


def artist_image_path(page_id, artist_id):
    normalized_id = normalize_artist_id(artist_id)
    if not normalized_id:
        return ""
    normalized_page = normalize_page_id(page_id)
    return os.path.join(ARTIST_IMAGE_DIR, str(normalized_page), f"{normalized_id}.webp")


def artist_image_url(page_id, artist_id):
    normalized_id = normalize_artist_id(artist_id)
    if not normalized_id:
        return ""
    normalized_page = normalize_page_id(page_id)
    return f"/anima/images/{normalized_page}/{normalized_id}.webp"


def artist_image_version(page_id, artist_id):
    path = artist_image_path(page_id, artist_id)
    if not path or not os.path.exists(path):
        return ""
    try:
        return str(int(os.path.getmtime(path)))
    except Exception:
        return ""


def artist_image_exists(page_id, artist_id, min_size=100):
    path = artist_image_path(page_id, artist_id)
    return bool(path) and os.path.exists(path) and os.path.getsize(path) > min_size


def resolve_requested_image(page_id, filename):
    normalized_page = normalize_page_id(page_id)
    stem, ext = os.path.splitext(str(filename or ""))
    if ext.lower() != ".webp":
        return "", "", ""

    normalized_id = normalize_artist_id(stem)
    if not normalized_id:
        return "", "", ""

    path = artist_image_path(normalized_page, normalized_id)
    return normalized_page, normalized_id, path
