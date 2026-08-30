function ccbResolveWorkerScriptUrl(raw, baseUrl) {
    if (typeof raw !== 'string' || !raw) return ''
    if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw
    try {
        return new URL(raw, baseUrl || 'https://www.bilibili.com/').href
    } catch (_) {
        return ''
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ccbResolveWorkerScriptUrl }
}
