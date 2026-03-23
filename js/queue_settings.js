import { buildSlotState } from "./slot_state.js";

export const ANIMA_PIN_FAVORITES_KEY = "_anima_pin_favorites";
export const ANIMA_QUEUE_MODE_KEY = "_anima_queue_mode";
export const ANIMA_AUTO_QUEUE_KEY = "_anima_auto_queue";

const WIDGET_PIN_FAVORITES = "Pin Favorites";
const WIDGET_QUEUE_MODE = "After Queue";
const WIDGET_AUTO_QUEUE = "Auto Queue";

function ensureNodeProperties(node) {
    if (!node?.properties || typeof node.properties !== "object") {
        node.properties = {};
    }
    return node.properties;
}

function getWidgetValue(node, name) {
    const widget = node?.widgets?.find((item) => String(item?.name || "") === name);
    return widget?.value;
}

function normalizeTag(value) {
    return String(value || "").trim().replace(/\s+/g, "_").toLowerCase();
}

function uniqueArtists(artists = []) {
    const list = [];
    const seen = new Set();

    for (const artist of artists) {
        const tag = normalizeTag(artist?.tag || "");
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        list.push({ ...artist, _queueTag: tag });
    }

    return list;
}

function shuffledArtists(artists = [], randomFn = Math.random) {
    const list = [...artists];
    for (let i = list.length - 1; i > 0; i -= 1) {
        const j = Math.floor(randomFn() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

function pinnedSlots(state, favoriteTags, limit = state.maxSlots) {
    const slots = [];
    state.tags.forEach((tag, slotIndex) => {
        if (!tag || !favoriteTags.has(tag) || slots.length >= limit) return;
        slots.push({ slotIndex, tag });
    });
    return slots;
}

export function readPinFavorites(node) {
    const props = ensureNodeProperties(node);
    const widgetValue = getWidgetValue(node, WIDGET_PIN_FAVORITES);
    if (widgetValue != null && widgetValue !== "") {
        const normalized = String(widgetValue).toLowerCase() === "on" ? "on" : "off";
        props[ANIMA_PIN_FAVORITES_KEY] = normalized;
        return normalized === "on";
    }

    return String(props[ANIMA_PIN_FAVORITES_KEY] || "off").toLowerCase() === "on";
}

export function writePinFavorites(node, value) {
    const props = ensureNodeProperties(node);
    const normalized = String(value || "").toLowerCase() === "on" ? "on" : "off";
    props[ANIMA_PIN_FAVORITES_KEY] = normalized;
    return normalized;
}

export function normalizeQueueMode(value) {
    const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
    if (normalized === "fixed") return "fixed";
    if (normalized === "next" || normalized === "next_artist") return "next_artist";
    if (normalized === "random" || normalized === "random_artist") return "random_artist";
    if (normalized === "off") return "fixed";
    return "fixed";
}

export function readQueueMode(node) {
    const props = ensureNodeProperties(node);
    const widgetValue = getWidgetValue(node, WIDGET_QUEUE_MODE);
    if (widgetValue != null && widgetValue !== "") {
        const normalized = normalizeQueueMode(widgetValue);
        props[ANIMA_QUEUE_MODE_KEY] = normalized;
        return normalized;
    }

    return normalizeQueueMode(props[ANIMA_QUEUE_MODE_KEY]);
}

export function writeQueueMode(node, value) {
    const props = ensureNodeProperties(node);
    const normalized = normalizeQueueMode(value);
    props[ANIMA_QUEUE_MODE_KEY] = normalized;
    return normalized;
}

export function readAutoQueue(node) {
    const props = ensureNodeProperties(node);
    const widgetValue = getWidgetValue(node, WIDGET_AUTO_QUEUE);
    if (widgetValue != null && widgetValue !== "") {
        const normalized = String(widgetValue).toLowerCase() === "on" ? "on" : "off";
        props[ANIMA_AUTO_QUEUE_KEY] = normalized;
        return normalized === "on";
    }

    return String(props[ANIMA_AUTO_QUEUE_KEY] || "off").toLowerCase() === "on";
}

export function writeAutoQueue(node, value) {
    const props = ensureNodeProperties(node);
    const normalized = String(value || "").toLowerCase() === "on" ? "on" : "off";
    props[ANIMA_AUTO_QUEUE_KEY] = normalized;
    return normalized;
}

export async function loadFavoriteTagSet(fetchImpl = fetch) {
    try {
        const response = await fetchImpl("/anima/favorites");
        if (!response.ok) return new Set();
        const payload = await response.json().catch(() => ({}));
        const items = Array.isArray(payload?.items) ? payload.items : [];
        return new Set(
            items
                .filter((item) => String(item?.kind || "").toLowerCase() === "style")
                .map((item) => normalizeTag(item?.tag || ""))
                .filter(Boolean)
        );
    } catch {
        return new Set();
    }
}

export function buildRandomizedSlotState({
    state,
    artists,
    pinFavorites = false,
    favoriteTags = new Set(),
    randomFn = Math.random,
}) {
    const current = buildSlotState(state);
    const pool = uniqueArtists(artists);
    if (!pool.length) return current;

    const targetCount = current.tags.filter(Boolean).length;
    if (!targetCount) return current;
    const lockedSlots = pinFavorites ? pinnedSlots(current, favoriteTags, targetCount) : [];
    const lockedTags = new Set(lockedSlots.map((entry) => entry.tag));
    const randomizedPool = shuffledArtists(
        pool.filter((artist) => !lockedTags.has(artist._queueTag)),
        randomFn
    );

    const nextTags = Array.from({ length: current.maxSlots }, () => "");
    lockedSlots.forEach(({ slotIndex, tag }) => {
        nextTags[slotIndex] = tag;
    });

    let filled = lockedSlots.length;
    let randomIndex = 0;
    for (let slotIndex = 0; slotIndex < current.maxSlots && filled < targetCount; slotIndex += 1) {
        if (nextTags[slotIndex]) continue;
        const artist = randomizedPool[randomIndex++];
        if (!artist) break;
        nextTags[slotIndex] = artist._queueTag;
        filled += 1;
    }

    return buildSlotState({
        tags: nextTags,
        currentSlot: current.currentSlot,
        maxSlots: current.maxSlots,
    });
}

export function buildNextArtistSlotState({
    state,
    artists,
    pinFavorites = false,
    favoriteTags = new Set(),
}) {
    const current = buildSlotState(state);
    const pool = uniqueArtists(artists);
    if (!pool.length) return current;

    const tagToIndex = new Map(pool.map((artist, index) => [artist._queueTag, index]));
    const nextTags = [...current.tags];

    nextTags.forEach((tag, slotIndex) => {
        if (!tag) return;
        if (pinFavorites && favoriteTags.has(tag)) return;
        const currentIndex = tagToIndex.get(tag);
        if (currentIndex == null) {
            nextTags[slotIndex] = pool[0]._queueTag;
            return;
        }
        nextTags[slotIndex] = pool[(currentIndex + 1) % pool.length]._queueTag;
    });

    return buildSlotState({
        tags: nextTags,
        currentSlot: current.currentSlot,
        maxSlots: current.maxSlots,
    });
}

export function diffSlotStates(previousState, nextState) {
    const previous = buildSlotState(previousState);
    const next = buildSlotState(nextState);
    const changes = [];

    for (let i = 0; i < next.maxSlots; i += 1) {
        if (previous.tags[i] === next.tags[i]) continue;
        changes.push({
            slotIndex: i,
            previousTag: previous.tags[i],
            nextTag: next.tags[i],
        });
    }

    return changes;
}
