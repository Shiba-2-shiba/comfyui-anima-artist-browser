import { MAX_ARTIST_SLOTS, buildSlotState } from "./slot_state.js";

const ANIMA_SIZE_KEY = "_anima_saved_size";

function ensureNodeProperties(node) {
    if (!node) return {};
    if (!node.properties || typeof node.properties !== "object") node.properties = {};
    return node.properties;
}

export function normalizeSizePair(value) {
    if (!Array.isArray(value) || value.length < 2) return null;
    const width = Number(value[0]) || 0;
    const height = Number(value[1]) || 0;
    if (width <= 0 || height <= 0) return null;
    return [width, height];
}

export function readStoredNodeSize(node) {
    const props = ensureNodeProperties(node);
    return normalizeSizePair(props[ANIMA_SIZE_KEY]);
}

export function writeStoredNodeSize(node, value) {
    const normalized = normalizeSizePair(value);
    if (!normalized) return null;
    const props = ensureNodeProperties(node);
    props[ANIMA_SIZE_KEY] = normalized;
    return normalized;
}

export function ensureResizePersistence(node) {
    if (!node || node._animaSizePersistenceAttached) return;
    node._animaSizePersistenceAttached = true;

    const originalSetSize = typeof node.setSize === "function" ? node.setSize.bind(node) : null;
    if (originalSetSize) {
        node.setSize = function (size) {
            const result = originalSetSize(size);
            const next = normalizeSizePair(this.size) || normalizeSizePair(size);
            if (next) writeStoredNodeSize(this, next);
            return result;
        };
    }

    const originalOnConfigure = typeof node.onConfigure === "function" ? node.onConfigure : null;
    node.onConfigure = function () {
        const result = originalOnConfigure?.apply(this, arguments);
        const incoming = arguments[0];
        const configured = normalizeSizePair(incoming?.properties?.[ANIMA_SIZE_KEY])
            || normalizeSizePair(incoming?.size)
            || normalizeSizePair(this.size);
        if (configured) writeStoredNodeSize(this, configured);
        return result;
    };

    const originalOnResize = typeof node.onResize === "function" ? node.onResize : null;
    node.onResize = function () {
        const result = originalOnResize?.apply(this, arguments);
        const resized = normalizeSizePair(arguments[0]) || normalizeSizePair(this.size);
        if (resized) writeStoredNodeSize(this, resized);
        return result;
    };

    if (!readStoredNodeSize(node)) {
        writeStoredNodeSize(node, node.size);
    }
}

export function ensureNodeRuntime(node) {
    if (!node) return null;
    if (!node._animaRuntime || typeof node._animaRuntime !== "object") {
        node._animaRuntime = {
            timers: Object.create(null),
        };
    }
    return node._animaRuntime;
}

export function clearNodeTimer(node, key) {
    const runtime = ensureNodeRuntime(node);
    const timer = runtime?.timers?.[key];
    if (!timer) return;
    clearTimeout(timer);
    delete runtime.timers[key];
}

export function scheduleNodeTimer(node, key, delay, callback) {
    const runtime = ensureNodeRuntime(node);
    if (!runtime) return;
    clearNodeTimer(node, key);
    runtime.timers[key] = setTimeout(() => {
        delete runtime.timers[key];
        callback();
    }, delay);
}

// `_currentSlot` and `_currentTags` are node-local runtime fields used by the
// canvas widget and browser interactions. Keep writes centralized here.
export function applyNodeSlotState(node, state) {
    const next = buildSlotState({
        ...state,
        maxSlots: state?.maxSlots ?? MAX_ARTIST_SLOTS,
    });
    node._currentTags = [...next.tags];
    node._currentSlot = next.currentSlot;
    return next;
}
