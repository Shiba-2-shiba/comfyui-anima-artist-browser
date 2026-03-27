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

    function resetSyncButton(delay = 0) {
        const applyReset = () => {
            syncBtn.textContent = "Sync Local Snapshot";
            syncBtn.classList.remove("disabled");
        };

        if (delay > 0) {
            setTimeout(applyReset, delay);
            return;
        }

        applyReset();
    }

    async function pollSyncStatus() {
        try {
            syncBtn.classList.add("disabled");
            const statusResponse = await api.fetchApi("/anima/download_status");
            const status = await statusResponse.json();
            if (status.active) {
                const phase = String(status.phase || "").trim();
                if (phase === "artist_data") {
                    syncBtn.textContent = "Syncing artist data...";
                } else {
                    syncBtn.textContent = `Syncing previews ${status.done}/${status.total}...`;
                }
                setTimeout(() => {
                    void pollSyncStatus();
                }, 1000);
                return;
            }

            const syncSucceeded = status.phase === "complete";
            syncBtn.textContent = syncSucceeded ? "Snapshot Ready!" : "Sync Failed";
            syncBtn.classList.remove("disabled");
            resetSyncButton(3000);
            if (syncSucceeded) {
                dataReset();
            }
            await render();
        } catch (error) {
            resetSyncButton();
            reportActionFailure("Failed while polling local snapshot sync status", error, "Could not refresh sync status.");
        }
    }

    syncBtn.addEventListener("click", async () => {
        if (syncBtn.classList.contains("disabled")) return;
        const ok = confirm(
            "This will download artist data and local preview images into this custom node folder.\n\n"
            + "Normal browsing will stay local-only after the sync completes.\n\n"
            + "It can take a long time and may use hundreds of MB.\n\n"
            + "Continue?"
        );
        if (!ok) return;

        try {
            const headers = await ensureHeadersReady();
            const response = await api.fetchApi("/anima/sync_local_snapshot", { method: "POST", headers });
            const payload = await response.json().catch(() => ({}));
            if (!payload.success) {
                alert("Sync is already running or failed to start.");
                return;
            }
            void pollSyncStatus();
        } catch (err) {
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
}
