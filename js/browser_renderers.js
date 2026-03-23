export function renderChunkedGrid({
    grid,
    observer,
    items,
    chunkSize,
    minHeight,
    renderItem,
    append = false,
}) {
    if (!append) {
        if (observer) observer.disconnect();
        grid.innerHTML = "";
    }

    for (let i = 0; i < items.length; i += chunkSize) {
        const chunkItems = items.slice(i, i + chunkSize);
        const chunk = document.createElement("div");
        chunk.className = "anima-chunk";
        chunk.style.minHeight = minHeight;
        chunk._mount = () => {
            if (chunk.children.length) return;
            const frag = document.createDocumentFragment();
            chunkItems.forEach((item) => {
                const node = renderItem?.(item);
                if (node) frag.appendChild(node);
            });
            chunk.appendChild(frag);
            chunk.style.minHeight = "";
        };
        chunk._unmount = () => {
            if (!chunk.children.length) return;
            chunk.style.minHeight = `${chunk.offsetHeight}px`;
            chunk.innerHTML = "";
        };
        grid.appendChild(chunk);
        observer?.observe(chunk);
    }
}

function normalizeSearchText(value = "") {
    return String(value || "")
        .toLowerCase()
        .replace(/^@+/, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function styleSearchScore(artist, query) {
    const tag = normalizeSearchText(artist?.tag || "");
    const name = normalizeSearchText(artist?.name || "");
    const hay = normalizeSearchText(`${artist?.tag || ""} ${artist?.name || ""}`);
    if (!query) return 100;
    if (tag === query) return 0;
    if (name === query) return 1;
    if (tag.startsWith(query)) return 2;
    if (name.startsWith(query)) return 3;
    if (hay.includes(` ${query}`)) return 4;
    if (hay.includes(query)) return 5;
    return -1;
}

export function buildStyleList(styles = [], { sort = "works", filter = "" } = {}) {
    let list = [...styles];

    if (sort === "name") {
        list.sort((a, b) => (a.tag || "").localeCompare(b.tag || ""));
    } else if (sort === "uniqueness") {
        list.sort((a, b) => {
            const u = (Number(b.uniqueness_score) || 0) - (Number(a.uniqueness_score) || 0);
            if (u) return u;
            const w = (Number(b.works) || 0) - (Number(a.works) || 0);
            if (w) return w;
            return (a.tag || "").localeCompare(b.tag || "");
        });
        list.forEach((artist, i) => {
            artist.uniquenessRank = i + 1;
        });
    } else {
        list.sort((a, b) => (Number(b.works) || 0) - (Number(a.works) || 0));
    }

    if (filter) {
        const query = normalizeSearchText(filter);
        list = list
            .map((artist, index) => ({
                artist,
                score: styleSearchScore(artist, query),
                index,
            }))
            .filter((entry) => entry.score >= 0)
            .sort((a, b) => {
                if (a.score !== b.score) return a.score - b.score;
                return a.index - b.index;
            })
            .map((entry) => entry.artist);
    }

    return list;
}
