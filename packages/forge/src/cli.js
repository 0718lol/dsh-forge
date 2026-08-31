#!/usr/bin/env node
// dsh-forge — developer toolchain for DeepSeek Harness (DSH) plugins.
//
//   dsh-forge check                 static lint of plugin shape & defensive-pattern gotchas
//   dsh-forge compat --list         list published @deepseek-ai/dsh-tools versions
//   dsh-forge compat --against X    install dsh-tools@X (via npm overrides), run the test suite
//   dsh-forge compat                run the whole default matrix (next + last 3 versions)
//   dsh-forge dev                   build in watch mode + print harness attach instructions
//   dsh-forge publish               check → build → test → npm publish
//
// Zero runtime dependencies: node: builtins only. The DSH project is a
// developer preview with compatibility-breaking changes; `compat` exists so
// plugin authors find breakage before their users do.

import { parseArgs } from 'node:util'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, copyFileSync, renameSync, rmSync, mkdtempSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const REGISTRY = 'https://registry.npmjs.org'
const PKG = '@deepseek-ai/dsh-tools'
const CORDIS = '@deepseek-ai/cordis'
const DEFAULT_MATRIX_SIZE = 4

const USAGE = `dsh-forge — developer toolchain for DeepSeek Harness (DSH) plugins

Usage:
  dsh-forge check                  static lint of plugin shape & defensive-pattern gotchas
  dsh-forge compat [--list]        list published ${PKG} versions
  dsh-forge compat --against X     run tests with ${PKG} pinned to version X
  dsh-forge compat [--matrix a,b]  run tests across versions (default: next + last 3)
  dsh-forge dev                    type-check & build in watch mode
  dsh-forge publish                check → build → test → npm publish

Options:
  --keep-install    keep the pinned devDependencies after compat (default: restore)
  -h, --help        show this help`

const argv = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    list: { type: 'boolean', default: false },
    against: { type: 'string' },
    matrix: { type: 'string' },
    'keep-install': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

const command = argv.positionals[0]

if (argv.values.help || !command) {
  console.log(USAGE)
  process.exit(argv.values.help ? 0 : 1)
}

const commands = { check, compat, dev, publish }
const fn = commands[command]
if (!fn) {
  console.error(`✗ Unknown command "${command}".\n\n${USAGE}`)
  process.exit(1)
}

try {
  const code = await fn(argv.values)
  process.exit(code ?? 0)
} catch (err) {
  console.error(`✗ ${err.message}`)
  process.exit(1)
}

// ── helpers ──────────────────────────────────────────────────────────────────

function run(cmd, { stdio = 'inherit' } = {}) {
  const result = spawnSync(cmd, { shell: true, stdio })
  if (result.status !== 0) {
    throw new Error(`command failed: ${cmd}`)
  }
  return result
}

function runCapture(cmd) {
  const result = spawnSync(cmd, { shell: true, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`command failed: ${cmd}`)
  }
  return result.stdout
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function fetchVersions(pkg) {
  const res = await fetch(`${REGISTRY}/${encodeURIComponent(pkg).replace('%40', '@').replace('%2F', '/')}`)
  if (!res.ok) throw new Error(`registry lookup failed for ${pkg} (HTTP ${res.status})`)
  const data = await res.json()
  const versions = Object.keys(data.versions ?? {})
  if (versions.length === 0) throw new Error(`no published versions found for ${pkg}`)
  return { versions, distTags: data['dist-tags'] ?? {} }
}

function sortVersions(versions) {
  return versions.sort((a, b) => {
    const pa = parseVersion(a)
    const pb = parseVersion(b)
    for (let i = 0; i < 3; i++) {
      if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] - pb.nums[i]
    }
    // pre-release sorts before its release
    if (pa.pre && !pb.pre) return -1
    if (!pa.pre && pb.pre) return 1
    return (pa.pre ?? '').localeCompare(pb.pre ?? '')
  })
}

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/.exec(v)
  if (!m) return { nums: [0, 0, 0], pre: v }
  return { nums: [+m[1], +m[2], +m[3]], pre: m[4] }
}

function requirePluginRoot() {
  const root = process.cwd()
  if (!existsSync(join(root, 'package.json'))) {
    throw new Error('no package.json found — run this from your plugin directory')
  }
  return root
}

function modifyJsonFile(path, fn) {
  const original = readFileSync(path, 'utf8')
  const json = JSON.parse(original)
  const updated = fn(json)
  writeFileSync(path, JSON.stringify(updated, null, 2) + '\n')
  return original
}

// ── dsh-forge check ──────────────────────────────────────────────────────────
// Static, regex-level lint of the plugin's shape. Not a type checker — it
// catches the structural mistakes that make plugins fail to load or leak
// defects, before you attach to a harness.

async function check() {
  const root = requirePluginRoot()
  const pkg = readJson(join(root, 'package.json'))
  const issues = []
  const warnings = []

  // Entry file resolution
  const entry = join(root, 'src', 'index.ts')
  if (!existsSync(entry)) {
    issues.push('src/index.ts not found — the loader expects an entry module')
  } else {
    const src = readFileSync(entry, 'utf8')

    if (!/export\s+const\s+name\s*=/.test(src)) {
      issues.push('missing `export const name` — harness diagnostics cannot identify your plugin')
    }
    if (!/export\s+function\s+apply|export\s+const\s+\w+\s*=\s*\{[\s\S]*apply|export\s+class\s+\w+\s+extends\s+Service/.test(src)) {
      issues.push('no plugin form found — export apply(ctx), an object plugin, or a Service class')
    }
    if (/ctx\.tools\.register/.test(src) && !/inject\s*=\s*\[\s*['"]tools['"]/.test(src)) {
      issues.push('registers tools but `inject` does not include \'tools\' — apply() may run before the registry exists')
    }
    // Defensive-pattern spot checks (see the official defensive-patterns doc)
    for (const toolBlock of src.matchAll(/defineTool\(\{([\s\S]*?)\n\s*\}\)/g)) {
      const block = toolBlock[1]
      const toolName = /name:\s*['"]([^'"]+)['"]/.exec(block)?.[1] ?? '(unnamed tool)'
      if (!/description:/.test(block)) {
        issues.push(`tool "${toolName}": missing description — the model cannot know when to use it`)
      }
      if (!/parameters:/.test(block)) {
        issues.push(`tool "${toolName}": missing parameters schema`)
      }
      if (!/output:\s*\{[\s\S]*schema:/.test(block)) {
        issues.push(`tool "${toolName}": missing output.schema — PTC mode and persistence need a canonical value`)
      }
      // The output schema is the value schema DSL, not raw JSON Schema: a
      // root-level required array is rejected at defineTool time.
      if (/output:\s*\{[\s\S]*?schema:\s*\{[\s\S]*?required:\s*\[/.test(block)) {
        issues.push(`tool "${toolName}": output.schema uses a root-level required array — the value schema DSL marks fields with \`required: true\` per property instead`)
      }
      if (/async\s+execute/.test(block) && !/signal/.test(block)) {
        warnings.push(`tool "${toolName}": async execute() never references exec.signal — long work will not be cancellable`)
      }
    }
    if (/\bpresentCall\b|\bpresentResult\b/.test(src) && /Date\.now|Math\.random/.test(src)) {
      warnings.push('presentCall/presentResult must be pure functions (no clock, no randomness) — replay will corrupt')
    }
  }

  if (!pkg.keywords?.includes('dsh-plugin')) {
    warnings.push('package.json keywords should include "dsh-plugin" for ecosystem discoverability')
  }
  if (!pkg.peerDependencies?.[PKG]) {
    warnings.push(`package.json should declare ${PKG} as a peerDependency (the harness provides it at runtime)`)
  }
  if (pkg.files && !pkg.files.includes('cordis.yml')) {
    warnings.push('package.json "files" should include cordis.yml so consumers can attach your published package')
  }

  if (!pkg.files && !existsSync(join(root, 'cordis.yml'))) {
    warnings.push('cordis.yml not found — the dsh.bundle manifest points here and dsh plugin add needs it to activate the plugin')
  } else if (existsSync(join(root, 'cordis.yml'))) {
    const patch = readFileSync(join(root, 'cordis.yml'), 'utf8')
    // dsh patch layers apply with INSERT semantics; bare entries are
    // silently skipped ("id is required for non-insert patches") and the
    // plugin never mounts — verified against dsh-app-boot.
    if (/^\s*-\s+(id|name):/m.test(patch) && !/insert:/.test(patch)) {
      issues.push('cordis.yml uses bare entries — dsh patch layers require insert semantics: wrap in `- insert:` with `id` + `name`, or the plugin silently never mounts')
    }
    if (/^\s*-\s+name:\s*['"]?\.\s*['"]?\s*$/m.test(patch)) {
      issues.push("cordis.yml mounts name: '.' — ESM cannot import a directory and patch specifiers resolve against the profile directory, not the plugin; mount the installed package or directory name instead")
    }
  }

  for (const w of warnings) console.log(`⚠ ${w}`)
  if (issues.length > 0) {
    for (const i of issues) console.error(`✗ ${i}`)
    console.error(`\ncheck failed: ${issues.length} issue(s), ${warnings.length} warning(s)`)
    return 1
  }
  console.log(`✓ check passed (${warnings.length} warning(s))`)
  return 0
}

// ── dsh-forge compat ─────────────────────────────────────────────────────────
// The harness is a developer preview with breaking changes. Pin each matrix
// version into devDependencies via npm overrides, run the plugin's own test
// suite, then restore the original package.json + lockfile.

async function compat(options) {
  const root = requirePluginRoot()

  if (options.list) {
    const { versions, distTags } = await fetchVersions(PKG)
    const sorted = sortVersions(versions)
    console.log(`published versions of ${PKG} (dist-tags: ${JSON.stringify(distTags)}):`)
    for (const v of sorted) console.log(`  ${v}${Object.values(distTags).includes(v) ? '  ← ' + Object.entries(distTags).filter(([, t]) => t === v).map(([tag]) => tag).join(', ') : ''}`)
    return 0
  }

  const { versions, distTags } = await fetchVersions(PKG)
  const sorted = sortVersions(versions)

  let matrix
  if (options.matrix) {
    matrix = options.matrix.split(',').map((v) => v.trim()).filter(Boolean)
  } else if (options.against) {
    matrix = [options.against]
  } else {
    const next = distTags.next ?? distTags.latest
    matrix = [...new Set([next, ...sorted.slice(-(DEFAULT_MATRIX_SIZE - 1))])]
  }
  for (const v of matrix) {
    if (!versions.includes(v)) throw new Error(`version ${v} of ${PKG} does not exist (see: dsh-forge compat --list)`)
  }

  console.log(`compat matrix: ${matrix.join('  →  ')}\n`)
  const results = []
  const pkgJsonPath = join(root, 'package.json')
  const lockfile = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].find((f) => existsSync(join(root, f)))
  const lockBackup = lockfile ? join(tmpdir(), `dsh-forge-lock-${Date.now()}`) : null
  if (lockfile) copyFileSync(join(root, lockfile), lockBackup)
  const originalPkgJson = readFileSync(pkgJsonPath, 'utf8')

  try {
    for (const version of matrix) {
      process.stdout.write(`▶ ${PKG}@${version} … `)
      try {
        modifyJsonFile(pkgJsonPath, (json) => ({
          ...json,
          devDependencies: {
            ...json.devDependencies,
            [PKG]: version,
            // Keep cordis aligned with the dsh-tools generation under test.
            ...(distTags.next ? { [CORDIS]: version.startsWith('0.0.') ? json.devDependencies?.[CORDIS] ?? '^4.0.1' : '^4.0.1' } : {}),
          },
        }))
        run('npm install --no-audit --no-fund', { stdio: 'pipe' })
        run('npx vitest run', { stdio: 'pipe' })
        results.push([version, 'PASS'])
        console.log('PASS')
      } catch (err) {
        results.push([version, 'FAIL'])
        console.log('FAIL')
        if (matrix.length === 1) throw new Error(`tests failed against ${PKG}@${version}: ${err.message}`)
      }
    }
  } finally {
    writeFileSync(pkgJsonPath, originalPkgJson)
    if (lockfile && lockBackup && !options['keep-install']) {
      renameSync(lockBackup, join(root, lockfile))
    }
    run('npm install --no-audit --no-fund', { stdio: 'pipe' })
  }

  const failed = results.filter(([, r]) => r === 'FAIL')
  console.log(`\ncompat summary: ${results.length - failed.length}/${results.length} versions passed`)
  if (failed.length > 0) {
    console.error(`✗ failing versions: ${failed.map(([v]) => v).join(', ')}
  → pin your peerDependency range below the earliest failing version, or fix the API usage.`)
    return 1
  }
  console.log('✓ all versions passed')
  return 0
}

// ── dsh-forge dev ────────────────────────────────────────────────────────────

async function dev() {
  const root = requirePluginRoot()
  console.log(`→ type-checking & building in watch mode (tsc --watch)…

Attach to a running harness (from this directory, one-time per profile):

  npx @deepseek-ai/dsh plugin --profile web add .
  npx @deepseek-ai/dsh web

Cordis hot-reloads the plugin when dist/ output changes. Press Ctrl+C to stop.
`)
  try {
    run('npx tsc -p tsconfig.json --watch --preserveWatchOutput')
  } catch {
    return 1
  }
  return 0
}

// ── dsh-forge publish ────────────────────────────────────────────────────────

async function publish() {
  requirePluginRoot()
  console.log('→ step 1/4 · check')
  const checkCode = await check()
  if (checkCode !== 0) throw new Error('fix the issues above before publishing')

  console.log('→ step 2/4 · build')
  run('npm run build')

  console.log('→ step 3/4 · test')
  run('npm test')

  console.log('→ step 4/4 · npm publish')
  run('npm publish')

  console.log('✓ published. Remember to add your plugin to the ecosystem lists:')
  console.log('  · https://github.com/awesome-dsh-plugin/awesome-dsh-plugin')
  console.log('  · topic: dsh-plugin  (add the keyword in package.json)')
  return 0
}
