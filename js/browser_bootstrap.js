import { AutoCycle } from "./autocycle.js";

export function createBrowserBootstrap({
    api,
    store,
    controller,
    view,
    dataApi,
    attachBrowserEvents,
    getBrowserTemplate,
    bindBrowserElements,
    setBrowserCategory,
    close,
}) {
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

    function attachEvents() {
        attachBrowserEvents({
            el: store.el,
            api,
            localHeaders: controller.localHeaders,
            ensureLocalToken: controller.ensureLocalToken,
            getCategory: () => store.category,
            reloadLocalFavorites: controller.reloadLocalFavorites,
            render: view.render,
            close,
            dataReset: () => dataApi.reset(),
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

    function ensureBuilt() {
        const existing = document.getElementById("anima-browser");
        if (existing) {
            bindBrowserElements(store, existing);
            ensureCycleBridge();
            return store.el;
        }

        const el = document.createElement("div");
        el.id = "anima-browser";
        el.className = "hidden";
        el.innerHTML = getBrowserTemplate();

        document.body.appendChild(el);
        bindBrowserElements(store, el);
        ensureCycleBridge();
        attachEvents();
        return store.el;
    }

    function focusSearchInput() {
        store.el?.querySelector(".cycle-search input")?.focus();
    }

    return {
        ensureBuilt,
        focusSearchInput,
    };
}
