# {{PLUGIN_DISPLAY_NAME}}

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugin — scaffolded with [dsh-forge](https://github.com/0718lol/dsh-forge).

## What's inside

- **TypeScript-first**: strict mode, `NodeNext` ESM, declarations emitted.
- **A working example tool** (`greet`) showing the `defineTool` contract: validated parameters, canonical `output.schema`, model-visible `render`, and `exec.signal` handling.
- **Unit tests** that verify tool registration, execution, and abort handling — no running harness required.
- **Compat testing** via `dsh-forge compat`: run the same tests against multiple published versions of `@deepseek-ai/dsh-tools` so upstream breaking changes can't ambush you.

## Try it in a harness

```sh
npx @deepseek-ai/dsh web --patch ./cordis.yml
```

Then ask the agent: *“Use the greet tool to greet Ada.”*

## Develop

| Command | What it does |
|---|---|
| `npm run dev` | Type-check & build in watch mode |
| `npm test` | Unit tests (vitest) |
| `npm run compat -- --list` | List published `@deepseek-ai/dsh-tools` versions |
| `npm run compat -- --against 0.1.0-rc.8` | Run tests pinned to a specific version |
| `npm run check` | Static lint of the plugin's shape & defensive-pattern gotchas |
| `npm publish` | Runs `dsh-forge publish` first: check → build → test → publish |

## Adding a tool

Register more tools inside `apply(ctx)` with `ctx.tools.register(defineTool({ ... }))`. The contract (schemas, canonical values, UI cards, background jobs) is documented in the official [tool authoring reference](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-tool.md).

## License

MIT © {{YEAR}}
