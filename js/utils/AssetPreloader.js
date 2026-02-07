import assets from '../config/assetManifest.js';

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
 *   const result = await preloader.checkAll();   // { ok, missing[], total, loaded }
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
     * @returns {Promise<{ok:boolean, missing:string[], total:number, loaded:number}>}
     */
    async checkAll() {
        const urls = this._collectURLs();
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
    _collectURLs() {
        const all = [];
        for (const category of Object.values(assets)) {
            if (Array.isArray(category)) {
                all.push(...category);
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
            if (/\.(png|jpe?g|webp|gif|svg)$/i.test(url)) {
                return await this._checkImage(url);
            }
            return await this._checkFetch(url);
        } catch {
            return false;
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
            return res.ok;
        } catch {
            return false;
        }
    }
}
