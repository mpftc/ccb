const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const templatePath = path.join(root, 'src', 'ccb-beta.template.js')
const outputPath = path.join(root, 'script', 'ccb-beta.js')
const marker = '/*__CCB_CORE_MODULES__*/'
const modulePaths = [
    path.join(root, 'src', 'core', 'media-url.js'),
    path.join(root, 'src', 'core', 'benchmark-math.js'),
    path.join(root, 'src', 'core', 'worker-url.js'),
    path.join(root, 'src', 'core', 'catalog-version.js'),
    path.join(root, 'src', 'core', 'probe-range.js'),
    path.join(root, 'src', 'core', 'runtime-route.js'),
]

function normalizeNewlines(value) {
    return String(value).replace(/\r\n/g, '\n')
}

function build() {
    const template = normalizeNewlines(fs.readFileSync(templatePath, 'utf8'))
    const markerCount = template.split(marker).length - 1
    if (markerCount !== 1) throw new Error(`expected one ${marker}, found ${markerCount}`)
    const modules = modulePaths.map(file => {
        const source = normalizeNewlines(fs.readFileSync(file, 'utf8')).trimEnd()
        const exportIndex = source.indexOf("\nif (typeof module !== 'undefined' && module.exports)")
        return exportIndex >= 0 ? source.slice(0, exportIndex).trimEnd() : source
    }).join('\n\n').split('\n').map(line => line ? `    ${line}` : '').join('\n')
    return template.replace(`    ${marker}`, modules).replace(/\s+$/, '') + '\n'
}

const expected = build()
if (process.argv.includes('--check')) {
    const actual = fs.existsSync(outputPath) ? normalizeNewlines(fs.readFileSync(outputPath, 'utf8')) : ''
    if (actual !== expected) {
        process.stderr.write('script/ccb-beta.js is not generated from src/ccb-beta.template.js\n')
        process.exitCode = 1
    }
} else {
    fs.writeFileSync(outputPath, expected, 'utf8')
}
