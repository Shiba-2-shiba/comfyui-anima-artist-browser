import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { Data } from "./data.js";
import { slotStateHasArtist } from "./slot_state.js";
import { applyStyle, getNodeSlotState, setCurrentArtistSlot } from "./utils.js";

const ANIMA_QUEUE_MODE_KEY = "_anima_queue_mode";
const ANIMA_AUTO_QUEUE_KEY = "_anima_auto_queue";

function cycleBtn() {
    return document.getElementById("anima-cycle-btn");
}

function cycleStatus() {
    return document.getElementById("anima-cycle-status");
}

export const AutoCycle = (() => {
    let _running = false, _handler = null, _node = null, _count = 0, _manualNext = null, _queueWasActive = false;
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

    function _readQueueMode(node) {
        const value = String(node?.properties?.[ANIMA_QUEUE_MODE_KEY] || "").trim().toLowerCase().replace(/\s+/g, "_");
        if (value === "next" || value === "next_artist") return "next_artist";
        if (value === "random" || value === "random_artist") return "random_artist";
        return "off";
    }

    function _readAutoQueue(node) {
        return String(node?.properties?.[ANIMA_AUTO_QUEUE_KEY] || "off").toLowerCase() === "on";
    }

    function _modeLabel(mode) {
        if (mode === "next_artist") return "Next Artist";
        if (mode === "random_artist") return "Random Artist";
        return "Off";
    }

    async function _pickNextArtist(node) {
        const list = await Data.all();
        if (!Array.isArray(list) || !list.length) return null;

        const state = getNodeSlotState(node);
        const slotIndex = Number.isInteger(state?.currentSlot) ? state.currentSlot : 0;
        const currentTag = String(state?.tags?.[slotIndex] || "").trim().toLowerCase();
        const currentIndex = list.findIndex((artist) => String(artist?.tag || "").trim().toLowerCase() === currentTag);
        if (currentIndex < 0) return list[0];
        return list[(currentIndex + 1) % list.length];
    }

    async function _pickRandomArtist(node) {
        const current = getNodeSlotState(node);
        let artist = _manualNext;
        _manualNext = null;
        if (artist) return artist;
        artist = await Data.random();
        if (artist && slotStateHasArtist(current, artist)) {
            artist = await Data.random();
        }
        return artist;
    }

    async function _advance() {
        if (!_running || !_node) return;

        if (!app.graph || !app.graph._nodes.includes(_node)) {
            stop();
            return;
        }

        try {
            const mode = _readQueueMode(_node);
            if (mode === "off") {
                _setStatus("set After Queue first", false);
                stop();
                return;
            }

            let a = _manualNext;
            if (!a) {
                a = mode === "next_artist"
                    ? await _pickNextArtist(_node)
                    : await _pickRandomArtist(_node);
            } else {
                _manualNext = null;
            }
            if (!a) return;
            applyStyle(_node, a, { preferCurrentSlot: true });
            _count++;
            const autoQueue = _readAutoQueue(_node);
            const tag = a.tag.replace(/_/g, " ");
            if (autoQueue) {
                _setStatus(`queued #${_count} @${tag}`, true);
                _notify("applied", { artist: a, mode, autoQueue: true });
                _queueWasActive = true;
                app.queuePrompt(0, 1);
                return;
            }

            _setStatus(`advanced #${_count} @${tag} - queue manually`, true);
            _notify("applied", { artist: a, mode, autoQueue: false });
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
        const mode = _readQueueMode(node);
        if (mode === "off") {
            _setStatus("set After Queue first", false);
            _notify("missing-mode");
            return false;
        }

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
                    _setStatus("queue finished, choosing next...", true);
                    _notify("queue-empty", { mode: _readQueueMode(_node), autoQueue: _readAutoQueue(_node) });
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
        const autoQueue = _readAutoQueue(node);
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

    async function inject(node, a, options = {}) {
        _node = node;
        if (Number.isInteger(options?.slotIndex)) {
            setCurrentArtistSlot(node, options.slotIndex);
        }
        if (!_running) {
            applyStyle(node, a, options);
            const autoQueue = _readAutoQueue(node);
            if (autoQueue) {
                _queueWasActive = true;
                app.queuePrompt(0, 1);
            }
            _notify("applied", { artist: a, node });
            return;
        }
        _manualNext = a;
        applyStyle(node, a, {
            ...options,
            preferCurrentSlot: true,
        });
        const autoQueue = _readAutoQueue(node);
        _setStatus(autoQueue ? `queued manual @${a.tag.replace(/_/g, " ")}` : `manual @${a.tag.replace(/_/g, " ")} ready`, true);
        _notify("applied", { artist: a, node, manual: true, autoQueue });
        if (autoQueue && (app.ui.lastQueueSize || 0) === 0) {
            _queueWasActive = true;
            app.queuePrompt(0, 1);
        }
    }

    function subscribe(listener) {
        if (typeof listener !== "function") return () => { };
        _listeners.add(listener);
        return () => {
            _listeners.delete(listener);
        };
    }

    return { toggle, stop, inject, subscribe, get running() { return _running; } };
})();
