const CCB_MEDIA_DOMAINS = Object.freeze([
    'bilivideo.com',
    'bilivideo.cn',
    'acgvideo.com',
    'acgvideo.cn',
    'akamaized.net',
    'edge.mountaintoys.cn',
])

function ccbIsMediaHostname(hostname) {
    const host = String(hostname || '').trim().toLowerCase().replace(/\.$/, '')
    if (!host) return false
    return CCB_MEDIA_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`))
}

function ccbExtractHostname(value, baseUrl) {
    if (typeof value !== 'string') return ''
    const raw = value.trim()
    if (!raw) return ''
    try {
        let candidate = raw
        if (candidate.startsWith('//')) candidate = `https:${candidate}`
        else if (!/^[a-z][a-z\d+.-]*:/i.test(candidate) && /^[\w.-]+(?:\/|$)/.test(candidate)) {
            candidate = `https://${candidate}`
        }
        return new URL(candidate, baseUrl || 'https://www.bilibili.com/').hostname.toLowerCase()
    } catch (_) {
        return ''
    }
}

function ccbHasMediaDomain(value, baseUrl) {
    return ccbIsMediaHostname(ccbExtractHostname(value, baseUrl))
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CCB_MEDIA_DOMAINS,
        ccbExtractHostname,
        ccbHasMediaDomain,
        ccbIsMediaHostname,
    }
}
