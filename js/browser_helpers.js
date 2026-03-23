export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function normalizeTag(value) {
    return String(value || "").trim().replace(/\s+/g, "_").toLowerCase();
}

export function favoriteKeyFromItem(item) {
    if (!item || typeof item !== "object") return "";
    const tag = normalizeTag(item.tag);
    return tag ? `style:${tag}` : "";
}

export function localFavoriteFromStyle(artist) {
    const tag = normalizeTag(artist?.tag || "");
    if (!tag) return null;

    const id = String(artist?.id ?? "").trim();
    const page = Number(artist?.p ?? 1) || 1;
    const works = Number(artist?.works ?? 0) || 0;
    const uniqueness = Number(artist?.uniqueness_score ?? 0) || 0;

    return {
        key: `style:${tag}`,
        kind: "style",
        tag,
        id,
        p: page,
        works,
        uniqueness_score: uniqueness,
        name: String(artist?.name || "").trim(),
        addedAt: new Date().toISOString(),
        localPreviewCached: !!artist?.localPreviewCached,
    };
}

export function sortByDateDesc(list) {
    return [...list].sort((a, b) => {
        const aTs = Date.parse(String(a?.addedAt || a?.createdAt || 0)) || 0;
        const bTs = Date.parse(String(b?.addedAt || b?.createdAt || 0)) || 0;
        return bTs - aTs;
    });
}
