import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { Data } from "./data.js";
import { applyStyle, getNodeSlotState, replaceArtistSlots, setCurrentArtistSlot } from "./utils.js";
import {
    buildNextArtistSlotState,
    buildRandomizedSlotState,
    diffSlotStates,
    loadFavoriteTagSet,
    readAutoQueue,
    readPinFavorites,
    readQueueMode,
    readRandomCount,
} from "./queue_settings.js";

function cycleBtn() {
    return document.getElementById("anima-cycle-btn");
}

function cycleStatus() {
    return document.getElementById("anima-cycle-status");
}

export const AutoCycle = (() => {
    let _running = false;
    let _handler = null;
    let _node = null;
    let _count = 0;
    let _queueWasActive = false;
    const _listeners = new Set();

    function _notify(event, payload = {}) {
        for (const listener of _listeners) {
            try {
                listener({ event, running: _running, node: _node, count: _count, ...payload });
            } catch { }
        }
    }

    function _setStatus(text, active = false) {
        const status = cycleStatus();
        if (!status) return;
        status.textContent = text;
        status.classList.toggle("active", !!active);
    }

    function _modeLabel(mode) {
        if (mode === "fixed") return "Fixed";
        if (mode === "next_artist") return "Next Artist";
        if (mode === "random_artist") return "Random Artist";
        return "Fixed";
    }

    function _findArtistByTag(artists, tag) {
        const normalized = String(tag || "").trim().toLowerCase();
        if (!normalized) return null;
        return artists.find((artist) => String(artist?.tag || "").trim().toLowerCase() === normalized) || null;
    }

    async function _advance() {
        if (!_running || !_node) return;

        if (!app.graph || !app.graph._nodes.includes(_node)) {
            stop();
            return;
        }

        try {
            const mode = readQueueMode(_node);
            const autoQueue = readAutoQueue(_node);
            if (mode === "fixed") {
                _count += 1;
                if (autoQueue) {
                    _setStatus(`queued #${_count} fixed artists`, true);
                    _notify("applied", { artist: null, artists: [], changes: [], mode, autoQueue: true });
                    _queueWasActive = true;
                    app.queuePrompt(0, 1);
                    return;
                }

                _setStatus(`fixed artists ready - queue manually`, true);
                _notify("applied", { artist: null, artists: [], changes: [], mode, autoQueue: false });
                return;
            }

            const artists = await Data.all();
            if (!Array.isArray(artists) || !artists.length) {
                _setStatus("no artists available", false);
                stop();
                return;
            }

            const previousState = getNodeSlotState(_node);
            const pinFavorites = readPinFavorites(_node);
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
                    count: readRandomCount(_node),
                    pinFavorites,
                    favoriteTags,
                });

            const changes = diffSlotStates(previousState, nextState);
            if (!changes.length) {
                _setStatus("no eligible slots to advance", false);
                stop();
                return;
            }

            replaceArtistSlots(_node, nextState.tags, nextState.currentSlot);
            _count += 1;

            const primaryTag = changes.find((entry) => entry.nextTag)?.nextTag || "";
            const primaryArtist = _findArtistByTag(artists, primaryTag) || (primaryTag ? { tag: primaryTag } : null);
            const changeSummary = changes
                .map((entry) => `S${entry.slotIndex + 1}`)
                .join(", ");

            if (autoQueue) {
                _setStatus(`queued #${_count} ${changeSummary}`, true);
                _notify("applied", { artist: primaryArtist, artists: changes.map((entry) => _findArtistByTag(artists, entry.nextTag) || { tag: entry.nextTag }), changes, mode, autoQueue: true });
                _queueWasActive = true;
                app.queuePrompt(0, 1);
                return;
            }

            _setStatus(`advanced #${_count} ${changeSummary} - queue manually`, true);
            _notify("applied", { artist: primaryArtist, artists: changes.map((entry) => _findArtistByTag(artists, entry.nextTag) || { tag: entry.nextTag }), changes, mode, autoQueue: false });
        } catch {
            stop();
        }
    }

    function start(node) {
        if (_running) return true;
        if (!node) {
            _setStatus("open from a node first", false);
            _notify("missing-node");
            return false;
        }
        const mode = readQueueMode(node);

        _running = true;
        _node = node;
        _count = 0;
        _queueWasActive = false;

        if (!_handler) {
            _handler = (e) => {
                if (!_running || !_node) return;
                const queueRemaining = Number(e.detail?.exec_info?.queue_remaining);
                if (Number.isFinite(queueRemaining) && queueRemaining > 0) {
                    _queueWasActive = true;
                    return;
                }
                if (queueRemaining === 0 && _queueWasActive) {
                    _queueWasActive = false;
                    _setStatus(readQueueMode(_node) === "fixed" ? "queue finished, requeueing fixed artists..." : "queue finished, applying next artists...", true);
                    _notify("queue-empty", { mode: readQueueMode(_node), autoQueue: readAutoQueue(_node) });
                    _advance();
                }
            };
            api.addEventListener("status", _handler);
        }

        const btn = cycleBtn();
        if (btn) {
            btn.classList.add("running");
            btn.querySelector(".btn-icon").innerHTML = "&#9646;&#9646;";
            btn.querySelector(".btn-lbl").textContent = "Stop";
        }

        const autoQueue = readAutoQueue(node);
        if (autoQueue) {
            _setStatus(`starting ${_modeLabel(mode)}...`, true);
            _notify("start", { mode, autoQueue });
            _advance();
        } else {
            _setStatus(`${_modeLabel(mode)} armed - queue manually`, true);
            _notify("start", { mode, autoQueue });
        }
        return true;
    }

    function stop() {
        if (!_running) return;
        _running = false;
        if (_handler) {
            api.removeEventListener("status", _handler);
            _handler = null;
        }
        const btn = cycleBtn();
        if (btn) {
            btn.classList.remove("running");
            btn.querySelector(".btn-icon").innerHTML = "&#9654;";
            btn.querySelector(".btn-lbl").textContent = "Play";
        }
        _setStatus(`stopped after ${_count}`, false);
        _notify("stop");
    }

    function toggle(node) {
        _running ? stop() : start(node);
        return _running;
    }

    async function inject(node, artist, options = {}) {
        _node = node;
        if (Number.isInteger(options?.slotIndex)) {
            setCurrentArtistSlot(node, options.slotIndex);
        }

        applyStyle(node, artist, options);

        const autoQueue = readAutoQueue(node);
        _notify("applied", { artist, node, manual: true, autoQueue });

        if (autoQueue) {
            _setStatus(`queued manual @${String(artist?.tag || "").replace(/_/g, " ")}`, true);
            _queueWasActive = true;
            if ((app.ui.lastQueueSize || 0) === 0) {
                app.queuePrompt(0, 1);
            }
            return;
        }

        _setStatus(`manual @${String(artist?.tag || "").replace(/_/g, " ")} ready`, true);
    }

    function subscribe(listener) {
        if (typeof listener !== "function") return () => { };
        _listeners.add(listener);
        return () => {
            _listeners.delete(listener);
        };
    }

    function isActiveFor(node) {
        return _running && !!node && node === _node;
    }

    return { toggle, stop, inject, subscribe, isActiveFor, get running() { return _running; } };
})();
