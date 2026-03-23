import { api } from "../../scripts/api.js";
import { Data } from "./data.js";
import { localFavoriteFromStyle } from "./browser_helpers.js";
import {
    buildFavoritesList,
    loadLocalFavorites as fetchLocalFavorites,
    mutateLocalFavorites as sendLocalFavoriteMutation,
    rebuildFavoriteMap,
} from "./browser_favorites.js";
import { createStyleCard } from "./browser_cards.js";
import { buildStyleList, renderChunkedGrid } from "./browser_renderers.js";
import { attachBrowserEvents } from "./browser_events.js";
import { getBrowserTemplate } from "./browser_template.js";
import { SITE_BASE } from "./config.js";
import { Swipe } from "./swipe.js";
import { thumbUrl } from "./utils.js";
import { showToast } from "./toast.js";
import { createBrowserController } from "./browser_controller.js";
import { createBrowserStore, getStoredBrowserCategory, setBrowserCategory } from "./browser_store.js";
import { createBrowserView } from "./browser_view.js";
import { AutoCycle } from "./autocycle.js";

const store = createBrowserStore();

const controller = createBrowserController({
    api,
    store,
    fetchLocalFavorites,
    sendLocalFavoriteMutation,
    rebuildFavoriteMap,
    localFavoriteFromStyle,
    showToast,
});

const view = createBrowserView({
    store,
    controller,
    dataApi: Data,
    renderChunkedGrid,
    buildStyleList,
    buildFavoritesList,
    createStyleCard,
    thumbUrl,
    showToast,
    swipe: Swipe,
});

let cycleUnsubscribe = null;

function ensureCycleBridge() {
    if (cycleUnsubscribe) return;
    cycleUnsubscribe = AutoCycle.subscribe(({ node, artist }) => {
        if (!store.el || node !== store.activeNode) return;
        if (artist?.tag) {
            view.highlight(String(artist.tag));
        }
        view.refreshSlotSummary();
    });
}

function ensureBuilt() {
    if (document.getElementById("anima-browser")) {
        store.el = document.getElementById("anima-browser");
        store.grid = store.el?.querySelector("#anima-grid") || null;
        store.countEl = store.el?.querySelector("#anima-count") || null;
        ensureCycleBridge();
        return;
    }

    store.el = document.createElement("div");
    store.el.id = "anima-browser";
    store.el.className = "hidden";
    store.el.innerHTML = getBrowserTemplate(SITE_BASE);

    document.body.appendChild(store.el);
    store.grid = store.el.querySelector("#anima-grid");
    store.countEl = store.el.querySelector("#anima-count");
    ensureCycleBridge();

    attachBrowserEvents({
        el: store.el,
        api,
        localHeaders: controller.localHeaders,
        ensureLocalToken: controller.ensureLocalToken,
        getCategory: () => store.category,
        reloadLocalFavorites: controller.reloadLocalFavorites,
        render: view.render,
        close,
        dataReset: () => Data.reset(),
        setFilter: (value) => {
            store.filter = value;
        },
        setSort: (value) => {
            store.sort = value;
        },
        setCategory: (value) => {
            setBrowserCategory(store, value);
        },
        setCategoryTabs: view.setCategoryTabs,
        setObserver: (observer) => {
            store.observer = observer;
        },
        setActiveSlot: view.setActiveSlot,
        refreshSlotSummary: view.refreshSlotSummary,
        openSwipeFromHighlighted: async () => {
            if (!store.lastList.length) await view.render();
            if (!store.lastList.length) return;

            let startIndex = 0;
            if (store.lastHighlightedTag) {
                const idx = store.lastList.findIndex((artist) => String(artist?.tag || "") === store.lastHighlightedTag);
                if (idx >= 0) startIndex = idx;
            }
            await view.openSwipe(startIndex);
        },
        loadLocalFavorites: controller.loadLocalFavorites,
    });
}

async function open(cb, node = null) {
    ensureBuilt();
    store.onPick = cb;
    store.activeNode = node || null;
    store.category = getStoredBrowserCategory();
    store.localFavoritesLoaded = false;
    view.setCategoryTabs();
    view.refreshSlotSummary();
    store.el.classList.remove("hidden");
    store.el.querySelector(".cycle-search input").focus();
    await controller.ensureLocalToken();
    await controller.loadLocalFavorites();
    await view.render();
}

function close() {
    Swipe.close();
    store.el?.classList.add("hidden");
}

function cycleBtn() {
    return document.getElementById("anima-cycle-btn");
}

function cycleStatus() {
    return document.getElementById("anima-cycle-status");
}

export const Browser = {
    open,
    close,
    cycleBtn,
    cycleStatus,
    highlight: view.highlight,
};
