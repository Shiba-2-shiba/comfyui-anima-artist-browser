let host = null;

function ensureHost() {
    if (host && document.body.contains(host)) return host;
    host = document.createElement("div");
    host.id = "anima-toast-host";
    document.body.appendChild(host);
    return host;
}

function resolveAnchor(anchor) {
    if (!(anchor instanceof Element)) return null;
    if (anchor.matches?.(".anima-card-img")) return anchor;
    if (anchor.matches?.("#anima-swipe-container")) return anchor;
    if (anchor.matches?.(".swipe-image")) {
        const swipeContainer = anchor.closest?.("#anima-swipe")?.querySelector?.("#anima-swipe-container");
        if (swipeContainer instanceof Element) return swipeContainer;
    }

    const media = anchor.closest?.(".anima-card")
        ?.querySelector?.(".anima-card-img");
    if (media instanceof Element) return media;
    return null;
}

function showInlineToast(anchor, message, type, ttl) {
    const existing = anchor.querySelector(".anima-inline-toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.className = `anima-inline-toast anima-inline-toast-${type}`;
    toast.textContent = String(message || "").trim();
    anchor.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    const remove = () => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 220);
    };
    setTimeout(remove, Math.max(900, Number(ttl) || 1500));
}

export function showToast(message, type = "info", ttl = 1800, options = {}) {
    const anchor = resolveAnchor(options?.anchor);
    if (anchor) {
        showInlineToast(anchor, message, type, ttl);
        return;
    }

    const container = ensureHost();
    const toast = document.createElement("div");
    toast.className = `anima-toast anima-toast-${type}`;
    toast.textContent = String(message || "").trim();
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    const remove = () => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 180);
    };
    setTimeout(remove, Math.max(900, Number(ttl) || 1800));
}
