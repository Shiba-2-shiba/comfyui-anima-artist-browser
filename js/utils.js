import { app } from "../../scripts/app.js";
import { CDN_BASE } from "./config.js";
import {
    MAX_ARTIST_SLOTS,
    applyArtistToSlotState,
    buildSlotState,
    clearSlotState,
    normalizeArtist,
} from "./slot_state.js";

export function thumbUrl(artist, useCustom = false) {
    if (!artist) return "";
    const id = artist.id ?? "";
    if (!id) return "";

    if (useCustom) {
        return `/anima/images/custom/${id}.webp`;
    }

    const page = artist.p ?? 1;
    const preferLocal = !!(artist?._preferLocalThumb || artist?.localPreviewCached);
    if (preferLocal) {
        return `/anima/images/${page}/${id}.webp`;
    }

    const isOnline = localStorage.getItem("anima_online") === "true";
    if (!isOnline) {
        return `/anima/images/${page}/${id}.webp`;
    }

    return `${CDN_BASE}/images/${page}/${id}.webp`;
}

function getWidgetByName(node, name) {
    return node?.widgets?.find((widget) => String(widget?.name || "") === name) ?? null;
}

function getArtistWidget(node, slotIndex) {
    return getWidgetByName(node, `artist_${slotIndex + 1}`);
}

function setWidgetValue(node, widget, value) {
    if (!widget) return;
    widget.value = value;
    if (widget.inputEl) {
        widget.inputEl.value = value;
        widget.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        widget.inputEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (widget.callback) widget.callback(value);
    node?.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
}

function readNodeSlotState(node) {
    const tags = [];
    for (let i = 0; i < MAX_ARTIST_SLOTS; i += 1) {
        const normalized = normalizeArtist(getArtistWidget(node, i)?.value || "");
        tags.push(normalized.tag);
    }
    return buildSlotState({
        tags,
        currentSlot: node?._currentSlot ?? 0,
        maxSlots: MAX_ARTIST_SLOTS,
    });
}

function applyNodeSlotState(node, state) {
    const next = buildSlotState(state);
    node._currentTags = [...next.tags];
    node._currentSlot = next.currentSlot;
    return next;
}

export function syncArtistState(node) {
    return applyNodeSlotState(node, readNodeSlotState(node));
}

export function getNodeSlotState(node) {
    return syncArtistState(node);
}

function setArtistSlot(node, slotIndex, value) {
    const widget = getArtistWidget(node, slotIndex);
    if (!widget) return false;
    setWidgetValue(node, widget, value);
    syncArtistState(node);
    return true;
}

export function replaceArtistSlots(node, tags = [], currentSlot = 0) {
    const next = buildSlotState({
        tags,
        currentSlot,
        maxSlots: MAX_ARTIST_SLOTS,
    });

    for (let i = 0; i < next.maxSlots; i += 1) {
        setArtistSlot(node, i, next.tags[i] ? `@${next.tags[i].replace(/_/g, " ")}` : "");
    }

    applyNodeSlotState(node, next);
    node?.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
    return next;
}

export function setCurrentArtistSlot(node, slotIndex) {
    const next = buildSlotState({
        ...getNodeSlotState(node),
        currentSlot: slotIndex,
    });
    applyNodeSlotState(node, next);
    node?.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
    return next.currentSlot;
}

export function clearArtistSlots(node) {
    const next = clearSlotState(getNodeSlotState(node));
    for (let i = 0; i < next.maxSlots; i += 1) {
        setArtistSlot(node, i, "");
    }
    applyNodeSlotState(node, next);
}

export function applyStyle(node, artist, options = {}) {
    const result = applyArtistToSlotState(getNodeSlotState(node), artist, options);
    if (!result.ok) return result;

    const ok = setArtistSlot(node, result.slotIndex, result.token);
    if (!ok) {
        return { ok: false, error: `Artist slot ${result.slotIndex + 1} not found.` };
    }

    applyNodeSlotState(node, result.state);

    return {
        ok: true,
        slotIndex: result.slotIndex,
        artist: result.artist,
        token: result.token,
    };
}
