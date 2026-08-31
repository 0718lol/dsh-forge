#!/usr/bin/env node
// create-dsh-plugin — scaffold a DeepSeek Harness (DSH) plugin.
//
// Usage:
//   npm create dsh-plugin@latest my-plugin
//   npm create dsh-plugin@latest my-plugin -- --pm pnpm --no-install
//
// Zero runtime dependencies: only node: builtins.

import { parseArgs } from 'node:util'
import { createInterface } from 'node:readline/promises'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'template')
const PM_RUN = { npm: 'npm run', pnpm: 'pnpm', yarn: 'yarn', bun: 'bun run' }
const PM_INSTALL = { npm: 'npm install', pnpm: 'pnpm install', yarn: 'yarn install', bun: 'bun install' }

const args = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    pm: { type: 'string', default: 'npm' },
    'no-install': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

if (args.values.help || !args.positionals[0]) {
  console.log(`@dshforge/create — scaffold a DeepSeek Harness (DSH) plugin

Usage:
  npm create @dshforge <plugin-name> [-- --pm npm|pnpm|yarn|bun] [--no-install]

Options:
  --pm <pm>       package manager for install (default: npm)
  --no-install    skip dependency installation
  -h, --help      show this help`)
  process.exit(args.values.help ? 0 : 1)
}

const projectName = args.positionals[0]
if (!/^(@[a-z0-9-]+\/)?[a-z][a-z0-9-]*$/.test(projectName)) {
  console.error(`✗ "${projectName}" is not a valid npm package name.
Use lowercase letters, digits and dashes, e.g. my-dsh-plugin or @scope/my-dsh-plugin.`)
  process.exit(1)
}

const targetDir = resolve(projectName)
if (existsSync(targetDir)) {
  console.error(`✗ Directory already exists: ${targetDir}`)
  process.exit(1)
}

const pm = args.values.pm
if (!(pm in PM_RUN)) {
  console.error(`✗ Unknown package manager "${pm}" (expected npm | pnpm | yarn | bun)`)
  process.exit(1)
}

const shortName = projectName.includes('/') ? projectName.split('/')[1] : projectName

// Non-interactive defaults; the prompt only runs on a real terminal.
let displayName = shortName
if (process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  displayName = (await rl.question(`Display name (${shortName}): `)).trim() || shortName
  rl.close()
}

console.log(`
  ⛏  dsh-forge · @dshforge/create
  ─────────────────────────────────
  name     ${projectName}
  pm       ${pm}
  target   ${targetDir}
`)

if (!args.values['dry-run']) {
  mkdirSync(targetDir, { recursive: true })
  cpSync(TEMPLATE_DIR, targetDir, { recursive: true })

  const replacements = {
    '{{PLUGIN_NAME}}': projectName,
    '{{PLUGIN_SHORT_NAME}}': shortName,
    '{{PLUGIN_DISPLAY_NAME}}': displayName,
    '{{YEAR}}': String(new Date().getFullYear()),
  }
  walkAndRender(targetDir, replacements)
}

function walkAndRender(dir, map) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walkAndRender(p, map)
    else renderFile(p, map)
  }
}

function renderFile(path, map) {
  const text = readFileSync(path, 'utf8')
  if (!Object.keys(map).some((k) => text.includes(k))) return
  const out = Object.entries(map).reduce((acc, [k, v]) => acc.split(k).join(v), text)
  writeFileSync(path, out)
}

if (args.values['dry-run']) {
  console.log('dry run complete — nothing written.')
  process.exit(0)
}

console.log('✓ Plugin scaffolded.')

if (!args.values['no-install']) {
  console.log(`→ Installing dependencies with ${pm} (this can take a minute)…`)
  const result = spawnSync(PM_INSTALL[pm], { shell: true, cwd: targetDir, stdio: 'inherit' })
  if (result.status !== 0) {
    console.error('✗ Install failed. Run the install command manually inside the project.')
    process.exit(1)
  }
}

console.log(`
✓ Done. Next steps:

  cd ${projectName}
  ${PM_RUN[pm]} dev        # type-check & build in watch mode
  ${PM_RUN[pm]} test       # unit tests
  ${PM_RUN[pm]} compat     # test against published @deepseek-ai/dsh-tools versions

Attach the plugin to a running harness (from this directory):

  npx @deepseek-ai/dsh plugin --profile web add .
  npx @deepseek-ai/dsh web

Forge docs: https://github.com/0718lol/dsh-forge
`)
