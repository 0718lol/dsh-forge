# Launch Kit — 发布文案包

dsh-forge 发布时直接复制使用的社区文案。发布节奏建议：npm 发布完成后 24 小时内全部发出。

---

## 1. DeepSeek Harness 官方 Discord（开发者频道）

英文短贴：

> **dsh-forge — scaffold, compat-test, and ship DSH plugins**
>
> Since dsh launched, 12k+ plugin repos have appeared — and dsh is still a developer preview with breaking changes. So we built the toolchain we wanted:
>
> - `npm create @dshforge my-plugin` — TypeScript + tests + the official defensive patterns, baked in
> - `dsh-forge compat` — runs your tests against every published `@deepseek-ai/dsh-tools` version (and restores your package.json after)
> - `dsh-forge check` — lints the structural mistakes that make plugins fail to load
> - `dsh-forge publish` — check → build → test → publish
>
> Everything is verified against real `dsh-tools` releases. Repo + docs: https://github.com/0718lol/dsh-forge
>
> Feedback welcome — especially: what breaking change hurt you most? We'll encode it as a check rule.

---

## 2. V2EX（/go/programmer 或 /go/nodejs）

**标题**：做了个开源工具链 dsh-forge：让 DeepSeek Harness 插件开发不被 breaking change 背刺

**正文**：

DeepSeek Harness（dsh）开源两周 20 万星，插件生态一夜之间冒出一万多个仓库。但它是 developer preview，官方明说"会有破坏性变更"，还专门写了一篇《防御性模式》文档讲"我们实际发布过的缺陷类别"。

插件作者的处境就是：裸奔踩坑，用户替你发现不兼容。

所以我做了 dsh-forge（MIT 开源）：

- `npm create @dshforge my-plugin` — 一条命令生成 TS 插件项目：严格 tsconfig、vitest 测试（不需要跑着 harness）、官方防御性模式写进模板注释、自带 dsh.bundle 清单（可直接被 awesome-dsh-plugin 收录）
- `npm run compat` — 把你的测试套件对 npm 上每个已发布的 @deepseek-ai/dsh-tools 版本跑一遍（默认 next + 最近 3 个版本），跑完自动还原 package.json 和 lockfile。上游 breaking change 变成你 CI 里的一张红叉，而不是用户提的 bug
- `npm run check` — 静态检查会让插件加载失败的结构问题（缺 inject: ['tools']、output.schema 用了根级 required 数组、async execute 没理 exec.signal 等，全是开发中真实踩过的）
- `npm run publish` — check → build → test → npm publish 流水线

全部零依赖实现（纯 node: 内置模块），对真实 dsh-tools 版本做过端到端验证。

GitHub：https://github.com/0718lol/dsh-forge
中文文档：https://github.com/0718lol/dsh-forge/blob/main/README.zh-CN.md

求反馈：你写 dsh 插件时被哪个坑坑得最狠？我把它做成 check 规则。

---

## 3. 掘金

**标题**：DeepSeek Harness 插件生态爆发了，我给插件开发者做了条工具链（附踩坑实录）

**正文**：用 V2EX 文案的加长版，开头补充生态数据（主仓 20.3 万星 / topic 下 1.2 万仓库 / 赢家全是 48 小时内卡位的基础设施位），中间把开发时抓到的 3 个 API 坑写成小节：

1. `defineTool` 会把 parameters DSL 编译成 JSON Schema——字段级 `required: true` 变成根级 `required: ["name"]` 数组，测试断言要按编译后形态写
2. `output.schema` 不是原始 JSON Schema，是 ValueSchemaSpec DSL——根级 `required: [...]` 数组会被 defineTool 直接拒绝，字段必填要写在每个属性上
3. UI 卡片数据不通过参数传递——`presentResult(args, result)` 拿到的 `result.meta` 来自 `output.presentationMeta(args, value)` 的投影，卡片 content 必须是 ContentBlock[]

结尾放 quickstart 四行命令 + 两个仓库链接。

---

## 4. DeepSeek 官方公众号投稿

**标题**：dsh-forge：给 DSH 插件开发者的脚手架与兼容性测试工具链

**正文**：掘金版精简到 800 字，突出：官方生态数据、与官方《防御性模式》文档的呼应（"官方文档里的每条规则，工具里都有对应的自动化检查"）、致谢官方 Cordis 框架、附快速开始代码块和二维码位。通过官方公众号的投稿渠道/邮箱提交。

---

## 5. 即刻 / X

> 给 DeepSeek Harness 插件开发者做了条工具链：npm create @dshforge 一条命令起项目，dsh-forge compat 对所有已发布的 dsh-tools 版本跑测试（上游 breaking change 在你 CI 里变红叉，而不是用户 bug 里见），dsh-forge check 静态查坑。零依赖，MIT。https://github.com/0718lol/dsh-forge

---

## 6. awesome-dsh-plugin 收录 PR（24 小时后提）

分支 `add-pet-plugin` 已推送到 fork（YAML + 校验通过，仅差仓库时长/提交数门槛）。满足条件后执行：

```sh
cd /tmp/awesome-dsh-plugin   # 若已清理，重新 git clone https://github.com/0718lol/awesome-dsh-plugin
git checkout add-pet-plugin
gh pr create --repo awesome-dsh-plugin/awesome-dsh-plugin \
  --title "add 0718lol/dsh-forge#dsh-plugin-pet (fun)" \
  --body "Adds the dsh-plugin-pet example (companion whale) under Just for Fun.

- Declares a dsh.bundle manifest in examples/dsh-plugin-pet/package.json
- Built with dsh-forge; tests run without a harness
- YAML generated per contributing.md; check-submission passes except the repo-age/commit gates that needed 24h (repo created 2026-08-30)"
```
