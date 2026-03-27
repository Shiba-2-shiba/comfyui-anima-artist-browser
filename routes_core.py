import asyncio
import os

from aiohttp import web

from .services.artist_repository import load_artists
from .services.artist_sync import download_artists
from .services.image_cache import (
    get_artist_image_download_status,
    start_artist_image_download,
    start_local_snapshot_sync,
)


def register_core_routes(server, require_local_token=None, get_local_token=None):
    try:
        img_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "js", "images"))
        os.makedirs(img_path, exist_ok=True)
        server.instance.app.router.add_static("/anima/images/", img_path, show_index=False, follow_symlinks=False)
        print(f" [AnimaArtistBrowser] Static route registered: /anima/images/ -> {img_path}")
    except Exception as e:
        print(f" [AnimaArtistBrowser] Static route error: {e}")

    @server.instance.routes.get("/anima/artists")
    async def get_artists(request):
        artists = await asyncio.to_thread(load_artists)
        return web.json_response(artists)

    @server.instance.routes.get("/anima/local_token")
    async def get_local_token_route(request):
        if get_local_token is None:
            return web.json_response({"error": "Local token support unavailable"}, status=503)
        local_token = get_local_token(request)
        if not local_token:
            return web.json_response({"error": "Local token requests are restricted to loopback clients"}, status=403)
        return web.json_response({"localToken": local_token})

    @server.instance.routes.post("/anima/update")
    async def update_artists(request):
        if require_local_token is not None:
            denied = require_local_token(request)
            if denied is not None:
                return denied
        success = await asyncio.to_thread(download_artists)
        return web.json_response({"success": success})

    @server.instance.routes.post("/anima/download_images")
    async def download_images(request):
        if require_local_token is not None:
            denied = require_local_token(request)
            if denied is not None:
                return denied
        success = await asyncio.to_thread(start_artist_image_download)
        return web.json_response({"success": success})

    @server.instance.routes.post("/anima/sync_local_snapshot")
    async def sync_local_snapshot(request):
        if require_local_token is not None:
            denied = require_local_token(request)
            if denied is not None:
                return denied
        success = await asyncio.to_thread(start_local_snapshot_sync)
        return web.json_response({"success": success})

    @server.instance.routes.get("/anima/download_status")
    async def download_status(request):
        return web.json_response(get_artist_image_download_status())
