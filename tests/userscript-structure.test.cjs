const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const script = fs.readFileSync(path.join(root, 'script', 'ccb-beta.js'), 'utf8')

test('generated userscript keeps the approved benchmark parameters', () => {
    const expected = [
        'const fullBenchmarkReachRounds = 2',
        'const fullBenchmarkSpeedBytes = 64 * 1024',
        'const fullBenchmarkDeepCount = 20',
        'const fullBenchmarkDeepRounds = 2',
        'const fullBenchmarkDeepBytes = 1024 * 1024',
        'const fullBenchmarkReachConcurrency = 18',
        'const fullBenchmarkSpeedConcurrency = 8',
        'const fullBenchmarkDeepConcurrency = 1',
        'const autoScreenFinalistCount = 4',
        'const autoSustainedBytes = 3 * 1024 * 1024',
        'const autoSustainedRounds = 3',
        'const autoSustainedFinalistCount = 3',
    ]
    for (const line of expected) assert.ok(script.includes(line), `missing ${line}`)
})

test('generated userscript checks upstream info and cleans up wrapper blob URLs', () => {
    assert.ok(script.includes('https://raw.githubusercontent.com/mpftc/ccb/refs/heads/personal/ccb-2.5/script/ccb-beta.js'))
    assert.ok(script.includes('raw.githubusercontent.com/Kanda-Akihito-Kun/ccb/main/data'))
    assert.ok(script.includes('fetchCatalogInfo(source)'))
    assert.ok(script.includes('上游版本未变化，继续使用本地缓存'))
    assert.ok(script.includes('ccbResolveWorkerScriptUrl('))
    assert.ok(script.includes('ccbPickProbeRangeStart('))
    assert.ok(script.includes('recordAutoPlaybackFailure('))
    assert.ok(script.includes('ccbPickNextRouteNode('))
    assert.ok(script.includes("type: 'ccb-worker-failure'"))
    assert.ok(script.includes('w.URL.revokeObjectURL(url)'))
    assert.equal(script.includes("if (typeof module !== 'undefined' && module.exports)"), false)
})
