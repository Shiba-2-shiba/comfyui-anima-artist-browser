import {
    favoriteKeyFromItem,
    normalizeTag,
    sortByDateDesc,
} from "./browser_helpers.js";
import { logWarn } from "./logger.js";

export function rebuildFavoriteMap(localFavorites = []) {
    const map = new Map();
    for (const item of localFavorites) {
        const key = favoriteKeyFromItem(item);
        if (!key) continue;
        map.set(key, item);
    }
    return map;
}

export async function loadLocalFavorites(api) {
    try {
        const r = await api.fetchApi("/anima/favorites");
        const data = await r.json().catch(() => ({}));
        return Array.isArray(data.items) ? data.items : [];
    } catch (error) {
        logWarn("Failed to load local favorites", error);
        return [];
    }
}

export async function mutateLocalFavorites(api, headers, payload) {
    try {
        const r = await api.fetchApi("/anima/favorites", {
            method: "POST",
            headers: {
                ...(headers || {}),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload || {}),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            return {
                ok: false,
                error: data?.error || `Favorite update failed (${r.status})`,
                status: r.status,
            };
        }
        return {
            ok: true,
            data,
            items: Array.isArray(data.items) ? data.items : [],
            status: r.status,
        };
    } catch (err) {
        logWarn("Failed to mutate local favorites", err);
        return { ok: false, error: err?.message || "Favorite update failed", status: 0 };
    }
}

function mergeStyleFavoriteSnapshot(snapshot = {}, known = null) {
    const base = known && typeof known === "object" ? { ...known } : {};
    const merged = {
        ...base,
        ...snapshot,
        tag: normalizeTag(snapshot?.tag || known?.tag || ""),
        id: String(snapshot?.id ?? known?.id ?? "").trim(),
        p: Number(snapshot?.p ?? known?.p ?? 1) || 1,
        works: Number(snapshot?.works ?? known?.works ?? 0) || 0,
        uniqueness_score: Number(snapshot?.uniqueness_score ?? known?.uniqueness_score ?? 0) || 0,
        addedAt: String(snapshot?.addedAt || ""),
        _kind: "style",
        _favoriteKey: String(snapshot?.key || favoriteKeyFromItem(snapshot)),
        _preferLocalThumb: !!snapshot?.localPreviewCached,
        localPreviewCached: !!snapshot?.localPreviewCached,
    };

    if (!merged._s) {
        merged._s = `${merged.tag || ""} ${merged.name || ""}`.trim().toLowerCase();
    }
    return merged;
}

export function buildFavoritesList({
    artists = [],
    localFavorites = [],
    filter = "",
}) {
    const byTag = new Map(artists.map((artist) => [normalizeTag(artist?.tag || ""), artist]));

    let list = [];

    for (const item of localFavorites) {
        if (String(item?.kind || "").toLowerCase() !== "style") continue;
        const key = favoriteKeyFromItem(item);
        if (!key) continue;
        const tag = normalizeTag(item?.tag || "");
        const known = byTag.get(tag);
        list.push(mergeStyleFavoriteSnapshot({ ...item, tag }, known));
    }

    list = sortByDateDesc(list);

    if (filter) {
        const q = filter.toLowerCase();
        list = list.filter((item) => {
            const hay = `${item.tag || ""} ${item.name || ""}`.toLowerCase();
            return hay.includes(q);
        });
    }

    return list;
}
