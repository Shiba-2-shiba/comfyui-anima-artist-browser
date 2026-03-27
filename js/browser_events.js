import { logWarn } from "./logger.js";

export function attachBrowserEvents({
    el,
    api,
    localHeaders,
    ensureLocalToken,
    getCategory,
    reloadLocalFavorites,
    render,
    close,
    dataReset,
    setFilter,
    setSort,
    setCategory,
    setCategoryTabs,
    setObserver,
    setActiveSlot,
    refreshSlotSummary,
    openSwipeFromHighlighted,
    loadLocalFavorites,
}) {
    const ensureHeadersReady = async () => {
        const ok = await ensureLocalToken();
        if (!ok) {
            throw new Error("Local security token not available. Reopen the browser and try again.");
        }
        return localHeaders();
    };

    function reportActionFailure(context, error, userMessage = "") {
        logWarn(context, error);
        if (userMessage) {
            alert(userMessage);
        }
    }

    function restoreInlineButton(button, html) {
        button.innerHTML = html;
        button.style.pointerEvents = "auto";
    }

    const closeBrowser = () => {
        close();
    };

    const syncBtn = el.querySelector("#anima-sync-local");
    const syncStrip = el.querySelector("#anima-sync-strip");
    const syncStatusEl = el.querySelector("#anima-sync-status");
    const syncProgressBarEl = el.querySelector("#anima-sync-progress-bar");
    const syncProgressTextEl = el.querySelector("#anima-sync-progress-text");

    function setSyncUi({
        state = "idle",
        buttonLabel = "Sync Local Snapshot",
        statusText = "Normal browsing uses local files only. Run sync to refresh the snapshot.",
        progressText = "Idle",
        progress = 0,
        active = false,
    } = {}) {
        const bounded = Math.max(0, Math.min(100, Number(progress) || 0));
        syncBtn.textContent = buttonLabel;
        syncBtn.classList.toggle("disabled", !!active);
        syncStrip?.setAttribute("data-state", state);
        if (syncStatusEl) syncStatusEl.textContent = statusText;
        if (syncProgressTextEl) syncProgressTextEl.textContent = progressText;
        if (syncProgressBarEl) syncProgressBarEl.style.width = `${bounded}%`;
    }

    function progressFromStatus(status = {}) {
        const phase = String(status.phase || "").trim();
        const total = Math.max(0, Number(status.total) || 0);
        const done = Math.max(0, Number(status.done) || 0);
        if (phase === "artist_data") return 8;
        if (!total) return phase === "complete" ? 100 : 0;
        return Math.max(10, Math.min(100, Math.round((done / total) * 100)));
    }

    function applySyncStatus(status = {}) {
        const phase = String(status.phase || "").trim();
        const total = Math.max(0, Number(status.total) || 0);
        const done = Math.max(0, Number(status.done) || 0);
        const message = String(status.message || "").trim();

        if (status.active) {
            const statusText = phase === "artist_data"
                ? (message || "Downloading artist data...")
                : `${message || "Downloading preview images..."} ${total > 0 ? `(${done}/${total})` : ""}`.trim();
            const progressText = phase === "artist_data"
                ? "Artist data"
                : total > 0
                    ? `${done}/${total}`
                    : "Working";
            setSyncUi({
                state: "active",
                buttonLabel: "Sync Running...",
                statusText,
                progressText,
                progress: progressFromStatus(status),
                active: true,
            });
            return;
        }

        if (phase === "complete") {
            setSyncUi({
                state: "complete",
                buttonLabel: "Sync Local Snapshot",
                statusText: message || "Local snapshot is ready. Browser thumbnails are served from local files.",
                progressText: total > 0 ? `${total}/${total}` : "Ready",
                progress: 100,
            });
            return;
        }

        if (phase === "failed") {
            setSyncUi({
                state: "failed",
                buttonLabel: "Retry Local Snapshot",
                statusText: message || "Local snapshot sync failed.",
                progressText: total > 0 ? `${done}/${total}` : "Failed",
                progress: progressFromStatus(status),
            });
            return;
        }

        setSyncUi();
    }

    async function pollSyncStatus({ rerenderOnComplete = true } = {}) {
        try {
            const statusResponse = await api.fetchApi("/anima/download_status");
            if (!statusResponse.ok) {
                throw new Error(`Download status request failed (${statusResponse.status})`);
            }
            const status = await statusResponse.json();
            applySyncStatus(status);
            if (status.active) {
                setTimeout(() => {
                    void pollSyncStatus({ rerenderOnComplete });
                }, 1000);
                return;
            }

            const syncSucceeded = status.phase === "complete";
            if (syncSucceeded) {
                dataReset();
                if (rerenderOnComplete) {
                    await render();
                }
            }
        } catch (error) {
            setSyncUi({
                state: "failed",
                buttonLabel: "Retry Local Snapshot",
                statusText: "Could not refresh local snapshot status.",
                progressText: "Unavailable",
                progress: 0,
            });
            reportActionFailure("Failed while polling local snapshot sync status", error, "Could not refresh sync status.");
        }
    }

    syncBtn.addEventListener("click", async () => {
        if (syncBtn.classList.contains("disabled")) return;
        const ok = confirm(
            "This will download artist data and local preview images into this custom node folder.\n\n"
            + "Estimated download size: about 750 MB.\n\n"
            + "Normal browsing will stay local-only after the sync completes.\n\n"
            + "It can take a long time and may use hundreds of MB.\n\n"
            + "Continue?"
        );
        if (!ok) return;

        try {
            const headers = await ensureHeadersReady();
            setSyncUi({
                state: "active",
                buttonLabel: "Starting Sync...",
                statusText: "Preparing local snapshot...",
                progressText: "Starting",
                progress: 2,
                active: true,
            });
            const response = await api.fetchApi("/anima/sync_local_snapshot", { method: "POST", headers });
            const payload = await response.json().catch(() => ({}));
            if (!payload.success) {
                await pollSyncStatus({ rerenderOnComplete: false });
                alert("Sync is already running or failed to start.");
                return;
            }
            void pollSyncStatus();
        } catch (err) {
            setSyncUi({
                state: "failed",
                buttonLabel: "Retry Local Snapshot",
                statusText: err?.message || "Could not start local snapshot sync.",
                progressText: "Failed",
                progress: 0,
            });
            reportActionFailure("Failed to start local snapshot sync", err, err?.message || "Could not start local snapshot sync.");
        }
    });

    el.querySelector(".backdrop").addEventListener("click", closeBrowser);
    el.querySelector(".hdr-close").addEventListener("click", closeBrowser);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeBrowser();
        }
    });

    el.querySelector("#anima-refresh").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const oldHtml = btn.innerHTML;
        btn.innerHTML = `<div class="anima-spinner" style="width:14px;height:14px;border-width:2px"></div>`;
        btn.style.pointerEvents = "none";
        try {
            if (getCategory() === "favorites") {
                await reloadLocalFavorites();
            } else {
                dataReset();
            }
            await render();
        } catch (error) {
            reportActionFailure("Failed to refresh browser view", error);
        }
        restoreInlineButton(btn, oldHtml);
    });

    let searchTo;
    el.querySelector(".cycle-search input").addEventListener("input", (e) => {
        clearTimeout(searchTo);
        searchTo = setTimeout(() => {
            setFilter(e.target.value.replace(/^@/, ""));
            render();
        }, 150);
    });

    el.querySelector(".hdr-select").addEventListener("change", (e) => {
        setSort(e.target.value);
        render();
    });

    el.querySelector("#anima-swipe-btn")?.addEventListener("click", async () => {
        await openSwipeFromHighlighted();
    });

    el.querySelector("#anima-cat-all").addEventListener("click", async () => {
        setCategory("all");
        setCategoryTabs();
        await render();
    });

    el.querySelector("#anima-cat-favorites").addEventListener("click", async () => {
        setCategory("favorites");
        setCategoryTabs();
        await render();
    });

    el.querySelectorAll(".slot-chip").forEach((button) => {
        button.addEventListener("click", () => {
            const slotIndex = Number(button.dataset.slotIndex);
            if (!Number.isInteger(slotIndex)) return;
            setActiveSlot(slotIndex);
            refreshSlotSummary();
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target._mount?.();
            else entry.target._unmount?.();
        });
    }, { root: el.querySelector(".body"), rootMargin: "400px" });
    setObserver(observer);

    setCategoryTabs();
    refreshSlotSummary();
    (async () => {
        await loadLocalFavorites();
    })();
    void pollSyncStatus({ rerenderOnComplete: false });
}
