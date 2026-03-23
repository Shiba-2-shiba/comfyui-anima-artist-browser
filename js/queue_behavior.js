import { app } from "../../scripts/app.js";
import { Data } from "./data.js";
import { AutoCycle } from "./autocycle.js";
import { getNodeSlotState, replaceArtistSlots } from "./utils.js";
import {
    buildNextArtistSlotState,
    buildRandomizedSlotState,
    loadFavoriteTagSet,
    readAutoQueue,
    readPinFavorites,
    readQueueMode,
} from "./queue_settings.js";

function defaultRefreshNodeCanvas(node) {
    if (!node) return;
    try {
        node.setDirtyCanvas?.(true, true);
        app.graph?.setDirtyCanvas?.(true, true);
    } catch { }
}

function defaultIsNodeAlive(node) {
    return !!node && Array.isArray(app.graph?._nodes) && app.graph._nodes.includes(node);
}

function getQueueBehaviorConfig() {
    return app._animaQueueBehavior || {};
}

function slotStatesMatch(left, right) {
    const leftTags = Array.isArray(left?.tags) ? left.tags : [];
    const rightTags = Array.isArray(right?.tags) ? right.tags : [];
    if (leftTags.length !== rightTags.length) return false;
    for (let i = 0; i < leftTags.length; i += 1) {
        if (leftTags[i] !== rightTags[i]) return false;
    }
    return true;
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
    const nextState = mode === "next_artist"
        ? buildNextArtistSlotState({
            state: previousState,
            artists,
            pinFavorites,
            favoriteTags,
        })
        : buildRandomizedSlotState({
            state: previousState,
            artists,
            pinFavorites,
            favoriteTags,
        });

    if (slotStatesMatch(previousState, nextState)) return false;

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
        } catch { }
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
