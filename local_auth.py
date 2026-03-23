import base64
import hmac
import os

from aiohttp import web

LOCAL_TOKEN_HEADER = "x-anima-local-token"
_local_api_token = base64.urlsafe_b64encode(os.urandom(24)).decode("utf-8").rstrip("=")


def get_local_token():
    return _local_api_token


def has_valid_local_token(request):
    provided = str(request.headers.get(LOCAL_TOKEN_HEADER) or "").strip()
    if not provided:
        return False
    return hmac.compare_digest(provided, _local_api_token)


def require_local_token(request):
    if has_valid_local_token(request):
        return None
    return web.json_response({"error": "Invalid local request token"}, status=403)
