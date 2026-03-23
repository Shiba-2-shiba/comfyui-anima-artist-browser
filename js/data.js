import { CACHE_KEY, CACHE_TTL } from "./config.js";
import { logWarn } from "./logger.js";

export const Data = (() => {
    let _promise = null;

    async function _load() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const { ts, list } = JSON.parse(raw);
                if (Date.now() - ts < CACHE_TTL) {
                    return { list, cacheable: true };
                }
            }
        } catch (error) {
            logWarn("Failed to read cached artist data", error);
        }

        try {
            const r = await fetch("/anima/artists");
            if (r.ok) {
                const list = await r.json();
                list.forEach(a => {
                    a._s = (a.tag + " " + (a.name || "")).toLowerCase();
                });
                _persist(list);
                return { list, cacheable: true };
            }
            logWarn("Artist data request returned a non-OK response", { status: r.status });
        } catch (error) {
            logWarn("Failed to fetch artist data", error);
        }

        return { list: [], cacheable: false };
    }

    function _persist(list) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), list }));
        } catch (error) {
            logWarn("Failed to persist artist data cache", error);
        }
    }

    function all() {
        if (_promise) return _promise;

        _promise = _load().then((result) => {
            if (!result?.cacheable) {
                _promise = null;
            }
            return Array.isArray(result?.list) ? result.list : [];
        }, (error) => {
            _promise = null;
            throw error;
        });

        return _promise;
    }

    function reset() {
        _promise = null;
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (error) {
            logWarn("Failed to clear artist data cache", error);
        }
    }

    async function search(q) {
        const list = await all();
        if (!q) return list;
        const lq = q.toLowerCase();
        return list.filter(a => a._s.includes(lq));
    }

    return { all, reset, search };
})();
