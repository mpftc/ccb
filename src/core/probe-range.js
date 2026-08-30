function ccbParseContentRangeTotal(headers) {
    const match = /(?:^|\r?\n)content-range:\s*bytes\s+(?:\d+-\d+|\*)\/(\d+|\*)/i.exec(String(headers || ''))
    if (!match || match[1] === '*') return 0
    const total = Number(match[1])
    return Number.isSafeInteger(total) && total > 0 ? total : 0
}

function ccbHashText(value) {
    let hash = 2166136261
    for (const char of String(value || '')) {
        hash ^= char.charCodeAt(0)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

function ccbPickProbeRangeStart(totalBytes, byteLimit, roundIndex, rounds, seed) {
    const total = Math.max(0, Number(totalBytes) || 0)
    const size = Math.max(1, Number(byteLimit) || 1)
    if (!Number.isSafeInteger(total) || total <= size * 2) return 0

    const maxStart = Math.max(0, total - size)
    const safeStart = Math.min(maxStart, Math.floor(total * 0.08))
    const safeEnd = Math.max(safeStart, Math.min(maxStart, Math.floor(total * 0.88) - size))
    const span = Math.max(0, safeEnd - safeStart)
    if (!span) return safeStart

    const count = Math.max(1, Math.floor(Number(rounds) || 1))
    const index = Math.max(0, Math.min(count - 1, Math.floor(Number(roundIndex) || 0)))
    const slotWidth = span / count
    const jitter = (ccbHashText(`${seed || ''}:${index}:${total}:${size}`) % 10000) / 10000
    const start = safeStart + Math.floor(Math.min(span, slotWidth * index + slotWidth * (0.2 + jitter * 0.6)))
    return Math.max(0, Math.min(maxStart, start))
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ccbParseContentRangeTotal,
        ccbPickProbeRangeStart,
    }
}
