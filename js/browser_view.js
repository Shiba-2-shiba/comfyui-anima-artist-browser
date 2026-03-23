import { nextRenderId } from "./browser_store.js";
import { getNodeSlotState, setCurrentArtistSlot } from "./utils.js";

export function createBrowserView({
    store,
    controller,
    dataApi,
    renderChunkedGrid,
    buildStyleList,
    buildFavoritesList,
    createStyleCard,
    thumbUrl,
    showToast,
    swipe,
}) {
    function setCategoryTabs() {
        if (!store.el) return;
        store.el.querySelector("#anima-cat-all").style.opacity = store.category === "all" ? "1" : "0.5";
        store.el.querySelector("#anima-cat-favorites").style.opacity = store.category === "favorites" ? "1" : "0.5";
        const sortSelect = store.el.querySelector(".hdr-select");
        if (sortSelect) sortSelect.disabled = store.category !== "all";
    }

    function refreshSlotSummary() {
        if (!store.el) return;
        const slotHint = store.el.querySelector("#anima-slot-hint");
        const slotButtons = [...store.el.querySelectorAll(".slot-chip")];
        const activeNode = store.activeNode;
        const state = activeNode ? getNodeSlotState(activeNode) : null;

        if (!state) {
            if (slotHint) slotHint.textContent = "Open from a node to target slots directly";
            slotButtons.forEach((button, index) => {
                button.classList.remove("active");
                button.querySelector(".slot-chip-tag").textContent = "(empty)";
                button.disabled = true;
                button.dataset.slotIndex = String(index);
            });
            return;
        }

        if (slotHint) slotHint.textContent = `Active slot S${state.currentSlot + 1} · click a chip or use card S1/S2/S3 buttons`;
        slotButtons.forEach((button, index) => {
            const tag = state.tags[index];
            button.classList.toggle("active", index === state.currentSlot);
            button.querySelector(".slot-chip-tag").textContent = tag ? `@${String(tag).replace(/_/g, " ")}` : "(empty)";
            button.disabled = false;
        });
    }

    function setActiveSlot(slotIndex) {
        if (!store.activeNode) return null;
        const currentSlot = setCurrentArtistSlot(store.activeNode, slotIndex);
        refreshSlotSummary();
        return currentSlot;
    }

    async function applyArtist(artist, anchorEl = null, options = {}) {
        if (Number.isInteger(options.slotIndex) && store.activeNode) {
            setActiveSlot(options.slotIndex);
        }
        await store.onPick?.(artist, options);
        highlight(artist?.tag || "");
        refreshSlotSummary();
        showToast(`Applied @${String(artist?.tag || "").replace(/_/g, " ")}`, "success", 1500, { anchor: anchorEl });
    }

    async function openSwipe(startIndex) {
        if (!store.lastList.length) await render();
        if (!store.lastList.length) return;

        const boundedStart = Math.max(0, Math.min(Number(startIndex) || 0, store.lastList.length - 1));
        swipe.open({
            list: store.lastList,
            startIndex: boundedStart,
            onApply: (artist) => {
                applyArtist(artist);
            },
            getImageUrl: (artist) => thumbUrl(artist, false),
            getTitle: (artist) => String(artist?.tag || "").replace(/_/g, " "),
        });
    }

    async function renderFavorites() {
        const id = nextRenderId(store);
        store.grid.innerHTML = `<div class="anima-empty"><div class="anima-spinner"></div><span>Loading favorites...</span></div>`;

        await controller.loadLocalFavorites();
        if (id !== store.renderId) return;

        const artists = await dataApi.all();
        if (id !== store.renderId) return;

        const list = buildFavoritesList({
            artists,
            localFavorites: store.localFavorites,
            filter: store.filter,
        });

        store.countEl.textContent = `${list.length} favorites`;
        store.lastList = list;
        store.el.querySelector(".body").scrollTop = 0;

        if (!list.length) {
            if (store.observer) store.observer.disconnect();
            store.grid.innerHTML = `<div class="anima-empty"><span>No favorites yet.</span></div>`;
            return;
        }

        renderChunkedGrid({
            grid: store.grid,
            observer: store.observer,
            items: list,
            chunkSize: 60,
            minHeight: "400px",
            renderItem: (artist) => card(artist),
        });
    }

    async function render() {
        if (store.category === "favorites") return renderFavorites();

        const id = nextRenderId(store);
        store.grid.innerHTML = `<div class="anima-empty"><div class="anima-spinner"></div><span>Loading styles...</span></div>`;
        const full = await dataApi.all();
        if (id !== store.renderId) return;

        const list = buildStyleList(full, { sort: store.sort, filter: store.filter });
        store.countEl.textContent = `${list.length} styles`;
        store.lastList = list;
        store.el.querySelector(".body").scrollTop = 0;

        renderChunkedGrid({
            grid: store.grid,
            observer: store.observer,
            items: list,
            chunkSize: 100,
            minHeight: "400px",
            renderItem: (artist) => card(artist),
        });
    }

    function card(artist) {
        return createStyleCard({
            artist,
            imageUrl: thumbUrl(artist, false),
            isUniq: store.sort === "uniqueness",
            isFav: controller.isFavorited(artist),
            onApply: (selectedArtist, anchorEl = null) => applyArtist(selectedArtist, anchorEl),
            onApplyToSlot: (selectedArtist, slotIndex, anchorEl = null) => applyArtist(selectedArtist, anchorEl, {
                slotIndex,
                preferCurrentSlot: true,
            }),
            onToggleFavorite: async (selectedArtist, _btn, anchorEl = null) => {
                return await controller.toggleStyleFavorite(selectedArtist, anchorEl, { rerenderFavorites: renderFavorites });
            },
            onOpenSwipe: (selectedArtist) => {
                const idx = store.lastList.findIndex((item) => item.tag === selectedArtist.tag);
                openSwipe(idx >= 0 ? idx : 0);
            },
        });
    }

    function highlight(tag) {
        store.lastHighlightedTag = tag || "";
        store.grid.querySelectorAll(".anima-card.selected").forEach((cardEl) => cardEl.classList.remove("selected"));
        if (!tag) return;
        const escaped = CSS.escape(tag);
        store.grid.querySelector(`.anima-card[data-tag="${escaped}"]`)?.classList.add("selected");
    }

    return {
        setCategoryTabs,
        refreshSlotSummary,
        setActiveSlot,
        openSwipe,
        renderFavorites,
        render,
        highlight,
    };
}
