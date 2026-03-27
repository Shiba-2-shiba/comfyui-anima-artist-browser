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
import { Swipe } from "./swipe.js";
import { thumbUrl } from "./utils.js";
import { showToast } from "./toast.js";
import { createBrowserBootstrap } from "./browser_bootstrap.js";
import { createBrowserController } from "./browser_controller.js";
import { bindBrowserElements, createBrowserStore, getStoredBrowserCategory, setBrowserCategory } from "./browser_store.js";
import { createBrowserView } from "./browser_view.js";
import { attachBrowserEvents } from "./browser_events.js";
import { getBrowserTemplate } from "./browser_template.js";

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

const bootstrap = createBrowserBootstrap({
    api,
    store,
    controller,
    view,
    dataApi: Data,
    attachBrowserEvents,
    getBrowserTemplate,
    bindBrowserElements,
    setBrowserCategory,
    close,
});

async function open(cb, node = null) {
    bootstrap.ensureBuilt();
    store.onPick = cb;
    store.activeNode = node || null;
    store.category = getStoredBrowserCategory();
    store.localFavoritesLoaded = false;
    view.setCategoryTabs();
    view.refreshSlotSummary();
    store.el.classList.remove("hidden");
    bootstrap.focusSearchInput();
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

export const Browser = {
    open,
    close,
    cycleBtn,
};
