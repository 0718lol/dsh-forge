# Changelog

All notable changes to dsh-forge are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [0.1.0] - 2026-08-30

First public release. Verified end to end against `@deepseek-ai/dsh-tools` `0.1.0-rc.8` and `0.1.1-rc.2`.

### Added — `@dshforge/create`

- `npm create @dshforge <name>` scaffolds a complete DSH plugin: TypeScript (strict, NodeNext ESM), a working `defineTool` example, vitest unit tests that run without a harness, `cordis.yml` patch for `dsh web --patch`, and a `dsh.bundle` manifest so the plugin is installable via `dsh plugin add` and eligible for the awesome-dsh-plugin list.
- Template code and comments encode the official defensive patterns: `inject: ['tools']`, `exec.signal` handling, dispose semantics, pure `render`/`presentResult`.

### Added — `@dshforge/cli` (bin: `dsh-forge`)

- `dsh-forge check` — static lint of the structural gotchas that make plugins fail to load or leak defects: missing `name`/`apply`/`inject`, tools missing `description`/`parameters`/canonical `output.schema`, root-level `required` arrays in the value schema DSL (rejected by `defineTool`), async `execute` that never references `exec.signal`, impure-looking `presentCall`/`presentResult`, packaging hygiene.
- `dsh-forge compat` — run your test suite against a matrix of published `@deepseek-ai/dsh-tools` versions (default: `next` + last 3). Pins each version, installs, runs vitest, then restores `package.json` and your lockfile. `--list` shows every published version with dist-tags; `--against <version>` pins one.
- `dsh-forge dev` — type-check & build in watch mode with harness attach instructions.
- `dsh-forge publish` — check → build → test → `npm publish`.

### Added

- `examples/dsh-plugin-pet` — a companion whale living in your harness (feed / play / status), demonstrating canonical values, `output.presentationMeta` → `presentResult` UI cards, and schema-inexpressible constraint checks. 6 tests.
- Bilingual documentation (English / 中文) and a CI workflow that runs the compat matrix.
