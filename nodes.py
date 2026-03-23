MAX_ARTIST_SLOTS = 3


def artist_input():
    return ("STRING", {
        "multiline": False,
        "dynamicPrompts": True,
        "default": "",
    })


class AnimaArtistBrowser:
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("artist_string",)
    OUTPUT_TOOLTIPS = ("Combined artist tags from all selected slots.",)
    FUNCTION = "build_artist_string"

    CATEGORY = "Anima"
    DESCRIPTION = "Builds a single artist tag string by combining up to three selected artist tags."
    SEARCH_ALIASES = ["artist browser", "artist tags", "anime artist", "artist string", "multi artist"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "artist_1": artist_input(),
                "artist_2": artist_input(),
                "artist_3": artist_input(),
            },
        }

    @staticmethod
    def _normalize_artist(value):
        display = str(value or "").strip().lstrip("@").replace("_", " ")
        display = " ".join(display.split())
        return f"@{display}" if display else ""

    def build_artist_string(self, artist_1, artist_2, artist_3):
        artists = [self._normalize_artist(artist) for artist in [artist_1, artist_2, artist_3][:MAX_ARTIST_SLOTS]]
        combined = ",".join(artist for artist in artists if artist)
        return (combined,)


NODE_CLASS_MAPPINGS = {
    "AnimaArtistBrowser": AnimaArtistBrowser,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "AnimaArtistBrowser": "Anima Artist Browser",
}
