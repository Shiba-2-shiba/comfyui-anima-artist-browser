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
            const status = cycleStatus();
            if (status) {
                status.textContent = `${_count} done - @${a.tag.replace(/_/g, " ")}`;
                status.classList.add("active");
            }
            app.queuePrompt(0, 1);
        } catch {
            stop();
        }
    }

    function start(node) {
        if (_running) return;
        _running = true;
        _node = node;
        _count = 0;
        if (!_handler) {
            _handler = (e) => {
                if (!_running || !_node) return;
                if (e.detail?.exec_info?.queue_remaining === 0) _next();
            };
            api.addEventListener("status", _handler);
        }
        const btn = cycleBtn();
        if (btn) {
            btn.classList.add("running");
            btn.querySelector(".btn-icon").innerHTML = "&#9646;&#9646;";
            btn.querySelector(".btn-lbl").textContent = "Stop";
        }
        _next();
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
        const status = cycleStatus();
        if (status) {
            status.textContent = `stopped after ${_count}`;
            status.classList.remove("active");
        }
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
            return;
        }
        if (slotStateHasArtist(getNodeSlotState(node), a)) a = await Data.random();
        _manualNext = a;
        applyStyle(node, a, {
            ...options,
            preferCurrentSlot: true,
        });
        if ((app.ui.lastQueueSize || 0) === 0) _next();
    }

    return { toggle, stop, inject, get running() { return _running; } };
})();
