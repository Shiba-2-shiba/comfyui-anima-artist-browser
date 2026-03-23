import { app } from "../../scripts/app.js";
import { injectCSS } from "./styles.js";
import { Data } from "./data.js";
import { AC } from "./autocomplete.js";
import { AutoCycle } from "./autocycle.js";
import { MAX_ARTIST_SLOTS, clampSlotIndex } from "./slot_state.js";
import { clearArtistSlots, cycleArtistSlot, getPromptWidget, syncArtistState } from "./utils.js";

const ANIMA_SIZE_KEY = "_anima_saved_size";
const LAYOUT_REFRESH_DELAYS = [140, 360];
const AUTOCOMPLETE_RETRY_DELAYS = [120, 320, 900];
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
            autocompleteReady: false,
            autocompleteAttempts: 0,
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

function attachPromptAutocomplete(node) {
    const textarea = getPromptWidget(node)?.inputEl;
    if (textarea?.tagName !== "TEXTAREA") return false;
    AC.attach(textarea);
    return true;
}

function ensurePromptAutocomplete(node) {
    if (!node || !isAnimaNode(node)) return;
    const runtime = ensureNodeRuntime(node);
    if (!runtime || runtime.autocompleteReady) return;

    if (attachPromptAutocomplete(node)) {
        runtime.autocompleteReady = true;
        clearNodeTimer(node, "autocomplete");
        return;
    }

    const attempt = runtime.autocompleteAttempts || 0;
    if (attempt >= AUTOCOMPLETE_RETRY_DELAYS.length) return;

    runtime.autocompleteAttempts = attempt + 1;
    scheduleNodeTimer(node, "autocomplete", AUTOCOMPLETE_RETRY_DELAYS[attempt], () => {
        if (!isNodeAlive(node)) return;
        ensurePromptAutocomplete(node);
    });
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

function ensureButtonWidget(node, name, callback) {
    const widgets = ensureWidgetArray(node);
    let widget = widgets.find((item) => String(item?.name || "") === name && String(item?.type || "") === "button");
    if (widget) {
        widget.callback = callback;
        return false;
    }
    if (typeof node.addWidget !== "function") return false;
    widget = node.addWidget("button", name, null, callback);
    return !!widget;
}

function moveWidgetsToBottom(node, names = []) {
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

    const addedRandom = ensureButtonWidget(node, "Random Style", () => {
        Data.random().then((artist) => {
            if (artist) AutoCycle.inject(node, artist);
        }).catch(() => { });
    });

    const addedBrowser = ensureButtonWidget(node, "Artist Browser", () => {
        openStyleBrowser(node);
    });

    const addedNextSlot = ensureButtonWidget(node, "Next Slot", () => {
        cycleArtistSlot(node);
    });

    const addedClear = ensureButtonWidget(node, "Clear Styles", () => {
        clearArtistSlots(node);
    });

    const addedTag = ensureTagDisplayWidget(node);
    moveWidgetsToBottom(node, ["_tag_display", "Clear Styles", "Next Slot", "Artist Browser", "Random Style"]);

    growNodeIfNeeded(node);

    if (addedRandom || addedBrowser || addedNextSlot || addedClear || addedTag) {
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
    ensurePromptAutocomplete(node);
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
