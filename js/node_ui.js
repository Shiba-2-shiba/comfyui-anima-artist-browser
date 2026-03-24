import { AutoCycle } from "./autocycle.js";
import { MAX_ARTIST_SLOTS, clampSlotIndex } from "./slot_state.js";
import { clearArtistSlots } from "./utils.js";
import {
    normalizeQueueMode,
    readAutoQueue,
    readPinFavorites,
    readQueueMode,
    writeAutoQueue,
    writePinFavorites,
    writeQueueMode,
} from "./queue_settings.js";

function ensureWidgetArray(node) {
    if (!node) return [];
    if (!Array.isArray(node.widgets)) node.widgets = [];
    return node.widgets;
}

function queueLoopButtonLabel(node) {
    return AutoCycle.isActiveFor?.(node) ? "Stop Queue Loop" : "Start Queue Loop";
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

function ensurePinFavoritesWidget(node, refreshNodeCanvas) {
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

function ensureQueueModeWidget(node, refreshNodeCanvas) {
    const widgets = ensureWidgetArray(node);
    let widget = widgets.find((item) => String(item?.name || "") === "After Queue" && String(item?.type || "") === "combo");
    const values = ["Fixed", "Next Artist", "Random Artist", "Favorite Random"];

    const toLabel = (value) => {
        const normalized = normalizeQueueMode(value);
        if (normalized === "fixed") return "Fixed";
        if (normalized === "next_artist") return "Next Artist";
        if (normalized === "random_artist") return "Random Artist";
        if (normalized === "favorite_random") return "Favorite Random";
        return "Fixed";
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

function ensureAutoQueueWidget(node, refreshNodeCanvas) {
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

export function ensureNodeWidgets(node, { refreshNodeCanvas } = {}) {
    const refresh = typeof refreshNodeCanvas === "function" ? refreshNodeCanvas : () => { };

    const addedQueueMode = ensureQueueModeWidget(node, refresh);
    const addedPinFavorites = ensurePinFavoritesWidget(node, refresh);
    const addedAutoQueue = ensureAutoQueueWidget(node, refresh);
    const addedQueueLoop = ensureButtonWidget(node, queueLoopButtonLabel(node), () => {
        AutoCycle.toggle(node);
        const button = ensureWidgetArray(node).find((item) => String(item?.type || "") === "button" && ["Start Queue Loop", "Stop Queue Loop"].includes(String(item?.name || "")));
        if (button) button.name = queueLoopButtonLabel(node);
        refresh(node);
    }, ["Start Queue Loop", "Stop Queue Loop"]);

    const addedBrowser = ensureButtonWidget(node, "Artist Browser", () => {
        openStyleBrowser(node);
    });

    const addedClear = ensureButtonWidget(node, "Clear Artist", () => {
        clearArtistSlots(node);
    }, ["Clear Styles"]);

    const addedTag = ensureTagDisplayWidget(node);
    const collapsedArtists = collapseArtistInputWidgets(node);
    reorderWidgets(node, [
        "Artist Browser",
        "After Queue",
        "Pin Favorites",
        "Clear Artist",
        "_tag_display",
        "Auto Queue",
        "Start Queue Loop",
        "Stop Queue Loop",
        "artist_1",
        "artist_2",
        "artist_3",
    ]);

    return addedQueueMode || addedPinFavorites || addedAutoQueue || addedQueueLoop || addedBrowser || addedClear || addedTag || collapsedArtists;
}
