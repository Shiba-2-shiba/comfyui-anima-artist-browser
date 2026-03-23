import re

from .services.artist_repository import list_artist_tags, load_artists, pick_random_artist
from .services.artist_sync import download_artists
from .services.image_cache import (
    ensure_artist_image_cached,
    get_artist_image_download_status,
    start_artist_image_download,
)


def download():
    return download_artists()


def ensure_image_cached(item, timeout=5):
    return ensure_artist_image_cached(item, timeout=timeout)


def start_image_download():
    return start_artist_image_download()


def get_download_status():
    return get_artist_image_download_status()


def load():
    return load_artists()


def all_tags():
    return list_artist_tags()


def pick_random():
    return pick_random_artist()


def inject(prompt, tag):
    space_tag = tag.replace("_", " ")
    cleaned = re.sub(r"^@[^,]+,?\s*", "", prompt).strip()
    return f"@{space_tag}, {cleaned}" if cleaned else f"@{space_tag}"
