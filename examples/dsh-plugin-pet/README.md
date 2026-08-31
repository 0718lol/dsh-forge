# dsh-plugin-pet 🐋

A companion whale that lives in your [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Feed it, play with it, check on it — the reference example plugin built with [dsh-forge](https://github.com/0718lol/dsh-forge).

## What it demonstrates

- Registering multiple tools with `ctx.tools.register(defineTool({ ... }))`
- Canonical `output.schema` values (object, string) + model-visible `render`
- UI cards via `presentResult` — ASCII portrait derived **purely** from the persisted value, so session replay reproduces it
- Constraints the schema can't express (non-empty string) checked inside `execute`
- `exec.signal` handling in every tool

## Try it

From this directory:

```sh
npx @deepseek-ai/dsh plugin --profile web add .
npx @deepseek-ai/dsh web
```

Then ask the agent: *“Check on my pet, then feed it a fish.”*

## Development

```sh
npm install
npm test          # 6 tests, no running harness needed
npm run check     # dsh-forge static lint
npm run compat    # test against published @deepseek-ai/dsh-tools versions
```

## License

MIT
