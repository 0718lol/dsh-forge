# Contributing to dsh-forge

Thanks for helping make DSH plugin development less painful!

## Development setup

The repo is an npm workspace. Node 18+ required.

```sh
git clone https://github.com/0718lol/dsh-forge
cd dsh-forge
npm install
```

Each package is standalone plain JavaScript / templated files:

- `packages/create-dsh-plugin/` — the scaffold CLI (zero deps, `node:` builtins only) + `template/`
- `packages/forge/` — the toolchain CLI (`check` / `compat` / `dev` / `publish`)
- `examples/dsh-plugin-pet/` — reference plugin, kept installable and list-worthy

## Testing your changes

The template is exercised end to end — generate, install, build, test:

```sh
node packages/create-dsh-plugin/index.js /tmp/smoke --no-install
cd /tmp/smoke
python3 - <<'EOF'
import json
d = json.load(open('package.json'))
d['devDependencies']['@dshforge/cli'] = 'file:<absolute path to this repo>/packages/forge'
json.dump(d, open('package.json','w'), indent=2)
EOF
npm install && npm run build && npm test
node <absolute path to this repo>/packages/forge/src/cli.js check
node <absolute path to this repo>/packages/forge/src/cli.js compat --against 0.1.1-rc.2
```

The CI workflow does the same thing across a `dsh-tools` version matrix — keep it green.

## Ground rules

- **Track the official docs.** The template and `check` rules must match [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) conventions. When upstream changes the plugin contract, the fix lands here first as a template + rule update.
- **Zero runtime dependencies** for both CLIs — `node:` builtins only. This keeps `npm create @dshforge` instant and audit-clean.
- **The compat tool must always restore your `package.json` and lockfile**, even on failure. Changes here need a test on the failure path.
- Every `check` rule must cite why it exists — link the official doc or the defect class it prevents.

## Submitting

1. Branch from `main`, keep commits focused.
2. Run the end-to-end snippet above against your changes.
3. Open a PR describing which template/check behavior changed and why.
