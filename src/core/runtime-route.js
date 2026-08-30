function ccbNormalizeRouteHost(value) {
    return String(value || '').trim().toLowerCase().replace(/\.$/, '')
}

function ccbShouldPreserveRouteHost(host, routeNodes, failedNodes) {
    const normalized = ccbNormalizeRouteHost(host)
    if (!normalized) return false
    const routes = new Set((routeNodes || []).map(ccbNormalizeRouteHost).filter(Boolean))
    const failed = new Set((failedNodes || []).map(ccbNormalizeRouteHost).filter(Boolean))
    return routes.has(normalized) && !failed.has(normalized)
}

function ccbPickNextRouteNode(activeNode, routeNodes, failedNodes) {
    const active = ccbNormalizeRouteHost(activeNode)
    const failed = new Set((failedNodes || []).map(ccbNormalizeRouteHost).filter(Boolean))
    const routes = [...new Set((routeNodes || []).map(ccbNormalizeRouteHost).filter(Boolean))]
    const activeIndex = Math.max(-1, routes.indexOf(active))
    for (let offset = 1; offset <= routes.length; offset++) {
        const candidate = routes[(activeIndex + offset + routes.length) % routes.length]
        if (candidate && candidate !== active && !failed.has(candidate)) return candidate
    }
    return ''
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ccbNormalizeRouteHost,
        ccbShouldPreserveRouteHost,
        ccbPickNextRouteNode,
    }
}
