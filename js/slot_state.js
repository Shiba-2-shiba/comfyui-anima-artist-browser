export const MAX_ARTIST_SLOTS = 3;

export function clampSlotIndex(value, maxSlots = MAX_ARTIST_SLOTS) {
    const index = Number(value);
    if (!Number.isFinite(index)) return 0;
    return Math.max(0, Math.min(maxSlots - 1, Math.trunc(index)));
}

export function normalizeArtist(value = "") {
    const display = String(value || "")
        .replace(/^@+/, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return {
        display,
        tag: display ? display.replace(/\s+/g, "_") : "",
        token: display ? `@${display}` : "",
    };
}

export function normalizeSlotTags(tags = [], maxSlots = MAX_ARTIST_SLOTS) {
    const normalized = [];
    for (let i = 0; i < maxSlots; i += 1) {
        normalized.push(normalizeArtist(tags[i] || "").tag);
    }
    return normalized;
}

export function buildSlotState({ tags = [], currentSlot = 0, maxSlots = MAX_ARTIST_SLOTS } = {}) {
    return {
        tags: normalizeSlotTags(tags, maxSlots),
        currentSlot: clampSlotIndex(currentSlot, maxSlots),
        maxSlots,
    };
}

export function getNextEmptySlot(tags = []) {
    return tags.findIndex((tag) => !tag);
}

export function cycleSlotState(state) {
    const next = buildSlotState(state);
    next.currentSlot = (next.currentSlot + 1) % next.maxSlots;
    return next;
}

export function clearSlotState(state) {
    const next = buildSlotState(state);
    next.tags = Array.from({ length: next.maxSlots }, () => "");
    next.currentSlot = 0;
    return next;
}

export function slotStateHasArtist(state, artist) {
    const tag = normalizeArtist(artist?.tag || artist?.token || artist?.display || artist || "").tag;
    if (!tag) return false;
    const normalizedState = buildSlotState(state);
    return normalizedState.tags.includes(tag);
}

export function applyArtistToSlotState(state, artist, options = {}) {
    const next = buildSlotState(state);
    const normalized = normalizeArtist(artist?.tag || artist?.token || artist?.display || artist || "");
    if (!normalized.tag) {
        return { ok: false, error: "Artist tag is empty." };
    }

    const forcedSlotIndex = Number.isInteger(options.slotIndex)
        ? clampSlotIndex(options.slotIndex, next.maxSlots)
        : null;
    const existingIndex = next.tags.findIndex((tag) => tag === normalized.tag);
    const preferCurrentSlot = !!options.preferCurrentSlot;

    let slotIndex = forcedSlotIndex ?? existingIndex;
    if (slotIndex < 0 && !preferCurrentSlot && forcedSlotIndex == null) {
        slotIndex = getNextEmptySlot(next.tags);
    }
    if (slotIndex < 0) {
        slotIndex = next.currentSlot;
    }

    next.tags[slotIndex] = normalized.tag;
    if (forcedSlotIndex != null || existingIndex >= 0 || preferCurrentSlot) {
        next.currentSlot = slotIndex;
    } else {
        next.currentSlot = (slotIndex + 1) % next.maxSlots;
    }

    return {
        ok: true,
        state: next,
        slotIndex,
        artist: normalized.display,
        tag: normalized.tag,
        token: normalized.token,
    };
}

export function stripLeadingArtist(prompt = "") {
    return String(prompt || "").replace(/^\s*@[^,\n]+\s*,?\s*/i, "").trim();
}

export function composeArtistAndPrompt(artistToken = "", promptText = "") {
    const artist = String(artistToken || "").trim().replace(/[\s,]+$/g, "");
    const prompt = String(promptText || "").trim().replace(/^[,\s]+/g, "");
    if (artist && prompt) return `${artist}, ${prompt}`;
    return artist || prompt;
}
