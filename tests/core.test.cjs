const test = require('node:test')
const assert = require('node:assert/strict')

const {
    ccbExtractHostname,
    ccbHasMediaDomain,
    ccbIsMediaHostname,
} = require('../src/core/media-url.js')
const {
    ccbCalculateProbeSustainedMetrics,
    ccbSamplePercentile,
} = require('../src/core/benchmark-math.js')
const { ccbResolveWorkerScriptUrl } = require('../src/core/worker-url.js')
const { ccbCatalogRefreshDecision } = require('../src/core/catalog-version.js')
const {
    ccbParseContentRangeTotal,
    ccbPickProbeRangeStart,
} = require('../src/core/probe-range.js')
const {
    ccbPickNextRouteNode,
    ccbShouldPreserveRouteHost,
} = require('../src/core/runtime-route.js')

test('media matching checks the actual hostname, not query-string text', () => {
    assert.equal(ccbHasMediaDomain('https://upos.example.bilivideo.com/video.m4s'), true)
    assert.equal(ccbHasMediaDomain('//upos.example.bilivideo.com/video.m4s'), true)
    assert.equal(ccbHasMediaDomain('upos.example.bilivideo.com/video.m4s'), true)
    assert.equal(ccbHasMediaDomain('https://example.com/log?target=https://upos.example.bilivideo.com/video.m4s'), false)
    assert.equal(ccbHasMediaDomain('https://notbilivideo.com/video.m4s'), false)
    assert.equal(ccbIsMediaHostname('EDGE.MOUNTAINTOYS.CN.'), true)
    assert.equal(ccbExtractHostname('/relative/path', 'https://www.bilibili.com/video/1'), 'www.bilibili.com')
})

test('worker URLs are resolved before wrapping them in a blob worker', () => {
    const base = 'https://www.bilibili.com/video/BV1/page.html'
    assert.equal(
        ccbResolveWorkerScriptUrl('./workers/player.js', base),
        'https://www.bilibili.com/video/BV1/workers/player.js',
    )
    assert.equal(
        ccbResolveWorkerScriptUrl('/workers/player.js', base),
        'https://www.bilibili.com/workers/player.js',
    )
    assert.equal(ccbResolveWorkerScriptUrl('blob:https://www.bilibili.com/id', base), 'blob:https://www.bilibili.com/id')
})

test('catalog refresh follows upstream timestamps without downloading unchanged data', () => {
    assert.equal(ccbCatalogRefreshDecision({ hasCache: true, cachedUpdatedAt: 100, remoteUpdatedAt: 100 }), 'use-cache')
    assert.equal(ccbCatalogRefreshDecision({ hasCache: true, cachedUpdatedAt: 100, remoteUpdatedAt: 99 }), 'use-cache')
    assert.equal(ccbCatalogRefreshDecision({ hasCache: true, cachedUpdatedAt: 100, remoteUpdatedAt: 101 }), 'download')
    assert.equal(ccbCatalogRefreshDecision({ hasCache: true, cachedUpdatedAt: 0, remoteUpdatedAt: 101 }), 'download')
    assert.equal(ccbCatalogRefreshDecision({ hasCache: true, cachedUpdatedAt: 100, remoteUpdatedAt: 0 }), 'unknown')
    assert.equal(ccbCatalogRefreshDecision({ force: true, hasCache: true, cachedUpdatedAt: 100, remoteUpdatedAt: 100 }), 'download')
})

test('sustained metrics prefer a steady transfer over a burst that collapses', () => {
    const mib = 1024 * 1024
    const steadyBurstMbps = mib * 8 / 1000 / 1000
    const steady = ccbCalculateProbeSustainedMetrics([
        { at: 0, loaded: 0 },
        { at: 250, loaded: 256 * 1024 },
        { at: 500, loaded: 512 * 1024 },
        { at: 750, loaded: 768 * 1024 },
        { at: 1000, loaded: mib },
    ], mib, 1000, steadyBurstMbps)
    const collapsingBurstMbps = mib * 8 / 1200 / 1000
    const collapsing = ccbCalculateProbeSustainedMetrics([
        { at: 0, loaded: 0 },
        { at: 20, loaded: 256 * 1024 },
        { at: 100, loaded: 512 * 1024 },
        { at: 600, loaded: 768 * 1024 },
        { at: 1200, loaded: mib },
    ], mib, 1200, collapsingBurstMbps)

    assert.ok(steady.sustainedMbps > collapsing.sustainedMbps)
    assert.equal(steady.stability, 1)
    assert.ok(collapsing.stability < 1)
    assert.equal(ccbSamplePercentile([9, 1, 5, 3, 7], 0.20), 1)
})

test('deep probes use distinct middle ranges when the file size is known', () => {
    const total = 777766052
    const bytes = 3 * 1024 * 1024
    const starts = [0, 1, 2].map(round => ccbPickProbeRangeStart(total, bytes, round, 3, 'video-1'))
    assert.equal(new Set(starts).size, 3)
    assert.ok(starts.every(start => start >= total * 0.08 && start + bytes <= total * 0.88))
    assert.equal(ccbPickProbeRangeStart(bytes, bytes, 0, 3, 'small'), 0)
    assert.equal(ccbParseContentRangeTotal('Content-Range: bytes 10-20/777766052\r\n'), total)
    assert.equal(ccbParseContentRangeTotal('Content-Type: video/mp4'), 0)
})

test('runtime failover preserves healthy backups and skips failed routes', () => {
    const routes = ['primary.example', 'backup-a.example', 'backup-b.example']
    assert.equal(ccbShouldPreserveRouteHost('BACKUP-A.EXAMPLE.', routes, []), true)
    assert.equal(ccbShouldPreserveRouteHost('backup-a.example', routes, ['backup-a.example']), false)
    assert.equal(ccbShouldPreserveRouteHost('other.example', routes, []), false)
    assert.equal(
        ccbPickNextRouteNode('primary.example', routes, ['primary.example', 'backup-a.example']),
        'backup-b.example',
    )
    assert.equal(ccbPickNextRouteNode('backup-b.example', routes, routes), '')
})
