import { CACHE_KEY, CACHE_TTL } from "./config.js";

export const Data = (() => {
    let _promise = null;

    async function _load() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const { ts, list } = JSON.parse(raw);
                if (Date.now() - ts < CACHE_TTL) return list;
            }
        } catch (_) { }

        try {
            const r = await fetch("/anima/artists");
            if (r.ok) {
                const list = await r.json();
                list.forEach(a => {
                    a._s = (a.tag + " " + (a.name || "")).toLowerCase();
                });
                _persist(list);
                return list;
            }
        } catch (_) { }

        return [];
    }

    function _persist(list) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), list })); } catch (_) { }
    }

    function all() { return _promise || (_promise = _load()); }
    function reset() { _promise = null; localStorage.removeItem(CACHE_KEY); }

    async function search(q) {
        const list = await all();
        if (!q) return list;
        const lq = q.toLowerCase();
        return list.filter(a => a._s.includes(lq));
    }

    async function random() {
        const list = await all();
        return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    }

    return { all, reset, search, random };
})();
