import { app } from "../../scripts/app.js";
import { Data } from "./data.js";
import { AutoCycle } from "./autocycle.js";
import { logWarn } from "./logger.js";
import { getNodeSlotState, replaceArtistSlots } from "./utils.js";
import {
    loadFavoriteTagSet,
    readAutoQueue,
    readPinFavorites,
    readQueueMode,
    resolveQueueAdvance,
} from "./queue_settings.js";

function defaultRefreshNodeCanvas(node) {
    if (!node) return;
    try {
        node.setDirtyCanvas?.(true, true);
        app.graph?.setDirtyCanvas?.(true, true);
    } catch (error) {
        logWarn("Failed to refresh node canvas after queue advance", error);
    }
}

function defaultIsNodeAlive(node) {
    return !!node && Array.isArray(app.graph?._nodes) && app.graph._nodes.includes(node);
}

function getQueueBehaviorConfig() {
    return app._animaQueueBehavior || {};
}

export async function advanceNodeAfterQueue(node, overrides = {}) {
    const config = { ...getQueueBehaviorConfig(), ...overrides };
    const isNodeAlive = config.isNodeAlive || defaultIsNodeAlive;
    const refreshNodeCanvas = config.refreshNodeCanvas || defaultRefreshNodeCanvas;

    if (!node || !isNodeAlive(node)) return false;

    const mode = readQueueMode(node);
    if (mode === "fixed") return false;

    const artists = await Data.all();
    if (!Array.isArray(artists) || !artists.length) return false;

    const previousState = getNodeSlotState(node);
    const pinFavorites = readPinFavorites(node);
    const favoriteTags = pinFavorites ? await loadFavoriteTagSet(fetch) : new Set();
    const { nextState, changes } = resolveQueueAdvance({
        state: previousState,
        artists,
        mode,
        pinFavorites,
        favoriteTags,
    });

    if (!changes.length) return false;

    replaceArtistSlots(node, nextState.tags, nextState.currentSlot);
    refreshNodeCanvas(node);
    return true;
}

async function advanceQueuedNodesAfterSubmission() {
    const config = getQueueBehaviorConfig();
    const isAnimaNode = config.isAnimaNode || (() => false);

    const nodes = (app.graph?._nodes || []).filter((node) => {
        if (!isAnimaNode(node)) return false;
        if (AutoCycle.isActiveFor?.(node)) return false;
        if (readAutoQueue(node)) return false;
        return readQueueMode(node) !== "fixed";
    });

    for (const node of nodes) {
        try {
            await advanceNodeAfterQueue(node);
        } catch (error) {
            logWarn("Failed to advance node after queue submission", error);
        }
    }
}

export function ensureQueuePromptHook(config = {}) {
    app._animaQueueBehavior = {
        ...getQueueBehaviorConfig(),
        ...config,
    };

    if (app._animaQueuePromptWrapped) return;
    if (typeof app.queuePrompt !== "function") return;

    const originalQueuePrompt = app.queuePrompt.bind(app);
    app._animaQueuePromptWrapped = true;
    app.queuePrompt = async function () {
        const result = await originalQueuePrompt(...arguments);
        await advanceQueuedNodesAfterSubmission();
        return result;
    };
}
