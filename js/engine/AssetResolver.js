/**
 * AssetResolver
 * -------------
 * Resolves an asset URL. If the asset is present in the global
 * `window.gameBundleData` (Base64 encoded), it returns the data URI.
 * Otherwise, it returns the original URL.
 */
export default class AssetResolver {
    /**
     * Resolve a URL to its content source.
     * @param {string} url
     * @returns {string}
     */
    static resolve(url) {
        const bundleData = window.gameBundleData;
        if (!bundleData) return url;

        // Try exact match
        if (bundleData[url]) return bundleData[url];

        // Normalise path: strip protocol, domain, and leading slash
        const normalized = url.replace(/^(?:https?:\/\/[^\/]+)?\//, '');
        if (bundleData[normalized]) return bundleData[normalized];

        // Try matches without leading slash if one exists
        const noLeadingSlash = url.startsWith('/') ? url.slice(1) : url;
        if (bundleData[noLeadingSlash]) return bundleData[noLeadingSlash];

        return url;
    }

    /**
     * Helper for fetch-like loads where we might already have the data as a string.
     * @param {string} url 
     * @returns {Promise<Response>}
     */
    static async fetch(url) {
        const resolved = this.resolve(url);
        if (resolved.startsWith('data:')) {
            const res = await fetch(resolved);
            return res;
        }
        return fetch(url);
    }
}
