const BROWSER_CATEGORY_KEY = "anima_browser_category";

export function safeLocalGet(key, fallback = "") {
    try {
        const value = localStorage.getItem(key);
        return value == null ? fallback : value;
    } catch {
        return fallback;
    }
}

export function safeLocalSet(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch { }
}

export function createBrowserStore() {
    return {
        el: null,
        grid: null,
        countEl: null,
        onPick: null,
        activeNode: null,
        filter: "",
        sort: "works",
        category: "all",
        renderId: 0,
        observer: null,
        lastList: [],
        lastHighlightedTag: "",
        localFavorites: [],
        localFavoritesLoaded: false,
        favoriteMap: new Map(),
        localApiToken: "",
    };
}

export function getStoredBrowserCategory() {
    return safeLocalGet(BROWSER_CATEGORY_KEY, "all") === "favorites" ? "favorites" : "all";
}

export function setBrowserCategory(store, value) {
    store.category = value === "favorites" ? "favorites" : "all";
    safeLocalSet(BROWSER_CATEGORY_KEY, store.category);
    return store.category;
}

export function nextRenderId(store) {
    store.renderId += 1;
    return store.renderId;
}
