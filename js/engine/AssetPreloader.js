/**
 * AssetPreloader
 * ──────────────
 * Walks the asset manifest and performs a lightweight reachability check
 * (HEAD request) for every listed file.  Reports progress via a callback
 * and surfaces any missing / unreachable files so problems are caught
 * before gameplay starts.
 *
 * Usage:
 *   const preloader = new AssetPreloader();
 *   preloader.onProgress = (loaded, total, url) => { … };
 *   const result = await preloader.checkAll(myManifest);   // { ok, missing[], total, loaded }
 */
export default class AssetPreloader {
    constructor() {
        /** @type {(loaded:number, total:number, url:string)=>void} */
        this.onProgress = null;
    }

    /* ── public API ─────────────────────────────────────────── */

    /**
     * Verify every asset in the manifest is reachable.
     * Images are loaded as <img> elements (validates decode).
     * Audio / models / other binaries use a HEAD fetch.
     * @param {Object} manifest
     * @returns {Promise<{ok:boolean, missing:string[], total:number, loaded:number}>}
     */
    async checkAll(manifest) {
        const urls = this._collectURLs(manifest);
        const total = urls.length;
        let loaded = 0;
        const missing = [];

        // Run checks in parallel with a concurrency cap so we don't
        // hammer the server with 60+ simultaneous requests.
        const CONCURRENCY = 8;
        const queue = [...urls];

        const worker = async () => {
            while (queue.length > 0) {
                const url = queue.shift();
                const ok = await this._checkOne(url);
                loaded++;
                if (!ok) missing.push(url);
                if (this.onProgress) this.onProgress(loaded, total, url);
            }
        };

        const workers = Array.from({ length: CONCURRENCY }, () => worker());
        await Promise.all(workers);

        return { ok: missing.length === 0, missing, total, loaded };
    }

    /* ── internals ──────────────────────────────────────────── */

    /** Flatten every category in the manifest into one URL list. */
    _collectURLs(manifest) {
        const all = [];
        for (const category of Object.values(manifest)) {
            if (Array.isArray(category)) {
                all.push(...category);
            } else if (typeof category === 'object' && category !== null) {
                // Handle named assets (like sfx: { key: url })
                all.push(...Object.values(category));
            }
        }
        return all;
    }

    /**
     * Check a single asset URL.
     * • Images (.png, .jpg, .webp) → load via Image element (catches decode errors)
     * • Everything else → HEAD fetch (just checks HTTP 200)
     */
    async _checkOne(url) {
        try {
            const safeUrl = this._encodeURL(url);
            if (/\.(png|jpe?g|webp|gif|svg)$/i.test(url)) {
                return await this._checkImage(safeUrl);
            }
            return await this._checkFetch(safeUrl);
        } catch {
            return false;
        }
    }

    _encodeURL(url) {
        try {
            // encodeURI keeps path separators but escapes spaces and other unsafe chars
            return encodeURI(url);
        } catch {
            return url;
        }
    }

    /** Load an image to confirm it decodes correctly. */
    _checkImage(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    /** HEAD request — lightweight existence check. */
    async _checkFetch(url) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            if (res.ok) return true;

            // Some hosts don't support HEAD (405). Fall back to GET but abort immediately
            // after headers are received to avoid downloading large binaries.
            if (res.status === 405) {
                const controller = new AbortController();
                try {
                    const getRes = await fetch(url, { method: 'GET', signal: controller.signal });
                    return getRes.ok;
                } finally {
                    controller.abort();
                }
            }

            return false;
        } catch {
            return false;
        }
    }
}
