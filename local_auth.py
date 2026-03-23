import base64
import hmac
import ipaddress
import os

from aiohttp import web

LOCAL_TOKEN_HEADER = "x-anima-local-token"
_local_api_token = base64.urlsafe_b64encode(os.urandom(24)).decode("utf-8").rstrip("=")
_ALLOW_REMOTE_MUTATIONS = str(os.getenv("ANIMA_ALLOW_REMOTE_MUTATIONS", "")).strip().lower() in {"1", "true", "yes", "on"}


def _is_loopback_host(value):
    host = str(value or "").strip()
    if not host:
        return False
    if host.startswith("[") and host.endswith("]"):
        host = host[1:-1]
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def is_local_request(request):
    if _ALLOW_REMOTE_MUTATIONS:
        return True

    if _is_loopback_host(getattr(request, "remote", "")):
        return True

    peer = request.transport.get_extra_info("peername") if getattr(request, "transport", None) else None
    if isinstance(peer, tuple) and peer:
        return _is_loopback_host(peer[0])

    return False


def get_local_token(request=None):
    if request is not None and not is_local_request(request):
        return ""
    return _local_api_token


def has_valid_local_token(request):
    provided = str(request.headers.get(LOCAL_TOKEN_HEADER) or "").strip()
    if not provided:
        return False
    return hmac.compare_digest(provided, _local_api_token)


def require_local_token(request):
    if not is_local_request(request):
        return web.json_response({"error": "Local mutations are restricted to loopback requests"}, status=403)
    if has_valid_local_token(request):
        return None
    return web.json_response({"error": "Invalid local request token"}, status=403)
