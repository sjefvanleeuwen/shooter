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

        // Try relative path match (strip leading slash and domain)
        const relativePath = url.replace(/^(?:https?:\/\/[^\/]+)?\//, '');
        if (bundleData[relativePath]) return bundleData[relativePath];

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
