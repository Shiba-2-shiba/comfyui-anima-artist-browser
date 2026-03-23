DEFAULT_PROMPT = "1girl, masterpiece, best quality"
MAX_ARTIST_SLOTS = 3


def text_input(multiline=True, default=DEFAULT_PROMPT):
    return ("STRING", {
        "multiline": multiline,
        "dynamicPrompts": True,
        "default": default,
    })


class AnimaArtistBrowser:
    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("prompt_1", "prompt_2", "prompt_3")
    OUTPUT_TOOLTIPS = (
        "Prompt for artist slot 1.",
        "Prompt for artist slot 2.",
        "Prompt for artist slot 3.",
    )
    FUNCTION = "build_prompts"

    CATEGORY = "Anima"
    DESCRIPTION = "Builds up to three prompt strings by combining the base prompt with up to three selected artist tags."
    SEARCH_ALIASES = ["artist prompt", "style prompt", "anime prompt", "prompt text", "multi prompt"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": text_input(),
                "artist_1": text_input(multiline=False, default=""),
                "artist_2": text_input(multiline=False, default=""),
                "artist_3": text_input(multiline=False, default=""),
            },
        }

    @staticmethod
    def _normalize_artist(value):
        display = str(value or "").strip().lstrip("@").replace("_", " ")
        display = " ".join(display.split())
        return f"@{display}" if display else ""

    @classmethod
    def _compose_prompt(cls, base_text, artist_value):
        artist = cls._normalize_artist(artist_value)
        prompt = str(base_text or "").strip()
        if not artist:
            return ""
        if not prompt:
            return artist
        return f"{artist}, {prompt}"

    def build_prompts(self, text, artist_1, artist_2, artist_3):
        artists = [artist_1, artist_2, artist_3][:MAX_ARTIST_SLOTS]
        prompts = tuple(self._compose_prompt(text, artist) for artist in artists)
        return prompts


NODE_CLASS_MAPPINGS = {
    "AnimaArtistBrowser": AnimaArtistBrowser,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "AnimaArtistBrowser": "Anima Artist Browser",
}
