function ccbCatalogRefreshDecision({ force = false, hasCache = false, cachedUpdatedAt = 0, remoteUpdatedAt = 0 } = {}) {
    if (force || !hasCache) return 'download'
    const cached = Math.max(0, Number(cachedUpdatedAt) || 0)
    const remote = Math.max(0, Number(remoteUpdatedAt) || 0)
    if (!remote) return 'unknown'
    if (!cached || remote > cached) return 'download'
    return 'use-cache'
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ccbCatalogRefreshDecision }
}
