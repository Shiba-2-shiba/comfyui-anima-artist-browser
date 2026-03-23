import { app } from "../../scripts/app.js";
import { injectCSS } from "./styles.js";
import { Data } from "./data.js";
import { AutoCycle } from "./autocycle.js";
import { MAX_ARTIST_SLOTS, clampSlotIndex } from "./slot_state.js";
import { applyStyle, clearArtistSlots, cycleArtistSlot, getNodeSlotState, replaceArtistSlots, syncArtistState } from "./utils.js";

const ANIMA_SIZE_KEY = "_anima_saved_size";
const ANIMA_RANDOM_COUNT_KEY = "_anima_random_count";
const ANIMA_PIN_FAVORITES_KEY = "_anima_pin_favorites";
const ANIMA_QUEUE_MODE_KEY = "_anima_queue_mode";
const ANIMA_AUTO_QUEUE_KEY = "_anima_auto_queue";
const LAYOUT_REFRESH_DELAYS = [140, 360];
const INITIAL_GRAPH_SWEEP_DELAYS = [0, 320];

function isAnimaNode(node) {
    const cls = String(node?.comfyClass || node?.type || node?.constructor?.comfyClass || "");
    const title = String(node?.title || "");
    return cls === "AnimaArtistBrowser" || title.includes("Anima Artist Browser");
}

function ensureWidgetArray(node) {
    if (!node) return [];
    if (!Array.isArray(node.widgets)) node.widgets = [];
    return node.widgets;
}

function ensureNodeProperties(node) {
    if (!node) return {};
    if (!node.properties || typeof node.properties !== "object") node.properties = {};
    return node.properties;
}

function normalizeSizePair(value) {
    if (!Array.isArray(value) || value.length < 2) return null;
    const width = Number(value[0]) || 0;
    const height = Number(value[1]) || 0;
    if (width <= 0 || height <= 0) return null;
    return [width, height];
}

function readStoredNodeSize(node) {
    const props = ensureNodeProperties(node);
    return normalizeSizePair(props[ANIMA_SIZE_KEY]);
}

function writeStoredNodeSize(node, value) {
    const normalized = normalizeSizePair(value);
    if (!normalized) return null;
    const props = ensureNodeProperties(node);
    props[ANIMA_SIZE_KEY] = normalized;
    return normalized;
}

function normalizeRandomCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count)) return 1;
    return Math.max(1, Math.min(MAX_ARTIST_SLOTS, Math.trunc(count)));
}

function readRandomCount(node) {
    const props = ensureNodeProperties(node);
    return normalizeRandomCount(props[ANIMA_RANDOM_COUNT_KEY]);
}

function writeRandomCount(node, value) {
    const props = ensureNodeProperties(node);
    const normalized = normalizeRandomCount(value);
    props[ANIMA_RANDOM_COUNT_KEY] = normalized;
    return normalized;
}

function readPinFavorites(node) {
    const props = ensureNodeProperties(node);
    return String(props[ANIMA_PIN_FAVORITES_KEY] || "off").toLowerCase() === "on";
}

function writePinFavorites(node, value) {
    const props = ensureNodeProperties(node);
    const normalized = String(value || "").toLowerCase() === "on" ? "on" : "off";
    props[ANIMA_PIN_FAVORITES_KEY] = normalized;
    return normalized;
}

function normalizeQueueMode(value) {
    const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
    if (normalized === "next" || normalized === "next_artist") return "next_artist";
    if (normalized === "random" || normalized === "random_artist") return "random_artist";
    return "off";
}

function readQueueMode(node) {
    const props = ensureNodeProperties(node);
    return normalizeQueueMode(props[ANIMA_QUEUE_MODE_KEY]);
}

function writeQueueMode(node, value) {
    const props = ensureNodeProperties(node);
    const normalized = normalizeQueueMode(value);
    props[ANIMA_QUEUE_MODE_KEY] = normalized;
    return normalized;
}

function readAutoQueue(node) {
    const props = ensureNodeProperties(node);
    return String(props[ANIMA_AUTO_QUEUE_KEY] || "off").toLowerCase() === "on";
}

function writeAutoQueue(node, value) {
    const props = ensureNodeProperties(node);
    const normalized = String(value || "").toLowerCase() === "on" ? "on" : "off";
    props[ANIMA_AUTO_QUEUE_KEY] = normalized;
    return normalized;
}

function ensureResizePersistence(node) {
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

function refreshNodeCanvas(node) {
    if (!node) return;
    try {
        node.setDirtyCanvas?.(true, true);
        app.graph?.setDirtyCanvas?.(true, true);
    } catch { }
}

function ensureNodeRuntime(node) {
    if (!node) return null;
    if (!node._animaRuntime || typeof node._animaRuntime !== "object") {
        node._animaRuntime = {
            timers: Object.create(null),
        };
    }
    return node._animaRuntime;
}

function clearNodeTimer(node, key) {
    const runtime = ensureNodeRuntime(node);
    const timer = runtime?.timers?.[key];
    if (!timer) return;
    clearTimeout(timer);
    delete runtime.timers[key];
}

function scheduleNodeTimer(node, key, delay, callback) {
    const runtime = ensureNodeRuntime(node);
    if (!runtime) return;
    clearNodeTimer(node, key);
    runtime.timers[key] = setTimeout(() => {
        delete runtime.timers[key];
        callback();
    }, delay);
}

function isNodeAlive(node) {
    return !!node && Array.isArray(app.graph?._nodes) && app.graph._nodes.includes(node);
}

function growNodeIfNeeded(node) {
    if (!node) return;
    try {
        const current = normalizeSizePair(node.size) || [0, 0];
        const stored = readStoredNodeSize(node) || current;
        const computed = Array.isArray(node.computeSize?.()) ? node.computeSize() : null;
        if (!computed || computed.length !== 2) {
            refreshNodeCanvas(node);
            return;
        }

        const next = [
            Math.max(stored[0], Number(computed[0]) || 0),
            Math.max(stored[1], Number(computed[1]) || 0),
        ];

        if (next[0] !== current[0] || next[1] !== current[1]) {
            node.setSize?.(next);
        }
        refreshNodeCanvas(node);
    } catch { }
}

function ensureTagDisplayWidget(node) {
    if (!node || typeof node.addCustomWidget !== "function") return false;
    const widgets = ensureWidgetArray(node);
    const existing = widgets.find((widget) => String(widget?.name || "") === "_tag_display");
    if (existing) return false;

    node.addCustomWidget({
        name: "_tag_display",
        type: "anima_tag",
        value: "",
        draw(ctx, n, width, y) {
            const tags = Array.isArray(n._currentTags) ? n._currentTags : [];
            const currentSlot = clampSlotIndex(n._currentSlot, MAX_ARTIST_SLOTS);
            ctx.save();
            for (let i = 0; i < MAX_ARTIST_SLOTS; i += 1) {
                const rowY = y + 2 + (i * 22);
                const active = i === currentSlot;
                const tag = tags[i];
                ctx.fillStyle = active ? "#151522" : "#0f0f18";
                ctx.strokeStyle = active ? "#5f6db4" : "#1e1e30";
                ctx.lineWidth = active ? 1.5 : 1;
                ctx.beginPath();
                if (typeof ctx.roundRect === "function") {
                    ctx.roundRect(8, rowY, width - 16, 18, 4);
                } else {
                    ctx.rect(8, rowY, width - 16, 18);
                }
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = active ? "#b7c2ff" : "#606080";
                ctx.font = "500 10px 'JetBrains Mono',monospace";
                ctx.textAlign = "left";
                ctx.fillText(`S${i + 1}`, 14, rowY + 12);
                ctx.textAlign = "center";
                ctx.fillStyle = tag ? "#d7d9e8" : "#5e6278";
                ctx.fillText(tag ? `@${tag.replace(/_/g, " ")}` : "(empty)", width / 2, rowY + 12);
            }
            ctx.restore();
        },
        computeSize() { return [0, 72]; },
        serialize: false,
    });
    return true;
}

function collapseArtistInputWidgets(node) {
    const widgets = ensureWidgetArray(node);
    let changed = false;

    for (const name of ["artist_1", "artist_2", "artist_3"]) {
        const widget = widgets.find((item) => String(item?.name || "") === name);
        if (!widget || widget._animaCollapsed) continue;
        widget._animaCollapsed = true;
        widget.hidden = true;
        widget.computeSize = () => [0, 0];
        widget.serialize = true;
        changed = true;
    }

    return changed;
}

async function openStyleBrowser(node) {
    try {
        const mod = await import("./browser.js");
        const browser = mod?.Browser;
        if (!browser) throw new Error("Browser module unavailable");
        browser.open((artist, options) => AutoCycle.inject(node, artist, options), node);
        const cycleBtn = browser.cycleBtn?.();
        if (cycleBtn) cycleBtn.onclick = () => AutoCycle.toggle(node);
    } catch (error) {
        console.error("[AnimaArtistBrowser] Failed to load Artist Browser", error);
        alert("Could not load Artist Browser. Reload ComfyUI and check the browser console.");
    }
}

function queuePromptIfEnabled(node) {
    if (!readAutoQueue(node)) return false;
    app.queuePrompt?.(0, 1);
    return true;
}

function ensureButtonWidget(node, name, callback, aliases = []) {
    const widgets = ensureWidgetArray(node);
    const allowedNames = [name, ...aliases];
    let widget = widgets.find((item) => allowedNames.includes(String(item?.name || "")) && String(item?.type || "") === "button");
    if (widget) {
        widget.name = name;
        widget.callback = callback;
        return false;
    }
    if (typeof node.addWidget !== "function") return false;
    widget = node.addWidget("button", name, null, callback);
    return !!widget;
}

function ensureRandomCountWidget(node) {
    const widgets = ensureWidgetArray(node);
    let widget = widgets.find((item) => String(item?.name || "") === "Random Count" && String(item?.type || "") === "combo");
    const values = ["1", "2", "3"];

    const onChange = (value) => {
        const normalized = writeRandomCount(node, value);
        if (widget) widget.value = String(normalized);
        refreshNodeCanvas(node);
    };

    if (widget) {
        widget.options = { ...(widget.options || {}), values };
        widget.callback = onChange;
        widget.value = String(readRandomCount(node));
        return false;
    }

    if (typeof node.addWidget !== "function") return false;
    widget = node.addWidget("combo", "Random Count", String(readRandomCount(node)), onChange, { values });
    return !!widget;
}

function ensurePinFavoritesWidget(node) {
    const widgets = ensureWidgetArray(node);
    let widget = widgets.find((item) => String(item?.name || "") === "Pin Favorites" && String(item?.type || "") === "combo");
    const values = ["Off", "On"];

    const onChange = (value) => {
        const normalized = writePinFavorites(node, value);
        if (widget) widget.value = normalized === "on" ? "On" : "Off";
        refreshNodeCanvas(node);
    };

    if (widget) {
        widget.options = { ...(widget.options || {}), values };
        widget.callback = onChange;
        widget.value = readPinFavorites(node) ? "On" : "Off";
        return false;
    }

    if (typeof node.addWidget !== "function") return false;
    widget = node.addWidget("combo", "Pin Favorites", readPinFavorites(node) ? "On" : "Off", onChange, { values });
    return !!widget;
}

function ensureQueueModeWidget(node) {
    const widgets = ensureWidgetArray(node);
    let widget = widgets.find((item) => String(item?.name || "") === "After Queue" && String(item?.type || "") === "combo");
    const values = ["Off", "Next Artist", "Random Artist"];

    const toLabel = (value) => {
        const normalized = normalizeQueueMode(value);
        if (normalized === "next_artist") return "Next Artist";
        if (normalized === "random_artist") return "Random Artist";
        return "Off";
    };

    const onChange = (value) => {
        const normalized = writeQueueMode(node, value);
        if (widget) widget.value = toLabel(normalized);
        refreshNodeCanvas(node);
    };

    if (widget) {
        widget.options = { ...(widget.options || {}), values };
        widget.callback = onChange;
        widget.value = toLabel(readQueueMode(node));
        return false;
    }

    if (typeof node.addWidget !== "function") return false;
    widget = node.addWidget("combo", "After Queue", toLabel(readQueueMode(node)), onChange, { values });
    return !!widget;
}

function ensureAutoQueueWidget(node) {
    const widgets = ensureWidgetArray(node);
    let widget = widgets.find((item) => String(item?.name || "") === "Auto Queue" && String(item?.type || "") === "combo");
    const values = ["Off", "On"];

    const onChange = (value) => {
        const normalized = writeAutoQueue(node, value);
        if (widget) widget.value = normalized === "on" ? "On" : "Off";
        refreshNodeCanvas(node);
    };

    if (widget) {
        widget.options = { ...(widget.options || {}), values };
        widget.callback = onChange;
        widget.value = readAutoQueue(node) ? "On" : "Off";
        return false;
    }

    if (typeof node.addWidget !== "function") return false;
    widget = node.addWidget("combo", "Auto Queue", readAutoQueue(node) ? "On" : "Off", onChange, { values });
    return !!widget;
}

async function loadFavoriteTagSet() {
    try {
        const response = await fetch("/anima/favorites");
        if (!response.ok) return new Set();
        const payload = await response.json().catch(() => ({}));
        const items = Array.isArray(payload?.items) ? payload.items : [];
        return new Set(
            items
                .filter((item) => String(item?.kind || "").toLowerCase() === "style")
                .map((item) => String(item?.tag || "").trim().replace(/\s+/g, "_").toLowerCase())
                .filter(Boolean)
        );
    } catch {
        return new Set();
    }
}

async function applyRandomArtists(node) {
    const count = readRandomCount(node);
    const artists = await Data.all();
    if (!Array.isArray(artists) || !artists.length) return;

    const unique = [];
    const seen = new Set();
    for (const artist of artists) {
        const tag = String(artist?.tag || "").trim();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        unique.push(artist);
    }
    if (!unique.length) return;

    for (let i = unique.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    const pinFavorites = readPinFavorites(node);
    const currentState = getNodeSlotState(node);
    const favoriteTags = pinFavorites ? await loadFavoriteTagSet() : new Set();
    const pinnedSlots = [];
    const pinnedTags = new Set();

    if (pinFavorites) {
        currentState.tags.forEach((tag, slotIndex) => {
            if (!tag || !favoriteTags.has(tag) || pinnedSlots.length >= count) return;
            pinnedSlots.push({ slotIndex, tag });
            pinnedTags.add(tag);
        });
    }

    const availableRandom = unique.filter((artist) => !pinnedTags.has(String(artist?.tag || "").trim().toLowerCase()));
    const nextTags = Array.from({ length: MAX_ARTIST_SLOTS }, () => "");

    pinnedSlots.forEach(({ slotIndex, tag }) => {
        nextTags[slotIndex] = tag;
    });

    let filled = pinnedSlots.length;
    let randomIndex = 0;
    for (let slotIndex = 0; slotIndex < MAX_ARTIST_SLOTS && filled < count; slotIndex += 1) {
        if (nextTags[slotIndex]) continue;
        const artist = availableRandom[randomIndex++];
        if (!artist) break;
        nextTags[slotIndex] = String(artist.tag || "").trim().replace(/\s+/g, "_").toLowerCase();
        filled += 1;
    }

    replaceArtistSlots(node, nextTags, 0);
    queuePromptIfEnabled(node);
}

function reorderWidgets(node, names = []) {
    const widgets = ensureWidgetArray(node);
    if (!widgets.length) return false;

    const wanted = names
        .map((name) => widgets.find((widget) => String(widget?.name || "") === name))
        .filter(Boolean);
    if (!wanted.length) return false;

    const others = widgets.filter((widget) => !wanted.includes(widget));
    const next = [...others, ...wanted];
    const changed = next.some((widget, index) => widget !== widgets[index]);
    if (!changed) return false;

    widgets.length = 0;
    widgets.push(...next);
    return true;
}

function patchNode(node, force = false) {
    if (!node || (!force && !isAnimaNode(node))) return;
    ensureNodeRuntime(node);
    ensureResizePersistence(node);
    syncArtistState(node);

    const addedRandom = ensureButtonWidget(node, "Random Artist", () => {
        applyRandomArtists(node).catch(() => { });
    }, ["Random Style"]);

    const addedRandomCount = ensureRandomCountWidget(node);
    const addedQueueMode = ensureQueueModeWidget(node);
    const addedPinFavorites = ensurePinFavoritesWidget(node);
    const addedAutoQueue = ensureAutoQueueWidget(node);

    const addedBrowser = ensureButtonWidget(node, "Artist Browser", () => {
        openStyleBrowser(node);
    });

    const addedNextSlot = ensureButtonWidget(node, "Next Slot", () => {
        cycleArtistSlot(node);
    });

    const addedClear = ensureButtonWidget(node, "Clear Artist", () => {
        clearArtistSlots(node);
    }, ["Clear Styles"]);

    const addedTag = ensureTagDisplayWidget(node);
    const collapsedArtists = collapseArtistInputWidgets(node);
    reorderWidgets(node, [
        "Artist Browser",
        "Random Artist",
        "After Queue",
        "Random Count",
        "Pin Favorites",
        "Next Slot",
        "Clear Artist",
        "_tag_display",
        "Auto Queue",
        "artist_1",
        "artist_2",
        "artist_3",
    ]);

    growNodeIfNeeded(node);

    if (addedRandom || addedRandomCount || addedQueueMode || addedPinFavorites || addedAutoQueue || addedBrowser || addedNextSlot || addedClear || addedTag || collapsedArtists) {
        LAYOUT_REFRESH_DELAYS.forEach((delay, index) => {
            scheduleNodeTimer(node, `layout_${index}`, delay, () => {
                if (!isNodeAlive(node)) return;
                growNodeIfNeeded(node);
            });
        });
    }
}

function ensureNodeUi(node, force = false) {
    patchNode(node, force);
}

function patchExistingNodes() {
    const nodes = app.graph?._nodes || [];
    for (const node of nodes) {
        ensureNodeUi(node);
    }
}

app.registerExtension({
    name: "AnimaArtistBrowser",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "AnimaArtistBrowser") return;
        injectCSS();

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            origOnNodeCreated?.apply(this, arguments);
            ensureNodeUi(this, true);
        };
    },

    nodeCreated(node) {
        ensureNodeUi(node);
    },

    loadedGraphNode(node) {
        ensureNodeUi(node);
    },

    setup() {
        INITIAL_GRAPH_SWEEP_DELAYS.forEach((delay) => {
            setTimeout(() => {
                patchExistingNodes();
            }, delay);
        });
    },
});
