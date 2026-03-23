import { logWarn } from "./logger.js";

export function createBrowserController({
    api,
    store,
    fetchLocalFavorites,
    sendLocalFavoriteMutation,
    rebuildFavoriteMap,
    localFavoriteFromStyle,
    showToast,
}) {
    function localHeaders() {
        if (!store.localApiToken) return {};
        return { "x-anima-local-token": store.localApiToken };
    }

    async function fetchLocalApiToken() {
        if (store.localApiToken) return store.localApiToken;
        try {
            const response = await api.fetchApi("/anima/local_token");
            const payload = await response.json().catch(() => ({}));
            if (typeof payload.localToken === "string" && payload.localToken) {
                store.localApiToken = payload.localToken;
            }
        } catch (error) {
            logWarn("Failed to fetch local API token", error);
        }
        return store.localApiToken;
    }

    async function ensureLocalToken() {
        if (store.localApiToken) return true;
        await fetchLocalApiToken();
        return !!store.localApiToken;
    }

    function rebuildFavoriteState() {
        store.favoriteMap = rebuildFavoriteMap(store.localFavorites, []);
        return store.favoriteMap;
    }

    async function loadLocalFavorites(force = false) {
        if (store.localFavoritesLoaded && !force) return store.localFavorites;
        store.localFavorites = await fetchLocalFavorites(api);
        store.localFavoritesLoaded = true;
        rebuildFavoriteState();
        return store.localFavorites;
    }

    async function reloadLocalFavorites() {
        store.localFavoritesLoaded = false;
        return await loadLocalFavorites(true);
    }

    async function mutateLocalFavorites(payload) {
        await ensureLocalToken();

        const result = await sendLocalFavoriteMutation(api, localHeaders(), payload);
        if (!result.ok) {
            if (!store.localApiToken && result.status === 403) {
                return { ok: false, error: result.error || "Favorite update is blocked for this browser origin." };
            }
            return { ok: false, error: result.error || "Favorite update failed" };
        }

        store.localFavorites = Array.isArray(result.items) ? result.items : store.localFavorites;
        store.localFavoritesLoaded = true;
        rebuildFavoriteState();
        return { ok: true, data: result.data };
    }

    function isFavorited(artist) {
        const entry = localFavoriteFromStyle(artist);
        return !!entry?.key && store.favoriteMap.has(entry.key);
    }

    async function toggleStyleFavorite(artist, anchorEl = null, { rerenderFavorites } = {}) {
        const entry = localFavoriteFromStyle(artist);
        if (!entry) {
            alert("Invalid style favorite payload.");
            return { ok: false };
        }

        const already = store.favoriteMap.has(entry.key);
        const result = already
            ? await mutateLocalFavorites({ action: "remove", key: entry.key })
            : await mutateLocalFavorites({ action: "upsert", item: entry });

        if (!result.ok) {
            alert(result.error || "Could not update favorite.");
            return { ok: false };
        }

        const favorited = !already;
        showToast(favorited ? "Added to favorites" : "Removed from favorites", "success", 1500, { anchor: anchorEl });

        if (store.category === "favorites" && typeof rerenderFavorites === "function") {
            await rerenderFavorites();
        }
        return { ok: true, favorited };
    }

    return {
        localHeaders,
        ensureLocalToken,
        loadLocalFavorites,
        reloadLocalFavorites,
        mutateLocalFavorites,
        isFavorited,
        toggleStyleFavorite,
    };
}
