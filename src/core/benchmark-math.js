function ccbSamplePercentile(values, percentile) {
    const sorted = (values || []).filter(Number.isFinite).sort((a, b) => a - b)
    if (!sorted.length) return 0
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * percentile)))
    return sorted[index]
}

function ccbCalculateProbeSustainedMetrics(samples, usedBytes, elapsedMs, burstMbps) {
    const points = []
    for (const sample of samples || []) {
        const at = Number(sample && sample.at)
        const loaded = Math.min(usedBytes, Math.max(0, Number(sample && sample.loaded) || 0))
        if (!Number.isFinite(at)) continue
        const previous = points[points.length - 1]
        if (previous && loaded <= previous.loaded) continue
        points.push({ at, loaded })
    }
    if (!points.length || points[0].loaded > 0) points.unshift({ at: 0, loaded: 0 })
    const last = points[points.length - 1]
    if (!last || last.loaded < usedBytes) points.push({ at: Math.max(elapsedMs, last && last.at || 0), loaded: usedBytes })

    const warmupBytes = Math.min(256 * 1024, Math.max(16 * 1024, Math.floor(usedBytes * 0.25)))
    let warmupIndex = points.findIndex(point => point.loaded >= warmupBytes)
    if (warmupIndex < 0) warmupIndex = 0
    if (warmupIndex >= points.length - 1) warmupIndex = Math.max(0, points.length - 2)
    const warmup = points[warmupIndex]
    const end = points[points.length - 1]
    const tailBytes = Math.max(0, end.loaded - warmup.loaded)
    const tailMs = Math.max(1, end.at - warmup.at)
    const tailMbps = tailBytes > 0 ? tailBytes * 8 / tailMs / 1000 : burstMbps

    const windowRates = []
    let anchor = warmup
    for (let index = warmupIndex + 1; index < points.length; index++) {
        const point = points[index]
        const deltaBytes = point.loaded - anchor.loaded
        const deltaMs = point.at - anchor.at
        const isLast = index === points.length - 1
        if (!isLast && deltaBytes < 64 * 1024 && deltaMs < 180) continue
        if (deltaBytes > 0 && deltaMs >= 8) windowRates.push(deltaBytes * 8 / deltaMs / 1000)
        anchor = point
    }
    if (!windowRates.length && tailMbps > 0) windowRates.push(tailMbps)
    const lowWindowMbps = ccbSamplePercentile(windowRates, 0.20) || tailMbps || burstMbps
    const medianWindowMbps = ccbSamplePercentile(windowRates, 0.50) || tailMbps || burstMbps
    const sustainedMbps = Math.max(0, Math.min(
        lowWindowMbps || burstMbps,
        tailMbps || burstMbps,
        burstMbps || Infinity,
    ))
    const stability = medianWindowMbps > 0
        ? Math.max(0, Math.min(1, lowWindowMbps / medianWindowMbps))
        : 0
    return {
        sustainedMbps: Number.isFinite(sustainedMbps) ? sustainedMbps : 0,
        lowWindowMbps,
        medianWindowMbps,
        tailMbps,
        stability,
        windowSamples: windowRates.length,
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ccbCalculateProbeSustainedMetrics,
        ccbSamplePercentile,
    }
}
