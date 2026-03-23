import { logWarn } from "./logger.js";

const BROWSER_CATEGORY_KEY = "anima_browser_category";

export function safeLocalGet(key, fallback = "") {
    try {
        const value = localStorage.getItem(key);
        return value == null ? fallback : value;
    } catch (error) {
        logWarn(`Failed to read localStorage key: ${key}`, error);
        return fallback;
    }
}

export function safeLocalSet(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch (error) {
        logWarn(`Failed to write localStorage key: ${key}`, error);
    }
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

export function bindBrowserElements(store, el) {
    store.el = el || null;
    store.grid = store.el?.querySelector("#anima-grid") || null;
    store.countEl = store.el?.querySelector("#anima-count") || null;
    return store.el;
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
