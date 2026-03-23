import { logWarn } from "./logger.js";

export const Swipe = (() => {
    const PRELOAD_WINDOW = 15;
    const PRELOAD_TRIGGER_OFFSET = 5;
    const WHEEL_NAV_THRESHOLD = 90;
    const WHEEL_IDLE_RESET_MS = 220;

    let el = null;
    let container = null;
    let prevImg = null;
    let curFrame = null;
    let curImg = null;
    let nextImg = null;
    let titleEl = null;
    let counterEl = null;
    let favoriteBtn = null;
    let favoriteBadge = null;
    let slotStateEl = null;

    let _list = [];
    let _index = 0;
    let _onApply = null;
    let _onToggleFavorite = null;
    let _isFavorited = null;
    let _getSlotState = null;
    let _getImageUrl = null;
    let _getTitle = null;

    let _keyHandler = null;
    let _wheelHandler = null;
    const _preloaded = new Set();
    let _preloadedAheadIndex = -1;
    let _preloadedBehindIndex = -1;
    let _previousBodyOverflow = "";
    let _wheelDelta = 0;
    let _lastWheelAt = 0;
    let _actionInFlight = false;

    function _build() {
        if (document.getElementById("anima-swipe")) return;

        el = document.createElement("div");
        el.id = "anima-swipe";
        el.className = "hidden";
        el.innerHTML = `
            <div class="backdrop"></div>
            <div class="swipe-header">
                <span class="swipe-counter" id="anima-swipe-counter"></span>
                <span class="swipe-title" id="anima-swipe-title"></span>
                <div class="swipe-actions">
                    <button class="swipe-close" id="anima-swipe-close" title="Close">&#10005;</button>
                </div>
            </div>
            <div class="swipe-container" id="anima-swipe-container">
                <img class="swipe-image swipe-image--prev" id="anima-swipe-prev" alt="" loading="eager"/>
                <div class="swipe-current-frame" id="anima-swipe-current-frame">
                    <img class="swipe-image swipe-image--current" id="anima-swipe-current" alt="" loading="eager"/>
                    <div class="swipe-image-favorite-badge" id="anima-swipe-favorite-badge" title="Favorited">&#10084;</div>
                </div>
                <img class="swipe-image swipe-image--next" id="anima-swipe-next" alt="" loading="eager"/>
                <aside class="swipe-side-stack" id="anima-swipe-side-stack">
                    <button class="swipe-favorite" id="anima-swipe-favorite" type="button" title="Right click the current image to toggle favorite">Favorite OFF</button>
                    <div class="swipe-slot-panel" id="anima-swipe-slots"></div>
                </aside>
            </div>
            <div class="swipe-hint">Left click apply &#183; Right click favorite &#183; &#8592;/&#8594; or wheel navigate &#183; Enter apply &#183; C copy &#183; Esc close</div>
        `;
        document.body.appendChild(el);

        container = el.querySelector("#anima-swipe-container");
        prevImg = el.querySelector("#anima-swipe-prev");
        curFrame = el.querySelector("#anima-swipe-current-frame");
        curImg = el.querySelector("#anima-swipe-current");
        nextImg = el.querySelector("#anima-swipe-next");
        titleEl = el.querySelector("#anima-swipe-title");
        counterEl = el.querySelector("#anima-swipe-counter");
        favoriteBtn = el.querySelector("#anima-swipe-favorite");
        favoriteBadge = el.querySelector("#anima-swipe-favorite-badge");
        slotStateEl = el.querySelector("#anima-swipe-slots");

        el.querySelector(".backdrop").addEventListener("click", close);
        el.querySelector("#anima-swipe-close").addEventListener("click", close);

        prevImg.addEventListener("click", (e) => { e.stopPropagation(); _navigate(-1); });
        nextImg.addEventListener("click", (e) => { e.stopPropagation(); _navigate(1); });
        curImg.addEventListener("click", (e) => { e.stopPropagation(); void _apply(); });
        curImg.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            void _toggleFavorite();
        });
        favoriteBtn?.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            void _toggleFavorite();
        });

        if (!_wheelHandler) {
            _wheelHandler = (e) => _onWheel(e);
            el.addEventListener("wheel", _wheelHandler, { passive: false });
        }
    }

    function _normalizeIndex(i, len) {
        if (!len) return 0;
        return ((i % len) + len) % len;
    }

    function _getItem(i) {
        if (!_list?.length) return null;
        return _list[_normalizeIndex(i, _list.length)] ?? null;
    }

    function _urlFor(item) {
        if (!item) return "";
        if (typeof _getImageUrl === "function") return _getImageUrl(item) || "";
        return item.image || "";
    }

    function _titleFor(item) {
        if (!item) return "";
        if (typeof _getTitle === "function") return _getTitle(item) || "";
        return item.tag || item.name || "";
    }

    function _setFavoriteState(item = _getItem(_index)) {
        if (!favoriteBtn) return;
        const favorited = item && typeof item === "object" && "_favorited" in item
            ? !!item._favorited
            : item && typeof _isFavorited === "function"
                ? !!_isFavorited(item)
                : false;
        favoriteBtn.dataset.active = favorited ? "true" : "false";
        favoriteBtn.textContent = favorited ? "Favorite ON" : "Favorite OFF";
        favoriteBtn.title = favorited
            ? "Right click the current image to remove from favorites"
            : "Right click the current image to add to favorites";
        if (favoriteBadge) {
            favoriteBadge.dataset.active = favorited ? "true" : "false";
        }
    }

    function _renderSlotState() {
        if (!slotStateEl) return;
        const state = typeof _getSlotState === "function" ? _getSlotState() : null;
        const slots = Array.isArray(state?.tags) ? state.tags : [];
        const maxSlots = Math.max(3, Number(state?.maxSlots) || 3);

        slotStateEl.dataset.visible = state ? "true" : "false";
        if (!state) {
            slotStateEl.innerHTML = `
                <div class="swipe-slot-panel__header">Slots</div>
                <div class="swipe-slot-panel__empty">Node slot state unavailable</div>
            `;
            return;
        }

        const chips = [];
        for (let index = 0; index < maxSlots; index += 1) {
            const tag = String(slots[index] || "").trim();
            const active = index === Number(state.currentSlot);
            chips.push(`
                <div class="swipe-slot-chip${active ? " active" : ""}">
                    <span class="swipe-slot-chip__id">S${index + 1}</span>
                    <span class="swipe-slot-chip__tag">${tag ? `@${tag.replace(/_/g, " ")}` : "(empty)"}</span>
                </div>
            `);
        }

        slotStateEl.innerHTML = `
            <div class="swipe-slot-panel__header">Current Slots</div>
            <div class="swipe-slot-panel__list">${chips.join("")}</div>
        `;
    }

    async function _apply() {
        const item = _getItem(_index);
        if (!item || _actionInFlight) return;
        try {
            _actionInFlight = true;
            await _onApply?.(item, curImg || container || el);
            _renderSlotState();
        } catch (error) {
            logWarn("Swipe apply handler failed", error);
        } finally {
            _actionInFlight = false;
        }
    }

    async function _toggleFavorite() {
        const item = _getItem(_index);
        if (!item || _actionInFlight) return;
        try {
            _actionInFlight = true;
            const result = await _onToggleFavorite?.(item, curImg || container || el);
            if (result?.ok && typeof result.favorited === "boolean") {
                _setFavoriteState({
                    ...item,
                    _favorited: result.favorited,
                });
                if (favoriteBadge) {
                    favoriteBadge.dataset.active = result.favorited ? "true" : "false";
                }
            }
        } catch (error) {
            logWarn("Swipe favorite handler failed", error);
        } finally {
            _actionInFlight = false;
        }
    }

    function _navigate(delta) {
        if (!_list?.length) return;
        _index = _normalizeIndex(_index + delta, _list.length);
        _update();

        if (delta > 0 && _index + PRELOAD_TRIGGER_OFFSET >= _preloadedAheadIndex) {
            _preloadAhead();
        }
        if (delta < 0 && (_index - PRELOAD_TRIGGER_OFFSET <= _preloadedBehindIndex || _index > _preloadedBehindIndex)) {
            _preloadBehind();
        }
    }

    function _preloadRange(start, end, step = 1) {
        const len = _list.length;
        if (!len) return;

        for (let i = start; step > 0 ? i < end : i > end; i += step) {
            const item = _getItem(i);
            const url = _urlFor(item);
            if (!url || _preloaded.has(url)) continue;
            _preloaded.add(url);
            const img = new Image();
            img.src = url;
        }
    }

    function _preloadAhead() {
        if (!_list.length) return;
        const start = _preloadedAheadIndex + 1;
        const end = Math.min(start + PRELOAD_WINDOW, _list.length);
        _preloadRange(start, end, 1);
        _preloadedAheadIndex = Math.max(_preloadedAheadIndex, end - 1);
    }

    function _preloadBehind() {
        if (!_list.length) return;
        const start = _preloadedBehindIndex - 1;
        const end = Math.max(start - PRELOAD_WINDOW, -1);
        _preloadRange(start, end, -1);
        _preloadedBehindIndex = Math.min(_preloadedBehindIndex, end + 1);
    }

    function _update() {
        if (!_list?.length) return;

        const len = _list.length;
        const prev = _getItem(_index - 1);
        const cur = _getItem(_index);
        const next = _getItem(_index + 1);

        prevImg.src = _urlFor(prev);
        curImg.src = _urlFor(cur);
        nextImg.src = _urlFor(next);

        const title = _titleFor(cur);
        titleEl.textContent = title ? `@${title}` : "";
        counterEl.textContent = `${_index + 1} / ${len}`;
        _setFavoriteState(cur);
        _renderSlotState();

        // Re-trigger animation
        container?.classList.remove("swipe-transition");
        void container?.offsetWidth;
        container?.classList.add("swipe-transition");
    }

    function _onKey(e) {
        if (!el || el.classList.contains("hidden")) return;

        switch (e.code) {
            case "ArrowLeft":
                e.preventDefault(); e.stopPropagation();
                _navigate(-1);
                break;
            case "ArrowRight":
                e.preventDefault(); e.stopPropagation();
                _navigate(1);
                break;
            case "Enter":
                e.preventDefault(); e.stopPropagation();
                void _apply();
                break;
            case "KeyC": {
                const cur = _getItem(_index);
                const title = _titleFor(cur);
                if (!title) break;
                e.preventDefault(); e.stopPropagation();
                navigator.clipboard?.writeText?.(`@${title}`).catch((error) => {
                    logWarn("Failed to copy swipe tag to clipboard", error);
                });
                break;
            }
            case "Escape":
                e.preventDefault(); e.stopPropagation();
                close();
                break;
        }
    }

    function _onWheel(e) {
        if (!el || el.classList.contains("hidden") || !_list?.length) return;

        const dominantDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (!Number.isFinite(dominantDelta) || dominantDelta === 0) return;

        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        if (now - _lastWheelAt > WHEEL_IDLE_RESET_MS) {
            _wheelDelta = 0;
        }
        _lastWheelAt = now;
        _wheelDelta += dominantDelta;

        if (Math.abs(_wheelDelta) < WHEEL_NAV_THRESHOLD) return;

        _navigate(_wheelDelta > 0 ? 1 : -1);
        _wheelDelta = 0;
    }

    function open({ list, startIndex = 0, onApply, onToggleFavorite, isFavorited, getSlotState, getImageUrl, getTitle } = {}) {
        _build();
        if (!Array.isArray(list) || list.length === 0) return;

        _list = list;
        _index = _normalizeIndex(startIndex, _list.length);
        _onApply = onApply ?? null;
        _onToggleFavorite = onToggleFavorite ?? null;
        _isFavorited = isFavorited ?? null;
        _getSlotState = getSlotState ?? null;
        _getImageUrl = getImageUrl ?? null;
        _getTitle = getTitle ?? null;
        _preloaded.clear();
        _preloadedAheadIndex = _index - 1;
        _preloadedBehindIndex = _index + 1;
        _wheelDelta = 0;
        _lastWheelAt = 0;
        _actionInFlight = false;

        _previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        el.classList.remove("hidden");
        _update();
        _preloadAhead();
        _preloadBehind();

        if (!_keyHandler) {
            _keyHandler = (e) => _onKey(e);
            document.addEventListener("keydown", _keyHandler, true);
        }
    }

    function close() {
        el?.classList.add("hidden");
        _list = [];
        _onApply = null;
        _onToggleFavorite = null;
        _isFavorited = null;
        _getSlotState = null;
        _getImageUrl = null;
        _getTitle = null;
        _preloaded.clear();
        _preloadedAheadIndex = -1;
        _preloadedBehindIndex = -1;
        _wheelDelta = 0;
        _lastWheelAt = 0;
        _actionInFlight = false;
        document.body.style.overflow = _previousBodyOverflow;

        if (_keyHandler) {
            document.removeEventListener("keydown", _keyHandler, true);
            _keyHandler = null;
        }
    }

    return { open, close };
})();
