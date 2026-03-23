from . import local_auth
from .routes_core import register_core_routes
from .routes_favorites import register_favorite_routes


def register(server):
    register_core_routes(
        server,
        require_local_token=local_auth.require_local_token,
        get_local_token=local_auth.get_local_token,
    )
    register_favorite_routes(
        server,
        require_local_token=local_auth.require_local_token,
        is_same_origin_request=local_auth.is_same_origin_request,
    )
