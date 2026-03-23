try:
    from server import PromptServer
    from . import routes
    routes.register(PromptServer)
    print(" [AnimaArtistBrowser] Routes registered successfully.")
except Exception as e:
    print(f" [AnimaArtistBrowser] Error registering routes: {e}")

WEB_DIRECTORY = "./js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
