import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { Data } from "./data.js";
import { slotStateHasArtist } from "./slot_state.js";
import { applyStyle, getNodeSlotState, setCurrentArtistSlot } from "./utils.js";

function cycleBtn() {
    return document.getElementById("anima-cycle-btn");
}

function cycleStatus() {
    return document.getElementById("anima-cycle-status");
}

export const AutoCycle = (() => {
    let _running = false, _handler = null, _node = null, _count = 0, _manualNext = null;
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

    async function _next() {
        if (!_running || !_node) return;

        if (!app.graph || !app.graph._nodes.includes(_node)) {
            stop();
            return;
        }

        try {
            let a = _manualNext;
            _manualNext = null;
            if (!a) a = await Data.random();
            if (a && slotStateHasArtist(getNodeSlotState(_node), a)) a = await Data.random();
            if (!a) return;
            applyStyle(_node, a, { preferCurrentSlot: true });
            _count++;
            _setStatus(`queued #${_count} @${a.tag.replace(/_/g, " ")}`, true);
            _notify("applied", { artist: a });
            app.queuePrompt(0, 1);
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
        _running = true;
        _node = node;
        _count = 0;
        if (!_handler) {
            _handler = (e) => {
                if (!_running || !_node) return;
                if (e.detail?.exec_info?.queue_remaining === 0) {
                    _setStatus("queue finished, choosing next...", true);
                    _notify("queue-empty");
                    _next();
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
        _setStatus("starting auto cycle...", true);
        _notify("start");
        _next();
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
            _notify("applied", { artist: a, node });
            return;
        }
        if (slotStateHasArtist(getNodeSlotState(node), a)) a = await Data.random();
        _manualNext = a;
        applyStyle(node, a, {
            ...options,
            preferCurrentSlot: true,
        });
        _setStatus(`queued manual @${a.tag.replace(/_/g, " ")}`, true);
        _notify("applied", { artist: a, node, manual: true });
        if ((app.ui.lastQueueSize || 0) === 0) _next();
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
