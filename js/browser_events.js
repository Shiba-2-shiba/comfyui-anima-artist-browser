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
    const onlineToggle = el.querySelector("#anima-online-toggle");
    if (localStorage.getItem("anima_online") === null) {
        localStorage.setItem("anima_online", "true");
    }
    onlineToggle.checked = localStorage.getItem("anima_online") === "true";
    onlineToggle.addEventListener("change", (e) => {
        localStorage.setItem("anima_online", e.target.checked);
        render();
    });

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

    const dlBtn = el.querySelector("#anima-dl-images");

    function resetDownloadButton(delay = 0) {
        const applyReset = () => {
            dlBtn.textContent = "Download Previews";
            dlBtn.classList.remove("disabled");
        };

        if (delay > 0) {
            setTimeout(applyReset, delay);
            return;
        }

        applyReset();
    }

    async function pollDownloadStatus() {
        try {
            dlBtn.classList.add("disabled");
            const statusResponse = await api.fetchApi("/anima/download_status");
            const status = await statusResponse.json();
            if (status.active) {
                dlBtn.textContent = `Downloading ${status.done}/${status.total}...`;
                setTimeout(() => {
                    void pollDownloadStatus();
                }, 1000);
                return;
            }

            dlBtn.textContent = "Download Complete!";
            dlBtn.classList.remove("disabled");
            resetDownloadButton(3000);
            await render();
        } catch (error) {
            resetDownloadButton();
            reportActionFailure("Failed while polling preview download status", error, "Could not refresh preview download status.");
        }
    }

    dlBtn.addEventListener("click", async () => {
        if (dlBtn.classList.contains("disabled")) return;
        const ok = confirm(
            "This will download preview images for up to 20,000 styles.\n\n"
            + "It can take a long time and may use hundreds of MB.\n\n"
            + "Continue?"
        );
        if (!ok) return;

        try {
            const headers = await ensureHeadersReady();
            const response = await api.fetchApi("/anima/download_images", { method: "POST", headers });
            const payload = await response.json().catch(() => ({}));
            if (!payload.success) {
                alert("Download already in progress or failed to start.");
                return;
            }
            void pollDownloadStatus();
        } catch (err) {
            reportActionFailure("Failed to start preview download", err, err?.message || "Could not start preview download.");
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

    const updateBtn = el.querySelector("#anima-update-styles");
    updateBtn.addEventListener("click", async () => {
        if (updateBtn.classList.contains("disabled")) return;
        updateBtn.innerHTML = "Updating...";
        updateBtn.classList.add("disabled");
        try {
            const headers = await ensureHeadersReady();
            const response = await api.fetchApi("/anima/update", { method: "POST", headers });
            const payload = await response.json().catch(() => ({}));
            if (payload.success) {
                dataReset();
                await render();
                updateBtn.innerHTML = "Success!";
            } else {
                updateBtn.innerHTML = "Failed!";
            }
        } catch (err) {
            updateBtn.innerHTML = "Error!";
            reportActionFailure("Failed to update styles", err, err?.message || "Could not update styles.");
        }
        setTimeout(() => {
            updateBtn.innerHTML = "Update Styles";
            updateBtn.classList.remove("disabled");
        }, 2000);
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
