# dsh-forge

[![npm](https://img.shields.io/npm/v/@dshforge/cli?style=flat-square)](https://www.npmjs.com/package/@dshforge/cli)
[![npm](https://img.shields.io/npm/v/@dshforge/create?label=%40dshforge%2Fcreate&style=flat-square)](https://www.npmjs.com/package/@dshforge/create)
[![CI](https://img.shields.io/github/actions/workflow/status/0718lol/dsh-forge/ci.yml?style=flat-square)](https://github.com/0718lol/dsh-forge/actions)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

**The developer toolchain for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugins.** Scaffold in seconds, test against every published `dsh-tools` version, publish with confidence.

> 中文文档：[README.zh-CN.md](./README.zh-CN.md)

```sh
npm create @dshforge my-plugin
```

## Why

DSH is a developer preview — the README says it outright: **there will be compatibility-breaking changes.** The official docs even ship a [defensive patterns](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/defensive-patterns.md) guide full of "defect categories we actually shipped."

Every plugin author is left to hand-roll the same guard rails. dsh-forge bakes them in:

| | Without dsh-forge | With dsh-forge |
|---|---|---|
| Start a plugin | read 7 tutorial chapters, assemble tsconfig/tests by hand | `npm create @dshforge` — one command |
| Upstream breakage | your users find it in production | `npm run compat` — every published version, before you ship |
| Plugin hygiene | self-reviewed | `dsh-forge check` — the structural gotchas, linted |
| Publish | hope for the best | `dsh-forge publish` — check → build → test → publish |

## Quick start

```sh
npm create @dshforge my-plugin
cd my-plugin
npm run dev        # build in watch mode
npm test           # unit tests — no harness required
npx @deepseek-ai/dsh plugin --profile web add .  # attach to a harness (one-time)
npx @deepseek-ai/dsh web                         # the plugin is live
```

Ask the agent: *"Use the greet tool to greet Ada."* You're live.

## Compat testing (the part that saves you)

```sh
npm run compat -- --list              # every published @deepseek-ai/dsh-tools version
npm run compat -- --against 0.1.0-rc.8   # pin one version, run your tests
npm run compat                        # default matrix: next + last 3 versions
```

`compat` pins each version into your `devDependencies`, runs your full suite, then **restores your package.json and lockfile**. Wire it into CI with the included [workflow](./.github/workflows/ci.yml) and upstream breakage becomes a red ❌ in your pull request — not a bug report from a stranger.

## Static checks

`dsh-forge check` lints the mistakes that make plugins fail to load or leak defects:

- missing `export const name` / `apply` / `inject: ['tools']`
- tools missing `description`, `parameters`, or canonical `output.schema`
- `async execute()` that never references `exec.signal`
- impure-looking `presentCall` / `presentResult` (clock / randomness)
- packaging hygiene: `dsh-plugin` keyword, peer dependencies, `cordis.yml` in `files`

## Example

[`examples/dsh-plugin-pet`](./examples/dsh-plugin-pet) — a companion whale that lives in your harness. Feed it, play with it, and see `presentResult` UI cards in action:

```
$ pet_status
　　　__________
　　/　　　　　　\
〈　^ㅅ^　　　　〉
　　\＿＿＿＿＿／
energy 80/100
```

## Ecosystem

- [`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) — curated plugin list; add yours after publishing
- Official docs: [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) · [tool authoring reference](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-tool.md)

## License

MIT © 2026 dsh-forge contributors
